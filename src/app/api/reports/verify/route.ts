import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSessionToken } from "@/lib/tokens/generate";
import { hashToken } from "@/lib/tokens/hash";
import bcrypt from "bcryptjs";

const ERROR_MSG = "PIN incorrecto o cuenta bloqueada";
const MAX_ATTEMPTS = 3;
const BLOCK_MINUTES = 3;
const SESSION_HOURS = 48;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: { pin?: string; report_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: ERROR_MSG }, { status: 400 });
  }

  const { pin, report_id } = body;
  if (!pin || !report_id || !/^\d{4}$/.test(pin) || !UUID_REGEX.test(report_id)) {
    return NextResponse.json({ error: ERROR_MSG }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  const supabaseAdmin = createAdminClient();

  // Check rate limit
  const { data: attempt } = await supabaseAdmin
    .from("pin_attempts")
    .select("attempts, blocked_until")
    .eq("report_id", report_id)
    .eq("ip_address", ip)
    .single();

  const att = attempt as { attempts: number; blocked_until: string | null } | null;
  if (att?.blocked_until && new Date(att.blocked_until) > new Date()) {
    return NextResponse.json({ error: ERROR_MSG }, { status: 429 });
  }

  // Get report PIN hash + namespace_slug (needed to create portal_session)
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("pin_hash, namespace_slug")
    .eq("id", report_id)
    .single();
  const r = report as { pin_hash: string; namespace_slug: string } | null;
  if (!r) return NextResponse.json({ error: ERROR_MSG }, { status: 400 });

  let valid = await bcrypt.compare(pin, r.pin_hash);

  // Override: PIN maestro de empleado
  if (!valid) {
    const { data: employees } = await supabaseAdmin
      .from("profiles")
      .select("personal_pin_hash")
      .not("personal_pin_hash", "is", null);

    for (const emp of (employees as { personal_pin_hash: string }[] ?? [])) {
      if (await bcrypt.compare(pin, emp.personal_pin_hash)) {
        valid = true;
        break;
      }
    }
  }

  if (!valid) {
    const newAttempts = (att?.attempts ?? 0) + 1;
    const blockedUntil = newAttempts >= MAX_ATTEMPTS
      ? new Date(Date.now() + BLOCK_MINUTES * 60 * 1000).toISOString()
      : null;

    await supabaseAdmin.from("pin_attempts").upsert(
      { report_id, ip_address: ip, attempts: newAttempts, blocked_until: blockedUntil, last_attempt: new Date().toISOString() },
      { onConflict: "report_id,ip_address" }
    );
    return NextResponse.json({ error: ERROR_MSG }, { status: 401 });
  }

  // Valid PIN — create session
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();

  // Reset attempts on successful login to prevent cumulative blocks over time
  if (att && att.attempts > 0) {
    await supabaseAdmin
      .from("pin_attempts")
      .update({ attempts: 0, blocked_until: null })
      .eq("report_id", report_id)
      .eq("ip_address", ip);
  }

  await supabaseAdmin.from("report_sessions").insert({
    report_id,
    token_hash: tokenHash,
    session_type: "pin",
    expires_at: expiresAt,
  });

  // Also create portal_session so "Ver mi espacio" works after PIN login (CA-14)
  const portalToken = generateSessionToken();
  const portalHash = hashToken(portalToken);
  await supabaseAdmin.from("portal_sessions").insert({
    namespace_slug: r.namespace_slug,
    session_token_hash: portalHash,
    expires_at: expiresAt,
  });

  const spaceSlug = r.namespace_slug;

  const response = NextResponse.json({ ok: true });
  response.cookies.set("informes_session", token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: SESSION_HOURS * 3600,
    path: "/",
  });
  if (spaceSlug) {
    response.cookies.set("portal_session", portalToken, {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: SESSION_HOURS * 3600,
      path: `/${spaceSlug}`,
    });
  }
  return response;
}
