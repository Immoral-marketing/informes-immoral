import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { getSignedDocUrl, getSignedAttachmentUrl } from "../actions";
import ReportManageClient from "./ReportManageClient";

export default async function InformeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;
  const isAdmin = profile?.role === "admin";

  const { data: rawReport } = await supabaseAdmin
    .from("reports")
    .select(`
      id, name, slug, current_version, auto_send_on_publish, created_by,
      space_id, client_spaces(slug, clients(id, name), verticals(name))
    `)
    .eq("id", id)
    .single();

  const report = rawReport as unknown as {
    id: string; name: string; slug: string; current_version: number;
    auto_send_on_publish: boolean; created_by: string; space_id: string;
    client_spaces: {
      slug: string;
      clients: { id: string; name: string } | null;
      verticals: { name: string } | null;
    } | null;
  } | null;

  if (!report) notFound();
  if (!isAdmin && report.created_by !== user.id) notFound();

  const [{ data: rawVersions }, { data: rawAttachments }] = await Promise.all([
    supabaseAdmin
      .from("report_versions")
      .select("id, version_number, format, storage_path, size_bytes, created_at, profiles(full_name)")
      .eq("report_id", id)
      .order("version_number", { ascending: false }),
    supabaseAdmin
      .from("report_attachments")
      .select("id, filename, mime_type, storage_path, size_bytes, display_order, created_at")
      .eq("report_id", id)
      .order("created_at"),
  ]);

  const versions = (rawVersions as unknown as Array<{
    id: string; version_number: number; format: string; storage_path: string;
    size_bytes: number | null; created_at: string;
    profiles: { full_name: string | null } | null;
  }>) ?? [];

  const attachments = (rawAttachments as unknown as Array<{
    id: string; filename: string; mime_type: string; storage_path: string;
    size_bytes: number; display_order: number; created_at: string;
  }>) ?? [];

  // Signed URLs for active version preview
  const activeVersion = versions.find((v) => v.version_number === report.current_version);
  const activeVersionUrl = activeVersion?.storage_path
    ? await getSignedDocUrl(activeVersion.storage_path)
    : null;

  // Signed URLs for attachments
  const attachmentsWithUrls = await Promise.all(
    attachments.map(async (a) => ({
      ...a,
      signed_url: await getSignedAttachmentUrl(a.storage_path),
    }))
  );

  const spaceSlug = report.client_spaces?.slug ?? "";
  const fullUrl = `https://informes.immoral.es/${spaceSlug}/${report.slug}`;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clientes" className="hover:text-primary">Clientes</Link>
        <span>›</span>
        <Link href={`/clientes/${report.client_spaces?.clients?.id ?? ""}`} className="hover:text-primary">
          {report.client_spaces?.clients?.name ?? "Cliente"}
        </Link>
        <span>›</span>
        <Link href={`/espacios/${report.space_id}`} className="hover:text-primary">
          {report.client_spaces?.verticals?.name ?? "Espacio"}
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{report.name}</span>
      </nav>

      <ReportManageClient
        report={report}
        versions={versions}
        attachments={attachmentsWithUrls}
        activeVersionUrl={activeVersionUrl}
        fullUrl={fullUrl}
        currentUserId={user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
