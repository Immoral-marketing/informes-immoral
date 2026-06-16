import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
import { generateMagicLinkToken } from "@/lib/tokens/generate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ space: string; token: string }> }
) {
  const { space, token } = await params;
  const origin = new URL(request.url).origin;
  const tokenHash = hashToken(token);
  const supabaseAdmin = createAdminClient();

  // Find namespace
  const { data: namespace } = await supabaseAdmin
    .from("report_namespaces")
    .select("slug, entity_type")
    .eq("slug", space)
    .single();

  if (!namespace || namespace.entity_type !== "client") {
    return NextResponse.redirect(new URL(`/${space}/portal?error=invalid_space`, origin));
  }

  // Find token
  const { data: tokenRecord } = await supabaseAdmin
    .from("space_access_tokens")
    .select("id, recipient_id, consumed_at, expires_at, namespace_slug")
    .eq("namespace_slug", namespace.slug)
    .eq("token_hash", tokenHash)
    .single();

  if (!tokenRecord) {
    return NextResponse.redirect(new URL(`/${space}/portal?error=link_invalid`, origin));
  }

  if (tokenRecord.consumed_at || new Date(tokenRecord.expires_at) <= new Date()) {
    return NextResponse.redirect(new URL(`/${space}/portal?error=link_expired`, origin));
  }

  // Consume token (atomic update)
  const { data: updateData, error: updateError } = await supabaseAdmin
    .from("space_access_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", tokenRecord.id)
    .is("consumed_at", null)
    .select("id")
    .single();

  if (updateError || !updateData) {
    return NextResponse.redirect(new URL(`/${space}/portal?error=link_expired`, origin));
  }

  // Create session
  const sessionTokenRaw = generateMagicLinkToken();
  const sessionTokenHash = hashToken(sessionTokenRaw);
  const sessionExpiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  const tokenRaw = tokenRecord as unknown as {
    id: string;
    recipient_id: string | null;
    consumed_at: string | null;
    expires_at: string;
    namespace_slug: string | null;
  };

  await supabaseAdmin.from("portal_sessions").insert({
    namespace_slug: tokenRaw.namespace_slug,
    recipient_id: tokenRaw.recipient_id,
    session_token_hash: sessionTokenHash,
    expires_at: sessionExpiresAt,
  });

  const response = NextResponse.redirect(new URL(`/${space}/portal`, origin));

  response.cookies.set({
    name: "portal_session",
    value: sessionTokenRaw,
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    path: `/${space}`,
    maxAge: 48 * 3600,
  });

  return response;
}
