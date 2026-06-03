"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createReport, checkReportSlug, checkReportName } from "../../informes/actions";
import { slugify } from "@/lib/utils/slugify";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { User, Phone, Mail, MessageSquare, Calendar, UserPlus, ExternalLink } from "lucide-react";

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
  contactData,
}: {
  spaceId: string;
  spaceSlug: string;
  reports: ReportRow[];
  canEdit: boolean;
  contactData: {
    contact_name: string | null;
    contact_phone: string | null;
    contact_whatsapp: string | null;
    email: string | null;
    created_by_name: string;
    created_at: string;
  };
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
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* ── Columna Izquierda: Informes ──────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">Informes ({initial.length})</h2>
          {canEdit && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl font-semibold">
              + Nuevo informe
            </Button>
          )}
        </div>

        {initial.length === 0 ? (
          <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-sm text-muted-foreground">No hay informes en este espacio todavía.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {initial.map((r) => {
              const format = r.report_versions.find((_, i) => i === 0)?.format ?? "pdf";
              const date = new Date(r.created_at).toLocaleDateString("es-ES", {
                day: "numeric", month: "short", year: "numeric",
              });
              return (
                <Card key={r.id} className="p-4 flex items-center justify-between gap-4 hover:border-primary/50 transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <span className="text-lg">{format === "pdf" ? "📄" : "🌐"}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{r.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded uppercase font-semibold">
                          {format}
                        </span>
                        <span>v{r.current_version}</span>
                        <span>{date}</span>
                        <span className="font-mono text-[10px]">/{spaceSlug}/{r.slug}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 h-8">
                      <Link href={`/informes/${r.id}`}>
                        Gestionar <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Columna Derecha: Datos de Contacto ───────────────────────────────── */}
      <aside>
        <Card className="p-6 flex flex-col gap-6">
          <h2 className="font-bold text-foreground">Datos de Contacto</h2>
          <div className="flex flex-col gap-4 text-sm text-muted-foreground">
            {contactData.contact_name && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">{contactData.contact_name}</span>
              </div>
            )}
            {contactData.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{contactData.email}</span>
              </div>
            )}
            {contactData.contact_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{contactData.contact_phone}</span>
              </div>
            )}
            {contactData.contact_whatsapp && (
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>{contactData.contact_whatsapp}</span>
              </div>
            )}

            {(!contactData.contact_name && !contactData.email && !contactData.contact_phone && !contactData.contact_whatsapp) && (
              <p className="italic">No hay datos de contacto registrados para este cliente.</p>
            )}

            <div className="h-px bg-border my-1" />

            <div className="flex items-center gap-3">
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Creado por: <span className="font-medium text-foreground">{contactData.created_by_name}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Fecha: {contactData.created_at}</span>
            </div>
          </div>
        </Card>
      </aside>

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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo informe</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Nombre *</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Informe Mensual Junio 2026"
              className="rounded-xl"
            />
            {nameTaken && <p className="text-xs text-destructive">Ya existe un informe con ese nombre en este espacio</p>}
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Slug (editable antes de guardar)</Label>
            <Input
              type="text"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              className={`rounded-xl font-mono ${slugTaken ? "border-destructive/50" : ""}`}
            />
            <p className={`text-xs ${slugTaken ? "text-destructive" : "text-muted-foreground"}`}>
              ⚠️ URL: informes.immoral.es/{spaceSlug}/<strong>{slug || "…"}</strong>
              {slugTaken ? " — ya existe" : " — no podrá cambiarse"}
            </p>
          </div>

          {/* Document upload */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Documento principal * (PDF o HTML, máx 50MB)</Label>
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {docFile ? (
                <p className="text-sm font-medium text-foreground">{docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)</p>
              ) : (
                <p className="text-sm text-muted-foreground">Arrastra o haz clic para subir</p>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.html,application/pdf,text/html" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Preview */}
          {docPreviewUrl && format === "pdf" && (
            <div className="border border-border rounded-xl overflow-hidden h-64">
              <iframe src={docPreviewUrl} className="w-full h-full" title="Preview PDF" />
            </div>
          )}
          {docPreviewUrl && format === "html" && (
            <div className="border border-border rounded-xl overflow-hidden h-64">
              <iframe src={docPreviewUrl} className="w-full h-full" sandbox="allow-same-origin" title="Preview HTML" />
            </div>
          )}

          {/* Auto-send toggle */}
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="autoSend"
              checked={autoSend}
              onCheckedChange={(checked) => setAutoSend(checked as boolean)}
            />
            <Label htmlFor="autoSend" className="text-sm font-medium leading-none cursor-pointer">
              Enviar magic link al destinatario primario al publicar
            </Label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button
              type="submit"
              disabled={isPending || slugTaken || nameTaken || !docFile}
              className="rounded-xl font-semibold"
            >
              {isPending ? "Guardando…" : "Crear informe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-2xl flex flex-col items-center p-8 gap-6 [&>button]:hidden">
        <DialogHeader className="w-full text-center">
          <DialogTitle className="text-xl">PIN generado</DialogTitle>
          <DialogDescription className="text-xs">
            Comparte este PIN con tu cliente. No volverá a mostrarse.
          </DialogDescription>
        </DialogHeader>

        <div
          className="text-5xl font-bold tracking-[0.4em] text-foreground bg-muted rounded-2xl px-8 py-5 cursor-pointer select-all w-full text-center"
          onClick={copyPin}
          title="Haz clic para copiar"
        >
          {pin}
        </div>

        {copied && <p className="text-xs text-green-600 font-medium h-2">¡Copiado!</p>}
        {!copied && <div className="h-2" />}

        {warning && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3 text-center border border-amber-200 w-full">
            ⚠️ {warning}
          </p>
        )}

        <Button
          onClick={onClose}
          className="w-full rounded-xl py-6 font-semibold text-base mt-2"
        >
          Entendido — he guardado el PIN
        </Button>
      </DialogContent>
    </Dialog>
  );
}
