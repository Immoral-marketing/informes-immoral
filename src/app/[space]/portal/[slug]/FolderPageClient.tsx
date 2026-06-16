"use client";

import { useState } from "react";
import Link from "next/link";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";
import { Download } from "lucide-react";

interface Attachment {
  id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
}

interface ReportFolderInfo {
  id: string;
  name: string;
  slug: string;
  updated_at: string;
  verticals: { name: string; color_hex: string } | null;
}

interface FolderPageData {
  report: ReportFolderInfo;
  attachments: Attachment[];
  clientName: string;
  clientLogoUrl: string | null;
}

// Same getIcon as AttachmentsModal
function getIcon(mime: string, className?: string) {
  if (mime.includes("pdf")) return <span className={`text-2xl ${className || ""}`}>📄</span>;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime.includes("csv")) return <span className={`text-2xl ${className || ""}`}>📊</span>;
  if (mime.includes("word") || mime.includes("document")) return <span className={`text-2xl ${className || ""}`}>📝</span>;
  if (mime.includes("presentation") || mime.includes("powerpoint")) return <span className={`text-2xl ${className || ""}`}>🖼️</span>;
  if (mime.includes("image")) return <span className={`text-2xl ${className || ""}`}>🖼️</span>;
  if (mime.includes("video")) return <span className={`text-2xl ${className || ""}`}>🎥</span>;
  if (mime.includes("audio")) return <span className={`text-2xl ${className || ""}`}>🎵</span>;
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar")) return <span className={`text-2xl ${className || ""}`}>📦</span>;
  return <span className={`text-2xl ${className || ""}`}>📎</span>;
}

export default function FolderPageClient({
  data,
  spaceSlug,
}: {
  data: FolderPageData;
  spaceSlug: string;
}) {
  const [showAttachments, setShowAttachments] = useState(false);
  const { report, attachments } = data;
  const color_hex = report.verticals?.color_hex ?? "#3b82f6";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F9FA" }}>
      <header className="h-16 shrink-0" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        <div className="max-w-6xl mx-auto px-4 h-full flex items-center justify-between">
          <CoBrandLockup
            clientLogoUrl={data.clientLogoUrl}
            titleText={data.clientName}
            variant="header"
            theme="light"
          />
          <Link
            href={`/${spaceSlug}/portal`}
            className="text-slate-500 hover:text-slate-900 transition-colors hidden sm:inline"
          >
            &larr; Volver al portal
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-8">
        <Link
          href={`/${spaceSlug}/portal`}
          className="text-slate-500 hover:text-slate-900 transition-colors sm:hidden mb-6 inline-block"
        >
          &larr; Volver al portal
        </Link>

        <div
          className="rounded-2xl p-6 flex flex-col gap-5"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
        >
          <div className="flex flex-col gap-3 items-start">
            {report.verticals && (
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  backgroundColor: `${color_hex}18`,
                  color: color_hex,
                }}
              >
                {report.verticals.name}
              </span>
            )}
            <h1 className="font-bold text-2xl text-slate-900">{report.name}</h1>
            <p className="text-sm text-slate-500">
              {new Date(report.updated_at).toLocaleDateString("es-ES", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div style={{ borderTop: "1px solid #e2e8f0" }} />

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link
              href={`/${spaceSlug}/${report.slug}`}
              className="font-semibold rounded-xl py-3 px-6 text-center transition-opacity hover:opacity-90 text-white"
              style={{ backgroundColor: "var(--brand)" }}
            >
              Ver informe
            </Link>

            {attachments.length > 0 ? (
              <button
                onClick={() => setShowAttachments(!showAttachments)}
                className="font-semibold rounded-xl py-3 px-6 text-slate-700 transition-colors"
                style={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                }}
              >
                Adjuntos ({attachments.length})
              </button>
            ) : (
              <button
                disabled
                className="font-semibold rounded-xl py-3 px-6 cursor-not-allowed"
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  color: "#94a3b8",
                }}
              >
                Sin adjuntos
              </button>
            )}
          </div>

          {showAttachments && attachments.length > 0 && (
            <div className="pt-4 mt-2" style={{ borderTop: "1px solid #e2e8f0" }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/reports/attachments/${a.id}`}
                    download={a.filename}
                    className="rounded-xl p-3 flex flex-col gap-2 transition-colors cursor-pointer group"
                    style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
                  >
                    <div className="flex justify-center w-full py-2">
                      <div className="w-8 h-8 flex items-center justify-center">
                        {getIcon(a.mime_type)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full mt-auto">
                      <div className="flex flex-col truncate pr-2">
                        <span className="text-xs text-slate-700 truncate font-medium" title={a.filename}>
                          {a.filename}
                        </span>
                        <span className="text-xs text-slate-400">
                          {Math.round(a.size_bytes / 1024)} KB
                        </span>
                      </div>
                      <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
