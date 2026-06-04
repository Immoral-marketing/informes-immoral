"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
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

      {showForm && (
        <NewClientWithVerticalDialog
          onClose={() => setShowForm(false)}
          onCreated={(r) => {
            setShowForm(false);
            router.push(`/espacios/${r.spaceId}`);
          }}
        />
      )}
    </div>
  );
}
