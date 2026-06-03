import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSignedLogoUrl } from "./actions";
import VerticalesClient from "./VerticalesClient";

export default async function AdminVerticalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;
  if (profile?.role !== "admin") redirect("/");

  const { data: rawVerticals } = await supabaseAdmin
    .from("verticals")
    .select("id, name, slug, logo_url, color_hex, created_by, profiles(full_name)")
    .order("created_at");

  const verticals = (rawVerticals as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    color_hex: string;
    created_by: string;
    profiles: { full_name: string | null } | null;
  }>) ?? [];

  // Generate signed URLs for all logos
  const verticalsWithUrls = await Promise.all(
    verticals.map(async (v) => ({
      ...v,
      logo_signed_url: v.logo_url ? await getSignedLogoUrl(v.logo_url) : null,
    }))
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-foreground">Verticales</h1>
      </div>
      <VerticalesClient verticals={verticalsWithUrls} />
    </div>
  );
}
