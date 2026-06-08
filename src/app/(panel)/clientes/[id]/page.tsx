import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { getSignedClientLogoUrl } from "@/app/(panel)/clientes/actions";
import { getSignedLogoUrl } from "../../admin/verticales/actions";
import ClientDetailClient from "./ClientDetailClient";
import SpacesSection from "./SpacesSection";

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

  const [{ data: rawRecipients }, { data: rawSpaces }, { data: rawVerticals }] = await Promise.all([
    supabaseAdmin
      .from("client_recipients")
      .select("id, email, full_name, role_label, is_primary, created_at")
      .eq("client_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at"),
    supabaseAdmin
      .from("client_spaces")
      .select("id, slug, vertical_id, created_at, verticals(id, name, slug, logo_url, color_hex), reports(count)")
      .eq("client_id", id)
      .order("created_at"),
    supabaseAdmin
      .from("verticals")
      .select("id, name, color_hex")
      .order("name"),
  ]);

  const recipients = (rawRecipients as unknown as Array<{
    id: string; email: string; full_name: string | null;
    role_label: string | null; is_primary: boolean; created_at: string;
  }>) ?? [];

  const spaces = await Promise.all(
    (rawSpaces as unknown as Array<{
      id: string;
      slug: string;
      vertical_id: string;
      created_at: string;
      verticals: { id: string; name: string; slug: string; logo_url: string | null; color_hex: string } | null;
      reports: { count: number }[];
    }> ?? []).map(async (s) => {
      const logoSignedUrl = s.verticals?.logo_url ? await getSignedLogoUrl(s.verticals.logo_url) : null;
      const reportsCount = s.reports?.[0]?.count ?? 0;
      return {
        id: s.id,
        slug: s.slug,
        vertical_id: s.vertical_id,
        created_at: s.created_at,
        vertical_name: s.verticals?.name ?? "—",
        vertical_color: s.verticals?.color_hex ?? "#ccc",
        logo_signed_url: logoSignedUrl,
        reports_count: reportsCount,
      };
    })
  );

  const verticals = (rawVerticals as unknown as Array<{
    id: string; name: string; color_hex: string;
  }>) ?? [];

  const canEdit = isAdmin || client.created_by === user.id;

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/" },
        { label: "Clientes", href: "/clientes" },
        { label: client.name }
      ]} />
      <ClientDetailClient
        client={clientWithLogo}
        recipients={recipients}
        isAdmin={isAdmin}
        currentUserId={user.id}
      />
      <SpacesSection
        clientId={client.id}
        clientName={client.name}
        spaces={spaces}
        verticals={verticals}
        canEdit={canEdit}
      />
    </div>
  );
}
