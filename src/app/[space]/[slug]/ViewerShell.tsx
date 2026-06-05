"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";
import AccessModal from "./AccessModal";
import PdfViewer from "./PdfViewer";
import AttachmentsModal from "./AttachmentsModal";

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
  client_name: string;
  client_logo_signed_url: string | null;
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
        <AccessModal 
          reportId={report.id} 
          reportName={report.name} 
          clientName={report.client_name}
          clientLogoUrl={report.client_logo_signed_url}
          onAuthenticated={handleAuthenticated} 
          linkExpired={linkExpired} 
        />
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
        <div className="flex items-center min-w-0">
          <CoBrandLockup
            clientLogoUrl={report.client_logo_signed_url}
            titleText={report.name}
            variant="viewer"
            theme="dark"
          />
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
          </div>
        )}
      </header>

      {/* Document area */}
      <main className="flex-1 overflow-hidden">
        {loading && (
          <div className="h-full flex flex-col items-center justify-center gap-6" style={{ backgroundColor: "#111111" }}>
            <div style={{ animation: "brandPhraseIn 320ms cubic-bezier(0.23, 1, 0.32, 1) both" }}>
              <CoBrandLockup
                clientLogoUrl={report.client_logo_signed_url ?? null}
                titleText={report.name}
                variant="loader"
                theme="dark"
              />
            </div>
            <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.5)", animation: "brandPhraseIn 320ms cubic-bezier(0.23, 1, 0.32, 1) both 100ms" }}>
              Cargando documento…
            </p>
          </div>
        )}

        {error && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <p className="text-sm" style={{ color: "#5E5E5E" }}>{error}</p>
            <button
              onClick={loadDocument}
              className="text-sm rounded-xl px-4 py-2 transition-colors"
              style={{ color: "var(--brand)", border: "1px solid var(--brand)" }}
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

      {showAttachments && (
        <AttachmentsModal 
          attachments={report.attachments}
          clientLogoUrl={report.client_logo_signed_url}
          clientName={report.client_name}
          onClose={() => setShowAttachments(false)}
        />
      )}
    </div>
  );
}
