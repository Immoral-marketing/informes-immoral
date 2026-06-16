"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientFields } from "./ClientFields";
import { createClientWithSpace } from "@/app/(panel)/clientes/actions";

export function NewClientDialog({
  defaultName = "",
  onClose,
  onCreated,
}: {
  defaultName?: string;
  onClose: () => void;
  onCreated: (r: { clientId: string; spaceSlug: string }) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      setError(null);
      try {
        const result = await createClientWithSpace(fd);
        if ("error" in result) {
          setError(result.error);
        } else {
          onCreated(result);
        }
      } catch {
        setError("Error inesperado al crear el cliente");
      }
    });
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo cliente</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <ClientFields defaultName={defaultName} />

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-xl font-semibold">
              {isPending ? "Creando…" : "Crear cliente"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
