import { notFound, permanentRedirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
import { getSignedClientLogoUrl } from "@/app/(panel)/clientes/actions";
import legacyRedirects from "@/lib/legacy-redirects.json";
import ViewerShell from "./ViewerShell";

interface ReportInfo {
  id: string;
  name: string;
  slug: string;
  current_version: number;
  namespace_slug: string | null;
  pin_hash: string | null;
  client_name: string;
  client_logo_signed_url: string | null;
  attachments: Array<{ id: string; filename: string; size_bytes: number; mime_type: string }>;
}

async function getReportBySlug(spaceSlug: string, reportSlug: string): Promise<ReportInfo & { entity_type: string } | null> {
  const supabaseAdmin = createAdminClient();

  const { data: namespace } = await supabaseAdmin
    .from("report_namespaces")
    .select("slug, entity_type, client_id, vertical_id")
    .eq("slug", spaceSlug)
    .single();

  let namespaceSlug = spaceSlug;
  let entityType = namespace?.entity_type;
  let clientId = namespace?.client_id;

  // Fallback 301 para legacy client_spaces
  if (!namespace) {
    const redirects: Record<string, string> = legacyRedirects;
    const clientSlug = redirects[spaceSlug];
    if (clientSlug) {
      permanentRedirect(`/${clientSlug}/${reportSlug}`);
    }
    return null;
  }

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, name, slug, current_version, namespace_slug, pin_hash")
    .eq("namespace_slug", namespaceSlug)
    .eq("slug", reportSlug)
    .single();

  if (!report) return null;
  const r = report as unknown as { id: string; name: string; slug: string; current_version: number; namespace_slug: string | null; pin_hash: string | null };

  const { data: attachments } = await supabaseAdmin
    .from("report_attachments")
    .select("id, filename, size_bytes, mime_type")
    .eq("report_id", r.id)
    .order("display_order")
    .order("created_at");

  let clientName = "Cliente";
  let clientLogoUrl = null;

  if (entityType === "client" && clientId) {
    const { data: client } = await supabaseAdmin
      .from("clients")
      .select("name, logo_url")
      .eq("id", clientId)
      .single();
    
    if (client) {
      clientName = client.name;
      clientLogoUrl = await getSignedClientLogoUrl(client.logo_url);
    }
  }

  return {
    ...r,
    entity_type: entityType,
    client_name: clientName,
    client_logo_signed_url: clientLogoUrl,
    attachments: (attachments as unknown as Array<{ id: string; filename: string; size_bytes: number; mime_type: string }>) ?? [],
  };
}

async function hasValidSession(report: ReportInfo & { entity_type: string | undefined }): Promise<boolean> {
  if (report.entity_type === "vertical" && report.pin_hash === null) {
    return true;
  }

  const cookieStore = await cookies();
  const supabaseAdmin = createAdminClient();

  // 1. Try document session
  const docToken = cookieStore.get("informes_session")?.value;
  if (docToken) {
    try {
      const docHash = hashToken(docToken);
      const { data } = await supabaseAdmin
        .from("report_sessions")
        .select("expires_at")
        .eq("report_id", report.id)
        .eq("token_hash", docHash)
        .single();
      if (data && new Date(data.expires_at) > new Date()) return true;
    } catch { /* ignore */ }
  }

  // 2. Try portal session
  const portalToken = cookieStore.get("portal_session")?.value;
  if (portalToken) {
    try {
      const portalHash = hashToken(portalToken);
      const { data } = await supabaseAdmin
        .from("portal_sessions")
        .select("expires_at")
        .eq("namespace_slug", report.namespace_slug)
        .eq("session_token_hash", portalHash)
        .single();
      if (data && new Date(data.expires_at) > new Date()) return true;
    } catch { /* ignore */ }
  }

  return false;
}

export default async function ViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ space: string; slug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { space, slug } = await params;
  const { error: errorParam } = await searchParams;

  const report = await getReportBySlug(space, slug);
  if (!report) notFound();

  const sessionValid = await hasValidSession(report);

  return (
    <ViewerShell
      report={report}
      sessionValid={sessionValid}
      linkExpired={errorParam === "link_expired"}
      spaceSlug={space}
      hidePortalLink={report.entity_type === "vertical"}
    />
  );
}
