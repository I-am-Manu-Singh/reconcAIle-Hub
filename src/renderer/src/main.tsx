import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./modules/App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastNotification";
import "./styles.css";

// Polyfill Uint8Array.prototype.toHex for pdfjs-dist compatibility in Chromium/Electron
if (typeof Uint8Array !== "undefined" && !(Uint8Array.prototype as any).toHex) {
  (Uint8Array.prototype as any).toHex = function () {
    return Array.from(this)
      .map((b: any) => b.toString(16).padStart(2, "0"))
      .join("");
  };
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Renderer root element was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
