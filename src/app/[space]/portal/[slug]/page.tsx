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
  
  const { data: spaceData } = await supabaseAdmin
    .from("client_spaces")
    .select("id")
    .eq("slug", space)
    .single();
    
  if (!spaceData) return { title: "Carpeta | Immoral" };

  const { data } = await supabaseAdmin
    .from("reports")
    .select("name")
    .eq("space_id", spaceData.id)
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

  // 1. Obtener spaceId + vertical (la vertical pertenece al espacio, no al informe)
  const { data: spaceData } = await supabaseAdmin
    .from("client_spaces")
    .select("id, clients(name, logo_url), verticals(name, color_hex)")
    .eq("slug", space)
    .single();

  if (!spaceData) notFound();

  const s = spaceData as unknown as {
    id: string;
    clients: { name: string; logo_url: string | null } | null;
    verticals: { name: string; color_hex: string } | null;
  };

  // 2. Verificar sesión
  const isValidSession = await hasValidPortalSession(s.id);
  if (!isValidSession) {
    redirect(`/${space}/portal`);
  }

  // 3. Obtener datos del informe
  const { data: reportData } = await supabaseAdmin
    .from("reports")
    .select("id, name, slug, updated_at")
    .eq("space_id", s.id)
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

  const clientName = s.clients?.name ?? "Cliente";
  const clientLogoUrl = await getSignedClientLogoUrl(s.clients?.logo_url ?? null);

  const data = {
    report: {
      id: reportData.id,
      name: reportData.name,
      slug: reportData.slug,
      updated_at: reportData.updated_at,
      verticals: s.verticals,
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
