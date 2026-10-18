import { app, BrowserWindow } from "electron";
import type { DesktopRuntimeConfig } from "../appConfig.js";
import { hardenWindow } from "../security.js";

export async function createMainWindow(config: DesktopRuntimeConfig): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    title: config.appName,
    icon: config.iconPath,
    backgroundColor: "#eef2f3",
    webPreferences: {
      preload: config.preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webviewTag: false,
      devTools: true,
    },
  });

  // Set macOS dock icon dynamically
  if (process.platform === "darwin" && app.dock) {
    try {
      app.dock.setIcon(config.iconPath);
    } catch {
      // Ignore if dock icon is not settable
    }
  }

  hardenWindow(window);

  window.webContents.on("preload-error" as any, (_event: any, preloadPath: string, error: Error) => {
    console.error("[PRELOAD ERROR]", preloadPath, error);
  });

  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Log L${level}] ${message} (${sourceId}:${line})`);
  });

  window.once("ready-to-show", () => {
    window.setTitle("ReconcAILe Hub");
    window.show();
  });

  window.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error("Window failed to load:", errorCode, errorDescription, validatedURL);
  });

  try {
    if (config.rendererDevServerUrl) {
      await window.loadURL(config.rendererDevServerUrl);
    } else {
      await window.loadFile(config.rendererIndexPath);
    }
  } catch (err) {
    console.error("Failed to load renderer content:", err);
  }

  // Ensure window is visible even in environments where ready-to-show is delayed
  if (!window.isVisible()) {
    window.show();
  }

  return window;
}
