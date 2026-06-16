import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAndSendMagicLink } from "@/lib/magic-link/send";

const GENERIC_MSG = "Si este email está registrado, recibirás un enlace de acceso.";
const MAX_REQUESTS = 3;
const WINDOW_MINUTES = 10;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EMAIL_LENGTH = 254;

export async function POST(request: NextRequest) {
  let body: { email?: string; report_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: GENERIC_MSG });
  }

  const { email, report_id } = body;
  const emailTrimmed = typeof email === "string" ? email.trim() : "";
  if (!emailTrimmed || emailTrimmed.length > MAX_EMAIL_LENGTH || !report_id || !UUID_REGEX.test(report_id)) {
    return NextResponse.json({ message: GENERIC_MSG });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";

  const supabaseAdmin = createAdminClient();

  // Resolve report → namespace → client
  const { data: report } = await supabaseAdmin
    .from("reports")
    .select("id, name, slug, namespace_slug")
    .eq("id", report_id)
    .single();
  const r = report as { id: string; name: string; slug: string; namespace_slug: string } | null;
  if (!r) return NextResponse.json({ message: GENERIC_MSG });

  const { data: namespace } = await supabaseAdmin
    .from("report_namespaces")
    .select("slug, client_id, clients(name, logo_url)")
    .eq("slug", r.namespace_slug)
    .single();
  const s = namespace as unknown as { slug: string; client_id: string; clients: { name: string; logo_url: string | null } | null } | null;
  if (!s || !s.client_id) return NextResponse.json({ message: GENERIC_MSG });

  // Find recipient by email (case-insensitive)
  const { data: recipient } = await supabaseAdmin
    .from("client_recipients")
    .select("id")
    .eq("client_id", s.client_id)
    .ilike("email", emailTrimmed)
    .single();
  const rec = recipient as { id: string } | null;
  if (!rec) return NextResponse.json({ error: "El email no está registrado como acceso a este cliente." }, { status: 400 });

  // Rate limiting — CA-10
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { data: rateRecord } = await supabaseAdmin
    .from("magic_link_requests")
    .select("attempts, window_start")
    .eq("report_id", r.id)
    .eq("recipient_id", rec.id)
    .eq("ip_address", ip)
    .single();

  const rate = rateRecord as { attempts: number; window_start: string } | null;
  const inWindow = rate && new Date(rate.window_start) > new Date(windowStart);
  if (inWindow && rate.attempts >= MAX_REQUESTS) {
    return NextResponse.json({ message: GENERIC_MSG });
  }

  // Update rate record
  const newAttempts = inWindow ? rate.attempts + 1 : 1;
  await supabaseAdmin.from("magic_link_requests").upsert(
    {
      report_id: r.id,
      recipient_id: rec.id,
      ip_address: ip,
      attempts: newAttempts,
      last_attempt: new Date().toISOString(),
      window_start: inWindow ? rate.window_start : new Date().toISOString(),
    },
    { onConflict: "report_id,recipient_id,ip_address" }
  );

  let clientLogoUrl: string | null = null;
  if (s.clients?.logo_url) {
    const { data } = await supabaseAdmin.storage.from("client-logos").createSignedUrl(s.clients.logo_url, 3600);
    clientLogoUrl = data?.signedUrl ?? null;
  }

  // Send
  await generateAndSendMagicLink({
    reportId: r.id,
    recipientId: rec.id,
    spaceSlug: s.slug,
    reportSlug: r.slug,
    reportName: r.name,
    clientName: s.clients?.name ?? "cliente",
    clientLogoUrl,
    createdBy: null,
  });

  return NextResponse.json({ message: GENERIC_MSG });
}
