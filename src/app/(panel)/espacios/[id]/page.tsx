import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import SpaceReportsClient from "./SpaceReportsClient";

export default async function EspacioDetailPage({
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

  const { data: rawSpace } = await supabaseAdmin
    .from("client_spaces")
    .select("id, slug, client_id, vertical_id, created_by, created_at, clients(id, name, contact_name, contact_phone, contact_whatsapp), verticals(name, color_hex), client_recipients:clients(client_recipients(email, is_primary))")
    .eq("id", id)
    .single();

  const space = rawSpace as unknown as {
    id: string; slug: string; client_id: string; vertical_id: string; created_by: string; created_at: string;
    clients: { id: string; name: string; contact_name: string | null; contact_phone: string | null; contact_whatsapp: string | null } | null;
    verticals: { name: string; color_hex: string } | null;
    client_recipients: Array<{ email: string; is_primary: boolean }> | null;
  } | null;

  if (!space) notFound();
  if (!isAdmin && space.created_by !== user.id) notFound();

  // Contact details
  let primaryEmail = null;
  if (space.client_recipients && Array.isArray(space.client_recipients)) {
    const primary = space.client_recipients.find((r) => r.is_primary) || space.client_recipients[0];
    if (primary) primaryEmail = primary.email;
  }

  const { data: creatorRaw } = await supabaseAdmin.from("profiles").select("full_name").eq("id", space.created_by).single();
  const creator = creatorRaw as { full_name: string | null } | null;

  const contactData = {
    contact_name: space.clients?.contact_name ?? null,
    contact_phone: space.clients?.contact_phone ?? null,
    contact_whatsapp: space.clients?.contact_whatsapp ?? null,
    email: primaryEmail,
    created_by_name: creator?.full_name ?? "Usuario",
    created_at: new Date(space.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }),
  };

  const { data: rawReports } = await supabaseAdmin
    .from("reports")
    .select("id, name, slug, current_version, auto_send_on_publish, created_at, report_versions(format)")
    .eq("space_id", id)
    .order("created_at", { ascending: false });

  const reports = (rawReports as unknown as Array<{
    id: string; name: string; slug: string; current_version: number;
    auto_send_on_publish: boolean; created_at: string;
    report_versions: Array<{ format: string }>;
  }>) ?? [];

  const canEdit = isAdmin || space.created_by === user.id;

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Breadcrumb / Eyebrow */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground font-semibold tracking-wide uppercase">
        <span style={{ color: space.verticals?.color_hex }}>●</span>
        <span>{space.verticals?.name ?? "Espacio"}</span>
      </nav>

      {/* Space header */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
              {space.clients?.name}
            </h1>
            <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 rounded-full">
              Cliente
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            informes.immoral.es/<strong>{space.slug}</strong>/...
          </p>
        </div>
      </div>

      <SpaceReportsClient
        spaceId={id}
        spaceSlug={space.slug}
        reports={reports}
        canEdit={canEdit}
        contactData={contactData}
      />
    </div>
  );
}
