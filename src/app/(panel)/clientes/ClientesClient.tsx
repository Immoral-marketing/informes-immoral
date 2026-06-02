"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient_ } from "./actions";
import { useRouter } from "next/navigation";

interface ClientRow {
  id: string;
  name: string;
  contact_name: string | null;
  created_by: string;
  created_at: string;
  profiles: { full_name: string | null } | null;
  client_recipients: [{ count: number }];
  client_spaces: [{ count: number }];
}

export default function ClientesClient({
  clients,
  isAdmin,
}: {
  clients: ClientRow[];
  isAdmin: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate(formData: FormData) {
    const result = await createClient_(formData);
    if ("error" in result) {
      setError(result.error);
    } else {
      router.push(`/clientes/${result.id}`);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-200">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 transition-colors"
        >
          + Nuevo cliente
        </button>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-[--color-gray-mid] text-center py-12">
          {isAdmin ? "No hay clientes creados todavía." : "No has creado ningún cliente todavía."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="bg-white rounded-2xl border border-[--color-gray-light] p-4 flex items-center gap-4 hover:border-[--color-brand] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[--color-brand]/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-[--color-brand]">
                  {c.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[--color-black] truncate">{c.name}</p>
                {c.contact_name && (
                  <p className="text-xs text-[--color-gray-mid] truncate">{c.contact_name}</p>
                )}
                {isAdmin && c.profiles?.full_name && (
                  <p className="text-xs text-[--color-gray-mid] truncate">por {c.profiles.full_name}</p>
                )}
              </div>
              <div className="flex gap-4 text-xs text-[--color-gray-mid] shrink-0">
                <span>{c.client_recipients[0]?.count ?? 0} dest.</span>
                <span>{c.client_spaces[0]?.count ?? 0} espacios</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && (
        <ClientFormModal
          onClose={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}

function ClientFormModal({
  client,
  onClose,
  onSubmit,
}: {
  client?: { name: string; contact_name: string | null; contact_phone: string | null; contact_whatsapp: string | null };
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      setError(null);
      try {
        await onSubmit(fd);
      } catch {
        setError("Error inesperado al guardar");
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">{client ? "Editar cliente" : "Nuevo cliente"}</h2>
          <button onClick={onClose} className="text-[--color-gray-mid] hover:text-[--color-black] text-xl">×</button>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {(["name", "contact_name", "contact_phone", "contact_whatsapp"] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[--color-gray-mid]">
                {field === "name" ? "Nombre *" :
                  field === "contact_name" ? "Persona de contacto" :
                  field === "contact_phone" ? "Teléfono" : "WhatsApp"}
              </label>
              <input
                type="text"
                name={field}
                defaultValue={client?.[field] ?? ""}
                required={field === "name"}
                className="border border-[--color-gray-light] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-brand]"
              />
            </div>
          ))}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="text-sm text-[--color-gray-mid] px-4 py-2 rounded-xl hover:bg-[--color-gray-light]">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
            >
              {isPending ? "Guardando…" : client ? "Guardar cambios" : "Crear cliente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { ClientFormModal };
