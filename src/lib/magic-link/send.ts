import { createAdminClient } from "@/lib/supabase/admin";
import { generateMagicLinkToken } from "@/lib/tokens/generate";
import { hashToken } from "@/lib/tokens/hash";
import { Resend } from "resend";

const TOKEN_HOURS = 48;

export async function generateAndSendMagicLink({
  reportId,
  recipientId,
  spaceSlug,
  reportSlug,
  reportName,
  clientName,
  clientLogoUrl,
  createdBy,
}: {
  reportId: string;
  recipientId: string;
  spaceSlug: string;
  reportSlug: string;
  reportName: string;
  clientName: string;
  clientLogoUrl: string | null;
  createdBy: string | null;
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

  // Invalidate previous unconsumed tokens for same (report_id, recipient_id) — CA-02
  await supabaseAdmin
    .from("magic_link_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("report_id", reportId)
    .eq("recipient_id", recipientId)
    .is("consumed_at", null);

  // Generate token
  const token = generateMagicLinkToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_HOURS * 3600 * 1000).toISOString();

  await supabaseAdmin.from("magic_link_tokens").insert({
    report_id: reportId,
    recipient_id: recipientId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ...(createdBy ? { created_by: createdBy } : {}),
  });

  // Build URL
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://informes.immoral.es";
  const url = `${appUrl}/${spaceSlug}/${reportSlug}/r/${token}`;

  // Send email via Resend
  const resendKey = process.env["RESEND_API_KEY"];
  const fromEmail = process.env["RESEND_FROM_EMAIL"] ?? "informes@immoral.es";

  if (!resendKey) {
    console.log(`[MAGIC LINK - DEV] To: ${r.email} | URL: ${url}`);
    return { ok: true };
  }

  const resend = new Resend(resendKey);

  const greeting = r.full_name ? `Hola ${r.full_name},` : "Hola,";

  const logoSrc = clientLogoUrl || `${appUrl}/immoral-logo-negro.png`;

  const { error: emailError } = await resend.emails.send({
    from: `Immoral Group <${fromEmail}>`,
    to: r.email,
    subject: `Acceso a tu informe: ${reportName}`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <tr><td style="padding:32px 40px 0;text-align:center;">
          <img src="${logoSrc}" alt="${clientName}" height="40" style="display:block;margin:0 auto 24px;max-width:200px;object-fit:contain;" />
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">${greeting}</p>
          <p style="color:#475569;font-size:15px;margin:0 0 24px;">
            Tienes acceso a un informe de <strong style="color:#0f172a;">${clientName}</strong>:
          </p>
          <p style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 32px;">${reportName}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${url}" style="display:inline-block;background:#3980E4;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;padding:14px 32px;">
                Acceder al informe
              </a>
            </td></tr>
          </table>
          <p style="color:#64748b;font-size:13px;margin:24px 0 0;text-align:center;">
            Este enlace es válido durante 48 horas.<br>
            Si no esperabas este email, puedes ignorarlo.
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">
            Immoral Group · <a href="https://immoral.marketing" style="color:#3980E4;text-decoration:none;">immoral.marketing</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (emailError) return { error: "Error al enviar el email" };
  return { ok: true };
}
