import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedClientLogoUrl } from "@/app/(panel)/clientes/actions";
import PortalClient from "./PortalClient";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ space: string }>;
}): Promise<Metadata> {
  const { space } = await params;
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("report_namespaces")
    .select("clients(name)")
    .eq("slug", space)
    .single();
  const s = data as unknown as { clients: { name: string } | null };
  const name = s?.clients?.name ?? "Cliente";
  return {
    title: `Portal de ${name} | Immoral`,
    description: "Portal de documentos compartidos",
  };
}

import { hasValidPortalSession } from "@/lib/portal/session";

async function getSpacePortalData(namespaceSlug: string, clientId: string, sessionValid: boolean) {
  const supabaseAdmin = createAdminClient();

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("name, logo_url")
    .eq("id", clientId)
    .single();

  const clientName = client?.name ?? "Cliente";
  const clientLogoUrl = await getSignedClientLogoUrl(client?.logo_url ?? null);

  type PortalReportRow = { id: string; name: string; slug: string; updated_at: string; verticals: { name: string; color_hex: string } | null };
  let reportsData: PortalReportRow[] = [];

  if (sessionValid) {
    const { data: reports } = await supabaseAdmin
      .from("reports")
      .select("id, name, slug, updated_at, verticals(name, color_hex)")
      .eq("namespace_slug", namespaceSlug)
      .not("current_version", "is", null)
      .order("updated_at", { ascending: false });

    reportsData = (reports ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      updated_at: r.updated_at,
      verticals: r.verticals as unknown as { name: string; color_hex: string } | null,
    }));
  }

  return {
    slug: namespaceSlug,
    clientName,
    clientLogoUrl,
    reports: reportsData,
  };
}

export default async function PortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ space: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { space } = await params;
  const { error } = await searchParams;

  const supabaseAdmin = createAdminClient();
  const { data: namespace } = await supabaseAdmin
    .from("report_namespaces")
    .select("entity_type, client_id")
    .eq("slug", space)
    .single();
  
  if (!namespace || namespace.entity_type === "vertical" || !namespace.client_id) notFound();

  const sessionValid = await hasValidPortalSession(space);
  const data = await getSpacePortalData(space, namespace.client_id, sessionValid);
  if (!data) notFound();

  return (
    <PortalClient 
      space={data}
      sessionValid={sessionValid}
      {...(error ? { errorParam: error } : {})}
    />
  );
}
