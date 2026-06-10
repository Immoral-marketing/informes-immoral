"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndSendPortalLink } from "@/lib/portal/send";

export async function sendPortalLinks(
  spaceId: string,
  recipientIds: string[],
  options?: { subject?: string; note?: string }
) {
  if (!recipientIds.length) return { error: "Selecciona al menos un destinatario" };
  if (options?.subject && options.subject.length > 120) return { error: "El asunto no puede exceder los 120 caracteres" };
  if (options?.note && options.note.length > 500) return { error: "La nota no puede exceder los 500 caracteres" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" };

  const supabaseAdmin = createAdminClient();

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("slug, created_by, clients(name, logo_url)")
    .eq("id", spaceId)
    .single();
  const s = space as unknown as { slug: string; created_by: string; clients: { name: string; logo_url: string | null } | null } | null;
  if (!s) return { error: "Espacio no encontrado" };

  const { data: profile } = await supabaseAdmin.from("profiles").select("role, full_name").eq("id", user.id).single();
  const p = profile as { role: string; full_name: string | null } | null;
  if (s.created_by !== user.id && p?.role !== "admin") return { error: "Sin permiso" };

  let clientLogoUrl: string | null = null;
  if (s.clients?.logo_url) {
    const { data } = await supabaseAdmin.storage.from("client-logos").createSignedUrl(s.clients.logo_url, 3600);
    clientLogoUrl = data?.signedUrl ?? null;
  }

  const results: Array<{ recipientId: string; ok: boolean; error: string | undefined }> = [];

  for (const recipientId of recipientIds) {
    const opts: any = {
      spaceId,
      recipientId,
      spaceSlug: s.slug,
      clientName: s.clients?.name ?? "cliente",
      clientLogoUrl,
      createdBy: user.id,
      senderName: p?.full_name ?? "El equipo",
    };
    if (options?.subject) opts.subject = options.subject;
    if (options?.note) opts.note = options.note;

    const result = await generateAndSendPortalLink(opts);
    results.push({ recipientId, ok: "ok" in result, error: "error" in result ? result.error : undefined });
  }

  const failures = results.filter((r) => !r.ok);
  if (failures.length === results.length) return { error: "No se pudo enviar ningún enlace" };
  if (failures.length > 0) return { partial: true, results };
  return { success: true, results };
}

export async function getSpaceRecipients(spaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { recipients: [], meta: null };

  const supabaseAdmin = createAdminClient();

  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("client_id, clients(id, name, logo_url)")
    .eq("id", spaceId)
    .single();
  const s = space as unknown as { client_id: string; clients: { id: string; name: string; logo_url: string | null } | null } | null;
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
    .eq("client_id", s.client_id)
    .order("is_primary", { ascending: false })
    .order("created_at");

  const typedRecipients = (recipients as unknown as Array<{
    id: string; email: string; full_name: string | null;
    role_label: string | null; is_primary: boolean;
  }>) ?? [];

  return {
    recipients: typedRecipients,
    meta: {
      reportName: "tu espacio de documentos",
      clientName: s.clients.name,
      clientLogoUrl,
      senderName: p?.full_name ?? "El equipo",
    }
  };
}
