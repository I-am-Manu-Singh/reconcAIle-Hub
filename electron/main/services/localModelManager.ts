import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import http from "node:http";
import { app, BrowserWindow } from "electron";

export interface ModelDownloadProgress {
  readonly status: "IDLE" | "DOWNLOADING" | "EXTRACTING" | "READY" | "ERROR";
  readonly downloadedBytes: number;
  readonly totalBytes: number;
  readonly progressPercentage: number;
  readonly speedBytesPerSec: number;
  readonly modelPath: string | null;
  readonly errorMessage: string | null;
}

export interface BundledModelConfig {
  readonly modelId: string;
  readonly name: string;
  readonly description: string;
  readonly sizeBytes: number;
  readonly downloadUrl: string;
  readonly filename: string;
}

// Recommended ultra-compact Q4_K_M quantized GGUF
export const BUNDLED_MODELS: Record<string, BundledModelConfig> = {
  "smollm2-135m": {
    modelId: "smollm2-135m",
    name: "SmolLM2 135M Instruct (Q4_K_M)",
    description: "Ultra-small ~100MB model. Featherlight on CPU, fast JSON & accounting reasoning.",
    sizeBytes: 105454432,
    downloadUrl: "https://huggingface.co/bartowski/SmolLM2-135M-Instruct-GGUF/resolve/main/SmolLM2-135M-Instruct-Q4_K_M.gguf",
    filename: "smollm2-135m-instruct-q4_k_m.gguf",
  },
  "smollm2-360m": {
    modelId: "smollm2-360m",
    name: "SmolLM2 360M Instruct (Q4_K_M)",
    description: "Compact ~258MB model. Fast on CPU, handles entity extraction & JSON.",
    sizeBytes: 270590880,
    downloadUrl: "https://huggingface.co/bartowski/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf",
    filename: "smollm2-360m-instruct-q4_k_m.gguf",
  },
  "qwen2.5-0.5b": {
    modelId: "qwen2.5-0.5b",
    name: "Qwen 2.5 0.5B Instruct (Q4_K_M)",
    description: "Compact 390MB model with strong Indian financial terminology awareness.",
    sizeBytes: 390 * 1024 * 1024,
    downloadUrl: "https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf",
    filename: "qwen2.5-0.5b-instruct-q4_k_m.gguf",
  },
};

export class LocalModelManager {
  private activeDownloadReq: http.ClientRequest | null = null;
  private currentProgress: ModelDownloadProgress = {
    status: "IDLE",
    downloadedBytes: 0,
    totalBytes: 0,
    progressPercentage: 0,
    speedBytesPerSec: 0,
    modelPath: null,
    errorMessage: null,
  };

  public getModelsDir(): string {
    const dir = path.join(app.getPath("userData"), "models");
    fs.mkdirSync(dir, { recursive: true });

    // Auto-link or copy any bundled models from build/models or app resources
    const appBundledDir = path.join(app.getAppPath(), "build", "models");
    if (fs.existsSync(appBundledDir)) {
      try {
        const files = fs.readdirSync(appBundledDir);
        for (const file of files) {
          const dest = path.join(dir, file);
          if (!fs.existsSync(dest)) {
            const src = path.join(appBundledDir, file);
            if (fs.statSync(src).isFile()) {
              try {
                fs.copyFileSync(src, dest);
              } catch {
                // If permission issue, continue
              }
            }
          }
        }
      } catch {}
    }

    return dir;
  }

  public getModelPath(modelId = "smollm2-135m"): string | null {
    const config = BUNDLED_MODELS[modelId];
    if (!config) return null;
    const fullPath = path.join(this.getModelsDir(), config.filename);
    return fs.existsSync(fullPath) ? fullPath : null;
  }

  public getStatus(modelId = "smollm2-360m"): ModelDownloadProgress {
    const existing = this.getModelPath(modelId);
    if (existing && this.currentProgress.status !== "DOWNLOADING") {
      return {
        status: "READY",
        downloadedBytes: fs.statSync(existing).size,
        totalBytes: fs.statSync(existing).size,
        progressPercentage: 100,
        speedBytesPerSec: 0,
        modelPath: existing,
        errorMessage: null,
      };
    }
    return this.currentProgress;
  }

  public async downloadModel(
    modelId = "smollm2-360m",
    onProgress?: (progress: ModelDownloadProgress) => void
  ): Promise<string> {
    const config = BUNDLED_MODELS[modelId] || BUNDLED_MODELS["smollm2-360m"]!;
    const destPath = path.join(this.getModelsDir(), config.filename);
    const tempPath = `${destPath}.tmp`;

    if (fs.existsSync(destPath)) {
      this.currentProgress = {
        status: "READY",
        downloadedBytes: fs.statSync(destPath).size,
        totalBytes: fs.statSync(destPath).size,
        progressPercentage: 100,
        speedBytesPerSec: 0,
        modelPath: destPath,
        errorMessage: null,
      };
      onProgress?.(this.currentProgress);
      return destPath;
    }

    this.currentProgress = {
      status: "DOWNLOADING",
      downloadedBytes: 0,
      totalBytes: config.sizeBytes,
      progressPercentage: 0,
      speedBytesPerSec: 0,
      modelPath: null,
      errorMessage: null,
    };
    onProgress?.(this.currentProgress);

    return new Promise<string>((resolve, reject) => {
      const downloadWithRedirect = (targetUrl: string, redirectDepth = 0) => {
        if (redirectDepth > 6) {
          const err = new Error("Too many redirects downloading AI model.");
          this.currentProgress = { ...this.currentProgress, status: "ERROR", errorMessage: err.message };
          onProgress?.(this.currentProgress);
          reject(err);
          return;
        }

        const client = targetUrl.startsWith("https") ? https : http;

        this.activeDownloadReq = client.get(targetUrl, (response) => {
          // Handle 301/302/307 redirects from HuggingFace CDN
          if (
            response.statusCode &&
            [301, 302, 303, 307, 308].includes(response.statusCode) &&
            response.headers.location
          ) {
            downloadWithRedirect(response.headers.location, redirectDepth + 1);
            return;
          }

          if (response.statusCode !== 200) {
            const err = new Error(`Failed to download model: HTTP ${response.statusCode}`);
            this.currentProgress = { ...this.currentProgress, status: "ERROR", errorMessage: err.message };
            onProgress?.(this.currentProgress);
            reject(err);
            return;
          }

          const total = parseInt(response.headers["content-length"] || String(config.sizeBytes), 10);
          let downloaded = 0;
          let lastTime = Date.now();
          let lastDownloaded = 0;

          const fileStream = fs.createWriteStream(tempPath);

          response.on("data", (chunk: Buffer) => {
            downloaded += chunk.length;
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;

            let speed = 0;
            if (elapsed >= 0.5) {
              speed = (downloaded - lastDownloaded) / elapsed;
              lastTime = now;
              lastDownloaded = downloaded;
            }

            const pct = Math.min(99.9, Math.round((downloaded / total) * 1000) / 10);

            this.currentProgress = {
              status: "DOWNLOADING",
              downloadedBytes: downloaded,
              totalBytes: total,
              progressPercentage: pct,
              speedBytesPerSec: Math.round(speed),
              modelPath: null,
              errorMessage: null,
            };

            onProgress?.(this.currentProgress);

            // Broadcast to all windows
            for (const win of BrowserWindow.getAllWindows()) {
              win.webContents.send("models:download-progress", this.currentProgress);
            }
          });

          response.pipe(fileStream);

          fileStream.on("finish", () => {
            fileStream.close(() => {
              fs.renameSync(tempPath, destPath);
              this.currentProgress = {
                status: "READY",
                downloadedBytes: total,
                totalBytes: total,
                progressPercentage: 100,
                speedBytesPerSec: 0,
                modelPath: destPath,
                errorMessage: null,
              };
              onProgress?.(this.currentProgress);
              for (const win of BrowserWindow.getAllWindows()) {
                win.webContents.send("models:download-progress", this.currentProgress);
              }
              resolve(destPath);
            });
          });

          fileStream.on("error", (err) => {
            fs.unlink(tempPath, () => {});
            this.currentProgress = { ...this.currentProgress, status: "ERROR", errorMessage: err.message };
            onProgress?.(this.currentProgress);
            reject(err);
          });
        });

        this.activeDownloadReq.on("error", (err) => {
          this.currentProgress = { ...this.currentProgress, status: "ERROR", errorMessage: err.message };
          onProgress?.(this.currentProgress);
          reject(err);
        });
      };

      downloadWithRedirect(config.downloadUrl);
    });
  }

  public cancelDownload(): void {
    if (this.activeDownloadReq) {
      this.activeDownloadReq.destroy();
      this.activeDownloadReq = null;
    }
    this.currentProgress = {
      status: "IDLE",
      downloadedBytes: 0,
      totalBytes: 0,
      progressPercentage: 0,
      speedBytesPerSec: 0,
      modelPath: null,
      errorMessage: "Download cancelled by user.",
    };
  }

  public importCustomModel(sourceFilePath: string): { modelId: string; name: string; path: string; sizeBytes: number } {
    if (!fs.existsSync(sourceFilePath)) {
      throw new Error(`File does not exist at path: ${sourceFilePath}`);
    }
    const filename = path.basename(sourceFilePath);
    const destPath = path.join(this.getModelsDir(), filename);
    fs.copyFileSync(sourceFilePath, destPath);
    const stats = fs.statSync(destPath);
    const modelId = `custom-${path.parse(filename).name}`;
    return {
      modelId,
      name: filename,
      path: destPath,
      sizeBytes: stats.size,
    };
  }

  public listInstalledModels(): Array<{ modelId: string; name: string; path: string; sizeBytes: number; isCustom: boolean }> {
    const dir = this.getModelsDir();
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".gguf") || f.endsWith(".bin") || f.endsWith(".onnx"));
    return files.map(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const isBundled = Object.values(BUNDLED_MODELS).some(m => m.filename === file);
      const bundledKey = Object.keys(BUNDLED_MODELS).find(k => BUNDLED_MODELS[k]?.filename === file);
      return {
        modelId: bundledKey || `custom-${path.parse(file).name}`,
        name: isBundled && bundledKey ? BUNDLED_MODELS[bundledKey]!.name : file,
        path: fullPath,
        sizeBytes: stats.size,
        isCustom: !isBundled,
      };
    });
  }

  private llamaInstance: any = null;
  private loadedModel: any = null;
  private loadedContext: any = null;
  private loadedModelPath: string | null = null;
  private modelLoadStatus: { status: "UNLOADED" | "LOADING" | "READY" | "ERROR"; modelName: string | null; error: string | null } = {
    status: "UNLOADED",
    modelName: null,
    error: null,
  };

  public getEngineStatus(): { status: "UNLOADED" | "LOADING" | "READY" | "ERROR"; modelName: string | null; error: string | null } {
    return this.modelLoadStatus;
  }

  private activeSession: any = null;
  private activeSequence: any = null;

  public async preloadModel(modelId = "smollm2-135m"): Promise<boolean> {
    const modelPath = this.getModelPath(modelId) || (this.listInstalledModels()[0]?.path ?? null);
    if (!modelPath || !fs.existsSync(modelPath)) {
      this.modelLoadStatus = {
        status: "ERROR",
        modelName: modelId,
        error: `Model file not found on disk: ${modelId}. Please download or import it.`,
      };
      return false;
    }

    if (this.loadedModel && this.loadedModelPath === modelPath && this.activeSession) {
      this.modelLoadStatus = { status: "READY", modelName: path.basename(modelPath), error: null };
      return true;
    }

    try {
      this.modelLoadStatus = { status: "LOADING", modelName: path.basename(modelPath), error: null };
      const { getLlama, LlamaChatSession } = await import("node-llama-cpp");
      if (!this.llamaInstance) {
        this.llamaInstance = await getLlama();
      }
      this.loadedModel = await this.llamaInstance.loadModel({ modelPath });
      
      // Clean up previous context sequence if any
      if (this.activeSequence?.dispose) {
        try { this.activeSequence.dispose(); } catch {}
      }
      if (this.loadedContext?.dispose) {
        try { this.loadedContext.dispose(); } catch {}
      }

      this.loadedContext = await this.loadedModel.createContext({ contextSize: 4096 });
      this.activeSequence = this.loadedContext.getSequence();
      this.activeSession = new LlamaChatSession({
        contextSequence: this.activeSequence,
        systemPrompt: "You are ReconcAILe Hub Co-Pilot, an expert accounting, tax, GST, and audit assistant. Answer clearly, accurately, and concisely. Help user understand vouchers, reconciliation, ledgers, and bank statements.",
      });
      this.loadedModelPath = modelPath;
      this.modelLoadStatus = { status: "READY", modelName: path.basename(modelPath), error: null };
      console.log(`[LocalModelManager] Native GGUF model and session successfully initialized: ${modelPath}`);
      return true;
    } catch (err: any) {
      console.error("[LocalModelManager] Failed to load model:", err);
      this.modelLoadStatus = { status: "ERROR", modelName: path.basename(modelPath), error: err?.message || String(err) };
      return false;
    }
  }

  public async chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    options?: {
      provider?: "local" | "groq" | "gemini" | "openai" | "custom";
      modelId?: string;
      customEndpoint?: string;
      apiKey?: string;
    }
  ): Promise<{ text: string; provider: string; model: string }> {
    const provider = options?.provider || "local";
    const endpoint = options?.customEndpoint || "http://localhost:11434/v1";
    const modelId = options?.modelId || "smollm2-135m";

    // 1. Google Gemini
    if (provider === "gemini" && options?.apiKey) {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: options.apiKey });
      const prompt = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
      const resp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return { text: resp.text || "No response received.", provider: "Google Gemini", model: "gemini-2.5-flash" };
    }

    // 2. Groq
    if (provider === "groq" && options?.apiKey) {
      const { default: Groq } = await import("groq-sdk");
      const groq = new Groq({ apiKey: options.apiKey });
      const completion = await groq.chat.completions.create({
        messages,
        model: "llama-3.3-70b-versatile",
      });
      return { text: completion.choices[0]?.message?.content || "", provider: "Groq Cloud", model: "llama-3.3-70b-versatile" };
    }

    // 3. Native Local Offline LLM Inference via node-llama-cpp
    if (provider === "local") {
      const modelPath = this.getModelPath(modelId) || (this.listInstalledModels()[0]?.path ?? null);
      if (modelPath && fs.existsSync(modelPath)) {
        try {
          const ready = await this.preloadModel(modelId);
          if (ready && this.activeSession) {
            // Build and sync multi-turn history into session so the model remembers conversation flow
            const historyToSync: any[] = [
              {
                type: "system",
                text: "You are ReconcAILe Hub Co-Pilot, an expert accounting, tax, GST, and audit assistant. Answer clearly, accurately, and concisely. Help user understand vouchers, reconciliation, ledgers, and bank statements.",
              },
            ];

            // Add previous turns (excluding the very latest prompt to be executed)
            const previousTurns = messages.slice(0, -1);
            let lastUserQuery: string | null = null;

            for (const msg of previousTurns) {
              if (msg.role === "user") {
                lastUserQuery = msg.content;
              } else if (msg.role === "assistant" && lastUserQuery) {
                historyToSync.push({ type: "user", text: lastUserQuery });
                historyToSync.push({ type: "model", response: [msg.content] });
                lastUserQuery = null;
              }
            }

            try {
              this.activeSession.setChatHistory(historyToSync);
            } catch (histErr) {
              console.warn("[LocalModelManager] Could not sync chat history, continuing:", histErr);
            }

            const currentPrompt = [...messages].reverse().find(m => m.role === "user")?.content || "";
            const responseText = await this.activeSession.prompt(currentPrompt, {
              maxTokens: 512,
              temperature: 0.2,
            });

            this.modelLoadStatus = { status: "READY", modelName: path.basename(modelPath), error: null };
            return {
              text: responseText.trim(),
              provider: "Local Offline Engine (node-llama-cpp)",
              model: path.basename(modelPath),
            };
          }
        } catch (localErr: any) {
          console.warn("[LocalModelManager] Native inference error, recreating session next turn:", localErr);
          this.activeSession = null;
          this.activeSequence = null;
          this.loadedContext = null;
          this.modelLoadStatus = {
            status: "ERROR",
            modelName: modelId,
            error: localErr?.message || String(localErr),
          };
        }
      }
    }

    // 4. OpenAI / Custom BYO-LLM (Ollama, LMStudio, vLLM)
    const targetUrl = provider === "openai" ? "https://api.openai.com/v1" : endpoint.replace(/\/+$/, "");
    const authHeader = options?.apiKey ? `Bearer ${options.apiKey}` : "Bearer local";
    const modelName = provider === "openai" ? "gpt-4o-mini" : (modelId || "smollm2:135m");

    try {
      const res = await fetch(`${targetUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          model: modelName,
          messages,
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const json: any = await res.json();
        const content = json.choices?.[0]?.message?.content || "";
        return { text: content, provider: provider === "openai" ? "OpenAI" : "Local / Custom LLM", model: modelName };
      }
    } catch {
      // Fallback
    }

    // 5. Intelligent Accounting Fallback if model not yet loaded
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content || "";
    return {
      text: `[ReconcAILe Co-Pilot (${modelId})] Model is being initialized. For your query "${lastUserMessage.slice(0, 70)}", you can query documents using '@doc', inspect company vouchers using '@company', or click Download to ensure model weights are ready.`,
      provider: "Local Engine",
      model: modelId,
    };
  }
}
