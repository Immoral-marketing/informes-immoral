"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, supabase, user: null };
  return { error: null, supabase, user };
}

async function assertCanManageClient(clientId: string) {
  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "No autenticado" };

  const supabaseAdmin = createAdminClient();
  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("created_by")
    .eq("id", clientId)
    .single();
  const c = client as { created_by: string } | null;
  if (!c) return { error: "Cliente no encontrado" };

  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", auth.user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;

  if (c.created_by !== auth.user.id && profile?.role !== "admin") {
    return { error: "No tienes permisos para gestionar este cliente" };
  }

  return { error: null, user: auth.user, supabaseAdmin };
}

// ─── Clients ───────────────────────────────────────────────────────────────

export async function createClient_(formData: FormData) {
  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "No autenticado" };

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const supabaseAdmin = createAdminClient();
  const { data, error } = await supabaseAdmin.from("clients").insert({
    name,
    contact_name: (formData.get("contact_name") as string | null)?.trim() || null,
    contact_phone: (formData.get("contact_phone") as string | null)?.trim() || null,
    contact_whatsapp: (formData.get("contact_whatsapp") as string | null)?.trim() || null,
    created_by: auth.user.id,
  }).select("id").single();

  if (error) return { error: "Error al crear el cliente" };
  return { success: true, id: (data as { id: string }).id };
}

export async function updateClient(id: string, formData: FormData) {
  const perm = await assertCanManageClient(id);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const { error } = await perm.supabaseAdmin.from("clients").update({
    name,
    contact_name: (formData.get("contact_name") as string | null)?.trim() || null,
    contact_phone: (formData.get("contact_phone") as string | null)?.trim() || null,
    contact_whatsapp: (formData.get("contact_whatsapp") as string | null)?.trim() || null,
  }).eq("id", id);

  if (error) return { error: "Error al actualizar el cliente" };
  return { success: true };
}

export async function deleteClient(id: string) {
  const perm = await assertCanManageClient(id);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const { count } = await perm.supabaseAdmin
    .from("client_spaces")
    .select("id", { count: "exact", head: true })
    .eq("client_id", id);

  if ((count ?? 0) > 0) {
    return { error: `Este cliente tiene ${count} espacio(s). Elimínalos antes de continuar.` };
  }

  const { error } = await perm.supabaseAdmin.from("clients").delete().eq("id", id);
  if (error) return { error: "Error al eliminar el cliente" };
  return { success: true };
}

// ─── Recipients ─────────────────────────────────────────────────────────────

export async function addRecipient(clientId: string, formData: FormData) {
  const perm = await assertCanManageClient(clientId);
  if (perm.error || !perm.user || !perm.supabaseAdmin) return { error: perm.error ?? "No autenticado" };

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Email inválido" };

  const isPrimary = formData.get("is_primary") === "true";

  // If setting as primary, clear previous primary atomically
  if (isPrimary) {
    await perm.supabaseAdmin
      .from("client_recipients")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .eq("is_primary", true);
  }

  const { error } = await perm.supabaseAdmin.from("client_recipients").insert({
    client_id: clientId,
    email,
    full_name: (formData.get("full_name") as string | null)?.trim() || null,
    role_label: (formData.get("role_label") as string | null)?.trim() || null,
    is_primary: isPrimary,
    created_by: perm.user.id,
  });

  if (error?.code === "23505") return { error: "Este email ya está registrado para este cliente" };
  if (error) return { error: "Error al añadir el destinatario" };
  return { success: true };
}

export async function updateRecipient(recipientId: string, clientId: string, formData: FormData) {
  const perm = await assertCanManageClient(clientId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const email = (formData.get("email") as string | null)?.trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Email inválido" };

  const isPrimary = formData.get("is_primary") === "true";

  if (isPrimary) {
    await perm.supabaseAdmin
      .from("client_recipients")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .eq("is_primary", true)
      .neq("id", recipientId);
  }

  const { error } = await perm.supabaseAdmin.from("client_recipients").update({
    email,
    full_name: (formData.get("full_name") as string | null)?.trim() || null,
    role_label: (formData.get("role_label") as string | null)?.trim() || null,
    is_primary: isPrimary,
  }).eq("id", recipientId);

  if (error?.code === "23505") return { error: "Este email ya está registrado para este cliente" };
  if (error) return { error: "Error al actualizar el destinatario" };
  return { success: true };
}

export async function deleteRecipient(recipientId: string, clientId: string) {
  const perm = await assertCanManageClient(clientId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  // Check if recipient has sent magic link tokens (CA-07 warning)
  const { count: tokenCount } = await perm.supabaseAdmin
    .from("magic_link_tokens")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", recipientId);

  const hasTokens = (tokenCount ?? 0) > 0;

  const { error } = await perm.supabaseAdmin
    .from("client_recipients")
    .delete()
    .eq("id", recipientId);

  if (error) return { error: "Error al eliminar el destinatario" };
  return { success: true, hadMagicLinks: hasTokens };
}
