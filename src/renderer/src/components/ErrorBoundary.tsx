import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertOctagon, RefreshCw, ShieldAlert } from "lucide-react";

type Props = {
  readonly children: ReactNode;
};

type State = {
  readonly hasError: boolean;
  readonly error: Error | null;
};

/**
 * Audit Item #80: App Error Boundary Screen
 * Prevents full React UI crashes by catching render exceptions and presenting a clean desktop recovery screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught UI error:", error, errorInfo);
  }

  public handleReload = (): void => {
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            height: "100vh",
            width: "100vw",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "#f8fafc",
            fontFamily: "system-ui, -apple-system, sans-serif",
            padding: "24px",
          }}
        >
          <div
            style={{
              maxHeight: "480px",
              maxWidth: "520px",
              width: "100%",
              background: "#1e293b",
              borderRadius: "16px",
              border: "1px solid rgba(239,68,68,0.3)",
              padding: "32px",
              textAlign: "center",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "inline-flex", padding: "16px", background: "rgba(239,68,68,0.1)", borderRadius: "16px", color: "#ef4444", marginBottom: "16px" }}>
              <ShieldAlert size={42} />
            </div>

            <h2 style={{ fontSize: "20px", fontWeight: "800", margin: "0 0 8px 0" }}>Application Interface Exception</h2>
            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "0 0 20px 0", lineHeight: "1.5" }}>
              An unexpected render error occurred in the workspace. Your database transactions and sync commands remain safe in SQLite storage.
            </p>

            {this.state.error && (
              <div
                style={{
                  background: "#0f172a",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontFamily: "monospace",
                  color: "#f87171",
                  textAlign: "left",
                  overflow: "auto",
                  marginBottom: "24px",
                  maxHeight: "150px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  whiteSpace: "pre-wrap"
                }}
              >
                {this.state.error.stack || this.state.error.toString()}
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 24px",
                background: "#0d9488",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "700",
                cursor: "pointer",
                transition: "background 0.15s ease",
              }}
            >
              <RefreshCw size={16} /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
