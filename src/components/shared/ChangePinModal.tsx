"use client";

import { useState } from "react";
import { changePersonalPin } from "@/app/(panel)/actions/pin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ChangePinModalProps {
  onClose: () => void;
}

export default function ChangePinModal({ onClose }: ChangePinModalProps) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(newPin)) {
      setError("El nuevo PIN debe tener exactamente 4 dígitos.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("Los nuevos PINs no coinciden.");
      return;
    }

    setLoading(true);
    const result = await changePersonalPin(currentPin, newPin);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Cambiar PIN Maestro</DialogTitle>
          <DialogDescription>
            Introduce tu PIN actual y el nuevo PIN de 4 dígitos.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="currentPin">PIN Actual</Label>
            <Input
              id="currentPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="1234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPin">Nuevo PIN</Label>
            <Input
              id="newPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Nuevo PIN"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPin">Confirmar Nuevo PIN</Label>
            <Input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="Confirma el nuevo PIN"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || newPin.length !== 4 || confirmPin.length !== 4 || currentPin.length !== 4}>
            {loading ? "Cambiando..." : "Cambiar PIN"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
