"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndSendMagicLink } from "@/lib/magic-link/send";
import { addRecipient } from "@/app/(panel)/clientes/actions";

export async function sendMagicLinks(
  reportId: string,
  recipientIds: string[],
  options?: { subject?: string | undefined; note?: string | undefined }
) {
  if (!recipientIds.length) return { error: "Selecciona al menos un destinatario" };
  if (options?.subject && options.subject.length > 120) return { error: "El asunto no puede exceder los 120 caracteres" };
  if (options?.note && options.note.length > 500) return { error: "La nota no puede exceder los 500 caracteres" };

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
  const { data: profile } = await supabaseAdmin.from("profiles").select("role, full_name").eq("id", user.id).single();
  const p = profile as { role: string; full_name: string | null } | null;
  if (r.created_by !== user.id && p?.role !== "admin") return { error: "Sin permiso" };

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("slug, clients(name, logo_url)")
    .eq("id", r.space_id)
    .single();
  const s = space as unknown as { slug: string; clients: { name: string; logo_url: string | null } | null } | null;
  if (!s) return { error: "Espacio no encontrado" };

  let clientLogoUrl: string | null = null;
  if (s.clients?.logo_url) {
    const { data } = await supabaseAdmin.storage.from("client-logos").createSignedUrl(s.clients.logo_url, 3600);
    clientLogoUrl = data?.signedUrl ?? null;
  }

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
      clientLogoUrl,
      createdBy: user.id,
      subject: options?.subject,
      note: options?.note,
      senderName: p?.full_name ?? "El equipo",
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
  if (!user) return { recipients: [], meta: null };

  const supabaseAdmin = createAdminClient();

  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("name, space_id")
    .eq("id", reportId)
    .single();
  const r = report as { name: string; space_id: string } | null;
  if (!r) return { recipients: [], meta: null };

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("clients(id, name, logo_url)")
    .eq("id", r.space_id)
    .single();
  const s = space as unknown as { clients: { id: string; name: string; logo_url: string | null } | null } | null;
  if (!s || !s.clients) return { recipients: [], meta: null };

  let clientLogoUrl: string | null = null;
  if (s.clients.logo_url) {
    const { data } = await supabaseAdmin.storage.from("client-logos").createSignedUrl(s.clients.logo_url, 3600);
    clientLogoUrl = data?.signedUrl ?? null;
  }

  const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", user.id).single();
  const p = profile as { full_name: string | null } | null;

  const { data: recipients } = await supabaseAdmin
    .from("client_recipients")
    .select("id, email, full_name, role_label, is_primary")
    .eq("client_id", s.clients.id)
    .order("is_primary", { ascending: false })
    .order("created_at");

  const typedRecipients = (recipients as unknown as Array<{
    id: string; email: string; full_name: string | null;
    role_label: string | null; is_primary: boolean;
  }>) ?? [];

  return {
    recipients: typedRecipients,
    meta: {
      reportName: r.name,
      clientName: s.clients.name,
      clientLogoUrl,
      senderName: p?.full_name ?? "El equipo",
      clientId: s.clients.id,
    }
  };
}

export async function addRecipientInline(
  clientId: string,
  email: string,
  fullName: string | undefined
) {
  const formData = new FormData();
  formData.set("email", email);
  if (fullName) formData.set("full_name", fullName);
  formData.set("is_primary", "false");
  return addRecipient(clientId, formData);
}
