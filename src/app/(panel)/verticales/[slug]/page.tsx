import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
import { getSignedLogoUrl } from "../../admin/verticales/actions";
import { getSignedClientLogoUrl } from "@/app/(panel)/clientes/actions";
import VerticalDetailClient from "./VerticalDetailClient";

export default async function VerticalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = profile?.role === "admin";

  const { data: vRaw } = await supabaseAdmin
    .from("verticals")
    .select("id, name, slug, logo_url, color_hex")
    .eq("slug", slug)
    .single();

  const vertical = vRaw as { id: string; name: string; slug: string; logo_url: string | null; color_hex: string } | null;
  if (!vertical) notFound();

  const logoUrl = vertical.logo_url ? await getSignedLogoUrl(vertical.logo_url) : null;

  let spacesQuery = supabaseAdmin
    .from("client_spaces")
    .select("id, slug, created_by, clients(id, name, logo_url, contact_name, contact_phone), client_recipients:clients(client_recipients(email, is_primary)), reports(count)")
    .eq("vertical_id", vertical.id)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    spacesQuery = spacesQuery.eq("created_by", user.id);
  }

  const { data: spacesRaw } = await spacesQuery;

  // Format spaces
  const spaces = (spacesRaw as unknown as Array<{
    id: string;
    slug: string;
    created_by: string;
    clients: {
      id: string;
      name: string;
      logo_url: string | null;
      contact_name: string | null;
      contact_phone: string | null;
    } | null;
    client_recipients: Array<{ email: string; is_primary: boolean }> | null;
    reports: [{ count: number }] | null;
  }> | null) ?? [];

  const formattedSpaces = await Promise.all(spaces.map(async (s) => {
    // Attempt to extract primary email
    let email = null;
    if (s.client_recipients && Array.isArray(s.client_recipients)) {
      const primary = s.client_recipients.find(r => r.is_primary) || s.client_recipients[0];
      if (primary) email = primary.email;
    }

    const clientLogoUrl = await getSignedClientLogoUrl(s.clients?.logo_url || null);

    return {
      id: s.id,
      slug: s.slug,
      client_id: s.clients?.id ?? "",
      client_name: s.clients?.name ?? "Cliente Desconocido",
      client_logo_signed_url: clientLogoUrl,
      contact_name: s.clients?.contact_name ?? null,
      contact_phone: s.clients?.contact_phone ?? null,
      contact_email: email,
      reports_count: s.reports?.[0]?.count ?? 0,
    };
  }));

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/" },
        { label: "Verticales", ...(isAdmin ? { href: "/admin/verticales" } : {}) },
        { label: vertical.name }
      ]} />
      <VerticalDetailClient
        vertical={{ ...vertical, logo_signed_url: logoUrl }}
        spaces={formattedSpaces}
      />
    </div>
  );
}
