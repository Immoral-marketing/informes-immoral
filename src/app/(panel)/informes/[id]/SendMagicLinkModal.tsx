"use client";

import { useState, useTransition, useEffect } from "react";
import { sendMagicLinks, getReportRecipients } from "../send-actions";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">Enviar al cliente</h2>
          <button onClick={onClose} className="text-[--color-gray-mid] text-xl">×</button>
        </div>

        {loading && <p className="text-sm text-[--color-gray-mid]">Cargando destinatarios…</p>}

        {!loading && recipients.length === 0 && (
          <p className="text-sm text-[--color-gray-mid]">
            El cliente no tiene destinatarios registrados. Añade uno en la ficha del cliente.
          </p>
        )}

        {!loading && recipients.length > 0 && !results && (
          <>
            <p className="text-sm text-[--color-gray-mid]">
              Selecciona a quién enviar el enlace de acceso (válido 48 horas):
            </p>

            {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {recipients.map((rec) => (
                <li
                  key={rec.id}
                  onClick={() => toggleRecipient(rec.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${
                    selected.has(rec.id)
                      ? "border-[--color-brand] bg-[--color-brand]/5"
                      : "border-[--color-gray-light] hover:border-[--color-brand]/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(rec.id)}
                    onChange={() => toggleRecipient(rec.id)}
                    className="w-4 h-4 accent-[--color-brand] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[--color-black] truncate">{rec.email}</p>
                      {rec.is_primary && (
                        <span className="text-[10px] bg-[--color-brand]/10 text-[--color-brand] px-2 py-0.5 rounded-full shrink-0">
                          primario
                        </span>
                      )}
                    </div>
                    {rec.full_name && <p className="text-xs text-[--color-gray-mid]">{rec.full_name}</p>}
                    {rec.role_label && <p className="text-xs text-[--color-gray-mid]">{rec.role_label}</p>}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="text-sm text-[--color-gray-mid] px-4 py-2 rounded-xl hover:bg-[--color-gray-light]">
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={isPending || selected.size === 0}
                className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
              >
                {isPending ? "Enviando…" : `Enviar enlace${selected.size > 1 ? "s" : ""}`}
              </button>
            </div>
          </>
        )}

        {results && (
          <div className="flex flex-col gap-3">
            {results.map((r) => (
              <div key={r.email} className={`flex items-center gap-3 p-3 rounded-xl ${r.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <span className="text-lg">{r.ok ? "✓" : "✗"}</span>
                <div>
                  <p className="text-sm font-medium text-[--color-black]">{r.email}</p>
                  <p className="text-xs text-[--color-gray-mid]">{r.ok ? "Enlace enviado" : "Error al enviar"}</p>
                </div>
              </div>
            ))}
            <button onClick={onClose} className="mt-2 w-full bg-[--color-brand] text-white font-semibold rounded-xl py-2.5 hover:bg-blue-600">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
