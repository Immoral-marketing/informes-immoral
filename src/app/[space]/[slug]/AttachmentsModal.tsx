"use client";

import { useEffect } from "react";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";
import { FileText, FileSpreadsheet, FileIcon as FilePresentation, FileImage, FileArchive, File, X, Download } from "lucide-react";

interface Attachment {
  id: string;
  filename: string;
  size_bytes: number;
  mime_type: string;
}

interface AttachmentsModalProps {
  attachments: Attachment[];
  clientLogoUrl: string | null;
  clientName: string;
  onClose: () => void;
}

export default function AttachmentsModal({ attachments, clientLogoUrl, clientName, onClose }: AttachmentsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function getIcon(mime: string, sizeClass = "w-5 h-5") {
    const m = mime.toLowerCase();
    if (m.includes("pdf")) return <FileText className={`${sizeClass} text-red-500`} />;
    if (m.includes("word") || m.includes("document")) return <FileText className={`${sizeClass} text-blue-500`} />;
    if (m.includes("excel") || m.includes("spreadsheet")) return <FileSpreadsheet className={`${sizeClass} text-emerald-500`} />;
    if (m.includes("powerpoint") || m.includes("presentation")) return <FilePresentation className={`${sizeClass} text-amber-500`} />;
    if (m.includes("image")) return <FileImage className={`${sizeClass} text-purple-500`} />;
    if (m.includes("zip")) return <FileArchive className={`${sizeClass} text-yellow-500`} />;
    return <File className={`${sizeClass} text-slate-500`} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full md:w-auto md:min-w-[700px] md:max-w-4xl max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-4 duration-300"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] bg-[#f8fafc]">
          <CoBrandLockup
            clientLogoUrl={clientLogoUrl}
            titleText={clientName}
            variant="header"
            theme="light"
          />
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <h2 className="text-slate-900 text-lg font-bold mb-4">Adjuntos ({attachments.length})</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {attachments.map((a) => {
              const isImage = a.mime_type.startsWith("image/");
              return (
                <a
                  key={a.id}
                  href={`/api/reports/attachments/${a.id}`}
                  download={a.filename}
                  className="group flex flex-col rounded-xl overflow-hidden transition-all duration-300 border border-slate-200"
                  style={{ backgroundColor: "#ffffff" }}
                  onMouseEnter={(e) => { 
                    e.currentTarget.style.borderColor = "var(--brand)"; 
                    e.currentTarget.style.backgroundColor = "#f8fafc"; 
                  }}
                  onMouseLeave={(e) => { 
                    e.currentTarget.style.borderColor = "#e2e8f0"; 
                    e.currentTarget.style.backgroundColor = "#ffffff"; 
                  }}
                >
                  {/* Visual Preview Area */}
                  <div className="w-full h-28 bg-slate-50 flex items-center justify-center relative overflow-hidden border-b border-slate-100">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/reports/attachments/${a.id}`}
                        alt={a.filename}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="transition-transform duration-300 group-hover:scale-110">
                        {getIcon(a.mime_type, "w-10 h-10")}
                      </div>
                    )}
                  </div>

                  {/* Card Details Footer */}
                  <div className="p-3 flex items-center justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="shrink-0">
                        {getIcon(a.mime_type, "w-4 h-4")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-900 truncate" title={a.filename}>
                          {a.filename}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {(a.size_bytes / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    <div className="p-1 text-slate-400 group-hover:text-primary transition-colors">
                      <Download className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
