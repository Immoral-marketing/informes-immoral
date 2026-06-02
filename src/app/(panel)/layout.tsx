import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/shared/Navbar";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as { full_name: string | null; role: "admin" | "employee" } | null;

  return (
    <div className="min-h-screen bg-[--color-gray-light] flex flex-col">
      <Navbar
        userEmail={user.email ?? ""}
        userName={profile?.full_name ?? ""}
        userRole={profile?.role ?? "employee"}
      />
      <main className="flex-1 px-4 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
