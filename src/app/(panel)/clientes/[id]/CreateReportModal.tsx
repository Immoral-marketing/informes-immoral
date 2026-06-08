"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, Upload, FileText, Check } from "lucide-react";
import { createReportUnified } from "../actions";
import { toast } from "sonner";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  verticals: { id: string; name: string; color_hex: string }[];
}

export default function CreateReportModal({ isOpen, onClose, clientId, verticals }: CreateReportModalProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedVertical, setSelectedVertical] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      if (verticals.length === 1 && verticals[0]) {
        setSelectedVertical(verticals[0].id);
      }
    } else {
      document.body.style.overflow = "unset";
      setFileError(null);
      setSelectedFileName(null);
      setSelectedVertical("");
      if (formRef.current) formRef.current.reset();
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen, verticals]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFileError(null);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("document") as File | null;
    const verticalId = formData.get("vertical_id") as string | null;

    if (!verticalId) {
      toast.error("Selecciona un vertical");
      return;
    }

    if (!file || file.size === 0) {
      setFileError("El documento principal es obligatorio");
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      setFileError("El archivo supera el límite de 50MB");
      return;
    }
    
    if (file.type !== "application/pdf" && file.type !== "text/html") {
      setFileError("Solo se permiten archivos PDF o HTML");
      return;
    }

    setLoading(true);
    
    // We pass the formData that contains name, document, and auto_send
    const result = await createReportUnified(clientId, verticalId, formData);
    
    setLoading(false);

    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Informe creado con éxito");
      if (result.autoSendWarning) {
        toast.warning(result.autoSendWarning, { duration: 6000 });
      }
      onClose();
      router.push(`/informes/${result.reportId}`);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFileName(file.name);
      setFileError(null);
    } else {
      setSelectedFileName(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const input = document.getElementById("document-upload") as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        setSelectedFileName(file.name);
        setFileError(null);
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Crear Informe</h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          <form ref={formRef} id="create-report-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            <div className="flex flex-col gap-2">
              <label htmlFor="vertical_id" className="text-sm font-medium text-slate-700">
                Vertical <span className="text-red-500">*</span>
              </label>
              <select
                name="vertical_id"
                id="vertical_id"
                required
                value={selectedVertical}
                onChange={(e) => setSelectedVertical(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="" disabled>Selecciona el vertical de este informe</option>
                {verticals.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium text-slate-700">
                Nombre del informe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                id="name"
                required
                placeholder="Ej. Estrategia Q3 2024"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                Documento principal (PDF o HTML) <span className="text-red-500">*</span>
              </label>
              
              <div 
                className={`relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-2xl transition-colors ${
                  dragActive 
                    ? "border-[var(--brand)] bg-[#3980E4]/5" 
                    : fileError
                      ? "border-red-300 bg-red-50"
                      : selectedFileName
                        ? "border-green-300 bg-green-50"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
                }`}
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  name="document"
                  id="document-upload"
                  accept=".pdf,text/html"
                  required
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {selectedFileName ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">{selectedFileName}</p>
                      <p className="text-xs text-slate-500 mt-1">Haz clic o arrastra para cambiar</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center">
                      <Upload className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-slate-900">
                        Selecciona o arrastra un archivo
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PDF o HTML hasta 50MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {fileError && <p className="text-sm text-red-500 mt-1">{fileError}</p>}
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <input
                type="checkbox"
                name="auto_send"
                id="auto_send"
                value="true"
                className="mt-1 w-4 h-4 rounded text-[var(--brand)] focus:ring-[var(--brand)] border-slate-300"
              />
              <label htmlFor="auto_send" className="flex flex-col gap-1 cursor-pointer select-none">
                <span className="text-sm font-medium text-slate-900">
                  Enviar por email automáticamente
                </span>
                <span className="text-xs text-slate-500">
                  Se generará un enlace mágico temporal y se enviará al destinatario principal del cliente en cuanto se suba el informe.
                </span>
              </label>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-3xl shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="create-report-form"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px] justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creando...</span>
              </>
            ) : (
              <span>Crear Informe</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
