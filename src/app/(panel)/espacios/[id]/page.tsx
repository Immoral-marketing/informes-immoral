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
    .select("id, slug, client_id, vertical_id, created_by, clients(id, name), verticals(name, color_hex)")
    .eq("id", id)
    .single();

  const space = rawSpace as unknown as {
    id: string; slug: string; client_id: string; vertical_id: string; created_by: string;
    clients: { id: string; name: string } | null;
    verticals: { name: string; color_hex: string } | null;
  } | null;

  if (!space) notFound();
  if (!isAdmin && space.created_by !== user.id) notFound();

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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/clientes" className="hover:text-primary">Clientes</Link>
        <span>›</span>
        <Link href={`/clientes/${space.client_id}`} className="hover:text-primary">
          {space.clients?.name ?? "Cliente"}
        </Link>
        <span>›</span>
        <span className="text-foreground font-medium">{space.verticals?.name ?? "Espacio"}</span>
      </nav>

      {/* Space header */}
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">
            {space.clients?.name} · {space.verticals?.name}
          </h1>
          <p className="text-sm font-mono text-muted-foreground">
            informes.immoral.es/<strong>{space.slug}</strong>/...
          </p>
        </div>
      </div>

      <SpaceReportsClient
        spaceId={id}
        spaceSlug={space.slug}
        reports={reports}
        canEdit={canEdit}
      />
    </div>
  );
}
