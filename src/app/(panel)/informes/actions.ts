"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slugify";
import { generateSessionToken } from "@/lib/tokens/generate";
import { generateAndSendMagicLink } from "@/lib/magic-link/send";
import bcrypt from "bcryptjs";
import { safeEncryptPin, decryptPin } from "@/lib/crypto/pin-cipher";

const DOC_BUCKET = "report-documents";
const ATT_BUCKET = "report-attachments";
const MAX_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME = ["application/pdf", "text/html"];

const ATT_MAX_SIZE = 25 * 1024 * 1024; // 25MB
const ATT_ALLOWED_MIME = [
  "application/pdf", 
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png", "image/jpeg", "image/jpg", 
  "application/zip", "application/x-zip-compressed"
];

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

async function assertCanManageReport(reportId: string) {
  const { user } = await getUser();
  if (!user) return { error: "No autenticado" as const };
  const supabaseAdmin = createAdminClient();
  const { data: r } = await supabaseAdmin.from("reports").select("created_by, space_id").eq("id", reportId).single();
  const report = r as { created_by: string; space_id: string } | null;
  if (!report) return { error: "Informe no encontrado" as const };
  const { data: p } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = p as { role: string } | null;
  if (report.created_by !== user.id && profile?.role !== "admin") return { error: "Sin permiso" as const };
  return { error: null, user, supabaseAdmin, report };
}

// ─── PIN generation ───────────────────────────────────────────────────────────

function generatePin(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String((arr[0] ?? 0) % 10000).padStart(4, "0");
}

// ─── Storage upload ───────────────────────────────────────────────────────────

async function uploadDocument(
  file: File,
  bucket: string
): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED_MIME.includes(file.type)) return { error: "Solo se aceptan archivos PDF o HTML" };
  if (file.size > MAX_SIZE) return { error: "El archivo no puede superar 50MB" };
  const supabaseAdmin = createAdminClient();
  const ext = file.type === "application/pdf" ? "pdf" : "html";
  const path = `${Date.now()}-${generateSessionToken().slice(0, 8)}.${ext}`;
  const bytes = await file.arrayBuffer();
  const { error } = await supabaseAdmin.storage.from(bucket).upload(path, bytes, { contentType: file.type });
  if (error) return { error: "Error al subir el archivo" };
  return { path };
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export async function checkReportSlug(spaceId: string, name: string): Promise<{ taken: boolean }> {
  const supabaseAdmin = createAdminClient();
  const slug = slugify(name);
  const { data } = await supabaseAdmin.from("reports").select("id").eq("space_id", spaceId).eq("slug", slug).single();
  return { taken: !!data };
}

export async function checkReportName(spaceId: string, name: string): Promise<{ taken: boolean }> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("space_id", spaceId)
    .ilike("name", name.trim())
    .single();
  return { taken: !!data };
}

export async function createReport(spaceId: string, formData: FormData) {
  const { user } = await getUser();
  if (!user) return { error: "No autenticado" };

  const name = (formData.get("name") as string | null)?.trim();
  const customSlug = (formData.get("slug") as string | null)?.trim();
  const autoSend = formData.get("auto_send") === "true";
  const docFile = formData.get("document") as File | null;

  if (!name) return { error: "El nombre es obligatorio" };
  if (!docFile || docFile.size === 0) return { error: "El documento principal es obligatorio" };

  const slug = customSlug ? slugify(customSlug) : slugify(name);
  if (!slug) return { error: "El slug generado es inválido" };

  const supabaseAdmin = createAdminClient();

  // Check name uniqueness (CA-04b)
  const { data: nameExists } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("space_id", spaceId)
    .ilike("name", name)
    .single();
  if (nameExists) return { error: `Ya existe un informe con el nombre "${name}" en este espacio` };

  // Check slug uniqueness (CA-04)
  const { data: slugExists } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("space_id", spaceId)
    .eq("slug", slug)
    .single();
  if (slugExists) return { error: `Ya existe un informe con el slug "${slug}" en este espacio` };

  // Upload document
  const uploadResult = await uploadDocument(docFile, DOC_BUCKET);
  if ("error" in uploadResult) return uploadResult;

  // Generate PIN
  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 12);

  // Create report
  const { data: reportData, error: reportError } = await supabaseAdmin
    .from("reports")
    .insert({
      space_id: spaceId,
      name,
      slug,
      pin_hash: pinHash,
      pin_encrypted: safeEncryptPin(pin),
      auto_send_on_publish: autoSend,
      current_version: 1,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (reportError || !reportData) {
    await supabaseAdmin.storage.from(DOC_BUCKET).remove([uploadResult.path]);
    return { error: "Error al crear el informe" };
  }

  const reportId = (reportData as { id: string }).id;
  const format = docFile.type === "application/pdf" ? "pdf" : "html";

  // Create version 1
  await supabaseAdmin.from("report_versions").insert({
    report_id: reportId,
    version_number: 1,
    format,
    storage_path: uploadResult.path,
    size_bytes: docFile.size,
    created_by: user.id,
  });

  // Auto-send magic link if enabled (SPEC-07 integration placeholder)
  let autoSendWarning: string | undefined;
  if (autoSend) {
    const primaryResult = await checkPrimaryRecipient(spaceId, supabaseAdmin);
    if (!primaryResult.hasPrimary) {
      autoSendWarning = "Auto-envío activado, pero el cliente no tiene destinatario primario. Añade uno en la ficha del cliente.";
    } else if (primaryResult.recipientId && primaryResult.spaceSlug && primaryResult.clientName) {
      await generateAndSendMagicLink({
        reportId,
        recipientId: primaryResult.recipientId,
        spaceSlug: primaryResult.spaceSlug,
        reportSlug: slug,
        reportName: name,
        clientName: primaryResult.clientName,
        clientLogoUrl: null, // Fetched during link generation or manual send if needed
        createdBy: user.id,
      });
    }
  }

  return { success: true, reportId, pin, autoSendWarning };
}

async function checkPrimaryRecipient(spaceId: string, supabaseAdmin: ReturnType<typeof createAdminClient>) {
  const { data: space } = await supabaseAdmin
    .from("client_spaces")
    .select("client_id, slug, clients(name)")
    .eq("id", spaceId)
    .single();
  if (!space) return { hasPrimary: false };
  const s = space as unknown as { client_id: string; slug: string; clients: { name: string } | null };
  const { data } = await supabaseAdmin
    .from("client_recipients")
    .select("id")
    .eq("client_id", s.client_id)
    .eq("is_primary", true)
    .single();
  const rec = data as { id: string } | null;
  return {
    hasPrimary: !!rec,
    recipientId: rec?.id,
    spaceSlug: s.slug,
    clientName: s.clients?.name ?? "cliente",
  };
}

export async function addVersion(reportId: string, formData: FormData) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const docFile = formData.get("document") as File | null;
  if (!docFile || docFile.size === 0) return { error: "El documento principal es obligatorio" };

  const uploadResult = await uploadDocument(docFile, DOC_BUCKET);
  if ("error" in uploadResult) return uploadResult;

  const { data: current } = await perm.supabaseAdmin
    .from("reports")
    .select("current_version, auto_send_on_publish, space_id")
    .eq("id", reportId)
    .single();
  const r = current as { current_version: number; auto_send_on_publish: boolean; space_id: string } | null;
  if (!r) return { error: "Informe no encontrado" };

  const nextVersion = r.current_version + 1;
  const format = docFile.type === "application/pdf" ? "pdf" : "html";
  const copyNotes = formData.get("copy_notes") === "true";

  // Get previous version id if copying notes
  let prevVersionId: string | null = null;
  if (copyNotes && r.current_version > 0) {
    const { data: prevVersion } = await perm.supabaseAdmin
      .from("report_versions")
      .select("id")
      .eq("report_id", reportId)
      .eq("version_number", r.current_version)
      .single();
    prevVersionId = (prevVersion as { id: string } | null)?.id ?? null;
  }

  const { data: newVersionRow } = await perm.supabaseAdmin.from("report_versions").insert({
    report_id: reportId,
    version_number: nextVersion,
    format,
    storage_path: uploadResult.path,
    size_bytes: docFile.size,
    created_by: perm.user.id,
  }).select("id").single();

  if (copyNotes && prevVersionId && newVersionRow) {
    const { copyNotesFromPreviousVersion } = await import("./[id]/notes-actions");
    await copyNotesFromPreviousVersion(reportId, prevVersionId, newVersionRow.id);
  }

  await perm.supabaseAdmin
    .from("reports")
    .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
    .eq("id", reportId);

  let autoSendWarning: string | undefined;
  if (r.auto_send_on_publish) {
    const primary = await checkPrimaryRecipient(r.space_id, perm.supabaseAdmin);
    if (!primary.hasPrimary) {
      autoSendWarning = "Auto-envío activado, pero el cliente no tiene destinatario primario.";
    } else if (primary.recipientId && primary.spaceSlug) {
      const { data: reportInfo } = await perm.supabaseAdmin.from("reports").select("name, slug").eq("id", reportId).single();
      const ri = reportInfo as { name: string; slug: string } | null;
      if (ri) {
        await generateAndSendMagicLink({
          reportId,
          recipientId: primary.recipientId,
          spaceSlug: primary.spaceSlug,
          reportSlug: ri.slug,
          reportName: ri.name,
          clientName: primary.clientName,
          clientLogoUrl: null,
          createdBy: perm.user.id,
        });
      }
    }
  }

  return { success: true, version: nextVersion, autoSendWarning };
}

export async function regeneratePin(reportId: string) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 12);

  // Update pin and timestamp
  await perm.supabaseAdmin
    .from("reports")
    .update({ 
      pin_hash: pinHash, 
      pin_encrypted: safeEncryptPin(pin),
      pin_updated_at: new Date().toISOString() 
    })
    .eq("id", reportId);

  // Invalidate all sessions for this report
  await perm.supabaseAdmin.from("report_sessions").delete().eq("report_id", reportId);

  // Expire all pending magic link tokens
  await perm.supabaseAdmin
    .from("magic_link_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .is("consumed_at", null);

  return { success: true, pin };
}

export async function deleteReport(reportId: string) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  // Get all storage paths to delete
  const [{ data: versions }, { data: attachments }] = await Promise.all([
    perm.supabaseAdmin.from("report_versions").select("storage_path").eq("report_id", reportId),
    perm.supabaseAdmin.from("report_attachments").select("storage_path").eq("report_id", reportId),
  ]);

  const docPaths = (versions as Array<{ storage_path: string }> ?? []).map((v) => v.storage_path);
  const attPaths = (attachments as Array<{ storage_path: string }> ?? []).map((a) => a.storage_path);

  // Delete report (cascade deletes versions, attachments, sessions, tokens)
  const { error } = await perm.supabaseAdmin.from("reports").delete().eq("id", reportId);
  if (error) return { error: "Error al eliminar el informe" };

  // Clean up Storage
  if (docPaths.length > 0) await perm.supabaseAdmin.storage.from(DOC_BUCKET).remove(docPaths);
  if (attPaths.length > 0) await perm.supabaseAdmin.storage.from(ATT_BUCKET).remove(attPaths);

  return { success: true };
}

export async function setReportExpiry(reportId: string, date: string | null) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const { error } = await perm.supabaseAdmin
    .from("reports")
    .update({ expiry_date: date })
    .eq("id", reportId);

  if (error) return { error: "Error al actualizar la vigencia" };
  return { success: true };
}

export async function getDecryptedReportPin(reportId: string) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const { data } = await perm.supabaseAdmin
    .from("reports")
    .select("pin_encrypted")
    .eq("id", reportId)
    .single();

  const row = data as { pin_encrypted: string | null } | null;
  if (!row?.pin_encrypted) return { error: "PIN no disponible — regenéralo para visualizarlo" };

  try {
    const pin = decryptPin(row.pin_encrypted);
    return { pin };
  } catch (err) {
    return { error: "Error interno al descifrar el PIN" };
  }
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export async function addAttachment(reportId: string, formData: FormData) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "El archivo es obligatorio" };
  
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  let mimeType = file.type;
  if (!mimeType || mimeType === "application/octet-stream") {
    if (fileExt === "pdf") mimeType = "application/pdf";
    else if (fileExt === "doc") mimeType = "application/msword";
    else if (fileExt === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (fileExt === "xls") mimeType = "application/vnd.ms-excel";
    else if (fileExt === "xlsx") mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    else if (fileExt === "ppt") mimeType = "application/vnd.ms-powerpoint";
    else if (fileExt === "pptx") mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    else if (fileExt === "png") mimeType = "image/png";
    else if (fileExt === "jpg" || fileExt === "jpeg") mimeType = "image/jpeg";
    else if (fileExt === "zip") mimeType = "application/zip";
  }

  if (!ATT_ALLOWED_MIME.includes(mimeType)) {
    return { error: "Tipo de archivo no permitido" };
  }
  if (file.size > ATT_MAX_SIZE) {
    return { error: "El archivo no puede superar 25 MB" };
  }

  const path = `${Date.now()}-${generateSessionToken().slice(0, 8)}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await perm.supabaseAdmin.storage.from(ATT_BUCKET).upload(path, bytes, { contentType: mimeType });
  if (uploadError) return { error: "Error al subir el adjunto" };

  const { data: attData, error } = await perm.supabaseAdmin.from("report_attachments").insert({
    report_id: reportId,
    filename: file.name,
    mime_type: mimeType,
    storage_path: path,
    size_bytes: file.size,
    created_by: perm.user.id,
  }).select("id, filename, mime_type, storage_path, size_bytes, created_at").single();

  if (error || !attData) {
    await perm.supabaseAdmin.storage.from(ATT_BUCKET).remove([path]);
    return { error: "Error al guardar el adjunto" };
  }

  const signed_url = await getSignedAttachmentUrl(path);

  return { success: true, attachment: { ...attData, signed_url } };
}

export async function deleteAttachment(attachmentId: string, reportId: string) {
  const perm = await assertCanManageReport(reportId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  const { data: att } = await perm.supabaseAdmin
    .from("report_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("report_id", reportId)
    .single();
  const a = att as { storage_path: string } | null;
  if (!a) return { error: "Adjunto no encontrado" };

  const { error } = await perm.supabaseAdmin.from("report_attachments").delete().eq("id", attachmentId);
  if (error) return { error: "Error al eliminar el adjunto" };

  await perm.supabaseAdmin.storage.from(ATT_BUCKET).remove([a.storage_path]);
  return { success: true };
}

export async function getSignedDocUrl(path: string): Promise<string | null> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage.from(DOC_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function getSignedAttachmentUrl(path: string): Promise<string | null> {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage.from(ATT_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
