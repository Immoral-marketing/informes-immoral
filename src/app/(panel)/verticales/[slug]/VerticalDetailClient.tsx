"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { User, Phone, Mail, MessageSquare, Search, Plus } from "lucide-react";
import QuickCreateModal from "@/components/shared/QuickCreateModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Space {
  id: string;
  slug: string;
  client_name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
}

interface Vertical {
  id: string;
  name: string;
  slug: string;
  logo_signed_url: string | null;
  color_hex: string;
}

export default function VerticalDetailClient({
  vertical,
  spaces,
}: {
  vertical: Vertical;
  spaces: Space[];
}) {
  const [search, setSearch] = useState("");
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const filtered = spaces.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.client_name.toLowerCase().includes(term) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(term)) ||
      (s.contact_email && s.contact_email.toLowerCase().includes(term))
    );
  });

  return (
    <div className="flex flex-col gap-8 pb-8">
      {showQuickCreate && (
        <QuickCreateModal onClose={() => setShowQuickCreate(false)} />
      )}

      {/* ── Header de Vertical ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border shadow-sm">
        <div
          className="absolute top-0 right-0 w-2 h-full"
          style={{ backgroundColor: vertical.color_hex }}
        />
        <div className="p-8 sm:p-10 flex flex-col items-center justify-center gap-6">
          <div className="h-20 sm:h-24 flex items-center justify-center">
            {vertical.logo_signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vertical.logo_signed_url} alt={vertical.name} className="max-h-full max-w-[80%] object-contain" />
            ) : (
              <span className="text-5xl font-extrabold" style={{ color: vertical.color_hex }}>
                {vertical.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-center max-w-lg">
            <h1 className="text-2xl font-bold text-foreground sr-only">{vertical.name}</h1>
            <p className="text-muted-foreground text-sm">
              Administración de espacios de cliente en esta vertical.
            </p>
          </div>
        </div>
      </div>

      {/* ── Buscador y Controles ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, contacto…"
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setShowQuickCreate(true)} className="rounded-xl font-semibold shrink-0 w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" /> Nuevo espacio
        </Button>
      </div>

      {/* ── Grid de Espacios ──────────────────────────────────────────────────── */}
      {spaces.length === 0 ? (
        <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center gap-4">
          <p className="text-muted-foreground text-sm">No hay espacios en esta vertical.</p>
          <Button variant="link" onClick={() => setShowQuickCreate(true)} className="text-primary font-semibold">
            Crear primer espacio →
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Sin coincidencias.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.id} className="p-6 flex flex-col gap-5 hover:border-primary/40 transition-colors">
              <div className="flex-1">
                <h3 className="font-bold text-lg text-foreground mb-4">{s.client_name}</h3>
                <div className="flex flex-col gap-2.5">
                  {s.contact_name && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <User className="w-4 h-4 shrink-0" />
                      <span className="truncate">{s.contact_name}</span>
                    </div>
                  )}
                  {s.contact_email && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="truncate">{s.contact_email}</span>
                    </div>
                  )}
                  {s.contact_phone && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{s.contact_phone}</span>
                    </div>
                  )}
                  {s.contact_whatsapp && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>{s.contact_whatsapp}</span>
                    </div>
                  )}
                  {(!s.contact_name && !s.contact_email && !s.contact_phone && !s.contact_whatsapp) && (
                    <div className="text-sm text-muted-foreground/60 italic">Sin datos de contacto</div>
                  )}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                <Link href={`/espacios/${s.id}`}>
                  Ver informes
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
