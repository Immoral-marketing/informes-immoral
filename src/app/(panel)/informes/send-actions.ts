"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndSendMagicLink } from "@/lib/magic-link/send";

export async function sendMagicLinks(reportId: string, recipientIds: string[]) {
  if (!recipientIds.length) return { error: "Selecciona al menos un destinatario" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const supabaseAdmin = createAdminClient();

  // Get report + space + client info
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, name, slug, space_id, created_by")
    .eq("id", reportId)
    .single();
  const r = report as { id: string; name: string; slug: string; space_id: string; created_by: string } | null;
  if (!r) return { error: "Informe no encontrado" };

  // Auth check
  const { data: profile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const p = profile as { role: string } | null;
  if (r.created_by !== user.id && p?.role !== "admin") return { error: "Sin permiso" };

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("slug, clients(name)")
    .eq("id", r.space_id)
    .single();
  const s = space as unknown as { slug: string; clients: { name: string } | null } | null;
  if (!s) return { error: "Espacio no encontrado" };

  // Send to each recipient
  const results: Array<{ recipientId: string; ok: boolean; error: string | undefined }> = [];

  for (const recipientId of recipientIds) {
    const result = await generateAndSendMagicLink({
      reportId,
      recipientId,
      spaceSlug: s.slug,
      reportSlug: r.slug,
      reportName: r.name,
      clientName: s.clients?.name ?? "cliente",
      createdBy: user.id,
    });
    results.push({ recipientId, ok: "ok" in result, error: "error" in result ? result.error : undefined });
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length === results.length) return { error: "No se pudo enviar ningún enlace" };
  if (failures.length > 0) return { partial: true, results };
  return { success: true, results };
}

export async function getReportRecipients(reportId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const supabaseAdmin = createAdminClient();

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("space_id")
    .eq("id", reportId)
    .single();
  const r = report as { space_id: string } | null;
  if (!r) return [];

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("client_id")
    .eq("id", r.space_id)
    .single();
  const s = space as { client_id: string } | null;
  if (!s) return [];

  const { data: recipients } = await supabaseAdmin
    .from("client_recipients")
    .select("id, email, full_name, role_label, is_primary")
    .eq("client_id", s.client_id)
    .order("is_primary", { ascending: false })
    .order("created_at");

  return (recipients as unknown as Array<{
    id: string; email: string; full_name: string | null;
    role_label: string | null; is_primary: boolean;
  }>) ?? [];
}
