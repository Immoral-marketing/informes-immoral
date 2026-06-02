import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";

async function validateSession(request: NextRequest, reportId: string) {
  const token = request.cookies.get("informes_session")?.value;
  if (!token) return false;
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
