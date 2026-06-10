"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateClient, deleteClient, addRecipient, updateRecipient, deleteRecipient } from "../actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientFields } from "@/components/clients/ClientFields";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, Edit2, Trash2, MailPlus, Layout } from "lucide-react";
import SharePortalModal from "./SharePortalModal";

interface Client {
  id: string;
  name: string;
  logo_signed_url?: string | null;
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
  spaces,
  isAdmin,
  currentUserId,
}: {
  client: Client;
  recipients: Recipient[];
  spaces: { id: string; slug: string; vertical_name: string }[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const [recipients, setRecipients] = useState(initial);
  const [editingClient, setEditingClient] = useState(false);

  // Sync local state when server re-renders via router.refresh()
  useEffect(() => { setRecipients(initial); }, [initial]);
  
  const [showRecipientsManager, setShowRecipientsManager] = useState(false);
  const [showRecipientForm, setShowRecipientForm] = useState(false);
  const [showSharePortal, setShowSharePortal] = useState(false);
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
          toast.info("Las sesiones activas de este destinatario seguirán válidas hasta que expiren.");
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
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20 mb-6">{error}</p>
      )}

      {/* Client header */}
      <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-border">
        <div className="flex items-center gap-6">
          {client.logo_signed_url ? (
            <div className="w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={client.logo_signed_url} alt={client.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-3xl sm:text-4xl font-extrabold text-primary">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          
          <div className="flex flex-col">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">{client.name}</h1>
            
            {/* Contact info row */}
            {(client.contact_name || client.contact_phone || client.contact_whatsapp) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground font-medium">
                {client.contact_name && <span>{client.contact_name}</span>}
                {client.contact_phone && (
                  <>
                    <span className="hidden sm:inline text-muted-foreground/30">•</span>
                    <span className="flex items-center gap-1">📞 {client.contact_phone}</span>
                  </>
                )}
                {client.contact_whatsapp && (
                  <>
                    <span className="hidden sm:inline text-muted-foreground/30">•</span>
                    <span className="flex items-center gap-1">💬 {client.contact_whatsapp}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {spaces.length > 0 && (
            <Button
              variant="outline"
              className="rounded-xl flex items-center gap-2"
              onClick={() => setShowSharePortal(true)}
              style={{ color: "var(--brand)", borderColor: "var(--brand)" }}
            >
              <Layout className="w-4 h-4" />
              <span>Compartir portal</span>
            </Button>
          )}
          
          <Button 
            variant="outline" 
            className="rounded-xl flex items-center gap-2"
            onClick={() => setShowRecipientsManager(true)}
          >
            <Users className="w-4 h-4" />
            <span>Destinatarios ({recipients.length})</span>
          </Button>

          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <MoreVertical className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem onClick={() => setEditingClient(true)} className="gap-2 cursor-pointer">
                  <Edit2 className="w-4 h-4" /> Editar cliente
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setClientToDelete(true)} className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                  <Trash2 className="w-4 h-4" /> Eliminar cliente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </section>

      {/* Modals */}
      {showSharePortal && (
        <SharePortalModal
          clientName={client.name}
          spaces={spaces}
          recipients={recipients}
          onClose={() => setShowSharePortal(false)}
        />
      )}

      {showRecipientsManager && (
        <RecipientsManagerModal
          recipients={recipients}
          canEdit={canEdit}
          onClose={() => setShowRecipientsManager(false)}
          onAdd={() => setShowRecipientForm(true)}
          onEdit={(r) => setEditRecipient(r)}
          onDelete={(r) => setRecipientToDelete(r)}
        />
      )}

      {editingClient && (
        <EditClientDialog
          client={client}
          onClose={() => setEditingClient(false)}
          onSubmit={handleUpdateClient}
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

function RecipientsManagerModal({
  recipients,
  canEdit,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: {
  recipients: Recipient[];
  canEdit: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (r: Recipient) => void;
  onDelete: (r: Recipient) => void;
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between mt-2">
             <DialogTitle>Gestión de Destinatarios</DialogTitle>
             {canEdit && (
                <Button size="sm" onClick={onAdd} className="rounded-lg gap-2 h-8">
                  <MailPlus className="w-4 h-4" /> Añadir
                </Button>
             )}
          </div>
          <DialogDescription className="text-left mt-1.5">
             Los destinatarios registrados recibirán los informes de este cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto pr-2 mt-2 -mr-2">
          {recipients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center bg-muted/30 rounded-xl">No hay destinatarios registrados.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {recipients.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3 px-4 bg-muted/20 border border-border/50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{r.email}</p>
                      {r.is_primary && (
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                          primario
                        </span>
                      )}
                    </div>
                    {r.full_name && <p className="text-xs text-muted-foreground mt-0.5">{r.full_name}</p>}
                    {r.role_label && <p className="text-xs text-muted-foreground">{r.role_label}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => onEdit(r)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(r)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditClientDialog({
  client,
  onClose,
  onSubmit,
}: {
  client: Client;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
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
          <DialogTitle>Editar cliente</DialogTitle>
        </DialogHeader>
        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ClientFields client={client} />
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
