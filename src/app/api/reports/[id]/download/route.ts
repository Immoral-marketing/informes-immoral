import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const DOC_BUCKET = "report-documents";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabaseAdmin = createAdminClient();

  const { data: r } = await supabaseAdmin
    .from("reports")
    .select("created_by, current_version, name, slug")
    .eq("id", reportId)
    .single();

  const report = r as { created_by: string; current_version: number; name: string; slug: string } | null;
  if (!report) return NextResponse.json({ error: "Informe no encontrado" }, { status: 404 });

  const { data: p } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = p as { role: string } | null;
  if (report.created_by !== user.id && profile?.role !== "admin") {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  const { data: v } = await supabaseAdmin
    .from("report_versions")
    .select("storage_path, format")
    .eq("report_id", reportId)
    .eq("version_number", report.current_version)
    .single();

  const version = v as { storage_path: string; format: string } | null;
  if (!version) return NextResponse.json({ error: "Versión no encontrada" }, { status: 404 });

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(DOC_BUCKET)
    .download(version.storage_path);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Error al obtener el archivo" }, { status: 500 });
  }

  const contentType = version.format === "pdf" ? "application/pdf" : "text/html";
  const filename = `${report.slug}_v${report.current_version}.${version.format}`;
  const bytes = await fileData.arrayBuffer();

  return new NextResponse(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(bytes.byteLength),
    },
  });
}
