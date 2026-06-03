"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateClient, deleteClient, addRecipient, updateRecipient, deleteRecipient } from "../actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

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

  const [clientToDelete, setClientToDelete] = useState<boolean>(false);
  const [recipientToDelete, setRecipientToDelete] = useState<Recipient | null>(null);

  function handleDeleteClient() {
    startTransition(async () => {
      const result = await deleteClient(client.id);
      if ("error" in result) setError(result.error);
      else router.push("/clientes");
    });
  }

  function handleDeleteRecipient(r: Recipient) {
    startTransition(async () => {
      const result = await deleteRecipient(r.id, client.id);
      if ("error" in result) {
        setError(result.error);
      } else {
        if (result.hadMagicLinks) {
          alert("Nota: Este destinatario había recibido magic links. Las sesiones activas seguirán válidas hasta que expiren.");
        }
        setRecipients((prev) => prev.filter((x) => x.id !== r.id));
        setRecipientToDelete(null);
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
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">{error}</p>
      )}

      {/* Client header */}
      <section className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">{client.name}</h1>
            {client.contact_name && <p className="text-sm text-muted-foreground mt-1">{client.contact_name}</p>}
            {client.contact_phone && <p className="text-sm text-muted-foreground">📞 {client.contact_phone}</p>}
            {client.contact_whatsapp && <p className="text-sm text-muted-foreground">💬 {client.contact_whatsapp}</p>}
          </div>
          {canEdit && (
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setEditingClient(true)}
                className="text-sm text-primary hover:underline"
              >
                Editar
              </button>
              <button
                onClick={() => setClientToDelete(true)}
                disabled={isPending}
                className="text-sm text-destructive hover:text-destructive disabled:opacity-40"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Recipients */}
      <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">Destinatarios</h2>
          {canEdit && (
            <button
              onClick={() => setShowRecipientForm(true)}
              className="text-sm text-primary hover:underline"
            >
              + Añadir
            </button>
          )}
        </div>

        {recipients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay destinatarios todavía.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recipients.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{r.email}</p>
                    {r.is_primary && (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                        primario
                      </span>
                    )}
                  </div>
                  {r.full_name && <p className="text-xs text-muted-foreground">{r.full_name}</p>}
                  {r.role_label && <p className="text-xs text-muted-foreground">{r.role_label}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setEditRecipient(r)}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setRecipientToDelete(r)}
                      disabled={isPending}
                      className="text-xs text-destructive/80 hover:text-destructive disabled:opacity-40"
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

      {/* Alert Dialogs for deletion */}
      <AlertDialog open={clientToDelete} onOpenChange={setClientToDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el cliente "{client.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!recipientToDelete} onOpenChange={(open) => !open && setRecipientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar destinatario?</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el destinatario {recipientToDelete?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => recipientToDelete && handleDeleteRecipient(recipientToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input
                type="text"
                name={f.name}
                defaultValue={f.defaultValue}
                required={f.required}
                className="rounded-xl"
              />
            </div>
          ))}
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={isPending} className="rounded-xl font-semibold">
              {isPending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
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
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>{recipient ? "Editar destinatario" : "Añadir destinatario"}</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {[
            { name: "email", label: "Email *", type: "email", required: true, defaultValue: recipient?.email },
            { name: "full_name", label: "Nombre completo", defaultValue: recipient?.full_name ?? "" },
            { name: "role_label", label: "Cargo", defaultValue: recipient?.role_label ?? "" },
          ].map((f) => (
            <div key={f.name} className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Input
                type={f.type ?? "text"}
                name={f.name}
                defaultValue={f.defaultValue}
                required={f.required}
                className="rounded-xl"
              />
            </div>
          ))}
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="isPrimary"
              checked={isPrimary}
              onCheckedChange={(checked) => setIsPrimary(checked as boolean)}
            />
            <Label htmlFor="isPrimary" className="text-sm font-medium leading-none cursor-pointer">
              Destinatario primario (recibe el magic link por defecto)
            </Label>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">Cancelar</Button>
            <Button type="submit" disabled={isPending} className="rounded-xl font-semibold">
              {isPending ? "Guardando…" : recipient ? "Guardar cambios" : "Añadir"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
