import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndSendPortalLink } from "@/lib/portal/send";

const GENERIC_MSG = "Si este email está registrado, recibirás un enlace de acceso.";
const MAX_EMAIL_LENGTH = 254;

// Simple in-memory rate limiting map because magic_link_requests is bound to report_id.
// It tracks attempts by (space_id, email, IP).
// We'll clean this periodically if it were a long running process, 
// but since it's Vercel Serverless, it clears out frequently anyway.
// A better long-term approach is adding a new DB table or modifying magic_link_requests.
const rateLimitMap = new Map<string, { attempts: number; windowStart: number }>();
const MAX_REQUESTS = 3;
const WINDOW_MINUTES = 10;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ space: string }> }
) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: GENERIC_MSG });
  }

  const { email } = body;
  const { space } = await params;
  const emailTrimmed = typeof email === "string" ? email.trim() : "";
  if (!emailTrimmed || emailTrimmed.length > MAX_EMAIL_LENGTH || !space) {
    return NextResponse.json({ message: GENERIC_MSG });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  const supabaseAdmin = createAdminClient();

  const { data: spaceData } = await supabaseAdmin
    .from("client_spaces")
    .select("id, slug, client_id, clients(name, logo_url)")
    .eq("slug", space)
    .single();

  const s = spaceData as unknown as { id: string; slug: string; client_id: string; clients: { name: string; logo_url: string | null } | null } | null;
  if (!s) return NextResponse.json({ message: GENERIC_MSG });

  // Rate Limiting (in-memory)
  const rateKey = `${s.id}-${emailTrimmed}-${ip}`;
  const now = Date.now();
  const windowMs = WINDOW_MINUTES * 60 * 1000;
  let rateData = rateLimitMap.get(rateKey);

  if (!rateData || now - rateData.windowStart > windowMs) {
    rateData = { attempts: 1, windowStart: now };
  } else {
    rateData.attempts += 1;
  }
  rateLimitMap.set(rateKey, rateData);

  if (rateData.attempts > MAX_REQUESTS) {
    return NextResponse.json({ message: GENERIC_MSG });
  }

  // Find recipient by email (case-insensitive)
  const { data: recipient } = await supabaseAdmin
    .from("client_recipients")
    .select("id")
    .eq("client_id", s.client_id)
    .ilike("email", emailTrimmed)
    .single();
  
  const rec = recipient as { id: string } | null;
  if (!rec) return NextResponse.json({ error: "El email no está registrado como acceso a este cliente." }, { status: 400 });

  let clientLogoUrl: string | null = null;
  if (s.clients?.logo_url) {
    const { data } = await supabaseAdmin.storage.from("client-logos").createSignedUrl(s.clients.logo_url, 3600);
    clientLogoUrl = data?.signedUrl ?? null;
  }

  // Send
  await generateAndSendPortalLink({
    spaceId: s.id,
    recipientId: rec.id,
    spaceSlug: s.slug,
    clientName: s.clients?.name ?? "cliente",
    clientLogoUrl,
    createdBy: null,
  });

  return NextResponse.json({ message: GENERIC_MSG });
}
