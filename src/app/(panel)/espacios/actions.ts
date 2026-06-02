"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils/slugify";

const RESERVED_SLUGS = new Set([
  "admin", "login", "auth", "api", "clientes", "espacios",
  "_next", "public", "favicon.ico", "sitemap.xml", "robots.txt",
]);

async function resolveSlug(baseName: string): Promise<{ slug: string } | { error: string }> {
  const base = slugify(baseName);
  if (!base) return { error: "El nombre del cliente no produce un slug válido" };
  if (RESERVED_SLUGS.has(base)) {
    return { error: `El slug "${base}" está reservado por el sistema. Cambia el nombre del cliente.` };
  }

  const supabaseAdmin = createAdminClient();

  // Check against vertical slugs (slug collision with verticals)
  const { data: vertical } = await supabaseAdmin
    .from("verticals")
    .select("id")
    .eq("slug", base)
    .single();
  if (vertical) {
    return { error: `El slug "${base}" coincide con un vertical existente. Cambia el nombre del cliente.` };
  }

  // Check global uniqueness in client_spaces, find available variant
  let candidate = base;
  let suffix = 2;
  while (true) {
    const { data: existing } = await supabaseAdmin
      .from("client_spaces")
      .select("id")
      .eq("slug", candidate)
      .single();
    if (!existing) break;
    candidate = `${base}-${suffix}`;
    suffix++;
    if (suffix > 99) return { error: "No se pudo generar un slug único. Contacta con soporte." };
  }

  return { slug: candidate };
}

async function assertCanManageClient(clientId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const };

  const supabaseAdmin = createAdminClient();
  const { data: c } = await supabaseAdmin
    .from("clients")
    .select("created_by")
    .eq("id", clientId)
    .single();
  const client = c as { created_by: string } | null;
  if (!client) return { error: "Cliente no encontrado" as const };

  const { data: rawProfile } = await supabaseAdmin.from("profiles").select("role").eq("id", user.id).single();
  const profile = rawProfile as { role: "admin" | "employee" } | null;

  if (client.created_by !== user.id && profile?.role !== "admin") {
    return { error: "No tienes permisos para gestionar este cliente" as const };
  }

  return { error: null, user, supabaseAdmin };
}

export async function getSlugPreview(clientName: string): Promise<{ slug: string } | { error: string }> {
  return resolveSlug(clientName);
}

export async function createSpace(clientId: string, verticalId: string, clientName: string) {
  const perm = await assertCanManageClient(clientId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  // Verify not already has space in this vertical (CA-07)
  const { data: existing } = await perm.supabaseAdmin
    .from("client_spaces")
    .select("id")
    .eq("client_id", clientId)
    .eq("vertical_id", verticalId)
    .single();
  if (existing) return { error: "Este cliente ya tiene un espacio en el vertical seleccionado." };

  // Resolve slug
  const slugResult = await resolveSlug(clientName);
  if ("error" in slugResult) return slugResult;

  const { data, error } = await perm.supabaseAdmin
    .from("client_spaces")
    .insert({
      client_id: clientId,
      vertical_id: verticalId,
      slug: slugResult.slug,
      created_by: perm.user.id,
    })
    .select("id")
    .single();

  if (error) return { error: "Error al crear el espacio" };
  return { success: true, id: (data as { id: string }).id, slug: slugResult.slug };
}

export async function deleteSpace(spaceId: string, clientId: string) {
  const perm = await assertCanManageClient(clientId);
  if (perm.error || !perm.supabaseAdmin) return { error: perm.error ?? "No autorizado" };

  // Check for reports (CA-08)
  const { count } = await perm.supabaseAdmin
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId);

  if ((count ?? 0) > 0) {
    return { error: `Este espacio tiene ${count} informe(s). Elimínalos antes de continuar.` };
  }

  const { error } = await perm.supabaseAdmin
    .from("client_spaces")
    .delete()
    .eq("id", spaceId);

  if (error) return { error: "Error al eliminar el espacio" };
  return { success: true };
}
