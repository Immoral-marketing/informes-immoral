"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { startPresentation, endPresentation } from "../presentation-actions";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Eye, Users, Copy, Square, Link as LinkIcon, Monitor, Smartphone, Tablet, MousePointer2 } from "lucide-react";
import BrandLoader from "@/components/shared/BrandLoader";
import PdfViewer from "@/app/[space]/[slug]/PdfViewer";
import NotesPanel from "../NotesPanel";
import { toast } from "sonner";

export default function PresenterClient({
  reportId,
  reportName,
  format,
  pdfUrl,
  reportVersionId,
  currentUserId,
}: {
  reportId: string;
  reportName: string;
  format: string;
  pdfUrl: string | null;
  reportVersionId: string;
  currentUserId: string;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [viewersCount, setViewersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [previewWidth, setPreviewWidth] = useState<"375px" | "768px" | "100%">("100%");
  const [isPointerEnabled, setIsPointerEnabled] = useState(true);
  
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      const result = await startPresentation(reportId);
      if (!active) return;
      if ("error" in result) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }
      setToken(result.token);
      
      const channel = supabase.channel(`presentation:${reportId}`, {
        config: { presence: { key: "presenter" } }
      });
      
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState<{ isViewer?: boolean }>();
          let count = 0;
          for (const key in state) {
            if (state[key] && state[key][0]?.isViewer) count++;
          }
          setViewersCount(count);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ isPresenter: true });
            setIsLoading(false);
          }
        });

      channelRef.current = channel;
    }
    
    init();

    return () => {
      active = false;
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [reportId, supabase]);

  useEffect(() => {
    if (format !== "html" || !channelRef.current) return;
    
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      
      const { type, ratio, startXPath, startOffset, endXPath, endOffset, selector, percentX, percentY, key, code, keyCode } = e.data;
      if (type === "scroll") {
        channelRef.current?.send({
          type: "broadcast",
          event: "presentation-event",
          payload: { type: "scroll", ratio }
        });
      } else if (type === "element-scroll") {
        channelRef.current?.send({
          type: "broadcast",
          event: "presentation-event",
          payload: { type: "element-scroll", selector, ratio }
        });
      } else if (type === "cursor") {
        if (!isPointerEnabled) return;
        channelRef.current?.send({
          type: "broadcast",
          event: "presentation-event",
          payload: { type: "cursor", selector, percentX, percentY }
        });
      } else if (type === "click") {
        channelRef.current?.send({
          type: "broadcast",
          event: "presentation-event",
          payload: { type: "click", selector }
        });
      } else if (type === "keydown") {
        channelRef.current?.send({
          type: "broadcast",
          event: "presentation-event",
          payload: { type: "keydown", key, code, keyCode }
        });
      } else if (type === "selection") {
        channelRef.current?.send({
          type: "broadcast",
          event: "presentation-event",
          payload: { type: "selection", startXPath, startOffset, endXPath, endOffset }
        });
      } else if (type === "selection-clear") {
        channelRef.current?.send({
          type: "broadcast",
          event: "presentation-event",
          payload: { type: "selection-clear" }
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [format, isPointerEnabled]);

  // For PDF Sync
  const handlePdfPageChange = (pageNumber: number) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "presentation-event",
      payload: { type: "page", pageNumber }
    });
  };

  const handleEnd = () => setShowEndDialog(true);

  const confirmEnd = async () => {
    setShowEndDialog(false);
    setIsEnding(true);
    
    channelRef.current?.send({
      type: "broadcast",
      event: "presentation-event",
      payload: { type: "end" }
    });
    
    await endPresentation(reportId);
    toast.success("Presentación finalizada");
    router.push(`/informes/${reportId}`);
  };

  const iframeRef = useRef<HTMLIFrameElement>(null);

  if (isLoading || !token) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <BrandLoader variant="dark" />
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">Iniciando presentación...</p>
      </div>
    );
  }

  const viewerUrl = `${window.location.origin}/presentar/${token}`;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-muted/30 -mx-4 -mb-4 sm:-mx-8 sm:-mb-8 px-4 sm:px-8 pt-4 pb-4 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-card border border-border shadow-sm rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg font-bold truncate">Presentando: {reportName}</h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-medium">{viewersCount} espectador{viewersCount !== 1 ? 'es' : ''}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-0.5">
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="font-mono text-xs truncate max-w-[200px]">{viewerUrl}</span>
              <button 
                onClick={() => { navigator.clipboard.writeText(viewerUrl); toast.success("Copia el enlace y envíaselo al cliente"); }}
                className="hover:text-foreground ml-1"
                title="Copiar enlace"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <Button 
            variant={isPointerEnabled ? "secondary" : "outline"} 
            size="sm" 
            onClick={() => {
              const newState = !isPointerEnabled;
              setIsPointerEnabled(newState);
              if (!newState) {
                channelRef.current?.send({
                  type: "broadcast",
                  event: "presentation-event",
                  payload: { type: "cursor-hide" }
                });
              }
            }}
          >
            <MousePointer2 className="w-3.5 h-3.5 mr-1.5" />
            {isPointerEnabled ? "Puntero visible" : "Puntero oculto"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(viewerUrl); toast.success("Enlace copiado"); }}>
            Copiar enlace
          </Button>
          <Button variant="destructive" size="sm" onClick={handleEnd} disabled={isEnding}>
            <Square className="w-3.5 h-3.5 mr-1.5 fill-current" />
            Terminar
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 gap-4">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-center justify-center gap-2 mb-3 shrink-0">
          <Button size="sm" variant={previewWidth === "375px" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("375px")}>
            <Smartphone className="w-4 h-4 mr-1.5" /> Móvil
          </Button>
          <Button size="sm" variant={previewWidth === "768px" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("768px")}>
            <Tablet className="w-4 h-4 mr-1.5" /> Tablet
          </Button>
          <Button size="sm" variant={previewWidth === "100%" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("100%")}>
            <Monitor className="w-4 h-4 mr-1.5" /> Escritorio
          </Button>
        </div>

        <div className="flex-1 flex justify-center w-full overflow-hidden pb-4">
          <div 
            className="bg-card border border-border shadow-sm overflow-hidden transition-all duration-300 ease-out relative h-full flex flex-col" 
            style={{ width: previewWidth, maxWidth: "100%", borderRadius: previewWidth !== "100%" ? "24px" : "12px" }}
          >
            {format === "html" ? (
              <iframe
                ref={iframeRef}
                src={`/api/presentation/${token}/content?role=presenter`}
                className="w-full h-full border-0 bg-white"
                sandbox="allow-same-origin allow-scripts"
                title="Vista previa del presentador"
              />
            ) : pdfUrl ? (
              <div className="h-full overflow-auto p-4 bg-white">
                <PdfViewer 
                  url={pdfUrl} 
                  onPageChange={handlePdfPageChange}
                  onScrollChange={(ratio) => channelRef.current?.send({
                    type: "broadcast",
                    event: "presentation-event",
                    payload: { type: "scroll", ratio }
                  })}
                  mode="presenter"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center text-muted-foreground h-full">
                Error al cargar PDF
              </div>
            )}
          </div>
        </div>
        </div>
        
        {/* Notes Panel */}
        <div className="w-[300px] shrink-0 bg-card border border-border shadow-sm rounded-xl overflow-hidden flex flex-col h-full hidden lg:flex">
          <NotesPanel 
            reportVersionId={reportVersionId}
            iframeRef={iframeRef}
            isReadOnly={true}
            currentUserId={currentUserId}
          />
        </div>
      </div>
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Terminar la presentación?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos los espectadores conectados serán desconectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEnd} className="bg-destructive hover:bg-destructive/90">
              Terminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
