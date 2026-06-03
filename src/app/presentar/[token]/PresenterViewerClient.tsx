"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import BrandLoader from "@/components/shared/BrandLoader";
import PdfViewer from "@/app/[space]/[slug]/PdfViewer";

export default function PresenterViewerClient({
  token,
  reportId,
  format,
  pdfUrl,
}: {
  token: string;
  reportId: string;
  format: string;
  pdfUrl: string | null;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasEnded, setHasEnded] = useState(false);
  const [forcedPage, setForcedPage] = useState<number | undefined>(undefined);
  const [forcedScrollRatio, setForcedScrollRatio] = useState<number | undefined>(undefined);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let active = true;

    const channel = supabase.channel(`presentation:${reportId}`, {
      config: { presence: { key: "viewer" } }
    });

    channel
      .on("broadcast", { event: "presentation-event" }, ({ payload }) => {
        if (!active) return;
        
        if (payload.type === "end") {
          setHasEnded(true);
        } else if (format === "html") {
          // Send message to iframe bridge
          iframeRef.current?.contentWindow?.postMessage(payload, "*");
        } else if (format === "pdf") {
          if (payload.type === "page") {
            setForcedPage(payload.pageNumber);
          } else if (payload.type === "scroll") {
            setForcedScrollRatio(payload.ratio);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && active) {
          await channel.track({ isViewer: true });
        }
      });

    return () => {
      active = false;
      channel.unsubscribe();
    };
  }, [reportId, supabase, format]);

  if (hasEnded) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#1a1a1a] text-white p-4 text-center z-50">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/60"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">La presentación ha finalizado</h1>
        <p className="text-white/60">El presentador ha cerrado la sesión.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#1a1a1a] overflow-hidden flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#1a1a1a]">
          <BrandLoader variant="dark" />
          <p className="mt-4 text-sm text-white/50 animate-pulse">Sincronizando con el presentador...</p>
        </div>
      )}
      
      {format === "html" ? (
        <iframe
          ref={iframeRef}
          src={`/api/presentation/${token}/content?role=viewer`}
          className="w-full h-full border-0 bg-white"
          sandbox="allow-same-origin allow-scripts"
          title="Vista de presentación"
          onLoad={() => setIsLoading(false)}
        />
      ) : pdfUrl ? (
        <div className="h-full w-full bg-white relative" onLoad={() => setIsLoading(false)}>
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-[#1a1a1a]">
              <BrandLoader variant="dark" />
              <p className="mt-4 text-sm text-white/50 animate-pulse">Cargando PDF sincronizado...</p>
            </div>
          )}
          <PdfViewer 
            url={pdfUrl} 
            mode="viewer"
            forcedPage={forcedPage}
            forcedScrollRatio={forcedScrollRatio}
          />
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-white/50">
          Error al cargar PDF
        </div>
      )}
    </div>
  );
}
