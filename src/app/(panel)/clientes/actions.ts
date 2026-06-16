"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slugify";
import { createReport } from "@/app/(panel)/informes/actions";

const LOGO_BUCKET = "client-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ["image/png", "image/svg+xml"];

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

// ─── Storage helpers ─────────────────────────────────────────────────────────

async function uploadClientLogo(file: File, oldPath?: string): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED_MIME.includes(file.type)) return { error: "Solo se aceptan archivos PNG o SVG" };
  if (file.size > MAX_LOGO_BYTES) return { error: "El archivo no puede superar 2MB" };

  const supabaseAdmin = createAdminClient();

  if (oldPath) {
    await supabaseAdmin.storage.from(LOGO_BUCKET).remove([oldPath]);
  }

  const ext = file.type === "image/svg+xml" ? "svg" : "png";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage.from(LOGO_BUCKET).upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { error: "Error al subir el logo" };
  return { path };
}

export async function getSignedClientLogoUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage.from(LOGO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ─── Quick-select helpers (QuickCreateModal) ────────────────────────────────

export async function getVerticalsForSelect(): Promise<Array<{ id: string; name: string; color_hex: string }>> {
  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.user) return [];
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("verticals")
    .select("id, name, color_hex")
    .order("name");
  return (data as Array<{ id: string; name: string; color_hex: string }>) ?? [];
}

export async function searchClients(query: string): Promise<Array<{ id: string; name: string }>> {
  if (!query || query.trim() === "") return [];
  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.user) return [];

  const supabaseAdmin = createAdminClient();
  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", auth.user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;

  let queryBuilder = supabaseAdmin
    .from("clients")
    .select("id, name")
    .ilike("name", `%${query}%`)
    .limit(20)
    .order("name");

  if (profile?.role !== "admin") {
    queryBuilder = queryBuilder.eq("created_by", auth.user.id);
  }

  const { data } = await queryBuilder;
  return (data as Array<{ id: string; name: string }>) ?? [];
}

export async function createClientWithSpace(formData: FormData): Promise<{ clientId: string; spaceSlug: string } | { error: string }> {
  const clientResult = await createClient_(formData);
  if ("error" in clientResult) return { error: clientResult.error };

  return {
    clientId: clientResult.id,
    spaceSlug: clientResult.slug,
  };
}

export async function createReportUnified(clientId: string, verticalId: string, formData: FormData) {
  const perm = await assertCanManageClient(clientId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const { data: client } = await perm.supabaseAdmin
    .from("clients")
    .select("slug")
    .eq("id", clientId)
    .single();

  if (!client) return { error: "Cliente no encontrado" };

  return await createReport(client.slug, verticalId, formData);
}

// ─── Clients ───────────────────────────────────────────────────────────────

export async function createClient_(formData: FormData) {
  const auth = await getAuthenticatedUser();
  if (auth.error || !auth.user) return { error: auth.error ?? "No autenticado" };

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const logoFile = formData.get("logo") as File | null;
  let logoPath: string | null = null;
  if (logoFile && logoFile.size > 0) {
    const logoResult = await uploadClientLogo(logoFile);
    if ("error" in logoResult) return logoResult;
    logoPath = logoResult.path;
  }

  const supabaseAdmin = createAdminClient();

  const slugBase = slugify(name);
  if (!slugBase) {
    if (logoPath) await supabaseAdmin.storage.from(LOGO_BUCKET).remove([logoPath]);
    return { error: "El nombre no produce un slug válido" };
  }

  let candidate = slugBase;
  let suffix = 2;
  while (true) {
    const { data: existing } = await supabaseAdmin
      .from("clients")
      .select("id")
      .eq("slug", candidate)
      .single();
    if (!existing) break;
    candidate = `${slugBase}-${suffix}`;
    suffix++;
    if (suffix > 99) {
      if (logoPath) await supabaseAdmin.storage.from(LOGO_BUCKET).remove([logoPath]);
      return { error: "No se pudo generar slug único" };
    }
  }

  const { data, error } = await supabaseAdmin.from("clients").insert({
    name,
    contact_name: (formData.get("contact_name") as string | null)?.trim() || null,
    contact_phone: (formData.get("contact_phone") as string | null)?.trim() || null,
    contact_whatsapp: (formData.get("contact_whatsapp") as string | null)?.trim() || null,
    logo_url: logoPath,
    created_by: auth.user.id,
    slug: candidate,
  }).select("id, slug").single();

  if (error) {
    if (logoPath) await supabaseAdmin.storage.from(LOGO_BUCKET).remove([logoPath]);
    return { error: "Error al crear el cliente" };
  }

  const client = data as { id: string; slug: string };
  await supabaseAdmin
    .from("report_namespaces")
    .insert({ slug: client.slug, entity_type: "client", client_id: client.id });

  return { success: true, id: client.id, slug: client.slug };
}

export async function updateClient(id: string, formData: FormData) {
  const perm = await assertCanManageClient(id);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const name = (formData.get("name") as string | null)?.trim();
  if (!name) return { error: "El nombre es obligatorio" };

  const { data: current } = await perm.supabaseAdmin.from("clients").select("logo_url").eq("id", id).single();
  const currentLogo = (current as { logo_url: string | null } | null)?.logo_url ?? undefined;

  let logoPath = currentLogo;
  const logoFile = formData.get("logo") as File | null;
  const removeLogo = formData.get("remove_logo") === "true";

  if (removeLogo) {
    if (currentLogo) await perm.supabaseAdmin.storage.from(LOGO_BUCKET).remove([currentLogo]);
    logoPath = undefined;
  } else if (logoFile && logoFile.size > 0) {
    const logoResult = await uploadClientLogo(logoFile, currentLogo);
    if ("error" in logoResult) return logoResult;
    logoPath = logoResult.path;
  }

  const updateData: any = {
    name,
    contact_name: (formData.get("contact_name") as string | null)?.trim() || null,
    contact_phone: (formData.get("contact_phone") as string | null)?.trim() || null,
    contact_whatsapp: (formData.get("contact_whatsapp") as string | null)?.trim() || null,
  };
  
  if (removeLogo || (logoFile && logoFile.size > 0)) {
     updateData.logo_url = removeLogo ? null : logoPath;
  }

  const { error } = await perm.supabaseAdmin.from("clients").update(updateData).eq("id", id);

  if (error) return { error: "Error al actualizar el cliente" };
  return { success: true };
}

export async function deleteClient(id: string) {
  const perm = await assertCanManageClient(id);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const { data: clientInfo } = await perm.supabaseAdmin.from("clients").select("slug").eq("id", id).single();
  const namespaceSlug = (clientInfo as { slug: string } | null)?.slug;

  // 2. Get all reports of this namespace, and their storage paths
  let reportIds: string[] = [];
  let docPaths: string[] = [];
  let attPaths: string[] = [];

  if (namespaceSlug) {
    const { data: reports } = await perm.supabaseAdmin
      .from("reports")
      .select("id")
      .eq("namespace_slug", namespaceSlug);
    reportIds = (reports as Array<{ id: string }> ?? []).map((r) => r.id);

    if (reportIds.length > 0) {
      const [{ data: versions }, { data: attachments }] = await Promise.all([
        perm.supabaseAdmin.from("report_versions").select("storage_path").in("report_id", reportIds),
        perm.supabaseAdmin.from("report_attachments").select("storage_path").in("report_id", reportIds),
      ]);
      docPaths = (versions as Array<{ storage_path: string }> ?? []).map((v) => v.storage_path);
      attPaths = (attachments as Array<{ storage_path: string }> ?? []).map((a) => a.storage_path);
    }
  }

  // 3. Delete DB rows in reverse dependency order
  if (reportIds.length > 0) {
    // Delete report notes logs and notes first
    const { data: versionsData } = await perm.supabaseAdmin
      .from("report_versions")
      .select("id")
      .in("report_id", reportIds);
    const versionIds = (versionsData as Array<{ id: string }> ?? []).map((v) => v.id);

    if (versionIds.length > 0) {
      const { data: notesData } = await perm.supabaseAdmin
        .from("report_notes")
        .select("id")
        .in("report_version_id", versionIds);
      const noteIds = (notesData as Array<{ id: string }> ?? []).map((n) => n.id);

      if (noteIds.length > 0) {
        await perm.supabaseAdmin.from("report_note_logs").delete().in("note_id", noteIds);
        await perm.supabaseAdmin.from("report_notes").delete().in("id", noteIds);
      }
    }

    // Delete reports tables references
    await Promise.all([
      perm.supabaseAdmin.from("report_sessions").delete().in("report_id", reportIds),
      perm.supabaseAdmin.from("magic_link_tokens").delete().in("report_id", reportIds),
      perm.supabaseAdmin.from("magic_link_requests").delete().in("report_id", reportIds),
      perm.supabaseAdmin.from("pin_attempts").delete().in("report_id", reportIds),
      perm.supabaseAdmin.from("report_attachments").delete().in("report_id", reportIds),
      perm.supabaseAdmin.from("report_versions").delete().in("report_id", reportIds),
    ]);

    // Delete reports
    await perm.supabaseAdmin.from("reports").delete().in("id", reportIds);
  }

  // Delete recipients
  await perm.supabaseAdmin.from("client_recipients").delete().eq("client_id", id);

  // Get current client details for logo cleanup
  const { data: current } = await perm.supabaseAdmin.from("clients").select("logo_url").eq("id", id).single();
  const currentLogo = (current as { logo_url: string | null } | null)?.logo_url;

  // Delete client
  const { error } = await perm.supabaseAdmin.from("clients").delete().eq("id", id);
  if (error) return { error: "Error al eliminar el cliente" };

  // 4. Clean up Storage files asynchronously or at the end
  if (docPaths.length > 0) {
    await perm.supabaseAdmin.storage.from("report-documents").remove(docPaths);
  }
  if (attPaths.length > 0) {
    await perm.supabaseAdmin.storage.from("report-attachments").remove(attPaths);
  }
  if (currentLogo) {
    await perm.supabaseAdmin.storage.from(LOGO_BUCKET).remove([currentLogo]);
  }

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
