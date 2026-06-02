import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=oauth_error`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  // Get the authenticated user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/login?error=unauthorized`);
  }

  // Verify domain using admin client (bypasses RLS — user may not be admin yet)
  const domain = user.email.split("@")[1] ?? "";
  const supabaseAdmin = createAdminClient();

  const { data: domainRecord } = await supabaseAdmin
    .from("authorized_domains")
    .select("id")
    .eq("domain", domain)
    .single();

  if (!domainRecord) {
    // Domain not authorized: delete user from auth.users and redirect
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    await supabase.auth.signOut();
    return NextResponse.redirect(
      `${origin}/login?error=unauthorized&message=${encodeURIComponent("Esta cuenta no tiene acceso a la plataforma")}`
    );
  }

  // Upsert profile — determine role atomically
  const { count: adminCount } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  const isFirstAdmin = (adminCount ?? 0) === 0 && domain === "immoral.es";
  const role = isFirstAdmin ? "admin" : "employee";

  await supabaseAdmin.from("profiles").upsert(
    {
      id: user.id,
      full_name: user.user_metadata["full_name"] ?? user.email.split("@")[0],
      role,
      notification_email_enabled: true,
    },
    { onConflict: "id", ignoreDuplicates: false }
  );

  return NextResponse.redirect(`${origin}/`);
}
