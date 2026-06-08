import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "@/components/shared/Navbar";
import PersonalPinSetup from "@/components/shared/PersonalPinSetup";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Admin client bypasses RLS — garantiza lectura correcta del rol
  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, role, personal_pin_hash")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as { full_name: string | null; role: "admin" | "employee"; personal_pin_hash: string | null } | null;

  const hasPin = !!profile?.personal_pin_hash;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? ""}
        userRole={profile?.role ?? "employee"}
      />
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-[1400px] mx-auto w-full">
        {children}
      </main>
      {!hasPin && <PersonalPinSetup />}
    </div>
  );
}
