import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: Date;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone global trigger so any module/component or utility can dispatch toasts easily
let globalShowToast: ((message: string, type?: ToastType, title?: string, duration?: number) => void) | null = null;

export function triggerToast(message: string, type: ToastType = "info", title?: string, duration = 4000) {
  if (globalShowToast) {
    globalShowToast(message, type, title, duration);
  } else {
    console.log(`[Toast ${type.toUpperCase()}]`, message);
  }
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "info", title?: string, duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newToast: ToastItem = {
      id,
      type,
      title,
      message,
      duration,
      timestamp: new Date(),
    };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Keep maximum 5 on screen

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  useEffect(() => {
    globalShowToast = showToast;
    return () => {
      globalShowToast = null;
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Top-Right Floating Toast / Snackbar Portal Container */}
      <div
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          maxWidth: "380px",
          width: "calc(100vw - 32px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === "success";
          const isError = toast.type === "error";
          const isWarning = toast.type === "warning";

          const bg = isSuccess
            ? "rgba(16, 185, 129, 0.95)"
            : isError
            ? "rgba(239, 68, 68, 0.95)"
            : isWarning
            ? "rgba(245, 158, 11, 0.95)"
            : "rgba(15, 23, 42, 0.95)";

          return (
            <div
              key={toast.id}
              role="alert"
              style={{
                pointerEvents: "auto",
                background: bg,
                color: "#ffffff",
                borderRadius: "10px",
                padding: "12px 14px",
                boxShadow: "0 10px 25px rgba(0, 0, 0, 0.25)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                animation: "toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
              }}
            >
              <div style={{ flexShrink: 0, marginTop: "1px" }}>
                {isSuccess && <CheckCircle2 size={18} />}
                {isError && <AlertCircle size={18} />}
                {isWarning && <AlertTriangle size={18} />}
                {!isSuccess && !isError && !isWarning && <Info size={18} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {toast.title && (
                  <div style={{ fontSize: "12.5px", fontWeight: "800", marginBottom: "2px", letterSpacing: "0.2px" }}>
                    {toast.title}
                  </div>
                )}
                <div style={{ fontSize: "12px", lineHeight: "1.4", wordBreak: "break-word", opacity: 0.95 }}>
                  {toast.message}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  padding: "2px",
                  cursor: "pointer",
                  opacity: 0.8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                }}
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      toasts: [],
      showToast: triggerToast,
      removeToast: () => {},
    };
  }
  return ctx;
}
