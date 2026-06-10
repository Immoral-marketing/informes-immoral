import { getLogoHtml, getMagicLinkEmailHtml } from "@/lib/magic-link/template";

export function EmailPreview({
  recipientName,
  senderName,
  reportName,
  clientName,
  clientLogoUrl,
  note,
  subject,
}: {
  recipientName: string;
  senderName: string;
  reportName: string;
  clientName: string;
  clientLogoUrl: string | null;
  note?: string | undefined;
  subject?: string | undefined;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://informes.immoral.es";

  const logoHtml = getLogoHtml(clientLogoUrl, clientName, appUrl);

  const html = getMagicLinkEmailHtml({
    greeting: recipientName ? `Hola ${recipientName},` : "Hola,",
    senderName,
    reportName,
    url: "#",
    logoHtml,
    note,
  });

  return (
    <div className="w-full bg-muted/30 border border-border rounded-xl overflow-hidden shadow-inner flex flex-col h-[500px]">
      <div className="bg-card border-b border-border px-4 py-3 flex flex-col gap-0.5 shrink-0 shadow-sm z-10 relative">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Asunto</span>
        <span className="text-sm font-semibold text-foreground truncate">{subject || `${reportName} — ${clientName}`}</span>
      </div>
      <div className="flex-1 overflow-y-auto bg-[#f5f5f5]">
        {/* We use a container that scales down on smaller screens if necessary, though the email template itself is responsive */}
        <div 
          className="w-full min-h-full flex items-start justify-center p-0 sm:p-4"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
