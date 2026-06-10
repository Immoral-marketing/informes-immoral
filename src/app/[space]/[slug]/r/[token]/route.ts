import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
import { generateSessionToken } from "@/lib/tokens/generate";

const SESSION_HOURS = 48;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ space: string; slug: string; token: string }> }
) {
  const { space, slug, token } = await params;
  const supabaseAdmin = createAdminClient();

  // Extract origin once — used for all redirects to avoid resolving relative to /r/[token]
  const origin = new URL(request.url).origin;
  const base = `${space}/${slug}`;

  // Resolve report from space+slug
  const { data: spaceData } = await supabaseAdmin
    .from("client_spaces")
    .select("id")
    .eq("slug", space)
    .single();
  const spaceId = (spaceData as { id: string } | null)?.id;

  if (!spaceId) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, origin));
  }

  const { data: reportData } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("space_id", spaceId)
    .eq("slug", slug)
    .single();
  const reportId = (reportData as { id: string } | null)?.id;

  if (!reportId) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, origin));
  }

  // Hash the token from URL
  const tokenHash = hashToken(token);

  const { data: tokenRecord } = await supabaseAdmin
    .from("magic_link_tokens")
    .select("id, recipient_id, expires_at, consumed_at")
    .eq("report_id", reportId)
    .eq("token_hash", tokenHash)
    .single();

  const t = tokenRecord as {
    id: string; recipient_id: string; expires_at: string; consumed_at: string | null;
  } | null;

  if (!t) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, origin));
  }

  // Check consumed or expired
  if (t.consumed_at || new Date(t.expires_at) <= new Date()) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, origin));
  }

  // Atomic consumption — update only if consumed_at is still NULL (race condition guard)
  const { data: updated } = await supabaseAdmin
    .from("magic_link_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", t.id)
    .is("consumed_at", null)
    .select("id");

  // If updated is empty, another request consumed it first
  if (!updated || updated.length === 0) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, origin));
  }

  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();

  // Create document session (informes_session)
  const sessionToken = generateSessionToken();
  const sessionHash = hashToken(sessionToken);
  await supabaseAdmin.from("report_sessions").insert({
    report_id: reportId,
    recipient_id: t.recipient_id,
    token_hash: sessionHash,
    session_type: "magic_link",
    expires_at: expiresAt,
  });

  // Create portal session (portal_session) — CA-14: magic link grants space-wide access
  const portalToken = generateSessionToken();
  const portalHash = hashToken(portalToken);
  await supabaseAdmin.from("portal_sessions").insert({
    space_id: spaceId,
    recipient_id: t.recipient_id,
    session_token_hash: portalHash,
    expires_at: expiresAt,
  });

  // Redirect to clean URL (without token) — CA-07
  const response = NextResponse.redirect(new URL(`/${base}`, origin));
  response.cookies.set("informes_session", sessionToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: SESSION_HOURS * 3600,
    path: "/",
  });
  response.cookies.set("portal_session", portalToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: SESSION_HOURS * 3600,
    path: `/${space}`,
  });
  return response;
}
