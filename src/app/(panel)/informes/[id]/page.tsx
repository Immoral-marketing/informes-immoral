import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Breadcrumbs } from "@/components/shared/Breadcrumbs";
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
      namespace_slug, expiry_date, pin_encrypted,
      report_namespaces(slug, clients(id, name)), verticals(name)
    `)
    .eq("id", id)
    .single();

  const report = rawReport as unknown as {
    id: string; name: string; slug: string; current_version: number;
    auto_send_on_publish: boolean; created_by: string; namespace_slug: string;
    expiry_date: string | null; pin_encrypted: string | null;
    report_namespaces: {
      slug: string;
      clients: { id: string; name: string } | null;
    } | null;
    verticals: { name: string } | null;
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

  const spaceSlug = report.namespace_slug ?? "";
  const fullUrl = `https://informes.immoral.es/${spaceSlug}/${report.slug}`;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[
        { label: "Dashboard", href: "/" },
        { label: "Clientes", href: "/clientes" },
        { label: report.report_namespaces?.clients?.name ?? "Cliente", href: `/clientes/${report.report_namespaces?.clients?.id ?? ""}` },

        { label: report.name }
      ]} />

      <ReportManageClient
        report={(() => {
          // No enviar el ciphertext del PIN al cliente — solo su presencia (CA-18.8)
          const { pin_encrypted, ...rest } = report;
          return { ...rest, has_pin_encrypted: !!pin_encrypted };
        })()}
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
