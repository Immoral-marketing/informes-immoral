import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/tokens/hash";
import { generateMagicLinkToken } from "@/lib/tokens/generate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ space: string; token: string }> }
) {
  const { space, token } = await params;
  const tokenHash = hashToken(token);
  const supabaseAdmin = createAdminClient();

  // Find space ID
  const { data: spaceData } = await supabaseAdmin
    .from("client_spaces")
    .select("id")
    .eq("slug", space)
    .single();

  if (!spaceData) {
    return NextResponse.redirect(new URL(`/${space}/portal?error=invalid_space`, request.url));
  }

  const spaceId = spaceData.id;

  // Find token
  const { data: tokenRecord } = await supabaseAdmin
    .from("space_access_tokens")
    .select("id, recipient_id, consumed_at, expires_at")
    .eq("space_id", spaceId)
    .eq("token_hash", tokenHash)
    .single();

  if (!tokenRecord) {
    return NextResponse.redirect(new URL(`/${space}/portal?error=link_invalid`, request.url));
  }

  if (tokenRecord.consumed_at || new Date(tokenRecord.expires_at) <= new Date()) {
    return NextResponse.redirect(new URL(`/${space}/portal?error=link_expired`, request.url));
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
    return NextResponse.redirect(new URL(`/${space}/portal?error=link_expired`, request.url));
  }

  // Create session
  const sessionTokenRaw = generateMagicLinkToken();
  const sessionTokenHash = hashToken(sessionTokenRaw);
  const sessionExpiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  await supabaseAdmin.from("portal_sessions").insert({
    space_id: spaceId,
    recipient_id: tokenRecord.recipient_id,
    session_token_hash: sessionTokenHash,
    expires_at: sessionExpiresAt,
  });

  // Set cookie
  const response = NextResponse.redirect(new URL(`/${space}/portal`, request.url));
  
  response.cookies.set({
    name: "portal_session",
    value: sessionTokenRaw,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: `/${space}`, // Scoped to space path
    maxAge: 48 * 3600,
  });

  return response;
}
