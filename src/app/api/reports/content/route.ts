import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";

async function validateSession(request: NextRequest, reportId: string) {
  const supabaseAdmin = createAdminClient();

  // 1. Try document session
  const docToken = request.cookies.get("informes_session")?.value;
  if (docToken) {
    const docHash = hashToken(docToken);
    const { data: docSession } = await supabaseAdmin
      .from("report_sessions")
      .select("id, expires_at")
      .eq("report_id", reportId)
      .eq("token_hash", docHash)
      .single();

    if (docSession && new Date(docSession.expires_at) > new Date()) {
      return docSession;
    }
  }

  // 2. Try portal session
  const portalToken = request.cookies.get("portal_session")?.value;
  if (portalToken) {
    const portalHash = hashToken(portalToken);
    
    // Need space_id of the report
    const { data: rData } = await supabaseAdmin
      .from("reports")
      .select("space_id")
      .eq("id", reportId)
      .single();

    if (rData) {
      const { data: pSession } = await supabaseAdmin
        .from("portal_sessions")
        .select("id, expires_at")
        .eq("space_id", rData.space_id)
        .eq("session_token_hash", portalHash)
        .single();

      if (pSession && new Date(pSession.expires_at) > new Date()) {
        return pSession;
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("report_id");
  const versionParam = searchParams.get("version");

  if (!reportId) return new NextResponse("Bad request", { status: 400 });

  const session = await validateSession(request, reportId);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const supabaseAdmin = createAdminClient();

  // Get report current version if not specified
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("current_version")
    .eq("id", reportId)
    .single();
  const r = report as { current_version: number } | null;
  if (!r) return new NextResponse("Not found", { status: 404 });

  const version = r.current_version;

  const { data: reportVersion } = await supabaseAdmin
    .from("report_versions")
    .select("storage_path, format")
    .eq("report_id", reportId)
    .eq("version_number", version)
    .single();

  const rv = reportVersion as { storage_path: string; format: string } | null;
  if (!rv) return new NextResponse("Version not found", { status: 404 });

  // Download from Storage
  const { data: fileData, error } = await supabaseAdmin.storage
    .from("report-documents")
    .download(rv.storage_path);

  if (error || !fileData) return new NextResponse("Storage error", { status: 500 });

  const contentType = rv.format === "pdf" ? "application/pdf" : "text/html; charset=utf-8";
  const bytes = await fileData.arrayBuffer();

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
