import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedLogoUrl } from "./admin/verticales/actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;
  const isAdmin = profile?.role === "admin";

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
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-extrabold" style={{ color: "#111111" }}>Dashboard</h1>

      {/* ── Verticales ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: "#111111" }}>Verticales</h2>
          {isAdmin && (
            <Link href="/admin/verticales" className="text-xs font-medium hover:underline" style={{ color: "#3980E4" }}>
              Gestionar →
            </Link>
          )}
        </div>

        {verticals.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: "#D8D8D8" }}>
            <p className="text-sm mb-3" style={{ color: "#5E5E5E" }}>No hay verticales creados todavía.</p>
            {isAdmin && (
              <Link href="/admin/verticales" className="text-sm font-semibold" style={{ color: "#3980E4" }}>
                Crear primera vertical →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {verticals.map((v) => (
              <Link
                key={v.id}
                href={`/clientes?vertical=${v.slug}`}
                className="bg-white rounded-2xl border p-5 flex items-center gap-4 hover:shadow-md transition-shadow group"
                style={{ borderColor: "#D8D8D8" }}
              >
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
                  <p className="font-semibold text-sm truncate group-hover:underline" style={{ color: "#111111" }}>
                    {v.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#5E5E5E" }}>
                    {v.espacios} espacio{v.espacios !== 1 ? "s" : ""} · {v.informes} informe{v.informes !== 1 ? "s" : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Últimos informes ──────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base" style={{ color: "#111111" }}>
            {isAdmin ? "Últimos informes" : "Mis últimos informes"}
          </h2>
          <Link href="/clientes" className="text-xs font-medium hover:underline" style={{ color: "#3980E4" }}>
            Ver clientes →
          </Link>
        </div>

        {recentReports.length === 0 ? (
          <div className="bg-white rounded-2xl border p-8 text-center" style={{ borderColor: "#D8D8D8" }}>
            <p className="text-sm" style={{ color: "#5E5E5E" }}>No hay informes creados todavía.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#D8D8D8" }}>
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
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                  style={{ borderBottom: i < recentReports.length - 1 ? "1px solid #D8D8D8" : undefined }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "#111111" }}>{r.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#5E5E5E" }}>
                      {clientName} · {spaceSlug}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs" style={{ color: "#5E5E5E" }}>{updatedAt}</p>
                  </div>
                  <span className="text-xs font-medium shrink-0" style={{ color: "#3980E4" }}>Ver →</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
