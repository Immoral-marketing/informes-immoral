import { createAdminClient } from "@/lib/supabase/admin";
import { generateMagicLinkToken } from "@/lib/tokens/generate";
import { hashToken } from "@/lib/tokens/hash";
import { Resend } from "resend";
import { getLogoHtml, getMagicLinkEmailHtml } from "@/lib/magic-link/template";

const TOKEN_HOURS = 48;

export async function generateAndSendPortalLink({
  spaceId,
  recipientId,
  spaceSlug,
  clientName,
  clientLogoUrl,
  createdBy,
  subject,
  note,
  senderName = "El equipo",
}: {
  spaceId: string;
  recipientId: string;
  spaceSlug: string;
  clientName: string;
  clientLogoUrl: string | null;
  createdBy: string | null;
  subject?: string;
  note?: string;
  senderName?: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabaseAdmin = createAdminClient();

  // Get recipient email + name
  const { data: recipient } = await supabaseAdmin
    .from("client_recipients")
    .select("email, full_name")
    .eq("id", recipientId)
    .single();
  const r = recipient as { email: string; full_name: string | null } | null;
  if (!r) return { error: "Destinatario no encontrado" };

  // Invalidate previous unconsumed tokens for same (space_id, recipient_id)
  await supabaseAdmin
    .from("space_access_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("space_id", spaceId)
    .eq("recipient_id", recipientId)
    .is("consumed_at", null);

  // Generate token
  const token = generateMagicLinkToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 3600 * 1000).toISOString();

  await supabaseAdmin.from("space_access_tokens").insert({
    space_id: spaceId,
    recipient_id: recipientId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });

  // Build URL
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://informes.immoral.es";
  const url = `${appUrl}/${spaceSlug}/portal/r/${token}`;

  // Send email via Resend
  const resendKey = process.env["RESEND_API_KEY"];
  const fromEmail = process.env["RESEND_FROM_EMAIL"] ?? "informes@immoral.es";

  if (!resendKey) {
    console.log(`[PORTAL LINK - DEV] To: ${r.email} | URL: ${url}`);
    return { ok: true };
  }

  const resend = new Resend(resendKey);

  const greeting = r.full_name ? `Hola ${r.full_name},` : "Hola,";
  const logoHtml = getLogoHtml(clientLogoUrl, clientName, appUrl);
  const finalSubject = subject && subject.trim() !== "" ? subject : `Acceso a tu espacio de documentos — ${clientName}`;

  const html = getMagicLinkEmailHtml({
    greeting,
    senderName,
    reportName: "tu espacio de documentos",
    url,
    logoHtml,
    note,
  });

  const { error: emailError } = await resend.emails.send({
    from: `Immoral Group <${fromEmail}>`,
    to: r.email,
    subject: finalSubject,
    html,
  });

  if (emailError) return { error: "Error al enviar el email" };
  return { ok: true };
}
