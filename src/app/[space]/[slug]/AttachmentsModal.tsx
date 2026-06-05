"use client";

import { useEffect } from "react";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";
import { FileText, FileSpreadsheet, FileIcon as FilePresentation, FileImage, FileArchive, File, X } from "lucide-react";

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

  function getIcon(mime: string) {
    if (mime.includes("pdf")) return <FileText className="w-8 h-8 text-red-400" />;
    if (mime.includes("word") || mime.includes("document")) return <FileText className="w-8 h-8 text-blue-400" />;
    if (mime.includes("excel") || mime.includes("spreadsheet")) return <FileSpreadsheet className="w-8 h-8 text-green-400" />;
    if (mime.includes("powerpoint") || mime.includes("presentation")) return <FilePresentation className="w-8 h-8 text-orange-400" />;
    if (mime.includes("image")) return <FileImage className="w-8 h-8 text-purple-400" />;
    if (mime.includes("zip")) return <FileArchive className="w-8 h-8 text-yellow-400" />;
    return <File className="w-8 h-8 text-gray-400" />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full md:w-auto md:min-w-[600px] md:max-w-4xl max-h-[90vh] flex flex-col rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-4 duration-300"
        style={{ backgroundColor: "#111111", border: "1px solid #2e2e2e" }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2e2e2e] bg-[#1c1c1c]">
          <CoBrandLockup
            clientLogoUrl={clientLogoUrl}
            titleText={clientName}
            variant="viewer"
            theme="dark"
          />
          <button onClick={onClose} className="p-2 text-[#5E5E5E] hover:text-white transition-colors rounded-full hover:bg-[#2e2e2e]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          <h2 className="text-white text-lg font-bold mb-4">Adjuntos ({attachments.length})</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attachments.map((a) => (
              <a
                key={a.id}
                href={`/api/reports/attachments/${a.id}`}
                download={a.filename}
                className="group flex flex-col gap-3 p-4 rounded-xl transition-all"
                style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.backgroundColor = "#242424"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e2e2e"; e.currentTarget.style.backgroundColor = "#1c1c1c"; }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="p-2 bg-[#111111] rounded-lg">
                    {getIcon(a.mime_type)}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-white truncate" title={a.filename}>{a.filename}</span>
                  <span className="text-xs text-[#5E5E5E]">{(a.size_bytes / 1024).toFixed(0)} KB</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
