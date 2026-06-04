"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PinModal({
  pin,
  warning,
  onClose,
}: {
  pin: string;
  warning: string | undefined;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyPin() {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-2xl flex flex-col items-center p-8 gap-6 [&>button]:hidden">
        <DialogHeader className="w-full text-center">
          <DialogTitle className="text-xl">PIN generado</DialogTitle>
          <DialogDescription className="text-xs">
            Comparte este PIN con tu cliente. No volverá a mostrarse.
          </DialogDescription>
        </DialogHeader>

        <div
          className="text-5xl font-bold tracking-[0.4em] text-foreground bg-muted rounded-2xl px-8 py-5 cursor-pointer select-all w-full text-center"
          onClick={copyPin}
          title="Haz clic para copiar"
        >
          {pin}
        </div>

        {copied && <p className="text-xs text-green-600 font-medium h-2">¡Copiado!</p>}
        {!copied && <div className="h-2" />}

        {warning && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-3 text-center border border-amber-200 w-full">
            ⚠️ {warning}
          </p>
        )}

        <Button onClick={onClose} className="w-full rounded-xl py-6 font-semibold text-base mt-2">
          Entendido — he guardado el PIN
        </Button>
      </DialogContent>
    </Dialog>
  );
}
