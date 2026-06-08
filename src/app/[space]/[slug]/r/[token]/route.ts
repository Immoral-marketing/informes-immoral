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

  // Resolve report from space+slug
  const { data: spaceData } = await supabaseAdmin
    .from("client_spaces")
    .select("id")
    .eq("slug", space)
    .single();
  const spaceId = (spaceData as { id: string } | null)?.id;

  const base = `${space}/${slug}`;

  if (!spaceId) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, request.url));
  }

  const { data: reportData } = await supabaseAdmin
    .from("reports")
    .select("id")
    .eq("space_id", spaceId)
    .eq("slug", slug)
    .single();
  const reportId = (reportData as { id: string } | null)?.id;

  if (!reportId) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, request.url));
  }

  // Hash the token from URL
  const tokenHash = hashToken(token);

  // Atomic consumption: UPDATE where consumed_at IS NULL and not expired
  // We first fetch, then update — Supabase doesn't support UPDATE ... RETURNING with WHERE in a single atomic step easily.
  // To ensure atomicity: fetch + check, then update with the same conditions.
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
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, request.url));
  }

  // Check consumed or expired
  if (t.consumed_at || new Date(t.expires_at) <= new Date()) {
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, request.url));
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
    return NextResponse.redirect(new URL(`/${base}?error=link_expired`, request.url));
  }

  // Create session
  const sessionToken = generateSessionToken();
  const sessionHash = hashToken(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();

  await supabaseAdmin.from("report_sessions").insert({
    report_id: reportId,
    recipient_id: t.recipient_id,
    token_hash: sessionHash,
    session_type: "magic_link",
    expires_at: expiresAt,
  });

  // Redirect to clean URL (without token) — CA-07
  const response = NextResponse.redirect(new URL(`/${base}`, request.url));
  response.cookies.set("informes_session", sessionToken, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "strict",
    maxAge: SESSION_HOURS * 3600,
    path: "/",
  });
  return response;
}
