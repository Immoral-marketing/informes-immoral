"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slugify";

const LOGO_BUCKET = "vertical-logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME = ["image/png", "image/svg+xml"];
const COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };
  // Leer el rol con admin client: las políticas RLS de `profiles` son recursivas
  // (profiles_select_admin consulta profiles) y devuelven null con el cliente RLS.
  const supabaseAdmin = createAdminClient();
  const { data: p } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = p as { role: "admin" | "employee" } | null;
  if (profile?.role !== "admin") return { error: "Solo los administradores pueden realizar esta acción" as const };
  return { user, supabase };
}

async function uploadLogo(file: File, oldPath?: string): Promise<{ path: string } | { error: string }> {
  if (!ALLOWED_MIME.includes(file.type)) return { error: "Solo se aceptan archivos PNG o SVG" };
  if (file.size > MAX_LOGO_BYTES) return { error: "El archivo no puede superar 2MB" };

  const supabaseAdmin = createAdminClient();

  // Delete old logo if replacing
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

export async function getSignedLogoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.storage.from(LOGO_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function checkSlug(name: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const slug = slugify(name);
  // Admin client: ver todos los slugs aunque RLS los oculte (evita colisiones)
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin.from("verticals").select("id").eq("slug", slug).maybeSingle();
  return !!data;
}

export async function createVertical(formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const name = (formData.get("name") as string | null)?.trim();
  const colorHex = (formData.get("color_hex") as string | null)?.trim();
  const logoFile = formData.get("logo") as File | null;

  if (!name) return { error: "El nombre es obligatorio" };
  if (!colorHex || !COLOR_RE.test(colorHex)) return { error: "Color hexadecimal inválido" };
  if (!logoFile || logoFile.size === 0) return { error: "El logo es obligatorio" };

  const slug = slugify(name);

  // Check slug uniqueness con admin client (ver todos los registros, evitar colisiones ocultas por RLS)
  const supabaseAdminCheck = createAdminClient();
  const { data: existing } = await supabaseAdminCheck.from("verticals").select("id").eq("slug", slug).maybeSingle();
  if (existing) return { error: `Ya existe un vertical con el slug "${slug}"` };

  const logoResult = await uploadLogo(logoFile);
  if ("error" in logoResult) return logoResult;

  const supabaseAdmin = createAdminClient();
  const { error: insertError } = await supabaseAdmin.from("verticals").insert({
    name,
    slug,
    logo_url: logoResult.path,
    color_hex: colorHex,
    created_by: auth.user.id,
  });

  if (insertError) {
    await supabaseAdmin.storage.from(LOGO_BUCKET).remove([logoResult.path]);
    return { error: "Error al crear el vertical" };
  }

  return { success: true };
}

export async function updateVertical(id: string, formData: FormData) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const name = (formData.get("name") as string | null)?.trim();
  const colorHex = (formData.get("color_hex") as string | null)?.trim();
  const logoFile = formData.get("logo") as File | null;

  if (!name) return { error: "El nombre es obligatorio" };
  if (!colorHex || !COLOR_RE.test(colorHex)) return { error: "Color hexadecimal inválido" };

  const supabaseAdmin = createAdminClient();
  const { data: current } = await supabaseAdmin.from("verticals").select("logo_url").eq("id", id).single();
  const currentLogo = (current as { logo_url: string | null } | null)?.logo_url ?? undefined;

  let logoPath = currentLogo;

  if (logoFile && logoFile.size > 0) {
    const logoResult = await uploadLogo(logoFile, currentLogo);
    if ("error" in logoResult) return logoResult;
    logoPath = logoResult.path;
  }

  const { error: updateError } = await supabaseAdmin
    .from("verticals")
    .update({ name, color_hex: colorHex, logo_url: logoPath ?? null })
    .eq("id", id);

  if (updateError) return { error: "Error al actualizar el vertical" };
  return { success: true };
}

export async function deleteVertical(id: string) {
  const auth = await requireAdmin();
  if ("error" in auth) return { error: auth.error };

  const supabaseAdmin = createAdminClient();

  // Check associated reports
  const { count } = await supabaseAdmin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("vertical_id", id);

  if ((count ?? 0) > 0) {
    return { error: `Este vertical tiene ${count} informe(s) asociado(s). Elimínalos antes de continuar.` };
  }

  const { data: vertical } = await supabaseAdmin.from("verticals").select("logo_url").eq("id", id).single();
  const logoPath = (vertical as { logo_url: string | null } | null)?.logo_url;

  const { error: deleteError } = await supabaseAdmin.from("verticals").delete().eq("id", id);
  if (deleteError) return { error: "Error al eliminar el vertical" };

  if (logoPath) {
    await supabaseAdmin.storage.from(LOGO_BUCKET).remove([logoPath]);
  }

  return { success: true };
}
