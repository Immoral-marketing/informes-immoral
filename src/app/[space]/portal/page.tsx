import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
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
    .from("client_spaces")
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

async function getSpacePortalData(spaceSlug: string, sessionValid: boolean) {
  const supabaseAdmin = createAdminClient();

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("id, clients(name, logo_url)")
    .eq("slug", spaceSlug)
    .single();

  if (!space) return null;
  const s = space as unknown as { id: string; clients: { name: string; logo_url: string | null } | null };

  const clientName = s.clients?.name ?? "Cliente";
  const clientLogoUrl = await getSignedClientLogoUrl(s.clients?.logo_url ?? null);

  type PortalReportRow = { id: string; name: string; slug: string; updated_at: string; verticals: { name: string; color_hex: string } | null };
  let reportsData: PortalReportRow[] = [];

  if (sessionValid) {
    const { data: reports } = await supabaseAdmin
      .from("reports")
      .select("id, name, slug, updated_at, verticals(name, color_hex)")
      .eq("space_id", s.id)
      .not("current_version", "is", null)
      .order("updated_at", { ascending: false });

    reportsData = (reports ?? []) as unknown as PortalReportRow[];
  }

  return {
    id: s.id,
    slug: spaceSlug,
    clientName,
    clientLogoUrl,
    reports: reportsData as Array<{ id: string; name: string; slug: string; updated_at: string; verticals: { name: string; color_hex: string } | null }>,
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

  // We need spaceId to check session, so we fetch space first but we can do it efficiently
  const supabaseAdmin = createAdminClient();
  const { data: spaceData } = await supabaseAdmin
    .from("client_spaces")
    .select("id")
    .eq("slug", space)
    .single();
  
  if (!spaceData) notFound();

  const sessionValid = await hasValidPortalSession(spaceData.id);
  const data = await getSpacePortalData(space, sessionValid);
  if (!data) notFound();

  return (
    <PortalClient 
      space={data}
      sessionValid={sessionValid}
      {...(error ? { errorParam: error } : {})}
    />
  );
}
