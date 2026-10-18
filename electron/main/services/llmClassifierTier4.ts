import { LedgerMatchResult, VoucherType } from "./ledgerClassifierTypes.js";
import { CompanyLedgerCandidate } from "./fuzzyLedgerTier3.js";

export type AiProvider = "local" | "groq" | "gemini" | "openai" | "custom";

export interface AiModelOptions {
  provider?: AiProvider;
  apiKey?: string;
  customEndpoint?: string; // e.g. http://localhost:11434/v1 for Ollama / vLLM / llama.cpp
  modelName?: string;
}

/**
 * Tier 4: Multi-Provider LLM Batch Accounting Categorizer
 * Supports:
 * 1. Bundled / Local Offline LLM (Ollama, LMStudio, llamafile, or ONNX endpoint)
 * 2. Popular Cloud Providers: Groq (Llama 3.1/3.3), Google Gemini (Gemini 2.5 Flash), OpenAI (GPT-4o-mini)
 * 3. Custom Bring-Your-Own-LLM endpoint (OpenAI-compatible)
 */
export async function evaluateTier4LlmBatch(
  unmappedItems: Array<{
    id: string;
    date: string;
    rawNarration: string;
    cleanedParty: string;
    debit: number;
    credit: number;
  }>,
  companyName: string,
  availableLedgers: readonly CompanyLedgerCandidate[],
  options?: AiModelOptions
): Promise<Map<string, LedgerMatchResult>> {
  const resultMap = new Map<string, LedgerMatchResult>();
  if (unmappedItems.length === 0) return resultMap;

  const provider: AiProvider = options?.provider || "groq";
  const customEndpoint = options?.customEndpoint || process.env["LOCAL_LLM_ENDPOINT"] || "http://localhost:11434/v1";

  // Build compact chart of accounts context
  const ledgerContext = availableLedgers.slice(0, 150).map(l => `${l.name} [${l.parentGroup}]`).join(", ");

  const prompt = `You are a Senior Chartered Accountant managing accounts for: "${companyName}".
Chart of Accounts:
${ledgerContext}

Classify the following bank transactions into the most accurate Tally ledger from the Chart of Accounts.
Determine double-entry VoucherType ("Payment" for debit out, "Receipt" for credit in, "Contra" for cash/bank transfer).

Transactions:
${JSON.stringify(unmappedItems, null, 2)}

Output strictly valid JSON with this format:
[
  {
    "id": "transaction id",
    "suggestedLedger": "string ledger name",
    "parentGroup": "Sundry Creditors | Sundry Debtors | Indirect Expenses | Duties & Taxes | etc",
    "voucherType": "Payment" | "Receipt" | "Contra",
    "confidence": 0.88,
    "reasoning": "brief explanation"
  }
]`;

  let responseJsonText = "";

  // 1. Google Gemini Provider
  if (provider === "gemini") {
    const geminiKey = options?.apiKey || process.env["GEMINI_API_KEY"];
    if (geminiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const modelName = options?.modelName || "gemini-2.5-flash";
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });
        responseJsonText = response.text || "";
      } catch (gemErr) {
        console.warn("[Tier4LLM] Gemini inference error:", gemErr);
      }
    }
  }

  // 2. Groq Provider (Llama-3.3-70b or lightweight Llama-3.1-8b)
  else if (provider === "groq") {
    const groqKey = options?.apiKey || process.env["GROQ_API_KEY"];
    if (groqKey) {
      try {
        const { default: Groq } = await import("groq-sdk");
        const groq = new Groq({ apiKey: groqKey });
        const modelName = options?.modelName || "llama-3.3-70b-versatile";
        const completion = await groq.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: modelName,
          temperature: 0.1,
          response_format: { type: "json_object" },
        });
        responseJsonText = completion.choices[0]?.message?.content || "";
      } catch (groqErr) {
        console.warn("[Tier4LLM] Groq inference error:", groqErr);
      }
    }
  }

  // 3. Local Offline LLM or Custom BYO-LLM (Ollama / LocalAI / OpenAI compatible)
  else if (provider === "local" || provider === "custom" || provider === "openai") {
    const targetUrl = provider === "openai" ? "https://api.openai.com/v1" : customEndpoint;
    const authHeader = options?.apiKey ? `Bearer ${options.apiKey}` : (process.env["OPENAI_API_KEY"] ? `Bearer ${process.env["OPENAI_API_KEY"]}` : "Bearer local-no-key");
    const modelName = options?.modelName || (provider === "openai" ? "gpt-4o-mini" : "qwen2.5:1.5b");

    try {
      const res = await fetch(`${targetUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": authHeader,
        },
        body: JSON.stringify({
          model: modelName,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.1,
        }),
      });

      if (res.ok) {
        const json: any = await res.json();
        responseJsonText = json.choices?.[0]?.message?.content || "";
      }
    } catch (localErr) {
      console.warn(`[Tier4LLM] ${provider} endpoint connection error:`, localErr);
    }
  }

  // Parse structured output
  if (responseJsonText.trim()) {
    try {
      let parsed: any = JSON.parse(responseJsonText);
      if (!Array.isArray(parsed) && Array.isArray(parsed.transactions)) {
        parsed = parsed.transactions;
      } else if (!Array.isArray(parsed) && Array.isArray(parsed.results)) {
        parsed = parsed.results;
      }

      if (Array.isArray(parsed)) {
        for (const res of parsed) {
          if (!res.id) continue;
          const orig = unmappedItems.find(it => it.id === res.id);
          if (!orig) continue;

          const conf = typeof res.confidence === "number" ? res.confidence : 0.88;
          resultMap.set(res.id, {
            transactionId: res.id,
            originalNarration: orig.rawNarration,
            cleanedPartyName: orig.cleanedParty,
            suggestedLedgerName: res.suggestedLedger || orig.cleanedParty,
            suggestedLedgerId: null,
            parentGroup: res.parentGroup || (orig.debit > 0 ? "Sundry Creditors" : "Sundry Debtors"),
            voucherType: (res.voucherType as VoucherType) || (orig.debit > 0 ? "Payment" : "Receipt"),
            confidenceScore: Math.round(conf * 100) / 100,
            matchTier: "TIER_4_LLM",
            reasoning: res.reasoning || `Classified via ${provider.toUpperCase()} AI model.`,
            isAutoApproved: conf >= 0.90,
          });
        }
      }
    } catch (parseErr) {
      console.warn("[Tier4LLM] Error parsing LLM JSON response:", parseErr);
    }
  }

  // Fallback for any items not returned or if model was unavailable
  for (const item of unmappedItems) {
    if (!resultMap.has(item.id)) {
      const isDebit = item.debit > 0;
      resultMap.set(item.id, {
        transactionId: item.id,
        originalNarration: item.rawNarration,
        cleanedPartyName: item.cleanedParty,
        suggestedLedgerName: item.cleanedParty || "Suspense Account",
        suggestedLedgerId: null,
        parentGroup: isDebit ? "Sundry Creditors" : "Sundry Debtors",
        voucherType: isDebit ? "Payment" : "Receipt",
        confidenceScore: 0.65,
        matchTier: "UNMAPPED",
        reasoning: "Requires manual assignment (AI model not configured or offline).",
        isAutoApproved: false,
      });
    }
  }

  return resultMap;
}
