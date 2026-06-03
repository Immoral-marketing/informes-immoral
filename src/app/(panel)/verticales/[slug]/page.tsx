import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedLogoUrl } from "../../admin/verticales/actions";
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
    .select("id, slug, created_by, clients(id, name, contact_name, contact_phone, contact_whatsapp), client_recipients:clients(client_recipients(email, is_primary))")
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
      contact_name: string | null;
      contact_phone: string | null;
      contact_whatsapp: string | null;
    } | null;
    client_recipients: Array<{ email: string; is_primary: boolean }> | null;
  }> | null) ?? [];

  const formattedSpaces = spaces.map((s) => {
    // Attempt to extract primary email
    let email = null;
    if (s.client_recipients && Array.isArray(s.client_recipients)) {
      const primary = s.client_recipients.find(r => r.is_primary) || s.client_recipients[0];
      if (primary) email = primary.email;
    }

    return {
      id: s.id,
      slug: s.slug,
      client_name: s.clients?.name ?? "Cliente Desconocido",
      contact_name: s.clients?.contact_name ?? null,
      contact_phone: s.clients?.contact_phone ?? null,
      contact_whatsapp: s.clients?.contact_whatsapp ?? null,
      contact_email: email,
    };
  });

  return (
    <VerticalDetailClient
      vertical={{ ...vertical, logo_signed_url: logoUrl }}
      spaces={formattedSpaces}
    />
  );
}
