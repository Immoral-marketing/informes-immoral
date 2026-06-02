"use client";

import { useState, useTransition } from "react";
import { addDomain, deleteDomain } from "./actions";

interface Domain {
  id: string;
  domain: string;
  created_at: string;
}

interface DomainManagerProps {
  domains: Domain[];
  currentUserDomain: string;
}

export default function DomainManager({ domains: initial, currentUserDomain }: DomainManagerProps) {
  const [domains, setDomains] = useState(initial);
  const [newDomain, setNewDomain] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPendingAdd, startAdd] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    startAdd(async () => {
      const result = await addDomain(newDomain);
      if ("error" in result) {
        setFeedback(result.error);
      } else {
        setNewDomain("");
        setFeedback(null);
        // Optimistic update — full refresh on next navigation
        setDomains((prev) => [
          ...prev,
          { id: crypto.randomUUID(), domain: newDomain.trim().toLowerCase(), created_at: new Date().toISOString() },
        ]);
      }
    });
  }

  function handleDelete(id: string, domain: string) {
    if (!confirm(`¿Seguro? Los empleados con @${domain} no podrán iniciar sesión de nuevo.`)) return;
    setDeletingId(id);
    deleteDomain(id).then((result) => {
      setDeletingId(null);
      if ("error" in result) {
        setFeedback(result.error);
      } else {
        setDomains((prev) => prev.filter((d) => d.id !== id));
        setFeedback(null);
      }
    });
  }

  return (
    <section className="bg-white rounded-2xl border border-[--color-gray-light] p-6 flex flex-col gap-4">
      <h2 className="font-bold text-[--color-black]">Dominios autorizados</h2>

      {feedback && (
        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{feedback}</p>
      )}

      <ul className="flex flex-col gap-2">
        {domains.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2 border-b border-[--color-gray-light] last:border-0">
            <span className="text-sm font-medium text-[--color-black]">@{d.domain}</span>
            {d.domain !== currentUserDomain && (
              <button
                onClick={() => handleDelete(d.id, d.domain)}
                disabled={deletingId === d.id}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
              >
                {deletingId === d.id ? "Eliminando…" : "Eliminar"}
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex gap-2 mt-2">
        <input
          type="text"
          placeholder="nuevo-dominio.es"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          required
          className="flex-1 border border-[--color-gray-light] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-brand]"
        />
        <button
          type="submit"
          disabled={isPendingAdd || !newDomain}
          className="bg-[--color-brand] text-white text-sm font-semibold rounded-xl px-4 py-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isPendingAdd ? "Añadiendo…" : "Añadir"}
        </button>
      </form>
    </section>
  );
}
