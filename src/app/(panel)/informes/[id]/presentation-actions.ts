"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSessionToken } from "@/lib/tokens/generate";
import { hashToken } from "@/lib/tokens/hash";

async function assertCanManageReport(reportId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };
  const supabaseAdmin = createAdminClient();
  const { data: r } = await supabaseAdmin.from("reports").select("created_by, space_id").eq("id", reportId).single();
  const report = r as { created_by: string; space_id: string } | null;
  if (!report) return { error: "Informe no encontrado" };
  const { data: p } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = p as { role: string } | null;
  if (report.created_by !== user.id && profile?.role !== "admin") return { error: "Sin permiso" };
  return { error: null, user, supabaseAdmin, report };
}

export async function startPresentation(reportId: string) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  // Terminar cualquier presentación previa de este informe
  await perm.supabaseAdmin
    .from("report_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .eq("session_type", "presentation")
    .is("ended_at", null);

  // Generar token opaco
  const token = generateSessionToken();
  const tokenHash = await hashToken(token);

  // Caducidad de 12h
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 12);

  const { error } = await perm.supabaseAdmin.from("report_sessions").insert({
    report_id: reportId,
    token_hash: tokenHash,
    session_type: "presentation",
    expires_at: expiresAt.toISOString(),
    // ended_at is null by default
  });

  if (error) return { error: "Error al crear la sesión de presentación" };
  return { success: true, token };
}

export async function endPresentation(reportId: string) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const { error } = await perm.supabaseAdmin
    .from("report_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .eq("session_type", "presentation")
    .is("ended_at", null);

  if (error) return { error: "Error al finalizar la presentación" };
  return { success: true };
}
