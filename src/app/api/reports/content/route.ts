import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";

async function validateSession(request: NextRequest, reportId: string) {
  const token = request.cookies.get("informes_session")?.value;
  if (!token) return null;

  const tokenHash = hashToken(token);
  const supabaseAdmin = createAdminClient();

  const { data } = await supabaseAdmin
    .from("report_sessions")
    .select("id, expires_at")
    .eq("report_id", reportId)
    .eq("token_hash", tokenHash)
    .single();

  const session = data as { id: string; expires_at: string } | null;
  if (!session) return null;
  if (new Date(session.expires_at) <= new Date()) return null;

  return session;
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
