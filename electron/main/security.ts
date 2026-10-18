import { app, BrowserWindow, shell, session } from "electron";

const allowedDevelopmentOrigins = new Set(["http://127.0.0.1:5173"]);

export function installSecurityGuards(): void {
  app.on("web-contents-created", (_event, contents) => {
    contents.on("will-navigate", (event, url) => {
      if (!isNavigationAllowed(url)) {
        event.preventDefault();
      }
    });

    contents.setWindowOpenHandler(({ url }) => {
      if (isExternalHttpUrl(url)) {
        void shell.openExternal(url);
      }

      return { action: "deny" };
    });
  });
}

export function applySessionSecurityPolicy(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [
          [
            "default-src 'self'",
            "script-src 'self'",
            "worker-src 'self' blob:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "img-src 'self' data: blob:",
            "font-src 'self' data: https://fonts.gstatic.com",
            "connect-src 'self' blob: http://127.0.0.1:5173",
            "object-src 'none'",
            "base-uri 'self'",
            "frame-ancestors 'none'",
          ].join("; "),
        ],
      },
    });
  });
}

export function hardenWindow(window: BrowserWindow): void {
  window.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
}

function isNavigationAllowed(url: string): boolean {
  if (url.startsWith("file://")) {
    return true;
  }

  return allowedDevelopmentOrigins.has(new URL(url).origin);
}

function isExternalHttpUrl(url: string): boolean {
  const parsed = new URL(url);
  return parsed.protocol === "https:" || parsed.protocol === "http:";
}
