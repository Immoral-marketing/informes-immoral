import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const query = supabaseAdmin
    .from("clients")
    .select(`
      id, name, contact_name, created_by, created_at,
      profiles(full_name),
      client_recipients(count),
      client_spaces(count)
    `)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.eq("created_by", user.id);
  }

  const { data: raw } = await query;
  const clients = (raw as unknown as Array<{
    id: string;
    name: string;
    contact_name: string | null;
    created_by: string;
    created_at: string;
    profiles: { full_name: string | null } | null;
    client_recipients: [{ count: number }];
    client_spaces: [{ count: number }];
  }>) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-foreground">Clientes</h1>
      <ClientesClient clients={clients} isAdmin={isAdmin} />
    </div>
  );
}
