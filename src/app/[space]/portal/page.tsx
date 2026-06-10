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

async function hasValidPortalSession(spaceId: string) {
  const cookieStore = await cookies();
  const supabaseAdmin = createAdminClient();

  // 1. Try portal_session (space-scoped)
  const portalToken = cookieStore.get("portal_session")?.value;
  if (portalToken) {
    try {
      const portalHash = hashToken(portalToken);
      const { data } = await supabaseAdmin
        .from("portal_sessions")
        .select("expires_at")
        .eq("space_id", spaceId)
        .eq("session_token_hash", portalHash)
        .single();
      if (data && new Date(data.expires_at) > new Date()) return true;
    } catch { /* ignore */ }
  }

  // 2. Try informes_session — if the user authenticated via PIN or magic link for any report
  //    in this space, they should also have access to the portal
  const docToken = cookieStore.get("informes_session")?.value;
  if (docToken) {
    try {
      const docHash = hashToken(docToken);
      const { data } = await supabaseAdmin
        .from("report_sessions")
        .select("expires_at, reports!inner(space_id)")
        .eq("token_hash", docHash)
        .single();
      const session = data as unknown as { expires_at: string; reports: { space_id: string } } | null;
      if (session && session.reports?.space_id === spaceId && new Date(session.expires_at) > new Date()) {
        return true;
      }
    } catch { /* ignore */ }
  }

  return false;
}

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

  let reportsData: any[] = [];
  
  if (sessionValid) {
    const { data: reports } = await supabaseAdmin
      .from("reports")
      .select("id, name, slug, updated_at, verticals(name, color_hex)")
      .eq("space_id", s.id)
      .not("current_version", "is", null) // only with published version
      .order("updated_at", { ascending: false });
    
    reportsData = reports ?? [];
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
