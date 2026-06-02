"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSpace, deleteSpace, getSlugPreview } from "../../espacios/actions";

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
  verticals: { name: string; color_hex: string } | null;
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

  function handleDelete(space: Space) {
    if (!confirm(`¿Eliminar el espacio "/${space.slug}"?`)) return;
    startTransition(async () => {
      const result = await deleteSpace(space.id, clientId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSpaces((prev) => prev.filter((s) => s.id !== space.id));
        setError(null);
      }
    });
  }

  return (
    <section className="bg-white rounded-2xl border border-[--color-gray-light] p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-[--color-black]">Espacios</h2>
        {canEdit && availableVerticals.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-[--color-brand] hover:underline"
          >
            + Nuevo espacio
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>
      )}

      {spaces.length === 0 ? (
        <p className="text-sm text-[--color-gray-mid]">No hay espacios creados todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {spaces.map((s) => (
            <li key={s.id} className="flex items-center gap-3 py-2 border-b border-[--color-gray-light] last:border-0">
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: s.verticals?.color_hex ?? "#ccc" }}
              />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/espacios/${s.id}`}
                  className="text-sm font-medium text-[--color-black] hover:text-[--color-brand] truncate block"
                >
                  {s.verticals?.name ?? "—"} · <span className="font-mono text-xs text-[--color-gray-mid]">/{s.slug}</span>
                </Link>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(s)}
                  disabled={isPending}
                  className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 shrink-0"
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
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
  useState(() => {
    getSlugPreview(clientName).then((r) => {
      if ("slug" in r) setSlugPreview(r.slug);
      else setSlugError(r.error);
    });
  });

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
          verticals: selectedVertical
            ? { name: selectedVertical.name, color_hex: selectedVertical.color_hex }
            : null,
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[--color-black]">Nuevo espacio</h2>
          <button onClick={onClose} className="text-[--color-gray-mid] text-xl">×</button>
        </div>

        {(error ?? slugError) && (
          <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error ?? slugError}</p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Vertical selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[--color-gray-mid]">Vertical *</label>
            <select
              value={verticalId}
              onChange={(e) => setVerticalId(e.target.value)}
              required
              className="border border-[--color-gray-light] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[--color-brand]"
            >
              {verticals.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          {/* Slug preview */}
          <div className="bg-[--color-gray-light]/50 rounded-xl px-4 py-3 text-sm">
            <p className="text-xs text-[--color-gray-mid] mb-1">⚠️ El slug no podrá modificarse. La URL de los informes comenzará por:</p>
            <p className="font-mono text-[--color-black]">
              informes.immoral.es/<strong>{slugPreview ?? "…"}</strong>/
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="text-sm text-[--color-gray-mid] px-4 py-2 rounded-xl hover:bg-[--color-gray-light]">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !!slugError || !slugPreview}
              className="bg-[--color-brand] text-white font-semibold text-sm rounded-xl px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
            >
              {isPending ? "Creando…" : "Crear espacio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
