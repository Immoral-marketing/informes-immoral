import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { getSignedClientLogoUrl } from "./actions";
import ClientesClient from "./ClientesClient";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;
  const isAdmin = profile?.role === "admin";

  // Clients query — with counts
  let query = supabaseAdmin
    .from("clients")
    .select(`
      id, name, logo_url, contact_name, created_by, created_at,
      profiles(full_name),
      client_recipients(count),
      client_spaces(count)
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query = query.eq("created_by", user.id);
  }

  const { data: raw } = await query;
  const clientsRaw = (raw as unknown as Array<{
    id: string;
    name: string;
    logo_url: string | null;
    contact_name: string | null;
    created_by: string;
    created_at: string;
    profiles: { full_name: string | null } | null;
    client_recipients: [{ count: number }];
    client_spaces: [{ count: number }];
  }>) ?? [];

  const clients = await Promise.all(
    clientsRaw.map(async (c) => ({
      ...c,
      logo_signed_url: await getSignedClientLogoUrl(c.logo_url),
    }))
  );

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: "Dashboard", href: "/" }, { label: "Clientes" }]} />
      <h1 className="text-2xl font-extrabold text-foreground">Clientes</h1>
      <ClientesClient clients={clients} isAdmin={isAdmin} />
    </div>
  );
}
