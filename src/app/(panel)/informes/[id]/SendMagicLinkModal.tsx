"use client";

import { useState, useTransition, useEffect } from "react";
import { sendMagicLinks, getReportRecipients } from "../send-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Recipient {
  id: string;
  email: string;
  full_name: string | null;
  role_label: string | null;
  is_primary: boolean;
}

export default function SendMagicLinkModal({
  reportId,
  onClose,
}: {
  reportId: string;
  onClose: () => void;
}) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<Array<{ email: string; ok: boolean }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getReportRecipients(reportId).then((r) => {
      setRecipients(r);
      // Pre-select primary recipient
      const primary = r.find((rec) => rec.is_primary);
      if (primary) setSelected(new Set([primary.id]));
      setLoading(false);
    });
  }, [reportId]);

  function toggleRecipient(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSend() {
    startTransition(async () => {
      setError(null);
      const result = await sendMagicLinks(reportId, [...selected]);
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

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar al cliente</DialogTitle>
          <DialogDescription className="hidden">Enviar informe a destinatarios</DialogDescription>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground text-center py-4">Cargando destinatarios…</p>}

        {!loading && recipients.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            El cliente no tiene destinatarios registrados. Añade uno en la ficha del cliente.
          </p>
        )}

        {!loading && recipients.length > 0 && !results && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Selecciona a quién enviar el enlace de acceso (válido 48 horas):
            </p>

            {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {recipients.map((rec) => (
                <li
                  key={rec.id}
                  onClick={() => toggleRecipient(rec.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
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
                    {rec.role_label && <p className="text-xs text-muted-foreground">{rec.role_label}</p>}
                  </div>
                </li>
              ))}
            </ul>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={isPending || selected.size === 0}
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
