export function getLogoHtml(clientLogoUrl: string | null, clientName: string, appUrl: string) {
  if (clientLogoUrl) {
    return `
      <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td valign="middle">
            <img src="${appUrl}/immoral-logo-negro.png" alt="Immoral" height="24" style="display:block;max-width:120px;object-fit:contain;" />
          </td>
          <td valign="middle" style="padding:0 16px;">
            <span style="color:#cbd5e1;font-size:16px;">&times;</span>
          </td>
          <td valign="middle">
            <img src="${clientLogoUrl}" alt="${clientName}" height="28" style="display:block;max-width:120px;object-fit:contain;" />
          </td>
        </tr>
      </table>
      <div style="height:24px;"></div>
    `;
  }

  return `
    <img src="${appUrl}/immoral-logo-negro.png" alt="Immoral" height="28" style="display:block;margin:0 auto 24px;max-width:200px;object-fit:contain;" />
  `;
}

export function getMagicLinkEmailHtml({
  greeting,
  senderName,
  reportName,
  url,
  logoHtml,
  note,
}: {
  greeting: string;
  senderName: string;
  reportName: string;
  url: string;
  logoHtml: string;
  note?: string | undefined;
}) {
  const noteHtml = note 
    ? `
      <div style="background:#f8fafc;border-left:4px solid #3980E4;padding:16px;margin:0 0 24px;border-radius:0 8px 8px 0;text-align:left;">
        <p style="color:#334155;font-size:14px;margin:0;line-height:1.5;">${
          note.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")
        }</p>
      </div>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
        <tr><td style="padding:32px 40px 0;text-align:center;">
          ${logoHtml}
        </td></tr>
        <tr><td style="padding:0 40px 32px;">
          <p style="color:#0f172a;font-size:15px;margin:0 0 16px;">${greeting}</p>
          <p style="color:#475569;font-size:15px;margin:0 0 16px;">
            <strong style="color:#0f172a;">${senderName}</strong> de Immoral Group te ha compartido un documento:
          </p>
          <p style="color:#0f172a;font-size:18px;font-weight:700;margin:0 0 24px;">${reportName}</p>
          ${noteHtml}
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${url}" style="display:inline-block;background:#3980E4;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;padding:14px 32px;">
                Acceder al documento
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
</html>`;
}
