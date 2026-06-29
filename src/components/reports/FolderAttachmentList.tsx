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
  Link,
  ExternalLink,
  X,
  Check,
} from "lucide-react"

interface Attachment {
  id: string
  filename: string
  mime_type: string
  storage_path: string | null
  url: string | null
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
  onAddUrl: (url: string, displayName: string) => void
}

function getFileIcon(mimeType: string) {
  const mt = mimeType.toLowerCase()
  if (mt === "text/uri-list") {
    return {
      Icon: Link,
      colorClass: "text-sky-500",
      bgClass: "bg-sky-500/10 border-sky-500/20",
    }
  }
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
  if (bytes === 0) return "—"
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
  onAddUrl,
}: FolderAttachmentListProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [urlName, setUrlName] = useState("")
  const [urlError, setUrlError] = useState<string | null>(null)
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
      const file = files[0]
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

  function handleUrlSubmit() {
    const trimUrl = urlInput.trim()
    const trimName = urlName.trim()
    if (!trimUrl) { setUrlError("Introduce una URL"); return }
    if (!trimName) { setUrlError("Introduce un nombre para el enlace"); return }
    try { new URL(trimUrl) } catch { setUrlError("La URL no es válida (debe empezar por https://)"); return }
    setUrlError(null)
    onAddUrl(trimUrl, trimName)
    setUrlInput("")
    setUrlName("")
    setShowUrlForm(false)
  }

  function handleUrlCancel() {
    setUrlInput("")
    setUrlName("")
    setUrlError(null)
    setShowUrlForm(false)
  }

  return (
    <div className="flex flex-col gap-4">
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
        {/* Folder tab */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-muted/30">
          <FolderOpen className="w-5 h-5 text-primary shrink-0 animate-pulse" />
          <h3 className="font-bold text-sm text-foreground">Carpeta de Adjuntos</h3>
          <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
            {attachments.length} archivo{attachments.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-primary/10 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px] z-10 animate-in fade-in duration-200 pointer-events-none">
            <UploadCloud className="w-12 h-12 text-primary animate-bounce" />
            <p className="text-sm font-semibold text-primary">¡Suelta tu archivo aquí!</p>
          </div>
        )}

        <div className="p-5 flex flex-col gap-4">
          {/* File list */}
          {attachments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <FolderOpen className="w-12 h-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">La carpeta está vacía.</p>
              {canEdit && (
                <p className="text-xs text-muted-foreground/60">
                  Arrastra un archivo aquí, sube uno o adjunta una URL.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {attachments.map((a) => {
                const isUrl = a.mime_type === "text/uri-list"
                const { Icon, colorClass, bgClass } = getFileIcon(a.mime_type)
                return (
                  <div
                    key={a.id}
                    className="group flex items-center justify-between p-3 rounded-xl border border-border bg-background/50 hover:bg-muted/30 hover:border-primary/20 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${bgClass}`}>
                        <Icon className={`w-5 h-5 ${colorClass}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground truncate" title={a.filename}>
                          {a.filename}
                        </p>
                        {isUrl ? (
                          <p className="text-xs text-muted-foreground truncate" title={a.url ?? ""}>
                            {a.url}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">{formatBytes(a.size_bytes)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {isUrl && a.url ? (
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir enlace"
                          className="p-1.5 text-muted-foreground hover:text-sky-500 hover:bg-sky-500/10 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        a.signed_url && (
                          <a
                            href={a.signed_url}
                            download={a.filename}
                            title="Descargar"
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        )
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

          {/* Actions */}
          {canEdit && (
            <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
              {/* Upload file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-muted/20 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 text-primary" />
                <span>Subir archivo...</span>
              </button>

              {/* Add URL button / inline form */}
              {showUrlForm ? (
                <div className="flex flex-col gap-2 p-3 rounded-xl border border-sky-500/30 bg-sky-500/5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Link className="w-3.5 h-3.5 text-sky-500" /> Adjuntar URL
                    </span>
                    <button
                      type="button"
                      onClick={handleUrlCancel}
                      className="p-0.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={urlName}
                    onChange={(e) => { setUrlName(e.target.value); setUrlError(null); }}
                    placeholder="Nombre del enlace (ej: Presentación Mayo)"
                    className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:border-sky-500 placeholder:text-muted-foreground/50"
                  />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
                    placeholder="https://..."
                    onKeyDown={(e) => { if (e.key === "Enter") handleUrlSubmit(); if (e.key === "Escape") handleUrlCancel(); }}
                    className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:border-sky-500 placeholder:text-muted-foreground/50"
                  />
                  {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleUrlCancel}
                      className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleUrlSubmit}
                      className="text-xs px-3 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition-colors flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" /> Añadir
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowUrlForm(true)}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-border hover:border-sky-500 hover:bg-sky-500/5 text-xs font-semibold text-muted-foreground hover:text-sky-600 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Link className="w-4 h-4 text-sky-500" />
                  <span>Adjuntar URL...</span>
                </button>
              )}

              <p className="text-[10px] text-muted-foreground text-center">
                Archivos: PDF, Word, Excel, PowerPoint, PNG, JPG, ZIP (máx. 25 MB)
              </p>
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
