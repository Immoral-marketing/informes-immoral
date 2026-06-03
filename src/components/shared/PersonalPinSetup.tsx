"use client";

import { useState } from "react";
import { setupPersonalPin } from "@/app/(panel)/actions/pin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PersonalPinSetup() {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(pin)) {
      setError("El PIN debe tener exactamente 4 dígitos.");
      return;
    }

    if (pin !== confirmPin) {
      setError("Los PINs no coinciden.");
      return;
    }

    setLoading(true);
    const result = await setupPersonalPin(pin);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setOpen(false); // PIN was setup successfully
    }
  }

  // Prevent closing by overriding onOpenChange
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Configura tu PIN Maestro</DialogTitle>
          <DialogDescription>
            Como empleado, necesitas un PIN de 4 dígitos para acceder a cualquier informe del sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="pin">PIN de 4 dígitos</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 1234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirmar PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirma el PIN"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || pin.length !== 4 || confirmPin.length !== 4}>
            {loading ? "Guardando..." : "Guardar PIN"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
