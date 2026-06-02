"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { slugify } from "@/lib/utils/slugify";
import { createVertical, updateVertical, deleteVertical, checkSlug } from "./actions";

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
  const [isPending, startTransition] = useTransition();

  function openCreate() { setEditTarget(null); setShowForm(true); setError(null); }
  function openEdit(v: Vertical) { setEditTarget(v); setShowForm(true); setError(null); }
  function closeForm() { setShowForm(false); setEditTarget(null); setError(null); }

  function handleSaved() {
    closeForm();
    window.location.reload(); // refresh server data (logo signed URLs)
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el vertical "${name}"? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      const result = await deleteVertical(id);
      if ("error" in result) {
        setError(result.error);
      } else {
        setVerticals((prev) => prev.filter((v) => v.id !== id));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-200">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={openCreate}
          className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 transition-colors"
        >
          + Nuevo vertical
        </button>
      </div>

      {/* List */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {verticals.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl border border-[--color-gray-light] p-4 flex items-center gap-3">
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
              <p className="font-semibold text-sm text-[--color-black] truncate">{v.name}</p>
              <p className="text-xs text-[--color-gray-mid] truncate">/{v.slug}</p>
              {v.profiles?.full_name && (
                <p className="text-xs text-[--color-gray-mid] truncate">por {v.profiles.full_name}</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => openEdit(v)}
                className="text-xs text-[--color-gray-mid] hover:text-[--color-brand] transition-colors px-2 py-1"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(v.id, v.name)}
                disabled={isPending}
                className="text-xs text-red-400 hover:text-red-600 transition-colors px-2 py-1 disabled:opacity-40"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {verticals.length === 0 && (
          <p className="col-span-full text-sm text-[--color-gray-mid] text-center py-8">
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
  const [colorHex, setColorHex] = useState(vertical?.color_hex ?? "#3980E4");
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">
            {isEdit ? "Editar vertical" : "Nuevo vertical"}
          </h2>
          <button onClick={onClose} className="text-[--color-gray-mid] hover:text-[--color-black] text-xl">×</button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[--color-gray-mid]">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="immoralia"
              className="border border-[--color-gray-light] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-brand]"
            />
            {!isEdit && slugPreview && (
              <p className={`text-xs ${slugExists ? "text-red-500" : "text-[--color-gray-mid]"}`}>
                Slug: /{slugPreview}{slugExists ? " — ya existe" : ""}
              </p>
            )}
            {isEdit && (
              <p className="text-xs text-[--color-gray-mid]">Slug: /{vertical.slug} (no editable)</p>
            )}
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[--color-gray-mid]">Color *</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                className="w-10 h-10 rounded-lg border border-[--color-gray-light] cursor-pointer"
              />
              <span className="text-sm text-[--color-gray-mid] font-mono">{colorHex}</span>
            </div>
          </div>

          {/* Logo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[--color-gray-mid]">
              Logo {isEdit ? "(opcional — reemplaza el actual)" : "*"} — PNG o SVG, máx 2MB
            </label>
            <div
              className="border-2 border-dashed border-[--color-gray-light] rounded-xl p-4 flex flex-col items-center gap-2 cursor-pointer hover:border-[--color-brand] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {logoPreview ? (
                <Image src={logoPreview} alt="preview" width={48} height={48} className="object-contain" />
              ) : (
                <span className="text-[--color-gray-mid] text-sm">Arrastra o haz clic para subir</span>
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

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[--color-gray-mid] px-4 py-2 rounded-xl hover:bg-[--color-gray-light] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || (!isEdit && slugExists)}
              className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear vertical"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
