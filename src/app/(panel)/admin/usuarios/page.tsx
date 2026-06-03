import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import DomainManager from "./DomainManager";
import EmployeeRoleManager from "./EmployeeRoleManager";

export default async function AdminUsuariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const supabaseAdmin = createAdminClient();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const [{ data: domains }, { data: employees }] = await Promise.all([
    supabaseAdmin.from("authorized_domains").select("id, domain, created_at").order("created_at"),
    supabaseAdmin.from("profiles").select("id, full_name, role, created_at").order("created_at"),
  ]);

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-2xl font-extrabold text-foreground">Administración de usuarios</h1>

      <DomainManager
        domains={domains ?? []}
        currentUserDomain={user.email?.split("@")[1] ?? ""}
      />

      <EmployeeRoleManager
        employees={employees ?? []}
        currentUserId={user.id}
      />
    </div>
  );
}
