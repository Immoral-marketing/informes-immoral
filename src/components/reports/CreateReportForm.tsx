"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { checkReportSlug, checkReportName } from "@/app/(panel)/informes/actions";
import { createReportUnified } from "@/app/(panel)/clientes/actions";
import { slugify } from "@/lib/utils/slugify";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function CreateReportForm({
  clientId,
  verticalId,
  clientSlug,
  onClose,
  onCreated,
}: {
  clientId: string;
  verticalId: string;
  clientSlug: string;
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
  const [isSlowUpload, setIsSlowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPending) { setIsSlowUpload(false); return; }
    const t = setTimeout(() => setIsSlowUpload(true), 4000);
    return () => clearTimeout(t);
  }, [isPending]);

  async function handleNameChange(val: string) {
    setName(val);
    setNameTaken(false);
    if (!slugEdited) {
      const s = slugify(val);
      setSlug(s);
      if (s) {
        // We pass clientId for the namespace checking now. Wait, checkReportSlug might need clientId or spaceId.
        // For now, we will pass clientId to checkReportSlug.
        const { taken } = await checkReportSlug(clientId, s);
        setSlugTaken(taken);
      }
    }
    if (val.trim()) {
      const { taken } = await checkReportName(clientId, val.trim());
      setNameTaken(taken);
    }
  }

  async function handleSlugChange(val: string) {
    setSlugEdited(true);
    const s = slugify(val);
    setSlug(s);
    if (s) {
      const { taken } = await checkReportSlug(clientId, s);
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
    if (!docFile) {
      setError("El documento es obligatorio");
      return;
    }
    if (slugTaken) {
      setError("El slug ya está en uso");
      return;
    }
    if (nameTaken) {
      setError("Ya existe un informe con ese nombre en este espacio");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("slug", slug);
      fd.append("auto_send", autoSend ? "true" : "false");
      fd.append("document", docFile);
      const result = await createReportUnified(clientId, verticalId, fd);
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
              ⚠️ URL: informes.immoral.es/{clientSlug || "cliente"}/<strong>{slug || "…"}</strong>
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
                <p className="text-sm font-medium text-foreground">
                  {docFile.name} ({(docFile.size / 1024).toFixed(0)} KB)
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Arrastra o haz clic para subir</p>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.html,application/pdf,text/html"
              className="hidden"
              onChange={handleFileChange}
            />
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

          {isPending && (
            <div className="flex flex-col gap-2 pt-2">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: "40%", animation: "indeterminate-progress 1.4s ease-in-out infinite" }}
                />
              </div>
              {isSlowUpload && (
                <p className="text-xs text-muted-foreground text-center animate-in fade-in duration-500">
                  El archivo es grande — por favor, espera. No cierres esta ventana.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isPending} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || slugTaken || nameTaken || !docFile}
              className="rounded-xl font-semibold"
            >
              {isPending ? "Subiendo informe…" : "Crear informe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
