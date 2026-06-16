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

  let reportsQuery = supabaseAdmin
    .from("reports")
    .select(`
      id, name, slug, created_at, namespace_slug,
      report_namespaces (
        entity_type,
        clients (
          id, name, logo_url, contact_name, contact_phone,
          client_recipients ( email, is_primary )
        )
      )
    `)
    .eq("vertical_id", vertical.id)
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    reportsQuery = reportsQuery.eq("created_by", user.id);
  }

  const { data: reportsRaw } = await reportsQuery;
  const reportsList = (reportsRaw as any[]) || [];

  const clientGroups = new Map<string, any>();
  const dossiers: Array<{ id: string; name: string; slug: string; namespace_slug: string; created_at: string }> = [];

  for (const r of reportsList) {
    const ns = r.report_namespaces;
    if (!ns) continue;
    if (ns.entity_type === "vertical") {
      dossiers.push({
        id: r.id,
        name: r.name,
        slug: r.slug,
        namespace_slug: r.namespace_slug,
        created_at: r.created_at,
      });
    } else if (ns.entity_type === "client" && ns.clients) {
      if (!clientGroups.has(ns.clients.id)) {
        clientGroups.set(ns.clients.id, {
          client: ns.clients,
          count: 0,
        });
      }
      clientGroups.get(ns.clients.id).count++;
    }
  }

  const formattedSpaces = await Promise.all(Array.from(clientGroups.values()).map(async (g) => {
    const c = g.client;
    let email = null;
    if (c.client_recipients && Array.isArray(c.client_recipients)) {
      const primary = c.client_recipients.find((r: any) => r.is_primary) || c.client_recipients[0];
      if (primary) email = primary.email;
    }
    const clientLogoUrl = await getSignedClientLogoUrl(c.logo_url || null);
    return {
      id: c.id,
      slug: c.id,
      client_id: c.id,
      client_name: c.name ?? "Cliente Desconocido",
      client_logo_signed_url: clientLogoUrl,
      contact_name: c.contact_name ?? null,
      contact_phone: c.contact_phone ?? null,
      contact_email: email,
      reports_count: g.count,
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
        dossiers={dossiers}
      />
    </div>
  );
}
