"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { slugify } from "@/lib/utils/slugify";
import { createVertical, updateVertical, deleteVertical, checkSlug } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Vertical {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  logo_signed_url: string | null;
  color_hex: string;
  created_by: string;
  profiles: { full_name: string | null } | null;
}

interface VerticalesClientProps {
  verticals: Vertical[];
}

export default function VerticalesClient({ verticals: initial }: VerticalesClientProps) {
  const [verticals, setVerticals] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Vertical | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function openCreate() { setEditTarget(null); setShowForm(true); setError(null); }
  function openEdit(v: Vertical) { setEditTarget(v); setShowForm(true); setError(null); }
  function closeForm() { setShowForm(false); setEditTarget(null); setError(null); }

  function handleSaved() {
    closeForm();
    window.location.reload(); // refresh server data (logo signed URLs)
  }

  function confirmDelete(id: string, name: string) {
    setDeleteConfirm({ id, name });
  }

  function handleDelete() {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    startTransition(async () => {
      const result = await deleteVertical(id);
      if ("error" in result) {
        setError(result.error);
      } else {
        setVerticals((prev) => prev.filter((v) => v.id !== id));
      }
      setDeleteConfirm(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3 border border-destructive/20">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={openCreate} className="font-semibold text-sm rounded-xl px-4 py-2">
          + Nuevo vertical
        </Button>
      </div>

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {verticals.map((v) => (
          <div key={v.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
              style={{ backgroundColor: v.color_hex + "22" }}
            >
              {v.logo_signed_url ? (
                <Image src={v.logo_signed_url} alt={v.name} width={32} height={32} className="object-contain" />
              ) : (
                <span className="text-lg font-bold" style={{ color: v.color_hex }}>
                  {v.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{v.name}</p>
              <p className="text-xs text-muted-foreground truncate">/{v.slug}</p>
              {v.profiles?.full_name && (
                <p className="text-xs text-muted-foreground truncate">por {v.profiles.full_name}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEdit(v)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 h-auto"
              >
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => confirmDelete(v.id, v.name)}
                disabled={isPending}
                className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors px-2 py-1 h-auto disabled:opacity-40"
              >
                Eliminar
              </Button>
            </div>
          </div>
        ))}
        {verticals.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground text-center py-8">
            No hay verticales creados todavía.
          </p>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <VerticalFormModal
          vertical={editTarget}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      {/* Alert Dialog Delete */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar el vertical &quot;{deleteConfirm?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán los datos asociados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete(); }} disabled={isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function VerticalFormModal({
  vertical,
  onClose,
  onSaved,
}: {
  vertical: Vertical | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(vertical?.name ?? "");
  const [colorHex, setColorHex] = useState(vertical?.color_hex ?? "#000000");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(vertical?.logo_signed_url ?? null);
  const [slugPreview, setSlugPreview] = useState(vertical?.slug ?? "");
  const [slugExists, setSlugExists] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const isEdit = !!vertical;

  async function handleNameChange(val: string) {
    setName(val);
    if (!isEdit) {
      const s = slugify(val);
      setSlugPreview(s);
      if (s) {
        const exists = await checkSlug(val);
        setSlugExists(exists);
      } else {
        setSlugExists(false);
      }
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isEdit && (!logoFile || logoFile.size === 0)) {
      setError("El logo es obligatorio");
      return;
    }
    if (!isEdit && slugExists) {
      setError("Ya existe un vertical con ese slug");
      return;
    }

    const fd = new FormData();
    fd.append("name", name);
    fd.append("color_hex", colorHex);
    if (logoFile) fd.append("logo", logoFile);

    startTransition(async () => {
      const result = isEdit
        ? await updateVertical(vertical.id, fd)
        : await createVertical(fd);

      if ("error" in result) {
        setError(result.error);
      } else {
        onSaved();
      }
    });
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar vertical" : "Nuevo vertical"}</DialogTitle>
          <DialogDescription className="hidden">Formulario de vertical</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Nombre *</Label>
            <Input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="immoralia"
            />
            {!isEdit && slugPreview && (
              <p className={`text-xs ${slugExists ? "text-destructive" : "text-muted-foreground"}`}>
                Slug: /{slugPreview}{slugExists ? " — ya existe" : ""}
              </p>
            )}
            {isEdit && (
              <p className="text-xs text-muted-foreground">Slug: /{vertical.slug} (no editable)</p>
            )}
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Color *</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0 overflow-hidden"
              />
              <span className="text-sm text-muted-foreground font-mono">{colorHex}</span>
            </div>
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Logo {isEdit ? "(opcional — reemplaza el actual)" : "*"} — PNG o SVG, máx 2MB
            </Label>
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors bg-muted/50 min-h-[140px]"
              onClick={() => fileRef.current?.click()}
            >
              {logoPreview ? (
                <Image src={logoPreview} alt="preview" width={96} height={96} className="object-contain max-h-24" />
              ) : (
                <>
                  <span className="text-muted-foreground text-sm">Arrastra o haz clic para subir</span>
                  <span className="text-muted-foreground text-xs">PNG o SVG, máx 2MB</span>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/svg+xml"
              className="hidden"
              onChange={handleLogoChange}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || (!isEdit && slugExists)}
            >
              {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear vertical"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
