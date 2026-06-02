import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
import ViewerShell from "./ViewerShell";

interface ReportInfo {
  id: string;
  name: string;
  slug: string;
  current_version: number;
  space_id: string;
  attachments: Array<{ id: string; filename: string; size_bytes: number; mime_type: string }>;
}

async function getReportBySlug(spaceSlug: string, reportSlug: string): Promise<ReportInfo | null> {
  const supabaseAdmin = createAdminClient();

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("id")
    .eq("slug", spaceSlug)
    .single();
  if (!space) return null;
  const spaceId = (space as { id: string }).id;

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

  return {
    ...r,
    attachments: (attachments as unknown as typeof r extends never ? never : Array<{ id: string; filename: string; size_bytes: number; mime_type: string }>) ?? [],
  };
}

async function hasValidSession(reportId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("informes_session")?.value;
  if (!token) return false;

  try {
    const tokenHash = hashToken(token);
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin
      .from("report_sessions")
      .select("expires_at")
      .eq("report_id", reportId)
      .eq("token_hash", tokenHash)
      .single();
    const session = data as { expires_at: string } | null;
    if (!session) return false;
    return new Date(session.expires_at) > new Date();
  } catch {
    return false;
  }
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

  const sessionValid = await hasValidSession(report.id);

  return (
    <ViewerShell
      report={report}
      sessionValid={sessionValid}
      linkExpired={errorParam === "link_expired"}
    />
  );
}
