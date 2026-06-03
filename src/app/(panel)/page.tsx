import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedLogoUrl } from "./admin/verticales/actions";
import DashboardQuickActions from "./DashboardQuickActions";
import { Card } from "@/components/ui/card";
import { Layers, FileText } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;
  const isAdmin = profile?.role === "admin";

  const nombre = user.user_metadata["full_name"] ?? user.email?.split("@")[0] ?? "Usuario";

  // ── Verticals con conteo de clientes ────────────────────────────────────────
  const { data: rawVerticals } = await supabaseAdmin
    .from("verticals")
    .select("id, name, slug, logo_url, color_hex")
    .order("created_at");

  const rawV = (rawVerticals as Array<{
    id: string; name: string; slug: string; logo_url: string | null; color_hex: string;
  }>) ?? [];

  // Contar espacios por vertical (cada espacio = un cliente en ese vertical)
  const { data: spaceCounts } = await supabaseAdmin
    .from("client_spaces")
    .select("vertical_id");
  const spacesByVertical: Record<string, number> = {};
  for (const s of (spaceCounts as Array<{ vertical_id: string }> ?? [])) {
    spacesByVertical[s.vertical_id] = (spacesByVertical[s.vertical_id] ?? 0) + 1;
  }

  // Contar informes por vertical
  const { data: reportCounts } = await supabaseAdmin
    .from("reports")
    .select("space_id, client_spaces(vertical_id)");
  const reportsByVertical: Record<string, number> = {};
  for (const r of (reportCounts as unknown as Array<{ client_spaces: { vertical_id: string } | null }> ?? [])) {
    const vid = r.client_spaces?.vertical_id;
    if (vid) reportsByVertical[vid] = (reportsByVertical[vid] ?? 0) + 1;
  }

  const verticals = await Promise.all(
    rawV.map(async (v) => ({
      ...v,
      logo_signed_url: v.logo_url ? await getSignedLogoUrl(v.logo_url) : null,
      espacios: spacesByVertical[v.id] ?? 0,
      informes: reportsByVertical[v.id] ?? 0,
    }))
  );

  // ── Últimos informes ─────────────────────────────────────────────────────────
  const reportsQuery = supabaseAdmin
    .from("reports")
    .select(`
      id, name, slug, updated_at, created_by,
      client_spaces(slug, clients(name))
    `)
    .order("updated_at", { ascending: false })
    .limit(8);

  if (!isAdmin) reportsQuery.eq("created_by", user.id);

  const { data: rawReports } = await reportsQuery;
  const recentReports = (rawReports as unknown as Array<{
    id: string; name: string; slug: string; updated_at: string;
    client_spaces: { slug: string; clients: { name: string } | null } | null;
  }>) ?? [];

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* ── Hero Banner ────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-lg">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary border border-primary/30">
            Informes Immoral
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Bienvenido, {nombre}</h1>
          <p className="text-slate-400 text-sm sm:text-base">Gestiona verticales, clientes e informes.</p>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <DashboardQuickActions />

      {/* ── Verticales ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">Verticales</h2>
          {isAdmin && (
            <Link href="/admin/verticales" className="text-xs font-medium text-primary hover:underline">
              Gestionar →
            </Link>
          )}
        </div>

        {verticals.length === 0 ? (
          <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center gap-4">
            <Layers className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay verticales creados todavía.</p>
            {isAdmin && (
              <Link href="/admin/verticales" className="text-sm font-semibold text-primary hover:underline">
                Crear primera vertical →
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {verticals.map((v) => (
              <Link key={v.id} href={`/clientes?vertical=${v.slug}`} className="group">
                <Card className="relative overflow-hidden hover:shadow-md hover:border-primary/50 transition-all">
                  <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: v.color_hex }} />
                  <div className="p-5 mt-1 flex items-center gap-4">
                    {/* Logo / inicial */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                      style={{ backgroundColor: v.color_hex + "22" }}
                    >
                      {v.logo_signed_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.logo_signed_url} alt={v.name} className="w-9 h-9 object-contain" />
                      ) : (
                        <span className="text-xl font-extrabold" style={{ color: v.color_hex }}>
                          {v.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate group-hover:underline text-foreground">
                        {v.name}
                      </p>
                      <p className="text-xs mt-0.5 text-muted-foreground">
                        {v.espacios} espacio{v.espacios !== 1 ? "s" : ""} · {v.informes} informe{v.informes !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Últimos informes ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base text-foreground">
            {isAdmin ? "Últimos informes" : "Mis últimos informes"}
          </h2>
          <Link href="/clientes" className="text-xs font-medium text-primary hover:underline">
            Ver clientes →
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center gap-4">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No hay informes creados todavía.</p>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            {recentReports.map((r, i) => {
              const spaceSlug = r.client_spaces?.slug ?? "";
              const clientName = r.client_spaces?.clients?.name ?? "—";
              const updatedAt = new Date(r.updated_at).toLocaleDateString("es-ES", {
                day: "numeric", month: "short", year: "numeric",
              });

              return (
                <Link
                  key={r.id}
                  href={`/informes/${r.id}`}
                  className={`flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors ${
                    i < recentReports.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground">{r.name}</p>
                    <p className="text-xs mt-0.5 text-muted-foreground">
                      {clientName} · {spaceSlug}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{updatedAt}</p>
                  </div>
                  <span className="text-xs font-medium shrink-0 text-primary group-hover:underline">Ver →</span>
                </Link>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
