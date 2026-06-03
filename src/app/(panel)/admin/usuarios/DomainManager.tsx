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
    <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      <h2 className="font-bold text-foreground">Dominios autorizados</h2>

      {feedback && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{feedback}</p>
      )}

      <ul className="flex flex-col gap-2">
        {domains.map((d) => (
          <li key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm font-medium text-foreground">@{d.domain}</span>
            {d.domain !== currentUserDomain && (
              <button
                onClick={() => handleDelete(d.id, d.domain)}
                disabled={deletingId === d.id}
                className="text-xs text-destructive hover:text-destructive/80 disabled:opacity-40 transition-colors"
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
          className="flex-1 border border-border bg-background rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={isPendingAdd || !newDomain}
          className="bg-primary text-primary-foreground text-sm font-semibold rounded-xl px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPendingAdd ? "Añadiendo…" : "Añadir"}
        </button>
      </form>
    </section>
  );
}
