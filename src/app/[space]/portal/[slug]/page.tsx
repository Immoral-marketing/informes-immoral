import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasValidPortalSession } from "@/lib/portal/session";
import { getSignedClientLogoUrl } from "@/app/(panel)/clientes/actions";
import FolderPageClient from "./FolderPageClient";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ space: string; slug: string }>;
}): Promise<Metadata> {
  const { space, slug } = await params;
  const supabaseAdmin = createAdminClient();
  
  const { data: namespace } = await supabaseAdmin
    .from("report_namespaces")
    .select("slug")
    .eq("slug", space)
    .single();
    
  if (!namespace) return { title: "Carpeta | Immoral" };

  const { data } = await supabaseAdmin
    .from("reports")
    .select("name")
    .eq("namespace_slug", namespace.slug)
    .eq("slug", slug)
    .single();

  const name = data?.name ?? "Carpeta de informe";
  return {
    title: `${name} | Immoral`,
  };
}

export default async function ReportFolderPage({
  params,
}: {
  params: Promise<{ space: string; slug: string }>;
}) {
  const { space, slug } = await params;
  const supabaseAdmin = createAdminClient();

  // 1. Obtener namespace + cliente (y vertical del informe luego)
  const { data: namespace } = await supabaseAdmin
    .from("report_namespaces")
    .select("slug, client_id, clients(name, logo_url)")
    .eq("slug", space)
    .single();

  if (!namespace || !namespace.client_id) notFound();

  const n = namespace as unknown as {
    slug: string;
    client_id: string;
    clients: { name: string; logo_url: string | null } | null;
  };

  // 2. Verificar sesión
  const isValidSession = await hasValidPortalSession(n.slug);
  if (!isValidSession) {
    redirect(`/${space}/portal`);
  }

  // 3. Obtener datos del informe
  const { data: reportData } = await supabaseAdmin
    .from("reports")
    .select("id, name, slug, updated_at, verticals(name, color_hex)")
    .eq("namespace_slug", n.slug)
    .eq("slug", slug)
    .not("current_version", "is", null)
    .single();

  if (!reportData) notFound();

  // Obtener adjuntos
  const { data: attachmentsData } = await supabaseAdmin
    .from("report_attachments")
    .select("id, filename, size_bytes, mime_type")
    .eq("report_id", reportData.id)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  const clientName = n.clients?.name ?? "Cliente";
  const clientLogoUrl = await getSignedClientLogoUrl(n.clients?.logo_url ?? null);

  const data = {
    report: {
      id: reportData.id,
      name: reportData.name,
      slug: reportData.slug,
      updated_at: reportData.updated_at,
      verticals: reportData.verticals as unknown as { name: string; color_hex: string } | null,
    },
    attachments: (attachmentsData ?? []) as Array<{
      id: string;
      filename: string;
      size_bytes: number;
      mime_type: string;
    }>,
    clientName,
    clientLogoUrl,
  };

  return <FolderPageClient data={data} spaceSlug={space} />;
}
