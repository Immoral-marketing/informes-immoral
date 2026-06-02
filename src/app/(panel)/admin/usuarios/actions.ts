"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthenticatedAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, user: null, supabase };

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;

  if (profile?.role !== "admin") {
    return { error: "No tienes permisos para realizar esta acción" as const, user: null, supabase };
  }

  return { error: null, user, supabase, supabaseAdmin };
}

export async function addDomain(domain: string) {
  const { error, supabaseAdmin } = await getAuthenticatedAdmin();
  if (error) return { error };

  const clean = domain.trim().toLowerCase().replace(/^@/, "");
  if (!clean || !clean.includes(".")) {
    return { error: "Formato de dominio inválido (ej: immoral.es)" };
  }

  const { error: insertError } = await supabaseAdmin!
    .from("authorized_domains")
    .insert({ domain: clean });

  if (insertError?.code === "23505") {
    return { error: "Este dominio ya está autorizado" };
  }
  if (insertError) return { error: "No se pudo añadir el dominio" };

  return { success: true };
}

export async function deleteDomain(domainId: string) {
  const { error, user, supabaseAdmin } = await getAuthenticatedAdmin();
  if (error || !user) return { error: error ?? "No autenticado" };

  // Prevent admin from deleting their own domain (CA-11) — identity from server session
  const userDomain = user.email?.split("@")[1] ?? "";
  const { data: domainRecord } = await supabaseAdmin!
    .from("authorized_domains")
    .select("domain")
    .eq("id", domainId)
    .single();

  if (domainRecord?.domain === userDomain) {
    return { error: "No puedes eliminar tu propio dominio" };
  }

  const { error: deleteError } = await supabaseAdmin!
    .from("authorized_domains")
    .delete()
    .eq("id", domainId);

  if (deleteError) return { error: "No se pudo eliminar el dominio" };

  return { success: true };
}

export async function updateRole(employeeId: string, role: "admin" | "employee") {
  const { error, user, supabaseAdmin } = await getAuthenticatedAdmin();
  if (error || !user) return { error: error ?? "No autenticado" };

  // Prevent admin from changing their own role (CA-05) — identity from server session
  if (employeeId === user.id) {
    return { error: "No puedes cambiar tu propio rol" };
  }

  const { error: updateError } = await supabaseAdmin!
    .from("profiles")
    .update({ role })
    .eq("id", employeeId);

  if (updateError) return { error: "No se pudo actualizar el rol" };

  return { success: true };
}
