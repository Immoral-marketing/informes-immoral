import * as React from "react"
import { useState, useRef } from "react"
import {
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Trash2,
  Download,
  FolderOpen,
  UploadCloud,
} from "lucide-react"

interface Attachment {
  id: string
  filename: string
  mime_type: string
  storage_path: string
  size_bytes: number
  display_order: number
  created_at: string
  signed_url: string | null
}

interface FolderAttachmentListProps {
  attachments: Attachment[]
  canEdit: boolean
  isUploading: boolean
  onDelete: (attachment: Attachment) => void
  onUploadFile: (file: File) => void
}

function getFileIcon(mimeType: string) {
  const mt = mimeType.toLowerCase()
  if (mt === "application/pdf") {
    return {
      Icon: FileText,
      colorClass: "text-red-500",
      bgClass: "bg-red-500/10 border-red-500/20",
    }
  }
  if (
    mt === "application/msword" ||
    mt === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return {
      Icon: FileText,
      colorClass: "text-blue-500",
      bgClass: "bg-blue-500/10 border-blue-500/20",
    }
  }
  if (
    mt === "application/vnd.ms-excel" ||
    mt === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return {
      Icon: FileSpreadsheet,
      colorClass: "text-emerald-500",
      bgClass: "bg-emerald-500/10 border-emerald-500/20",
    }
  }
  if (
    mt === "application/vnd.ms-powerpoint" ||
    mt === "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  ) {
    return {
      Icon: FileText,
      colorClass: "text-amber-500",
      bgClass: "bg-amber-500/10 border-amber-500/20",
    }
  }
  if (mt.startsWith("image/")) {
    return {
      Icon: FileImage,
      colorClass: "text-purple-500",
      bgClass: "bg-purple-500/10 border-purple-500/20",
    }
  }
  if (mt === "application/zip" || mt === "application/x-zip-compressed") {
    return {
      Icon: FileArchive,
      colorClass: "text-yellow-500",
      bgClass: "bg-yellow-500/10 border-yellow-500/20",
    }
  }
  return {
    Icon: File,
    colorClass: "text-slate-500",
    bgClass: "bg-slate-500/10 border-slate-500/20",
  }
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export function FolderAttachmentList({
  attachments,
  canEdit,
  isUploading,
  onDelete,
  onUploadFile,
}: FolderAttachmentListProps) {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canEdit) return
    dragCounter.current++
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!canEdit) return
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    dragCounter.current = 0
    if (!canEdit) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0] // Upload the first dropped file
      if (file) onUploadFile(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      const file = files[0]
      if (file) onUploadFile(file)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Folder Container Wrapper */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden rounded-2xl border transition-all duration-300 ${
          isDragging
            ? "border-primary bg-primary/5 shadow-lg scale-[0.99]"
            : "border-border bg-card shadow-sm"
        }`}
      >
        {/* Physical Folder tab effect */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
          <FolderOpen className="w-5 h-5 text-primary shrink-0 animate-pulse" />
          <h3 className="font-bold text-sm text-foreground">Carpeta de Adjuntos</h3>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
            {attachments.length} archivo{attachments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Dropzone Overlay for Drag State */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] z-10 animate-in fade-in duration-200 pointer-events-none">
            <UploadCloud className="w-12 h-12 text-primary animate-bounce" />
            <p className="text-sm font-semibold text-primary">¡Suelta tu archivo aquí!</p>
          </div>
        )}

        <div className="p-5 flex flex-col gap-4">
          {/* File Grid/List */}
          {attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">La carpeta está vacía.</p>
              {canEdit && (
                <p className="text-xs text-muted-foreground/60">
                  Arrastra un archivo aquí o utiliza el botón inferior.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {attachments.map((a) => {
                const { Icon, colorClass, bgClass } = getFileIcon(a.mime_type)
                return (
                  <div
                    key={a.id}
                    className="group flex items-center justify-between p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/30 hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Icon wrapper */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${bgClass}`}
                      >
                        <Icon className={`w-5 h-5 ${colorClass}`} />
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-semibold text-foreground truncate"
                          title={a.filename}
                        >
                          {a.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatBytes(a.size_bytes)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {a.signed_url && (
                        <a
                          href={a.signed_url}
                          download={a.filename}
                          title="Descargar"
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => onDelete(a)}
                          title="Eliminar"
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Trigger Input UI (Optional trigger button inside Folder card) */}
          {canEdit && (
            <div className="pt-2 border-t border-border/60">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-muted/20 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 text-primary" />
                <span>Subir archivo...</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
