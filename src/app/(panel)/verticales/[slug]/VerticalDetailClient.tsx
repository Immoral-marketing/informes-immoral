"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, FileText, Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { ClientTransitionLink } from "@/components/shared/ClientTransitionLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateClientlessReportForm } from "@/components/reports/CreateClientlessReportForm";
import { PinModal } from "@/components/reports/PinModal";

interface Space {
  id: string;
  slug: string;
  client_id: string;
  client_name: string;
  client_logo_signed_url?: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  reports_count: number;
}

interface Vertical {
  id: string;
  name: string;
  slug: string;
  logo_signed_url: string | null;
  color_hex: string;
}

interface DossierReport {
  id: string;
  name: string;
  slug: string;
  namespace_slug: string;
  created_at: string;
}

export default function VerticalDetailClient({
  vertical,
  spaces,
  dossiers,
}: {
  vertical: Vertical;
  spaces: Space[];
  dossiers: DossierReport[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pinData, setPinData] = useState<{ id: string; pin: string } | null>(null);

  const filtered = spaces.filter((s) => {
    const term = search.toLowerCase();
    return (
      s.client_name.toLowerCase().includes(term) ||
      (s.contact_name && s.contact_name.toLowerCase().includes(term)) ||
      (s.contact_email && s.contact_email.toLowerCase().includes(term))
    );
  });

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);



  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* ── Header de Vertical ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-card border shadow-sm">
        <div
          className="absolute top-0 right-0 w-2 h-full"
          style={{ backgroundColor: vertical.color_hex }}
        />
        <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-10 sm:h-12 w-10 sm:w-12 flex-shrink-0 flex items-center justify-center">
              {vertical.logo_signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vertical.logo_signed_url} alt={vertical.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-3xl font-extrabold" style={{ color: vertical.color_hex }}>
                  {vertical.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">{vertical.name}</h1>
              <p className="text-muted-foreground text-sm">
                Administración de informes y espacios de cliente en esta vertical.
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateForm(true)}
            className="rounded-xl font-semibold gap-2 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Nuevo informe sin cliente
          </Button>
        </div>
      </div>

      {/* ── Informes sin cliente ────────────────────────────────────────────────── */}
      {dossiers.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-foreground">Informes de la vertical (sin cliente)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dossiers.map((d) => (
              <Card key={d.id} className="p-5 flex flex-col gap-3 hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col">
                    <h3 className="font-semibold text-foreground break-words">{d.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      /{d.namespace_slug}/{d.slug}
                    </p>
                  </div>
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                  <Button asChild variant="secondary" size="sm" className="rounded-xl">
                    <Link href={`/${d.namespace_slug}/${d.slug}`}>
                      Ver informe
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Clientes con informes ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 pt-4 border-t">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Clientes con informes</h2>
          <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente…"
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        </div>

        {/* ── Grid/Table de Espacios ────────────────────────────────────────────── */}
        {spaces.length === 0 ? (
        <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center gap-4">
          <p className="text-muted-foreground text-sm">No hay clientes con informes en esta vertical.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          Sin coincidencias.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Table for sm and above */}
          <div className="hidden sm:block rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Informes</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-3">
                        {s.client_logo_signed_url ? (
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={s.client_logo_signed_url} alt={s.client_name} className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {s.client_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span>{s.client_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{s.contact_name || "—"}</TableCell>
                    <TableCell>{s.contact_email || "—"}</TableCell>
                    <TableCell>{s.contact_phone || "—"}</TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex items-center justify-center bg-secondary text-secondary-foreground font-semibold px-2.5 py-0.5 rounded-full text-xs">
                        {s.reports_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <ClientTransitionLink
                        href={`/clientes/${s.client_id}`}
                        clientLogoUrl={s.client_logo_signed_url ?? null}
                        clientName={s.client_name}
                        className="inline-flex items-center justify-center text-sm font-medium h-8 px-3 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        Ver informes
                      </ClientTransitionLink>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Cards for mobile */}
          <div className="grid gap-4 sm:hidden">
            {pageItems.map((s) => (
              <Card key={s.id} className="p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {s.client_logo_signed_url ? (
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.client_logo_signed_url} alt={s.client_name} className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {s.client_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <h3 className="font-bold text-base text-foreground">{s.client_name}</h3>
                  </div>
                  <span className="shrink-0 inline-flex items-center justify-center bg-secondary text-secondary-foreground font-semibold px-2 py-0.5 rounded-full text-xs gap-1">
                    <FileText className="w-3 h-3" />
                    {s.reports_count}
                  </span>
                </div>
                
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  {s.contact_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 shrink-0" />
                      <span className="truncate">{s.contact_name}</span>
                    </div>
                  )}
                  {s.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 shrink-0" />
                      <span className="truncate">{s.contact_email}</span>
                    </div>
                  )}
                  {s.contact_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 shrink-0" />
                      <span>{s.contact_phone}</span>
                    </div>
                  )}
                  {(!s.contact_name && !s.contact_email && !s.contact_phone) && (
                    <div className="italic opacity-70">Sin datos de contacto</div>
                  )}
                </div>

                <ClientTransitionLink
                  href={`/clientes/${s.client_id}`}
                  clientLogoUrl={s.client_logo_signed_url ?? null}
                  clientName={s.client_name}
                  className="w-full rounded-xl mt-1 inline-flex items-center justify-center text-sm font-medium h-10 px-4 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Ver informes
                </ClientTransitionLink>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>
                <span className="text-sm font-medium px-2">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded-xl"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4 sm:ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {showCreateForm && (
        <CreateClientlessReportForm
          verticalId={vertical.id}
          verticalSlug={vertical.slug}
          onClose={() => setShowCreateForm(false)}
          onCreated={(reportId, pin) => {
            setShowCreateForm(false);
            if (pin) {
              setPinData({ id: reportId, pin });
            } else {
              router.push(`/informes/${reportId}`);
            }
          }}
        />
      )}

      {pinData && (
        <PinModal
          pin={pinData.pin}
          warning="Este informe requiere PIN para ser visualizado."
          onClose={() => {
            setPinData(null);
            router.push(`/informes/${pinData.id}`);
          }}
        />
      )}
    </div>
  );
}
