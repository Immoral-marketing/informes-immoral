import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
import { getSignedDocUrl } from "@/app/(panel)/informes/actions";
import PresenterViewerClient from "./PresenterViewerClient";

export default async function PresenterViewerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token) notFound();

  const tokenHash = hashToken(token);
  const supabaseAdmin = createAdminClient();

  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from("report_sessions")
    .select("report_id, expires_at, ended_at")
    .eq("token_hash", tokenHash)
    .eq("session_type", "presentation")
    .single();

  if (sessionError || !sessionData) {
    return <ErrorState title="Presentación no encontrada" message="El enlace no es válido." />;
  }

  if (sessionData.ended_at !== null) {
    return <ErrorState title="La presentación ha finalizado" message="El presentador ha terminado la sesión." />;
  }

  if (new Date(sessionData.expires_at) < new Date()) {
    return <ErrorState title="Enlace expirado" message="Este enlace de presentación ya no es válido." />;
  }

  const reportId = sessionData.report_id;

  // Get active version format
  const { data: reportData } = await supabaseAdmin
    .from("reports")
    .select("current_version")
    .eq("id", reportId)
    .single();

  if (!reportData) notFound();

  const { data: versionData } = await supabaseAdmin
    .from("report_versions")
    .select("storage_path, format")
    .eq("report_id", reportId)
    .eq("version_number", reportData.current_version)
    .single();

  if (!versionData) notFound();

  let pdfUrl: string | null = null;
  if (versionData.format === "pdf") {
    pdfUrl = await getSignedDocUrl(versionData.storage_path);
  }

  return (
    <PresenterViewerClient 
      token={token} 
      reportId={reportId}
      format={versionData.format}
      pdfUrl={pdfUrl}
    />
  );
}

function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a1a1a] text-white p-4 text-center">
      <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-white/60">{message}</p>
    </div>
  );
}
