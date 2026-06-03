"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfViewer({ 
  url, 
  filename,
  mode = "default",
  onPageChange,
  onScrollChange,
  forcedPage,
  forcedScrollRatio
}: { 
  url: string; 
  filename?: string;
  mode?: "default" | "presenter" | "viewer";
  onPageChange?: (page: number) => void;
  onScrollChange?: (ratio: number) => void;
  forcedPage?: number | undefined;
  forcedScrollRatio?: number | undefined;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDoc, setPdfDoc] = useState<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  const renderingRef = useRef(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (forcedPage && forcedPage !== page) {
      setPage(forcedPage);
    }
  }, [forcedPage, page]);

  useEffect(() => {
    if (forcedScrollRatio !== undefined && containerRef.current && mode === "viewer") {
      const el = containerRef.current;
      const targetY = forcedScrollRatio * Math.max(0, el.scrollHeight - el.clientHeight);
      el.scrollTo({ top: targetY, behavior: "auto" });
    }
  }, [forcedScrollRatio, mode]);

  useEffect(() => {
    let cancelled = false;
    async function loadPdf() {
      const { loadPdfFromBytes } = await import("@/lib/pdf/loader");
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const doc = await loadPdfFromBytes(new Uint8Array(buf));
      if (cancelled) return;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
      setLoading(false);
    }
    loadPdf();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current) return;
    renderPage(pdfDoc, page);
    if (onPageChange && mode === "presenter") {
      onPageChange(page);
    }
  }, [pdfDoc, page]);

  async function renderPage(doc: import("pdfjs-dist").PDFDocumentProxy, pageNum: number) {
    if (!canvasRef.current || !containerRef.current) return;
    renderingRef.current = true;

    const pdfPage = await doc.getPage(pageNum);
    const containerWidth = containerRef.current.clientWidth;
    const viewport = pdfPage.getViewport({ scale: 1 });
    const scale = containerWidth / viewport.width;
    const scaledViewport = pdfPage.getViewport({ scale });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await pdfPage.render({ canvasContext: ctx, viewport: scaledViewport, canvas }).promise;
    renderingRef.current = false;
  }

  const handleScroll = () => {
    if (mode === "presenter" && onScrollChange && containerRef.current) {
      const el = containerRef.current;
      const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
      onScrollChange(ratio);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Controls */}
      {mode !== "viewer" && (
        <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="text-white/60 hover:text-white disabled:opacity-30 text-sm px-3 py-1.5 border border-white/10 rounded-lg transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-white/60 text-sm">
            {loading ? "…" : `${page} / ${totalPages}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="text-white/60 hover:text-white disabled:opacity-30 text-sm px-3 py-1.5 border border-white/10 rounded-lg transition-colors"
          >
            Siguiente →
          </button>
        </div>

        {/* Mobile download fallback */}
        {filename && (
          <a
            href={url}
            download={filename}
            className="text-xs text-primary border border-primary/30 rounded-lg px-3 py-1.5 hover:bg-primary/10 transition-colors sm:hidden"
          >
            Descargar PDF
          </a>
        )}
      </div>
      )}

      {/* Canvas */}
      <div 
        ref={containerRef} 
        onScroll={handleScroll}
        className={`flex-1 overflow-auto flex justify-center py-4 px-2 ${mode === "viewer" ? "pointer-events-none" : ""}`}
      >
        {loading ? (
          <div className="flex items-center text-white/40 text-sm">Cargando PDF…</div>
        ) : (
          <canvas
            ref={canvasRef}
            className="shadow-2xl max-w-full"
          />
        )}
      </div>
    </div>
  );
}
