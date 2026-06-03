"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  addVersion, addAttachment, deleteAttachment,
  regeneratePin, deleteReport
} from "../actions";
import SendMagicLinkModal from "./SendMagicLinkModal";

interface Version {
  id: string; version_number: number; format: string;
  storage_path: string; size_bytes: number | null;
  created_at: string; profiles: { full_name: string | null } | null;
}

interface Attachment {
  id: string; filename: string; mime_type: string; storage_path: string;
  size_bytes: number; display_order: number; created_at: string;
  signed_url: string | null;
}

interface Report {
  id: string; name: string; slug: string; current_version: number;
  auto_send_on_publish: boolean; created_by: string; space_id: string;
  client_spaces: { slug: string; clients: { id: string; name: string } | null; verticals: { name: string } | null } | null;
}

export default function ReportManageClient({
  report, versions, attachments, activeVersionUrl, fullUrl, currentUserId, isAdmin,
}: {
  report: Report; versions: Version[]; attachments: Attachment[];
  activeVersionUrl: string | null; fullUrl: string;
  currentUserId: string; isAdmin: boolean;
}) {
  const [atts, setAtts] = useState(attachments);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(
    versions.find((v) => v.version_number === report.current_version) ?? null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(activeVersionUrl);
  const [pinModal, setPinModal] = useState<string | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const docFileRef = useRef<HTMLInputElement>(null);
  const attFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const canEdit = isAdmin || report.created_by === currentUserId;
  const activeVersion = versions.find((v) => v.version_number === report.current_version);

  function copyUrl() {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleVersionClick(v: Version) {
    setPreviewVersion(v);
    setPreviewUrl(null); // will need signed URL — for now show loading
  }

  function handleNewVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("document", file);
      const result = await addVersion(report.id, fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  function handleAddAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const result = await addAttachment(report.id, fd);
      if ("error" in result) setError(result.error);
      else router.refresh();
    });
  }

  function handleDeleteAttachment(att: Attachment) {
    if (!confirm(`¿Eliminar el adjunto "${att.filename}"?`)) return;
    startTransition(async () => {
      const result = await deleteAttachment(att.id, report.id);
      if ("error" in result) setError(result.error);
      else setAtts((prev) => prev.filter((a) => a.id !== att.id));
    });
  }

  function handleRegeneratePin() {
    if (!confirm("¿Regenerar el PIN? Esto invalidará todas las sesiones y magic links activos de este informe.")) return;
    startTransition(async () => {
      const result = await regeneratePin(report.id);
      if ("error" in result) setError(result.error);
      else setPinModal(result.pin);
    });
  }

  function handleDeleteReport() {
    if (!confirm(`¿Eliminar el informe "${report.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteReport(report.id);
      if ("error" in result) setError(result.error);
      else router.push(`/espacios/${report.space_id}`);
    });
  }

  return (
    <>
      {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">{error}</p>}

      {/* Header */}
      <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-foreground">{report.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs text-muted-foreground">{fullUrl}</span>
              <button onClick={copyUrl} className="text-xs text-primary hover:underline shrink-0">
                {copied ? "✓ Copiado" : "Copiar"}
              </button>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className="text-xs bg-muted text-muted-foreground rounded-full px-3 py-1">
              v{report.current_version} · {activeVersion?.format?.toUpperCase()}
            </span>
          </div>
        </div>
      </section>

      {/* Version history */}
      <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">Versiones</h2>
          {canEdit && (
            <button
              onClick={() => docFileRef.current?.click()}
              disabled={isPending}
              className="text-sm text-primary hover:underline disabled:opacity-40"
            >
              + Subir nueva versión
            </button>
          )}
        </div>
        <input ref={docFileRef} type="file" accept=".pdf,.html,application/pdf,text/html" className="hidden" onChange={handleNewVersion} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Version list */}
          <ul className="flex flex-col gap-2">
            {versions.map((v) => (
              <li
                key={v.id}
                onClick={() => handleVersionClick(v)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                  previewVersion?.id === v.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  v{v.version_number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">Versión {v.version_number}</span>
                    {v.version_number === report.current_version && (
                      <span className="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full">Activa</span>
                    )}
                    <span className="text-xs text-muted-foreground uppercase">{v.format}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {v.profiles?.full_name ?? "—"} · {new Date(v.created_at).toLocaleDateString("es-ES")}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Preview pane */}
          {activeVersionUrl && (
            <div className="border border-border rounded-xl overflow-hidden h-64 lg:h-full min-h-48">
              <iframe
                src={previewUrl ?? activeVersionUrl}
                className="w-full h-full"
                sandbox={activeVersion?.format === "html" ? "allow-same-origin" : undefined}
                title="Vista previa"
              />
            </div>
          )}
        </div>
      </section>

      {/* Attachments */}
      <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">Adjuntos</h2>
          {canEdit && (
            <button
              onClick={() => attFileRef.current?.click()}
              disabled={isPending}
              className="text-sm text-primary hover:underline disabled:opacity-40"
            >
              + Añadir adjunto
            </button>
          )}
        </div>
        <input ref={attFileRef} type="file" className="hidden" onChange={handleAddAttachment} />

        {atts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay adjuntos.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {atts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{a.filename}</p>
                  <p className="text-xs text-muted-foreground">{(a.size_bytes / 1024).toFixed(0)} KB</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {a.signed_url && (
                    <a href={a.signed_url} download={a.filename} className="text-xs text-primary hover:underline">
                      Descargar
                    </a>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => handleDeleteAttachment(a)}
                      disabled={isPending}
                      className="text-xs text-destructive/80 hover:text-destructive disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Access section */}
      {canEdit && (
        <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
          <h2 className="font-bold text-foreground">Acceso</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRegeneratePin}
              disabled={isPending}
              className="text-sm border border-border rounded-xl px-4 py-2 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              🔑 Regenerar PIN
            </button>
            <button
              onClick={() => setShowSendModal(true)}
              className="text-sm border border-border rounded-xl px-4 py-2 hover:border-primary hover:text-primary transition-colors"
            >
              📨 Enviar al cliente
            </button>
            <button
              onClick={handleDeleteReport}
              disabled={isPending}
              className="text-sm border border-destructive/20 text-destructive rounded-xl px-4 py-2 hover:bg-destructive/10 transition-colors disabled:opacity-40 ml-auto"
            >
              Eliminar informe
            </button>
          </div>
        </section>
      )}

      {showSendModal && (
        <SendMagicLinkModal reportId={report.id} onClose={() => setShowSendModal(false)} />
      )}

      {/* PIN Modal */}
      {pinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="font-bold text-lg">Nuevo PIN generado</h2>
              <p className="text-xs text-muted-foreground mt-1">Comparte este PIN con tu cliente. No volverá a mostrarse.</p>
            </div>
            <div className="text-5xl font-bold tracking-[0.4em] bg-muted rounded-2xl px-8 py-5 select-all cursor-pointer"
              onClick={() => { navigator.clipboard.writeText(pinModal); }}>
              {pinModal}
            </div>
            <button onClick={() => setPinModal(null)} className="w-full bg-primary text-white font-semibold rounded-xl py-3 hover:bg-primary/90">
              Entendido — he guardado el PIN
            </button>
          </div>
        </div>
      )}
    </>
  );
}
