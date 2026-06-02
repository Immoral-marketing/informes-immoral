import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Use NEXT_PUBLIC_SITE_URL in production; fall back to request origin for local
  const siteUrl = process.env["NEXT_PUBLIC_SITE_URL"] ?? new URL(request.url).origin;

  if (error) {
    return NextResponse.redirect(`${siteUrl}/login?error=oauth_error`);
  }

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/login?error=no_code`);
  }

  // Build the success redirect first — cookies will be attached to this response
  let response = NextResponse.redirect(`${siteUrl}/clientes`);

  // Create the Supabase client with setAll writing directly onto the response object.
  // This is the correct pattern for Route Handlers: cookies must be set on the
  // NextResponse, not via next/headers cookieStore, or they are lost on redirect.
  const supabase = createServerClient<Database>(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("[callback] exchangeCodeForSession error:", exchangeError.message);
    return NextResponse.redirect(`${siteUrl}/login?error=exchange_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    console.error("[callback] no user after exchange");
    return NextResponse.redirect(`${siteUrl}/login?error=unauthorized`);
  }

  // Verify domain — admin client bypasses RLS (user has no profile yet)
  const domain = user.email.split("@")[1] ?? "";
  const supabaseAdmin = createAdminClient();

  const { data: domainRecord, error: domainError } = await supabaseAdmin
    .from("authorized_domains")
    .select("id")
    .eq("domain", domain)
    .single();

  console.log("[callback] email:", user.email, "| domain found:", !!domainRecord, "| error:", domainError?.message);

  if (!domainRecord) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
    return NextResponse.redirect(
      `${siteUrl}/login?error=unauthorized`
    );
  }

  // Upsert profile and assign role
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

  // Return the redirect with session cookies attached
  return response;
}
