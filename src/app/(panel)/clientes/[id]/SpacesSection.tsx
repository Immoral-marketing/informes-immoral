"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSpace, deleteSpace, getSlugPreview } from "../../espacios/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DashboardCard } from "@/components/shared/dashboard-card";

interface Vertical {
  id: string;
  name: string;
  color_hex: string;
}

interface Space {
  id: string;
  slug: string;
  vertical_id: string;
  created_at: string;
  vertical_name: string;
  vertical_color: string;
  logo_signed_url: string | null;
  reports_count: number;
}

export default function SpacesSection({
  clientId,
  clientName,
  spaces: initial,
  verticals,
  canEdit,
}: {
  clientId: string;
  clientName: string;
  spaces: Space[];
  verticals: Vertical[];
  canEdit: boolean;
}) {
  const [spaces, setSpaces] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open from QuickCreateModal (?openSpace=1)
  useEffect(() => {
    if (searchParams.get("openSpace") === "1" && canEdit) setShowForm(true);
  }, [searchParams, canEdit]);

  // Verticals already used
  const usedVerticalIds = new Set(spaces.map((s) => s.vertical_id));
  const availableVerticals = verticals.filter((v) => !usedVerticalIds.has(v.id));

  function handleDelete() {
    if (!deleteTarget) return;
    const space = deleteTarget;
    startTransition(async () => {
      const result = await deleteSpace(space.id, clientId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSpaces((prev) => prev.filter((s) => s.id !== space.id));
        setError(null);
      }
      setDeleteTarget(null);
    });
  }

  return (
    <section className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground">Espacios</h2>
        {canEdit && availableVerticals.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-primary hover:underline"
          >
            + Nuevo espacio
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
      )}

      {spaces.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay espacios creados todavía.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {spaces.map((s) => (
            <div key={s.id} className="relative group/card h-full">
              <DashboardCard
                href={`/espacios/${s.id}`}
                title={s.vertical_name}
                subtitle={`/${s.slug} · ${s.reports_count} informe${s.reports_count !== 1 ? "s" : ""}`}
                topColor={s.vertical_color}
                imageUrl={s.logo_signed_url}
              />
              {canEdit && (
                <button
                  onClick={() => setDeleteTarget(s)}
                  disabled={isPending}
                  className="absolute top-3 right-3 z-10 opacity-0 group-hover/card:opacity-100 focus:opacity-100 bg-background/95 border border-border px-2.5 py-1 text-xs font-semibold text-destructive rounded-lg shadow-sm transition-all hover:bg-destructive/10"
                  title="Eliminar espacio"
                >
                  Eliminar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <NewSpaceModal
          clientId={clientId}
          clientName={clientName}
          verticals={availableVerticals}
          onClose={() => setShowForm(false)}
          onCreated={(space) => {
            setSpaces((prev) => [...prev, space]);
            setShowForm(false);
            router.refresh();
          }}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el espacio &quot;/{deleteTarget?.slug}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán los informes asociados a este espacio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function NewSpaceModal({
  clientId,
  clientName,
  verticals,
  onClose,
  onCreated,
}: {
  clientId: string;
  clientName: string;
  verticals: Vertical[];
  onClose: () => void;
  onCreated: (space: Space) => void;
}) {
  const [verticalId, setVerticalId] = useState(verticals[0]?.id ?? "");
  const [slugPreview, setSlugPreview] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Load slug preview on mount
  useEffect(() => {
    getSlugPreview(clientName).then((r) => {
      if ("slug" in r) setSlugPreview(r.slug);
      else setSlugError(r.error);
    });
  }, [clientName]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!verticalId) return;
    startTransition(async () => {
      const result = await createSpace(clientId, verticalId, clientName);
      if ("error" in result) {
        setError(result.error);
      } else {
        const selectedVertical = verticals.find((v) => v.id === verticalId);
        onCreated({
          id: result.id,
          slug: result.slug,
          vertical_id: verticalId,
          created_at: new Date().toISOString(),
          vertical_name: selectedVertical?.name ?? "—",
          vertical_color: selectedVertical?.color_hex ?? "#ccc",
          logo_signed_url: null,
          reports_count: 0,
        });
      }
    });
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo espacio</DialogTitle>
          <DialogDescription>Asocia una vertical a {clientName}.</DialogDescription>
        </DialogHeader>

        {(error ?? slugError) && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error ?? slugError}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Vertical selector */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Vertical *</Label>
            <select
              value={verticalId}
              onChange={(e) => setVerticalId(e.target.value)}
              required
              className="border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:border-primary"
            >
              {verticals.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Slug preview */}
          <div className="bg-muted/50 rounded-xl px-4 py-3 text-sm">
            <p className="text-xs text-muted-foreground mb-1">⚠️ El slug no podrá modificarse. La URL de los informes comenzará por:</p>
            <p className="font-mono text-foreground">
              informes.immoral.es/<strong>{slugPreview ?? "…"}</strong>/
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending || !!slugError || !slugPreview}>
              {isPending ? "Creando…" : "Crear espacio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
