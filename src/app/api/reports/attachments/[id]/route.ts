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
      .select("expires_at")
      .eq("report_id", reportId)
      .eq("token_hash", docHash)
      .single();

    if (docSession && new Date(docSession.expires_at) > new Date()) {
      return true;
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
        .select("expires_at")
        .eq("space_id", rData.space_id)
        .eq("session_token_hash", portalHash)
        .single();

      if (pSession && new Date(pSession.expires_at) > new Date()) {
        return true;
      }
    }
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabaseAdmin = createAdminClient();

  // Get attachment info
  const { data: att } = await supabaseAdmin
    .from("report_attachments")
    .select("report_id, filename, mime_type, storage_path")
    .eq("id", id)
    .single();
  const a = att as { report_id: string; filename: string; mime_type: string; storage_path: string } | null;
  if (!a) return new NextResponse("Not found", { status: 404 });

  // Validate session is scoped to this attachment's report (CA-13)
  const valid = await validateSession(request, a.report_id);
  if (!valid) return new NextResponse("Unauthorized", { status: 401 });

  const { data: fileData, error } = await supabaseAdmin.storage
    .from("report-attachments")
    .download(a.storage_path);

  if (error || !fileData) return new NextResponse("Storage error", { status: 500 });

  const bytes = await fileData.arrayBuffer();
  const safeFilename = encodeURIComponent(a.filename).replace(/%20/g, " ");

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": a.mime_type,
      "Content-Disposition": `attachment; filename="${safeFilename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
