"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createClient_ } from "./actions";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">{error}</p>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} className="rounded-xl font-semibold">
          + Nuevo cliente
        </Button>
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {isAdmin ? "No hay clientes creados todavía." : "No has creado ningún cliente todavía."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clientes/${c.id}`}
              className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-lg font-bold text-primary">
                  {c.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
                {c.contact_name && (
                  <p className="text-xs text-muted-foreground truncate">{c.contact_name}</p>
                )}
                {isAdmin && c.profiles?.full_name && (
                  <p className="text-xs text-muted-foreground truncate">por {c.profiles.full_name}</p>
                )}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground shrink-0">
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {(["name", "contact_name", "contact_phone", "contact_whatsapp"] as const).map((field) => (
            <div key={field} className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {field === "name" ? "Nombre *" :
                  field === "contact_name" ? "Persona de contacto" :
                  field === "contact_phone" ? "Teléfono" : "WhatsApp"}
              </Label>
              <Input
                type="text"
                name={field}
                defaultValue={client?.[field] ?? ""}
                required={field === "name"}
                className="rounded-xl"
              />
            </div>
          ))}

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl font-semibold"
            >
              {isPending ? "Guardando…" : client ? "Guardar cambios" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ClientFormModal };
