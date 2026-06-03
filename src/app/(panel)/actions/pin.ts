"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function setupPersonalPin(pin: string) {
  if (!/^\d{4}$/.test(pin)) {
    return { error: "El PIN debe tener exactamente 4 dígitos." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado." };
  }

  const supabaseAdmin = createAdminClient();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("personal_pin_hash")
    .eq("id", user.id)
    .single();

  if (profile?.personal_pin_hash) {
    return { error: "El PIN personal ya está configurado. Usa la opción de cambiar PIN." };
  }

  const hash = await bcrypt.hash(pin, 12);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ personal_pin_hash: hash })
    .eq("id", user.id);

  if (error) {
    console.error("Error setting up personal PIN:", error);
    return { error: "Hubo un error al guardar el PIN." };
  }

  return { success: true };
}

export async function changePersonalPin(currentPin: string, newPin: string) {
  if (!/^\d{4}$/.test(newPin)) {
    return { error: "El nuevo PIN debe tener exactamente 4 dígitos." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "No autorizado." };
  }

  const supabaseAdmin = createAdminClient();

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("personal_pin_hash")
    .eq("id", user.id)
    .single();

  if (!profile?.personal_pin_hash) {
    return { error: "No tienes un PIN configurado." };
  }

  const isValid = await bcrypt.compare(currentPin, profile.personal_pin_hash);

  if (!isValid) {
    return { error: "El PIN actual no es correcto." };
  }

  const hash = await bcrypt.hash(newPin, 12);

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ personal_pin_hash: hash })
    .eq("id", user.id);

  if (error) {
    console.error("Error changing personal PIN:", error);
    return { error: "Hubo un error al guardar el nuevo PIN." };
  }

  return { success: true };
}
