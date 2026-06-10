"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { NewClientWithVerticalDialog } from "@/components/clients/NewClientWithVerticalDialog";
import { ClientTransitionLink } from "@/components/shared/ClientTransitionLink";

interface ClientRow {
  id: string;
  name: string;
  logo_signed_url: string | null;
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
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const PAGE_SIZE = 24;

  const filteredClients = useMemo(() => {
    if (!query.trim()) return clients;
    const q = query.toLowerCase();
    return clients.filter((c) => 
      c.name.toLowerCase().includes(q) || 
      (c.contact_name && c.contact_name.toLowerCase().includes(q))
    );
  }, [clients, query]);

  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const paginatedClients = filteredClients.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nombre o contacto..." 
            className="pl-9 bg-card"
            value={query}
            onChange={handleQueryChange}
          />
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl font-semibold w-full sm:w-auto">
          + Nuevo cliente
        </Button>
      </div>

      {filteredClients.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          {clients.length === 0 
            ? (isAdmin ? "No hay clientes creados todavía." : "No has creado ningún cliente todavía.")
            : "No hay clientes que coincidan con la búsqueda."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {paginatedClients.map((c) => (
            <ClientTransitionLink
              key={c.id}
              href={`/clientes/${c.id}`}
              clientLogoUrl={c.logo_signed_url}
              clientName={c.name}
              className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-primary transition-colors"
            >
              {c.logo_signed_url ? (
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.logo_signed_url} alt={c.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
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
            </ClientTransitionLink>
          ))}
        </div>
      )}

      {filteredClients.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filteredClients.length)} de {filteredClients.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium px-2">
              {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {showForm && (
        <NewClientWithVerticalDialog
          onClose={() => setShowForm(false)}
          onCreated={(r) => {
            setShowForm(false);
            router.push(`/clientes/${r.clientId}`);
          }}
        />
      )}
    </div>
  );
}
