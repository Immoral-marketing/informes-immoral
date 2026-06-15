import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { getSignedClientLogoUrl } from "@/app/(panel)/clientes/actions";
import { getSignedLogoUrl } from "../../admin/verticales/actions";
import ClientDetailClient from "./ClientDetailClient";
import ClientReportsTable from "./ClientReportsTable";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;
  const isAdmin = profile?.role === "admin";

  const { data: rawClient } = await supabaseAdmin
    .from("clients")
    .select("id, name, logo_url, contact_name, contact_phone, contact_whatsapp, created_by")
    .eq("id", id)
    .single();

  const client = rawClient as {
    id: string;
    name: string;
    logo_url: string | null;
    contact_name: string | null;
    contact_phone: string | null;
    contact_whatsapp: string | null;
    created_by: string;
  } | null;

  if (!client) notFound();
  if (!isAdmin && client.created_by !== user.id) notFound();

  const logo_signed_url = await getSignedClientLogoUrl(client.logo_url);
  const clientWithLogo = { ...client, logo_signed_url };

  const [{ data: rawRecipients }, { data: rawReports }, { data: rawVerticals }] = await Promise.all([
    supabaseAdmin
      .from("client_recipients")
      .select("id, email, full_name, role_label, is_primary, created_at")
      .eq("client_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at"),
    supabaseAdmin
      .from("reports")
      .select(`
        id, name, slug, current_version, created_at, updated_at,
        client_spaces!inner(slug, client_id, verticals(name, color_hex, logo_url))
      `)
      .eq("client_spaces.client_id", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("verticals")
      .select("id, name, color_hex, logo_url")
      .order("name"),
  ]);

  const recipients = (rawRecipients as unknown as Array<{
    id: string; email: string; full_name: string | null;
    role_label: string | null; is_primary: boolean; created_at: string;
  }>) ?? [];

  const reports = await Promise.all((rawReports as any[] ?? []).map(async r => {
    const logoUrl = r.client_spaces?.verticals?.logo_url;
    const signedLogoUrl = logoUrl ? await getSignedLogoUrl(logoUrl) : null;
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      current_version: r.current_version,
      created_at: r.created_at,
      updated_at: r.updated_at,
      vertical_name: r.client_spaces?.verticals?.name ?? "—",
      vertical_color: r.client_spaces?.verticals?.color_hex ?? "#ccc",
      vertical_logo_url: signedLogoUrl,
      space_slug: r.client_spaces?.slug ?? "",
    };
  }));

  const { data: rawSpaces } = await supabaseAdmin
    .from("client_spaces")
    .select("id, slug, verticals(name)")
    .eq("client_id", id);
    
  const spaces = (rawSpaces as unknown as Array<{
    id: string; slug: string; verticals: { name: string } | null;
  }>)?.map(s => ({
    id: s.id,
    slug: s.slug,
    vertical_name: s.verticals?.name ?? "—"
  })) ?? [];

  const verticals = (rawVerticals as unknown as Array<{
    id: string; name: string; color_hex: string;
  }>) ?? [];

  const canEdit = isAdmin || client.created_by === user.id;

  return (
    <div className="flex flex-col gap-6 w-full">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/" },
        { label: "Clientes", href: "/clientes" },
        { label: client.name }
      ]} />
      <ClientDetailClient
        client={clientWithLogo}
        recipients={recipients}
        spaces={spaces}
        reportsCount={reports.length}
        isAdmin={isAdmin}
        currentUserId={user.id}
      />
      <ClientReportsTable
        clientId={client.id}
        clientName={client.name}
        reports={reports}
        verticals={verticals}
        canEdit={canEdit}
      />
    </div>
  );
}
