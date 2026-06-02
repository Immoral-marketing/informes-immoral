"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateClient, deleteClient, addRecipient, updateRecipient, deleteRecipient } from "../actions";

interface Client {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  created_by: string;
}

interface Recipient {
  id: string;
  email: string;
  full_name: string | null;
  role_label: string | null;
  is_primary: boolean;
  created_at: string;
}

export default function ClientDetailClient({
  client,
  recipients: initial,
  isAdmin,
  currentUserId,
}: {
  client: Client;
  recipients: Recipient[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [recipients, setRecipients] = useState(initial);
  const [editingClient, setEditingClient] = useState(false);

  // Sync local state when server re-renders via router.refresh()
  useEffect(() => { setRecipients(initial); }, [initial]);
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [editRecipient, setEditRecipient] = useState<Recipient | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canEdit = isAdmin || client.created_by === currentUserId;

  function handleDeleteClient() {
    if (!confirm(`¿Eliminar el cliente "${client.name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteClient(client.id);
      if ("error" in result) setError(result.error);
      else router.push("/clientes");
    });
  }

  function handleDeleteRecipient(r: Recipient) {
    if (!confirm(`¿Eliminar el destinatario ${r.email}?`)) return;
    startTransition(async () => {
      const result = await deleteRecipient(r.id, client.id);
      if ("error" in result) {
        setError(result.error);
      } else {
        if (result.hadMagicLinks) {
          alert("Nota: Este destinatario había recibido magic links. Las sesiones activas seguirán válidas hasta que expiren.");
        }
        setRecipients((prev) => prev.filter((x) => x.id !== r.id));
        router.refresh();
      }
    });
  }

  async function handleUpdateClient(fd: FormData) {
    const result = await updateClient(client.id, fd);
    if ("error" in result) throw new Error(result.error);
    setEditingClient(false);
    router.refresh();
  }

  async function handleAddRecipient(fd: FormData) {
    const result = await addRecipient(client.id, fd);
    if ("error" in result) throw new Error(result.error);
    setShowRecipientForm(false);
    router.refresh();
  }

  async function handleUpdateRecipient(fd: FormData) {
    if (!editRecipient) return;
    const result = await updateRecipient(editRecipient.id, client.id, fd);
    if ("error" in result) throw new Error(result.error);
    setEditRecipient(null);
    router.refresh();
  }

  return (
    <>
      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3 border border-red-200">{error}</p>
      )}

      {/* Client header */}
      <section className="bg-white rounded-2xl border border-[--color-gray-light] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-[--color-black]">{client.name}</h1>
            {client.contact_name && <p className="text-sm text-[--color-gray-mid] mt-1">{client.contact_name}</p>}
            {client.contact_phone && <p className="text-sm text-[--color-gray-mid]">📞 {client.contact_phone}</p>}
            {client.contact_whatsapp && <p className="text-sm text-[--color-gray-mid]">💬 {client.contact_whatsapp}</p>}
          </div>
          {canEdit && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditingClient(true)}
                className="text-sm text-[--color-brand] hover:underline"
              >
                Editar
              </button>
              <button
                onClick={handleDeleteClient}
                disabled={isPending}
                className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Recipients */}
      <section className="bg-white rounded-2xl border border-[--color-gray-light] p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">Destinatarios</h2>
          {canEdit && (
            <button
              onClick={() => setShowRecipientForm(true)}
              className="text-sm text-[--color-brand] hover:underline"
            >
              + Añadir
            </button>
          )}
        </div>

        {recipients.length === 0 ? (
          <p className="text-sm text-[--color-gray-mid]">No hay destinatarios todavía.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recipients.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 border-b border-[--color-gray-light] last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[--color-black] truncate">{r.email}</p>
                    {r.is_primary && (
                      <span className="text-[10px] bg-[--color-brand]/10 text-[--color-brand] px-2 py-0.5 rounded-full font-medium shrink-0">
                        primario
                      </span>
                    )}
                  </div>
                  {r.full_name && <p className="text-xs text-[--color-gray-mid]">{r.full_name}</p>}
                  {r.role_label && <p className="text-xs text-[--color-gray-mid]">{r.role_label}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setEditRecipient(r)}
                      className="text-xs text-[--color-gray-mid] hover:text-[--color-brand]"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteRecipient(r)}
                      disabled={isPending}
                      className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Modals */}
      {editingClient && (
        <FormModal
          title="Editar cliente"
          onClose={() => setEditingClient(false)}
          onSubmit={handleUpdateClient}
          fields={[
            { name: "name", label: "Nombre *", required: true, defaultValue: client.name },
            { name: "contact_name", label: "Persona de contacto", defaultValue: client.contact_name ?? "" },
            { name: "contact_phone", label: "Teléfono", defaultValue: client.contact_phone ?? "" },
            { name: "contact_whatsapp", label: "WhatsApp", defaultValue: client.contact_whatsapp ?? "" },
          ]}
        />
      )}

      {showRecipientForm && (
        <RecipientFormModal
          onClose={() => setShowRecipientForm(false)}
          onSubmit={handleAddRecipient}
        />
      )}

      {editRecipient && (
        <RecipientFormModal
          recipient={editRecipient}
          onClose={() => setEditRecipient(null)}
          onSubmit={handleUpdateRecipient}
        />
      )}
    </>
  );
}

function FormModal({
  title,
  onClose,
  onSubmit,
  fields,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
  fields: Array<{ name: string; label: string; required?: boolean; defaultValue?: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      try { await onSubmit(fd); }
      catch (err) { setError(err instanceof Error ? err.message : "Error inesperado"); }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">{title}</h2>
          <button onClick={onClose} className="text-[--color-gray-mid] text-xl">×</button>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[--color-gray-mid]">{f.label}</label>
              <input
                type="text"
                name={f.name}
                defaultValue={f.defaultValue}
                required={f.required}
                className="border border-[--color-gray-light] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-brand]"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="text-sm text-[--color-gray-mid] px-4 py-2 rounded-xl hover:bg-[--color-gray-light]">Cancelar</button>
            <button type="submit" disabled={isPending} className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 disabled:opacity-50">
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RecipientFormModal({
  recipient,
  onClose,
  onSubmit,
}: {
  recipient?: Recipient;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [isPrimary, setIsPrimary] = useState(recipient?.is_primary ?? false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("is_primary", isPrimary ? "true" : "false");
    startTransition(async () => {
      try { await onSubmit(fd); }
      catch (err) { setError(err instanceof Error ? err.message : "Error inesperado"); }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">{recipient ? "Editar destinatario" : "Añadir destinatario"}</h2>
          <button onClick={onClose} className="text-[--color-gray-mid] text-xl">×</button>
        </div>
        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { name: "email", label: "Email *", type: "email", required: true, defaultValue: recipient?.email },
            { name: "full_name", label: "Nombre completo", defaultValue: recipient?.full_name ?? "" },
            { name: "role_label", label: "Cargo", defaultValue: recipient?.role_label ?? "" },
          ].map((f) => (
            <div key={f.name} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[--color-gray-mid]">{f.label}</label>
              <input
                type={f.type ?? "text"}
                name={f.name}
                defaultValue={f.defaultValue}
                required={f.required}
                className="border border-[--color-gray-light] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-brand]"
              />
            </div>
          ))}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 accent-[--color-brand]"
            />
            <span className="text-sm text-[--color-black]">Destinatario primario (recibe el magic link por defecto)</span>
          </label>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="text-sm text-[--color-gray-mid] px-4 py-2 rounded-xl hover:bg-[--color-gray-light]">Cancelar</button>
            <button type="submit" disabled={isPending} className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 disabled:opacity-50">
              {isPending ? "Guardando…" : recipient ? "Guardar cambios" : "Añadir"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
