import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Loader2, Download } from "lucide-react";

interface PdfCanvasViewerProps {
  file?: File | null;
  url?: string | null;
  password?: string | null;
}

export const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({ file, url, password }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [promptPassword, setPromptPassword] = useState<boolean>(false);
  const [enteredPassword, setEnteredPassword] = useState<string>("");
 
   // Original File / Document State for Proofreading & Side-by-Side View
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [originalFileUrl, setOriginalFileUrl] = useState<string | null>(null);
  const [originalFileType, setOriginalFileType] = useState<"pdf" | "csv" | "json" | "xml" | "image" | "other">("pdf");
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const passwordCallbackRef = useRef<((pw: string) => void) | null>(null);

  const [customPassword, setCustomPassword] = useState<string | null>(null);
  const effectivePassword = password || customPassword;

  // Load document
  useEffect(() => {
    let isCancelled = false;

    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      setPromptPassword(false);
      setCurrentPage(1);

      try {
        let pdfData: Uint8Array | null = null;

        if (file) {
          const buffer = await file.arrayBuffer();
          pdfData = new Uint8Array(buffer);
        } else if (url) {
          const res = await fetch(url);
          const buffer = await res.arrayBuffer();
          pdfData = new Uint8Array(buffer);
        }

        if (!pdfData || pdfData.length === 0) {
          throw new Error("No PDF data provided or file is empty.");
        }

        // Dynamically import pdfjs-dist and its local bundled worker
        const [pdfjsLib, workerModule] = await Promise.all([
          import("pdfjs-dist/build/pdf.mjs"),
          import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
        ]);
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
        }

        const loadingTask = pdfjsLib.getDocument({
          data: pdfData,
          password: effectivePassword || undefined,
        });

        loadingTask.onPassword = (updatePassword: (pw: string) => void, reason: number) => {
          if (effectivePassword) {
            updatePassword(effectivePassword);
            return;
          }
          passwordCallbackRef.current = updatePassword;
          setPromptPassword(true);
          setLoading(false);
        };

        const pdf = await loadingTask.promise;

        if (!isCancelled) {
          pdfDocRef.current = pdf;
          setNumPages(pdf.numPages);
          setLoading(false);
          setPromptPassword(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("PDF load error:", err);
          const msg = String(err?.message || "");
          if (err?.name === "PasswordException" || /password/i.test(msg) || /invalid root reference/i.test(msg)) {
            setPromptPassword(true);
            setError(null);
          } else {
            setError(err?.message || "Failed to parse PDF document.");
          }
          setLoading(false);
        }
      }
    };

    if (file || url) {
      loadDocument();
    } else {
      setLoading(false);
      setError("No document selected.");
    }

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
      }
    };
  }, [file, url, effectivePassword]);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!enteredPassword) return;
    if (passwordCallbackRef.current) {
      setLoading(true);
      setPromptPassword(false);
      passwordCallbackRef.current(enteredPassword);
    } else {
      setCustomPassword(enteredPassword);
      setPromptPassword(false);
    }
  };

  // Render current page onto canvas
  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!pdfDocRef.current || !canvasRef.current || numPages === 0) return;

      try {
        if (renderTaskRef.current) {
          try {
            await renderTaskRef.current.cancel();
          } catch {
            // ignore
          }
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error("Error rendering PDF page:", err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, scale, numPages]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--surface-2)",
        overflow: "hidden",
      }}
    >
      {/* Viewer Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          fontSize: "12px",
          userSelect: "none",
        }}
      >
        {/* Pagination Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            disabled={currentPage <= 1 || loading}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: "28px",
              height: "28px",
              minWidth: "28px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: currentPage <= 1 ? "var(--muted)" : "var(--text)",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              opacity: currentPage <= 1 ? 0.4 : 1,
            }}
            title="Previous Page"
          >
            <ChevronLeft size={16} strokeWidth={2.5} style={{ display: "block" }} />
          </button>
          <span style={{ fontSize: "11.5px", fontWeight: "700", color: "var(--text)", padding: "0 4px" }}>
            Page {numPages > 0 ? currentPage : 0} of {numPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= numPages || loading}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: "28px",
              height: "28px",
              minWidth: "28px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: currentPage >= numPages ? "var(--muted)" : "var(--text)",
              cursor: currentPage >= numPages ? "not-allowed" : "pointer",
              opacity: currentPage >= numPages ? 0.4 : 1,
            }}
            title="Next Page"
          >
            <ChevronRight size={16} strokeWidth={2.5} style={{ display: "block" }} />
          </button>
        </div>
              
        {/* Zoom Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, +(s - 0.15).toFixed(2)))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: "28px",
              height: "28px",
              minWidth: "28px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer",
            }}
            title="Zoom Out"
          >
            <ZoomOut size={15} strokeWidth={2.5} style={{ display: "block" }} />
          </button>
          <span style={{ minWidth: "40px", textAlign: "center", fontSize: "11px", fontWeight: "700", color: "var(--muted)" }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(3.0, +(s + 0.15).toFixed(2)))}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: "28px",
              height: "28px",
              minWidth: "28px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer",
            }}
            title="Zoom In"
          >
            <ZoomIn size={15} strokeWidth={2.5} style={{ display: "block" }} />
          </button>
          <button
            type="button"
            onClick={() => setScale(1.2)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              width: "28px",
              height: "28px",
              minWidth: "28px",
              borderRadius: "6px",
              border: "1px solid var(--line)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer",
            }}
            title="Reset Zoom"
          >
            <RotateCcw size={14} strokeWidth={2.5} style={{ display: "block" }} />
          </button>
        </div>
          {originalFileUrl && (
                                <a
                                  href={originalFileUrl}
                                  download={uploadedFile?.name || `source_document.${originalFileType}`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    color: "var(--accent)",
                                    textDecoration: "none",
                                    padding: "3px 8px",
                                    borderRadius: "5px",
                                    background: "var(--surface-2)",
                                    border: "1px solid var(--line)",
                                  }}
                                >
                                  <Download size={11} /> Download File
                                </a>
                              )}
      </div>

      {/* Main Canvas Scroll Area */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "16px",
          background: "var(--surface-2)",
          boxSizing: "border-box",
        }}
      >
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", margin: "auto" }}>
            <Loader2 size={24} className="spin" style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Loading PDF document...</span>
          </div>
        )}

        {promptPassword && (
          <form
            onSubmit={handlePasswordSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              margin: "auto",
              padding: "24px",
              background: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--line)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              maxWidth: "320px",
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ padding: "10px", borderRadius: "50%", background: "var(--accent-subtle)", color: "var(--accent)" }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "var(--text)" }}>Password Protected PDF</h4>
              <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "var(--muted)" }}>Enter password to view statement pages</p>
            </div>
            <input
              type="password"
              placeholder="PDF Password"
              value={enteredPassword}
              onChange={(e) => setEnteredPassword(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--text)",
                fontSize: "13px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
            <button
              type="submit"
              className="primary"
              style={{
                width: "100%",
                padding: "8px 14px",
                fontSize: "12px",
                fontWeight: "700",
                justifyContent: "center",
              }}
            >
              Unlock Preview
            </button>
          </form>
        )}

        {error && !promptPassword && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              margin: "auto",
              padding: "20px",
              maxWidth: "360px",
              textAlign: "center",
            }}
          >
            <AlertTriangle size={24} style={{ color: "#ef4444" }} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)" }}>Unable to preview PDF</span>
            <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>{error}</span>
          </div>
        )}

        {!loading && !error && !promptPassword && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
              minWidth: "min-content",
              minHeight: "min-content",
              width: "100%",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
                borderRadius: "4px",
                background: "#ffffff",
                flexShrink: 0,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
