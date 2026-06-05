"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  addVersion, addAttachment, deleteAttachment,
  regeneratePin, deleteReport, setReportExpiry, getDecryptedReportPin, getSignedDocUrl
} from "../actions";
import SendMagicLinkModal from "./SendMagicLinkModal";
import NotesPanel from "./NotesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Monitor, Smartphone, Tablet, Eye, EyeOff, Copy, RefreshCw, Send, Upload, Calendar, Edit3, Presentation, Trash2, X
} from "lucide-react";
import { toast } from "sonner";

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
  expiry_date: string | null; has_pin_encrypted: boolean;
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
  const [isUploadingAtt, setIsUploadingAtt] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(
    versions.find((v) => v.version_number === report.current_version) ?? null
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(activeVersionUrl);
  const [previewWidth, setPreviewWidth] = useState<"375px" | "768px" | "100%">("100%");
  
  const [isAnnotateMode, setIsAnnotateMode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [expiryDate, setExpiryDate] = useState(report.expiry_date ? report.expiry_date.slice(0, 16) : "");
  const [pinVisible, setPinVisible] = useState(false);
  const [decryptedPin, setDecryptedPin] = useState<string | null>(null);

  const [showSendModal, setShowSendModal] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAttDialog, setShowDeleteAttDialog] = useState(false);
  const [attToDelete, setAttToDelete] = useState<Attachment | null>(null);
  const [showCopyNotesDialog, setShowCopyNotesDialog] = useState(false);
  const [pendingVersionFile, setPendingVersionFile] = useState<File | null>(null);
  const [pinModal, setPinModal] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const docFileRef = useRef<HTMLInputElement>(null);
  const attFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const canEdit = isAdmin || report.created_by === currentUserId;
  const activeVersion = versions.find((v) => v.version_number === report.current_version);

  useEffect(() => {
    if (!canEdit || !report.has_pin_encrypted) return;
    getDecryptedReportPin(report.id).then((r) => {
      if (!("error" in r)) setDecryptedPin(r.pin ?? null);
    });
  }, [report.id, report.has_pin_encrypted, canEdit]);

  // Bloquear el scroll de body cuando el drawer esté abierto
  useEffect(() => {
    document.body.style.overflow = isAnnotateMode ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isAnnotateMode]);

  // Origen del preview: HTML por endpoint (text/html, renderizado); PDF por signed URL.
  const previewVer = previewVersion?.version_number ?? report.current_version;
  const previewIsHtml = (previewVersion?.format ?? activeVersion?.format) === "html";
  const previewSrc = previewIsHtml
    ? `/api/reports/${report.id}/preview?version=${previewVer}${isAnnotateMode ? "&mode=annotate" : ""}`
    : (previewUrl ?? activeVersionUrl);

  function copyUrl() {
    navigator.clipboard.writeText(fullUrl);
    toast.success("URL copiada al portapapeles");
  }

  function copyPin() {
    if (decryptedPin) {
      navigator.clipboard.writeText(decryptedPin);
      toast.success("PIN copiado al portapapeles");
    }
  }

  async function handleVersionClick(v: Version) {
    if (v.id === previewVersion?.id) return;
    setPreviewVersion(v);
    setPreviewUrl(null);
    const url = await getSignedDocUrl(v.storage_path);
    setPreviewUrl(url);
  }

  function handleNewVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingVersionFile(file);
    setShowCopyNotesDialog(true);
    e.target.value = "";
  }

  function confirmNewVersion(copyNotes: boolean) {
    setShowCopyNotesDialog(false);
    if (!pendingVersionFile) return;
    const file = pendingVersionFile;
    setPendingVersionFile(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("document", file);
      if (copyNotes) fd.append("copy_notes", "true");
      const result = await addVersion(report.id, fd);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Nueva versión subida");
        router.refresh();
      }
    });
  }

  function handleAddAttachment(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingAtt(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      const result = await addAttachment(report.id, fd);
      setIsUploadingAtt(false);
      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Adjunto subido");
        if (result.attachment) {
          setAtts((prev) => [...prev, result.attachment as unknown as Attachment]);
        }
      }
    });
  }

  function handleDeleteAttachment(att: Attachment) {
    setAttToDelete(att);
    setShowDeleteAttDialog(true);
  }

  function confirmDeleteAttachment() {
    setShowDeleteAttDialog(false);
    if (!attToDelete) return;
    const att = attToDelete;
    setAttToDelete(null);
    startTransition(async () => {
      const result = await deleteAttachment(att.id, report.id);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Adjunto eliminado");
        setAtts((prev) => prev.filter((a) => a.id !== att.id));
      }
    });
  }

  function handleRegeneratePin() {
    setShowRegenerateDialog(false);
    startTransition(async () => {
      const result = await regeneratePin(report.id);
      if ("error" in result) toast.error(result.error);
      else {
        setPinModal(result.pin);
        setDecryptedPin(result.pin);
        router.refresh(); // to update has_pin_encrypted if it was missing
      }
    });
  }

  function handleDeleteReport() {
    setShowDeleteDialog(false);
    startTransition(async () => {
      const result = await deleteReport(report.id);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Informe eliminado");
        router.push(`/espacios/${report.space_id}`);
      }
    });
  }

  function handleSaveExpiry() {
    startTransition(async () => {
      const val = expiryDate ? new Date(expiryDate).toISOString() : null;
      const result = await setReportExpiry(report.id, val);
      if ("error" in result) toast.error(result.error);
      else {
        toast.success("Fecha de vigencia actualizada");
        router.refresh();
      }
    });
  }

  async function handleRevealPin() {
    if (pinVisible) {
      setPinVisible(false);
      return;
    }
    if (!decryptedPin) {
      const result = await getDecryptedReportPin(report.id);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDecryptedPin(result.pin ?? null);
    }
    setPinVisible(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <section className="bg-card rounded-2xl border border-border p-6 flex flex-col xl:flex-row xl:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-foreground truncate" title={report.name}>{report.name}</h1>
            <span className="text-xs font-semibold bg-muted text-muted-foreground rounded-full px-3 py-1 whitespace-nowrap">
              v{report.current_version} · {activeVersion?.format?.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-xs text-muted-foreground truncate max-w-sm">{fullUrl}</span>
            <button onClick={copyUrl} className="text-xs text-primary hover:underline flex items-center gap-1 shrink-0">
              <Copy className="w-3 h-3" /> Copiar URL
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => docFileRef.current?.click()} disabled={isPending}>
              <Upload className="w-4 h-4 mr-1.5" />
              Nueva versión
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowRegenerateDialog(true)} disabled={isPending}>
              <RefreshCw className="w-4 h-4 mr-1.5" />
              Regenerar PIN
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowSendModal(true)} disabled={isPending}>
              <Send className="w-4 h-4 mr-1.5" />
              Enviar
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/informes/${report.id}/presentar`)} disabled={isPending}>
              <Presentation className="w-4 h-4 mr-1.5" />
              Presentar
            </Button>
          )}
          {canEdit && (
            <Button 
              variant={isAnnotateMode ? "default" : "secondary"} 
              size="sm" 
              onClick={() => setIsAnnotateMode(!isAnnotateMode)} 
              disabled={isPending || activeVersion?.format !== "html"} 
              title={activeVersion?.format !== "html" ? "Disponible solo para informes HTML" : "Modo anotación"}
            >
              <Edit3 className="w-4 h-4 mr-1.5" />
              Anotar
            </Button>
          )}
        </div>
        <input ref={docFileRef} type="file" accept=".pdf,.html,application/pdf,text/html" className="hidden" onChange={handleNewVersion} />
      </section>

      <div className={`grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start transition-all`}>
        {/* Sidebar Left: Config & History */}
        <div className="flex flex-col gap-6">
          {canEdit && (
            <section className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
              <h2 className="font-bold text-foreground">Configuración</h2>
              
              {/* Expiry Date */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fecha de vigencia</Label>
                <Input
                  type="datetime-local"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="text-sm h-9 w-full"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {report.expiry_date ? "Con caducidad" : "Sin caducidad"}
                  </span>
                  <Button size="sm" onClick={handleSaveExpiry} disabled={isPending}>Guardar</Button>
                </div>
              </div>

              {/* Active PIN */}
              <div className="space-y-2">
                <Label className="text-xs font-medium">PIN activo</Label>
                {report.has_pin_encrypted ? (
                  <div className="flex items-center gap-2 bg-muted rounded-xl p-2 border border-border">
                    <div
                      className="flex-1 text-center font-mono font-bold tracking-widest text-foreground transition-all select-none"
                      style={{ filter: pinVisible ? "none" : "blur(6px)", userSelect: pinVisible ? "auto" : "none" }}
                    >
                      {decryptedPin ?? "••••"}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleRevealPin} disabled={isPending}>
                      {pinVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={copyPin} disabled={!decryptedPin || isPending}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    PIN no disponible — regenéralo para poder visualizarlo.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Versions History */}
          <section className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <h2 className="font-bold text-foreground">Historial de versiones</h2>
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
                  <div className="w-8 h-8 rounded-lg bg-background border flex items-center justify-center text-xs font-bold text-muted-foreground">
                    v{v.version_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Versión {v.version_number}</span>
                      {v.version_number === report.current_version && (
                        <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-bold">Activa</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {v.profiles?.full_name ?? "—"} · {new Date(v.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Attachments */}
          <section className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-foreground">Adjuntos</h2>
              {canEdit && (
                <button
                  onClick={() => attFileRef.current?.click()}
                  disabled={isPending || isUploadingAtt}
                  className="text-xs text-primary hover:underline disabled:opacity-40"
                >
                  {isUploadingAtt ? "Subiendo…" : "+ Añadir"}
                </button>
              )}
            </div>
            {canEdit && (
              <p className="text-[10px] text-muted-foreground mt-[-10px]">
                PDF, Word, Excel, PowerPoint, PNG, JPG, ZIP. Máx 25 MB.
              </p>
            )}
            <input ref={attFileRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip" className="hidden" onChange={handleAddAttachment} />
            {atts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay adjuntos.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {atts.map((a) => (
                  <li key={a.id} className="flex flex-col gap-1 py-2 border-b border-border last:border-0">
                    <p className="text-sm font-medium text-foreground truncate" title={a.filename}>{a.filename}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{(a.size_bytes / 1024).toFixed(0)} KB</p>
                      <div className="flex gap-2">
                        {a.signed_url && (
                          <a href={a.signed_url} download={a.filename} className="text-xs text-primary hover:underline">
                            Descargar
                          </a>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleDeleteAttachment(a)}
                            disabled={isPending}
                            className="text-xs text-destructive hover:underline disabled:opacity-40"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          
          {canEdit && (
            <section className="pt-2">
              <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/20 hover:bg-destructive/10" onClick={() => setShowDeleteDialog(true)} disabled={isPending}>
                <Trash2 className="w-4 h-4 mr-2" /> Eliminar informe
              </Button>
            </section>
          )}
        </div>

        {/* Preview Right */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" variant={previewWidth === "375px" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("375px")}>
              <Smartphone className="w-4 h-4 mr-1.5" /> Móvil
            </Button>
            <Button size="sm" variant={previewWidth === "768px" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("768px")}>
              <Tablet className="w-4 h-4 mr-1.5" /> Tablet
            </Button>
            <Button size="sm" variant={previewWidth === "100%" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("100%")}>
              <Monitor className="w-4 h-4 mr-1.5" /> Escritorio
            </Button>
          </div>

          <div className="flex justify-center w-full relative">
            <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden transition-all duration-300 ease-out flex items-center justify-center relative" style={{ width: previewWidth, maxWidth: "100%", height: "75vh", minHeight: "600px" }}>
              {previewSrc ? (
                <iframe
                  ref={iframeRef}
                  src={previewSrc}
                  className="w-full h-full border-0 bg-white"
                  sandbox={previewIsHtml ? "allow-same-origin allow-scripts allow-popups" : undefined}
                  title="Vista previa"
                />
              ) : (
                <div className="flex items-center justify-center text-muted-foreground w-full h-full">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" /> Cargando...
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
      </div>

      {/* Drawer Overlay */}
      {isAnnotateMode && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsAnnotateMode(false)} 
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed right-0 top-0 h-full w-[360px] max-w-full z-50 bg-card shadow-2xl border-l border-border transition-transform duration-300 ease-in-out ${
          isAnnotateMode ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {isAnnotateMode && previewVersion && (
          <div className="relative h-full flex flex-col">
            <button 
              onClick={() => setIsAnnotateMode(false)}
              className="absolute right-4 top-4 z-50 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <NotesPanel 
              reportVersionId={previewVersion.id}
              iframeRef={iframeRef}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>

      {showSendModal && (
        <SendMagicLinkModal reportId={report.id} onClose={() => setShowSendModal(false)} />
      )}

      {/* PIN Dialog (Generated) */}
      <Dialog open={!!pinModal} onOpenChange={(o) => { if (!o) setPinModal(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Nuevo PIN generado</DialogTitle>
            <DialogDescription className="text-center">
              Comparte este PIN con tu cliente. No volverá a mostrarse en claro, pero podrás revelarlo en la configuración.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-6">
            <div 
              className="text-5xl font-bold tracking-[0.4em] bg-muted rounded-2xl px-8 py-5 select-all cursor-pointer text-foreground border border-border hover:border-primary transition-colors"
              onClick={() => { navigator.clipboard.writeText(pinModal!); toast.success("Copiado"); }}
            >
              {pinModal}
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setPinModal(null)} className="w-full">
              Entendido — he guardado el PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirm */}
      <AlertDialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Regenerar el PIN?</AlertDialogTitle>
            <AlertDialogDescription>
              Esto invalidará todas las sesiones abiertas y los magic links pendientes de este informe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleRegeneratePin(); }}>
              Regenerar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Copy Notes Confirm */}
      <AlertDialog open={showCopyNotesDialog} onOpenChange={(o) => { if (!o) { setShowCopyNotesDialog(false); setPendingVersionFile(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Copiar notas de orador?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas copiar las notas de orador de la versión anterior a esta nueva versión?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => confirmNewVersion(false)}>No copiar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmNewVersion(true)}>Copiar notas</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Attachment Confirm */}
      <AlertDialog open={showDeleteAttDialog} onOpenChange={(o) => { if (!o) { setShowDeleteAttDialog(false); setAttToDelete(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar adjunto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará &quot;{attToDelete?.filename}&quot;. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteAttachment} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el informe?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todas las versiones, adjuntos y sesiones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDeleteReport(); }} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
