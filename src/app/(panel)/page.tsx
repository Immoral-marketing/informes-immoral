import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { getSignedLogoUrl } from "./admin/verticales/actions";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;
  const isAdmin = profile?.role === "admin";

  // Verticals visible for this user
  let rawVerticals: Array<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    color_hex: string;
    profiles: { full_name: string | null } | null;
  }> = [];

  if (isAdmin) {
    // Admin: all verticals
    const { data } = await supabaseAdmin
      .from("verticals")
      .select("id, name, slug, logo_url, color_hex, profiles(full_name)")
      .order("created_at");
    rawVerticals = (data as unknown as typeof rawVerticals) ?? [];
  } else {
    // Employee: verticals where they have client_spaces
    try {
      const { data: spaces } = await supabaseAdmin
        .from("client_spaces")
        .select("vertical_id")
        .eq("created_by", user.id);
      const verticalIds = [...new Set((spaces ?? []).map((s: { vertical_id: string }) => s.vertical_id))];
      if (verticalIds.length > 0) {
        const { data } = await supabaseAdmin
          .from("verticals")
          .select("id, name, slug, logo_url, color_hex, profiles(full_name)")
          .in("id", verticalIds)
          .order("created_at");
        rawVerticals = (data as unknown as typeof rawVerticals) ?? [];
      }
    } catch {
      // client_spaces table may not exist yet
    }
  }

  const verticals = await Promise.all(
    rawVerticals.map(async (v) => ({
      ...v,
      logo_signed_url: v.logo_url ? await getSignedLogoUrl(v.logo_url) : null,
    }))
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-[--color-black]">Dashboard</h1>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[--color-black]">Verticales</h2>
          {isAdmin && (
            <Link href="/admin/verticales" className="text-xs text-[--color-brand] hover:underline">
              Gestionar →
            </Link>
          )}
        </div>

        {verticals.length === 0 ? (
          <p className="text-sm text-[--color-gray-mid]">
            {isAdmin ? "No hay verticales creados todavía." : "No tienes actividad en ningún vertical todavía."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {verticals.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-[--color-gray-light] p-4 flex items-center gap-3 hover:border-[--color-brand] transition-colors cursor-pointer"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                  style={{ backgroundColor: v.color_hex + "22" }}
                >
                  {v.logo_signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.logo_signed_url} alt={v.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-lg font-bold" style={{ color: v.color_hex }}>
                      {v.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[--color-black] truncate">{v.name}</p>
                  {isAdmin && v.profiles?.full_name && (
                    <p className="text-xs text-[--color-gray-mid] truncate">por {v.profiles.full_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
