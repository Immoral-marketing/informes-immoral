import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedDocUrl } from "../../actions";
import PresenterClient from "./PresenterClient";

export default async function PresenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: r } = await supabaseAdmin
    .from("reports")
    .select("created_by, name, current_version")
    .eq("id", id)
    .single();

  const report = r as { created_by: string; name: string; current_version: number } | null;
  if (!report) notFound();

  const { data: p } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = p as { role: string } | null;
  
  if (report.created_by !== user.id && profile?.role !== "admin") notFound();

  // Load the active version format (to know if PDF or HTML)
  const { data: v } = await supabaseAdmin
    .from("report_versions")
    .select("format, storage_path")
    .eq("report_id", id)
    .eq("version_number", report.current_version)
    .single();

  if (!v) notFound();
  
  const version = v as { format: string, storage_path: string };
  
  let signedUrl: string | null = null;
  if (version.format === "pdf") {
    signedUrl = await getSignedDocUrl(version.storage_path);
  }

  return (
    <PresenterClient 
      reportId={id} 
      reportName={report.name} 
      format={version.format} 
      pdfUrl={signedUrl} 
    />
  );
}
