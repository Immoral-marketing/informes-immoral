"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";
import AccessModal from "./AccessModal";
import PdfViewer from "./PdfViewer";
import AttachmentsModal from "./AttachmentsModal";
import { Paperclip } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F8F9FA" }}>
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
    <div className="flex flex-col h-screen" style={{ backgroundColor: "#F8F9FA" }}>
      {/* Viewer Header */}
      <header
        className="h-16 shrink-0 flex items-center justify-between px-6 gap-4"
        style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}
      >
        <div className="flex items-center min-w-0">
          <CoBrandLockup
            clientLogoUrl={report.client_logo_signed_url}
            titleText={report.name}
            variant="viewer"
            theme="light"
          />
        </div>

        {report.attachments.length > 0 && (
          <div className="relative shrink-0">
            <button
              onClick={() => setShowAttachments((v) => !v)}
              className="flex items-center gap-2 text-sm font-medium transition-all rounded-xl px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-sm"
            >
              <Paperclip className="w-4 h-4 text-slate-500" />
              <span>{report.attachments.length} {report.attachments.length === 1 ? "adjunto" : "adjuntos"}</span>
            </button>
          </div>
        )}
      </header>

      {/* Document area */}
      <main className="flex-1 overflow-hidden">
        {loading && (
          <div className="h-full flex flex-col items-center justify-center gap-6" style={{ backgroundColor: "#F8F9FA" }}>
            <div style={{ animation: "brandPhraseIn 320ms cubic-bezier(0.23, 1, 0.32, 1) both" }}>
              <CoBrandLockup
                clientLogoUrl={report.client_logo_signed_url ?? null}
                titleText={report.name}
                variant="loader"
                theme="light"
              />
            </div>
            <p className="text-sm font-medium" style={{ color: "rgba(15,23,42,0.6)", animation: "brandPhraseIn 320ms cubic-bezier(0.23, 1, 0.32, 1) both 100ms" }}>
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
