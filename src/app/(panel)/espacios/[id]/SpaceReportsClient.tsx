"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createReport, checkReportSlug, checkReportName } from "../../informes/actions";
import { slugify } from "@/lib/utils/slugify";

interface ReportRow {
  id: string;
  name: string;
  slug: string;
  current_version: number;
  auto_send_on_publish: boolean;
  created_at: string;
  report_versions: Array<{ format: string }>;
}

export default function SpaceReportsClient({
  spaceId,
  spaceSlug,
  reports: initial,
  canEdit,
}: {
  spaceId: string;
  spaceSlug: string;
  reports: ReportRow[];
  canEdit: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [pinModal, setPinModal] = useState<{ pin: string; warning: string | undefined } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open from QuickCreateModal (?openReport=1)
  useEffect(() => {
    if (searchParams.get("openReport") === "1" && canEdit) setShowForm(true);
  }, [searchParams, canEdit]);

  function handleCreated(reportId: string, pin: string, warning?: string) {
    setShowForm(false);
    setPinModal({ pin, warning });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[--color-black]">Informes ({initial.length})</h2>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 transition-colors"
          >
            + Nuevo informe
          </button>
        )}
      </div>

      {initial.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[--color-gray-light] p-8 text-center">
          <p className="text-sm text-[--color-gray-mid]">No hay informes en este espacio todavía.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {initial.map((r) => {
            const format = r.report_versions.find((_, i) => i === 0)?.format ?? "pdf";
            return (
              <Link
                key={r.id}
                href={`/informes/${r.id}`}
                className="bg-white rounded-2xl border border-[--color-gray-light] p-4 flex items-center gap-4 hover:border-[--color-brand] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[--color-gray-light] flex items-center justify-center shrink-0">
                  <span className="text-lg">{format === "pdf" ? "📄" : "🌐"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[--color-black] truncate">{r.name}</p>
                  <p className="text-xs font-mono text-[--color-gray-mid] truncate">
                    /{spaceSlug}/{r.slug}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-[--color-gray-mid]">
                  <span className="uppercase font-medium">{format}</span>
                  <span>v{r.current_version}</span>
                  {r.auto_send_on_publish && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">auto-send</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showForm && (
        <CreateReportModal
          spaceId={spaceId}
          spaceSlug={spaceSlug}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      {pinModal && (
        <PinModal
          pin={pinModal.pin}
          warning={pinModal.warning}
          onClose={() => setPinModal(null)}
        />
      )}
    </div>
  );
}

function CreateReportModal({
  spaceId,
  spaceSlug,
  onClose,
  onCreated,
}: {
  spaceId: string;
  spaceSlug: string;
  onClose: () => void;
  onCreated: (id: string, pin: string, warning?: string) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slugTaken, setSlugTaken] = useState(false);
  const [nameTaken, setNameTaken] = useState(false);
  const [autoSend, setAutoSend] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleNameChange(val: string) {
    setName(val);
    setNameTaken(false);
    if (!slugEdited) {
      const s = slugify(val);
      setSlug(s);
      if (s) {
        const { taken } = await checkReportSlug(spaceId, s);
        setSlugTaken(taken);
      }
    }
    if (val.trim()) {
      const { taken } = await checkReportName(spaceId, val.trim());
      setNameTaken(taken);
    }
  }

  async function handleSlugChange(val: string) {
    setSlugEdited(true);
    const s = slugify(val);
    setSlug(s);
    if (s) {
      const { taken } = await checkReportSlug(spaceId, s);
      setSlugTaken(taken);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["application/pdf", "text/html"].includes(file.type)) {
      setError("Solo se aceptan archivos PDF o HTML");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("El archivo no puede superar 50MB");
      return;
    }
    setError(null);
    setDocFile(file);
    setDocPreviewUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docFile) { setError("El documento es obligatorio"); return; }
    if (slugTaken) { setError("El slug ya está en uso"); return; }
    if (nameTaken) { setError("Ya existe un informe con ese nombre en este espacio"); return; }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("slug", slug);
      fd.append("auto_send", autoSend ? "true" : "false");
      fd.append("document", docFile);
      const result = await createReport(spaceId, fd);
      if ("error" in result) {
        setError(result.error);
      } else {
        onCreated(result.reportId, result.pin, result.autoSendWarning);
      }
    });
  }

  const format = docFile?.type === "application/pdf" ? "pdf" : docFile ? "html" : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">Nuevo informe</h2>
          <button onClick={onClose} className="text-[--color-gray-mid] text-xl">×</button>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[--color-gray-mid]">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Informe Mensual Junio 2026"
              className="border border-[--color-gray-light] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-brand]"
            />
            {nameTaken && <p className="text-xs text-red-500">Ya existe un informe con ese nombre en este espacio</p>}
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[--color-gray-mid]">Slug (editable antes de guardar)</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={`border rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-[--color-brand] ${slugTaken ? "border-red-400" : "border-[--color-gray-light]"}`}
            />
            <p className={`text-xs ${slugTaken ? "text-red-500" : "text-[--color-gray-mid]"}`}>
              ⚠️ URL: informes.immoral.es/{spaceSlug}/<strong>{slug || "…"}</strong>
              {slugTaken ? " — ya existe" : " — no podrá cambiarse"}
            </p>
          </div>

          {/* Document upload */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-[--color-gray-mid]">Documento principal * (PDF o HTML, máx 50MB)</label>
            <div
              className="border-2 border-dashed border-[--color-gray-light] rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-[--color-brand] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {docFile ? (
                <p className="text-sm font-medium text-[--color-black]">{docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)</p>
              ) : (
                <p className="text-sm text-[--color-gray-mid]">Arrastra o haz clic para subir</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.html,application/pdf,text/html" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Preview */}
          {docPreviewUrl && format === "pdf" && (
            <div className="border border-[--color-gray-light] rounded-xl overflow-hidden h-64">
              <iframe src={docPreviewUrl} className="w-full h-full" title="Preview PDF" />
            </div>
          )}
          {docPreviewUrl && format === "html" && (
            <div className="border border-[--color-gray-light] rounded-xl overflow-hidden h-64">
              <iframe src={docPreviewUrl} className="w-full h-full" sandbox="allow-same-origin" title="Preview HTML" />
            </div>
          )}

          {/* Auto-send toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="w-4 h-4 accent-[--color-brand]"
            />
            <span className="text-sm text-[--color-black]">
              Enviar magic link al destinatario primario al publicar
            </span>
          </label>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="text-sm text-[--color-gray-mid] px-4 py-2 rounded-xl hover:bg-[--color-gray-light]">Cancelar</button>
            <button
              type="submit"
              disabled={isPending || slugTaken || nameTaken || !docFile}
              className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
            >
              {isPending ? "Guardando…" : "Crear informe"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PinModal({ pin, warning, onClose }: { pin: string; warning: string | undefined; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyPin() {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-8 flex flex-col items-center gap-6">
        <div className="text-center">
          <h2 className="font-bold text-[--color-black] text-lg mb-1">PIN generado</h2>
          <p className="text-xs text-[--color-gray-mid]">Comparte este PIN con tu cliente. No volverá a mostrarse.</p>
        </div>

        <div
          className="text-5xl font-bold tracking-[0.4em] text-[--color-black] bg-[--color-gray-light] rounded-2xl px-8 py-5 cursor-pointer select-all"
          onClick={copyPin}
          title="Haz clic para copiar"
        >
          {pin}
        </div>

        {copied && <p className="text-xs text-green-600 font-medium">¡Copiado!</p>}

        {warning && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3 text-center border border-amber-200">
            ⚠️ {warning}
          </p>
        )}

        <button
          onClick={onClose}
          className="w-full bg-[--color-brand] text-white font-semibold rounded-xl py-3 hover:bg-blue-600 transition-colors"
        >
          Entendido — he guardado el PIN
        </button>
      </div>
    </div>
  );
}
