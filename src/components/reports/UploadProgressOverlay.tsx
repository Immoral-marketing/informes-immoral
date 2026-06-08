import * as React from "react"
import { Loader2 } from "lucide-react"

interface UploadProgressOverlayProps {
  progress: number
  filename: string
  isOpen: boolean
}

export function UploadProgressOverlay({
  progress,
  filename,
  isOpen,
}: UploadProgressOverlayProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md flex flex-col items-center gap-6 scale-in-center animate-in zoom-in-95 duration-200">
        
        {/* Animated Icon Container */}
        <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <span className="absolute text-[10px] font-bold text-primary">
            {progress}%
          </span>
        </div>

        {/* Text Details */}
        <div className="text-center space-y-1.5 w-full">
          <h3 className="font-bold text-lg text-foreground">Subiendo archivo</h3>
          <p className="text-sm text-muted-foreground truncate px-4" title={filename}>
            {filename}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-2">
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden border border-border">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-0.5">
            <span>Enviando al servidor...</span>
            <span className="font-mono font-semibold text-primary">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
