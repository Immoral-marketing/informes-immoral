"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import AccessModal from "./AccessModal";
import PdfViewer from "./PdfViewer";

interface Attachment {
  id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
}

interface ReportInfo {
  id: string;
  name: string;
  slug: string;
  current_version: number;
  space_id: string;
  attachments: Attachment[];
}

type DocFormat = "pdf" | "html" | null;

export default function ViewerShell({
  report,
  sessionValid,
  linkExpired,
}: {
  report: ReportInfo;
  sessionValid: boolean;
  linkExpired: boolean;
}) {
  const [authenticated, setAuthenticated] = useState(sessionValid);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docFormat, setDocFormat] = useState<DocFormat>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);

  useEffect(() => {
    if (authenticated && !docUrl) {
      loadDocument();
    }
  }, [authenticated]);

  async function loadDocument() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/content?report_id=${report.id}&version=${report.current_version}`);
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (!res.ok) {
        setError("No se pudo cargar el documento. Inténtalo de nuevo.");
        return;
      }
      const contentType = res.headers.get("content-type") ?? "";
      const format: DocFormat = contentType.includes("pdf") ? "pdf" : "html";
      setDocFormat(format);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDocUrl(url);
    } catch {
      setError("Error de red al cargar el documento.");
    } finally {
      setLoading(false);
    }
  }

  function handleAuthenticated() {
    setAuthenticated(true);
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#111111" }}>
        <AccessModal reportId={report.id} reportName={report.name} onAuthenticated={handleAuthenticated} linkExpired={linkExpired} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: "#111111" }}>
      {/* Viewer Header */}
      <header
        className="h-12 shrink-0 flex items-center justify-between px-4 gap-4"
        style={{ backgroundColor: "#111111", borderBottom: "1px solid #2e2e2e" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <a href="https://immoral.marketing" target="_blank" rel="noreferrer" className="shrink-0">
            <Image src="/immoral-logo-blanco.png" alt="Immoral" width={72} height={20} className="object-contain" />
          </a>
          <span className="text-xs" style={{ color: "#2e2e2e" }}>|</span>
          <span className="text-white text-sm font-medium truncate">{report.name}</span>
        </div>

        {report.attachments.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAttachments((v) => !v)}
              className="flex items-center gap-1.5 text-xs transition-colors rounded-lg px-3 py-1.5"
              style={{ color: "#5E5E5E", border: "1px solid #3a3a3a" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#5E5E5E"; }}
            >
              📎 {report.attachments.length} adjunto{report.attachments.length !== 1 ? "s" : ""}
            </button>
            {showAttachments && (
              <div
                className="absolute right-0 top-10 rounded-xl shadow-xl w-64 py-1 z-50"
                style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
              >
                {report.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/reports/attachments/${a.id}`}
                    download={a.filename}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                    style={{ color: "#D8D8D8" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#242424"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    onClick={() => setShowAttachments(false)}
                  >
                    <span className="text-sm text-white truncate flex-1">{a.filename}</span>
                    <span className="text-xs shrink-0" style={{ color: "#5E5E5E" }}>{(a.size_bytes / 1024).toFixed(0)} KB</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Document area */}
      <main className="flex-1 overflow-hidden">
        {loading && (
          <div className="h-full flex items-center justify-center">
            <div className="text-sm" style={{ color: "#5E5E5E" }}>Cargando documento…</div>
          </div>
        )}

        {error && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <p className="text-sm" style={{ color: "#5E5E5E" }}>{error}</p>
            <button
              onClick={loadDocument}
              className="text-sm rounded-xl px-4 py-2 transition-colors"
              style={{ color: "#3980E4", border: "1px solid #3980E4" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(57,128,228,0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              Reintentar
            </button>
          </div>
        )}

        {docUrl && docFormat === "pdf" && (
          <PdfViewer url={docUrl} filename={report.name} />
        )}

        {docUrl && docFormat === "html" && (
          <iframe
            src={docUrl}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts"
            title={report.name}
          />
        )}
      </main>
    </div>
  );
}
