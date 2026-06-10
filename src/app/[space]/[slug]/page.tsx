import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
import { getSignedClientLogoUrl } from "@/app/(panel)/clientes/actions";
import ViewerShell from "./ViewerShell";

interface ReportInfo {
  id: string;
  name: string;
  slug: string;
  current_version: number;
  space_id: string;
  client_name: string;
  client_logo_signed_url: string | null;
  attachments: Array<{ id: string; filename: string; size_bytes: number; mime_type: string }>;
}

async function getReportBySlug(spaceSlug: string, reportSlug: string): Promise<ReportInfo | null> {
  const supabaseAdmin = createAdminClient();

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("id, clients(name, logo_url)")
    .eq("slug", spaceSlug)
    .single();
  if (!space) return null;
  const spaceTyped = space as unknown as { id: string; clients: { name: string; logo_url: string | null } | null };
  const spaceId = spaceTyped.id;

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, name, slug, current_version, space_id")
    .eq("space_id", spaceId)
    .eq("slug", reportSlug)
    .single();
  if (!report) return null;
  const r = report as { id: string; name: string; slug: string; current_version: number; space_id: string };

  const { data: attachments } = await supabaseAdmin
    .from("report_attachments")
    .select("id, filename, size_bytes, mime_type")
    .eq("report_id", r.id)
    .order("display_order")
    .order("created_at");

  const clientName = spaceTyped.clients?.name ?? "Cliente";
  const clientLogoUrl = await getSignedClientLogoUrl(spaceTyped.clients?.logo_url ?? null);

  return {
    ...r,
    client_name: clientName,
    client_logo_signed_url: clientLogoUrl,
    attachments: (attachments as unknown as typeof r extends never ? never : Array<{ id: string; filename: string; size_bytes: number; mime_type: string }>) ?? [],
  };
}

async function hasValidSession(reportId: string, spaceId: string): Promise<boolean> {
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
        .eq("report_id", reportId)
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
        .eq("space_id", spaceId)
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

  const sessionValid = await hasValidSession(report.id, report.space_id);

  return (
    <ViewerShell
      report={report}
      sessionValid={sessionValid}
      linkExpired={errorParam === "link_expired"}
      spaceSlug={space}
    />
  );
}
