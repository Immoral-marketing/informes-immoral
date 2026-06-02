"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: "No se pudo iniciar el proceso de autenticación." };
  }

  return { url: data.url };
}

export async function signInWithMagicLink(email: string) {
  // Always return the same message regardless of outcome (CA-03)
  const GENERIC_MESSAGE =
    "Si esta cuenta está registrada, recibirás un enlace de acceso.";

  if (!email || !email.includes("@")) {
    return { message: GENERIC_MESSAGE };
  }

  const domain = email.split("@")[1] ?? "";

  // Verify domain BEFORE sending email — using admin client (CA-02)
  const supabaseAdmin = createAdminClient();
  const { data: domainRecord } = await supabaseAdmin
    .from("authorized_domains")
    .select("id")
    .eq("domain", domain)
    .single();

  if (!domainRecord) {
    // Domain not authorized — return generic message without sending email
    return { message: GENERIC_MESSAGE };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin") ?? "";

  await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  // Always return the same message (CA-03)
  return { message: GENERIC_MESSAGE };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
