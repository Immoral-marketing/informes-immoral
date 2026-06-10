"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { sendPortalLinks } from "../../portal-actions";
import { toast } from "sonner";
import { Send, Layout } from "lucide-react";

interface Recipient {
  id: string;
  email: string;
  full_name: string | null;
  role_label: string | null;
  is_primary: boolean;
}

interface Space {
  id: string;
  slug: string;
  vertical_name: string;
}

export default function SharePortalModal({
  clientName,
  spaces,
  recipients,
  onClose,
}: {
  clientName: string;
  spaces: Space[];
  recipients: Recipient[];
  onClose: () => void;
}) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(spaces[0]?.id ?? "");
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(
    new Set(recipients.filter((r) => r.is_primary).map((r) => r.id))
  );
  
  const [subject, setSubject] = useState("");
  const [note, setNote] = useState("");

  const [isPending, startTransition] = useTransition();

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId);
  const portalUrl = selectedSpace ? `informes.immoral.es/${selectedSpace.slug}/portal` : "";

  function toggleRecipient(id: string) {
    const next = new Set(selectedRecipients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedRecipients(next);
  }

  function handleSend() {
    if (selectedRecipients.size === 0) return;
    if (!selectedSpaceId) return;

    startTransition(async () => {
      const options: { subject?: string; note?: string } = {};
      if (subject.trim() !== "") options.subject = subject.trim();
      if (note.trim() !== "") options.note = note.trim();

      const result = await sendPortalLinks(
        selectedSpaceId, 
        Array.from(selectedRecipients),
        options
      );
      
      if (result.error) {
        toast.error(result.error);
      } else if (result.partial) {
        toast.warning("Algunos correos no se pudieron enviar.");
        onClose();
      } else {
        toast.success("Enlaces de portal enviados con éxito.");
        onClose();
      }
    });
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-brand" style={{ color: "var(--brand)" }} />
            Compartir Portal del Cliente
          </DialogTitle>
          <DialogDescription className="text-left mt-2">
            Envía a {clientName} acceso a su espacio de documentos. 
            El enlace expira en 48 horas y sirve para acceder a todos los informes publicados de este espacio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 overflow-y-auto pr-1 py-2">
          
          {/* URL Preview */}
          <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex flex-col gap-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">URL del portal</span>
            <span className="text-sm font-medium text-foreground truncate">{portalUrl}</span>
          </div>

          {/* Space Selection */}
          {spaces.length > 1 && (
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-medium">Selecciona el espacio a compartir</Label>
              <select
                value={selectedSpaceId}
                onChange={(e) => setSelectedSpaceId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-shadow cursor-pointer"
              >
                {spaces.map(s => (
                  <option key={s.id} value={s.id}>Espacio: {s.vertical_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Recipients Selection */}
          <div className="flex flex-col gap-2">
            <Label className="text-sm font-medium">Destinatarios</Label>
            {recipients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No hay destinatarios registrados.</p>
            ) : (
              <div className="flex flex-col gap-2 border border-border/50 rounded-xl p-3 bg-muted/10 max-h-[200px] overflow-y-auto">
                {recipients.map((r) => (
                  <div key={r.id} className="flex items-start space-x-3 py-1">
                    <Checkbox
                      id={`rec-${r.id}`}
                      checked={selectedRecipients.has(r.id)}
                      onCheckedChange={() => toggleRecipient(r.id)}
                      className="mt-1"
                    />
                    <div className="flex flex-col">
                      <Label htmlFor={`rec-${r.id}`} className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        {r.email}
                        {r.is_primary && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            primario
                          </span>
                        )}
                      </Label>
                      {r.full_name && <span className="text-xs text-muted-foreground mt-0.5">{r.full_name}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Note and Subject */}
          <div className="flex flex-col gap-4 pt-2 border-t border-border">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="subject" className="text-sm font-medium">Asunto (Opcional)</Label>
                <span className="text-xs text-muted-foreground">{subject.length}/120</span>
              </div>
              <Input
                id="subject"
                placeholder="Acceso a tu espacio de documentos..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={120}
                className="rounded-xl"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="note" className="text-sm font-medium">Nota personal (Opcional)</Label>
                <span className="text-xs text-muted-foreground">{note.length}/500</span>
              </div>
              <Textarea
                id="note"
                placeholder="Hola, te envío el acceso al portal donde podrás revisar..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={3}
                className="rounded-xl resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border mt-2">
          <Button variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
          <Button
            onClick={handleSend}
            disabled={isPending || selectedRecipients.size === 0 || !selectedSpaceId || spaces.length === 0}
            className="rounded-xl gap-2 font-semibold"
            style={{ backgroundColor: "var(--brand)" }}
          >
            {isPending ? "Enviando..." : "Enviar enlace de portal"}
            {!isPending && <Send className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
