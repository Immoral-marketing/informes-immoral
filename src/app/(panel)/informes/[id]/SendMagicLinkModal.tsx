"use client";

import { useState, useTransition, useEffect } from "react";
import { sendMagicLinks, getReportRecipients, addRecipientInline } from "../send-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmailPreview } from "./EmailPreview";

interface Recipient {
  id: string;
  email: string;
  full_name: string | null;
  role_label: string | null;
  is_primary: boolean;
}

interface Meta {
  reportName: string;
  clientName: string;
  clientLogoUrl: string | null;
  senderName: string;
  clientId: string;
}

export default function SendMagicLinkModal({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Array<{ email: string; ok: boolean }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Inline add-recipient form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [isAdding, startAdding] = useTransition();

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getReportRecipients(reportId).then((r) => {
      setRecipients(r.recipients);
      setMeta(r.meta);
      const primary = r.recipients.find((rec) => rec.is_primary);
      if (primary) setSelected(new Set([primary.id]));
      // Auto-expand add form if no recipients
      if (r.recipients.length === 0) setShowAddForm(true);
      setLoading(false);
    });
  }, [reportId]);

  function handleAddRecipient() {
    if (!meta?.clientId) return;
    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setAddError("Introduce un email válido");
      return;
    }
    setAddError(null);
    startAdding(async () => {
      const result = await addRecipientInline(meta.clientId, trimmedEmail, newName.trim() || undefined);
      if ("error" in result && result.error) {
        setAddError(result.error);
        return;
      }
      // Reload recipients and pre-select the new one
      const updated = await getReportRecipients(reportId);
      setRecipients(updated.recipients);
      const newRec = updated.recipients.find((r) => r.email === trimmedEmail);
      if (newRec) setSelected((prev) => new Set([...prev, newRec.id]));
      setNewEmail("");
      setNewName("");
      setShowAddForm(false);
    });
  }

  function toggleRecipient(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSend() {
    if (subject.length > 120) return setError("El asunto no puede exceder 120 caracteres");
    if (note.length > 500) return setError("La nota no puede exceder 500 caracteres");

    startTransition(async () => {
      setError(null);
      const result = await sendMagicLinks(reportId, [...selected], {
        subject: subject.trim() || undefined,
        note: note.trim() || undefined,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        const recipientMap = new Map(recipients.map((r) => [r.id, r.email]));
        const res = (result.results ?? []).map((r) => ({
          email: recipientMap.get(r.recipientId) ?? r.recipientId,
          ok: r.ok,
        }));
        setResults(res);
      }
    });
  }

  const defaultSubject = meta ? `${meta.reportName} — ${meta.clientName}` : "Asunto generado automáticamente";
  const selectedRecipient = recipients.find(r => selected.has(r.id)) || recipients[0];
  const previewRecipientName = selectedRecipient?.full_name || "";

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={showPreview ? "sm:max-w-2xl" : "sm:max-w-md"}>
        <DialogHeader>
          <DialogTitle>{showPreview ? "Previsualizar email" : "Enviar al cliente"}</DialogTitle>
          <DialogDescription className="hidden">Enviar informe a destinatarios</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground text-center py-4">Cargando destinatarios…</p>}

        {!loading && !results && !showPreview && (
          <div className="flex flex-col gap-5">
            {/* Subject + note fields — only show when there are recipients or the add form has a valid email */}
            {(recipients.length > 0 || newEmail.trim().includes("@")) && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="subject" className="text-xs font-semibold">Asunto del email (opcional)</Label>
                    <span className={`text-[10px] ${subject.length > 120 ? "text-destructive" : "text-muted-foreground"}`}>
                      {subject.length} / 120
                    </span>
                  </div>
                  <Input
                    id="subject"
                    placeholder={defaultSubject}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="text-sm h-9"
                    maxLength={120}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="note" className="text-xs font-semibold">Nota para el cliente (opcional)</Label>
                    <span className={`text-[10px] ${note.length > 500 ? "text-destructive" : "text-muted-foreground"}`}>
                      {note.length} / 500
                    </span>
                  </div>
                  <Textarea
                    id="note"
                    placeholder="Añade un mensaje personal para el cliente…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="text-sm resize-none h-20"
                    maxLength={500}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <p className="text-sm font-semibold text-foreground">Destinatarios</p>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

              {recipients.length > 0 && (
                <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                  {recipients.map((rec) => (
                    <li
                      key={rec.id}
                      onClick={() => toggleRecipient(rec.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                        selected.has(rec.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(rec.id)}
                        onChange={() => toggleRecipient(rec.id)}
                        className="w-4 h-4 accent-primary shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{rec.email}</p>
                          {rec.is_primary && (
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
                              primario
                            </span>
                          )}
                        </div>
                        {rec.full_name && <p className="text-xs text-muted-foreground">{rec.full_name}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Inline add-recipient form */}
              {showAddForm ? (
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-muted/30">
                  <p className="text-xs font-semibold text-foreground">Añadir destinatario</p>
                  {addError && (
                    <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-2 py-1">{addError}</p>
                  )}
                  <Input
                    type="email"
                    placeholder="Email *"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setAddError(null); }}
                    className="text-sm h-9"
                    autoFocus
                  />
                  <Input
                    type="text"
                    placeholder="Nombre completo (opcional)"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="text-sm h-9"
                  />
                  <div className="flex gap-2 justify-end">
                    {recipients.length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => { setShowAddForm(false); setNewEmail(""); setNewName(""); setAddError(null); }}
                        disabled={isAdding}
                      >
                        Cancelar
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddRecipient}
                      disabled={isAdding || !newEmail.trim().includes("@")}
                    >
                      {isAdding ? "Añadiendo…" : "Añadir"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="text-xs text-primary hover:underline self-start mt-1"
                >
                  + Añadir destinatario
                </button>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 mt-2">
              <div className="flex-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={() => setShowPreview(true)}
                  disabled={!meta || recipients.length === 0}
                >
                  Previsualizar email
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={isPending || selected.size === 0 || subject.length > 120 || note.length > 500}
              >
                {isPending ? "Enviando…" : `Enviar enlace${selected.size > 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {showPreview && meta && (
          <div className="flex flex-col gap-4">
            <EmailPreview
              recipientName={previewRecipientName}
              senderName={meta.senderName}
              reportName={meta.reportName}
              clientName={meta.clientName}
              clientLogoUrl={meta.clientLogoUrl}
              note={note.trim() || undefined}
              subject={subject.trim() || undefined}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                Volver a editar
              </Button>
              <Button
                onClick={handleSend}
                disabled={isPending || selected.size === 0 || subject.length > 120 || note.length > 500}
              >
                {isPending ? "Enviando…" : `Enviar enlace${selected.size > 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {results && (
          <div className="flex flex-col gap-3">
            {results.map((r) => (
              <div key={r.email} className={`flex items-center gap-3 p-3 rounded-xl ${r.ok ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400" : "bg-destructive/10 border border-destructive/20 text-destructive"}`}>
                <span className="text-lg">{r.ok ? "✓" : "✗"}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{r.email}</p>
                  <p className="text-xs opacity-80">{r.ok ? "Enlace enviado" : "Error al enviar"}</p>
                </div>
              </div>
            ))}
            <DialogFooter className="mt-4">
              <Button onClick={onClose} className="w-full">
                Cerrar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
