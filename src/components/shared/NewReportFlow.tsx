"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientAutocomplete } from "./ClientAutocomplete";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { CreateReportForm } from "@/components/reports/CreateReportForm";
import { PinModal } from "@/components/reports/PinModal";

import { VerticalSelect } from "@/components/clients/VerticalSelect";

type Step = "search" | "selectVertical" | "createClient" | "reportForm" | "pin";

export function NewReportFlow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("search");

  // State variables for the flow
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");

  const [clientSlug, setClientSlug] = useState<string | null>(null);

  const [verticalId, setVerticalId] = useState<string | null>(null);

  const [pinData, setPinData] = useState<{ id: string; pin: string; warning?: string } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSelectClient(c: { id: string; name: string; slug?: string }) {
    setClientId(c.id);
    setClientName(c.name);
    // Note: searchClients doesn't return slug currently, so we might need to rely on the fact that candidate is basically slug.
    // Actually, clientSlug is just needed for preview text in the form.
    setClientSlug(c.slug ?? "");
    setStep("selectVertical");
  }

  function handleSelectVertical(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const vId = fd.get("vertical_id") as string;
    if (!vId) return;
    setVerticalId(vId);
    setStep("reportForm");
  }



  if (step === "createClient") {
    return (
      <NewClientDialog
        defaultName={query}
        onClose={onClose}
        onCreated={(r) => {
          setClientId(r.clientId);
          setClientName(query);
          setClientSlug(r.spaceSlug); // newly created space slug is same as client namespace for now
          setStep("selectVertical");
        }}
      />
    );
  }

  if (step === "reportForm") {
    return (
      <CreateReportForm
        clientId={clientId!}
        verticalId={verticalId!}
        clientSlug={clientSlug!}
        onClose={onClose}
        onCreated={(id, pin, warning) => {
          setPinData({ id, pin, ...(warning ? { warning } : {}) });
          setStep("pin");
        }}
      />
    );
  }

  if (step === "pin") {
    return (
      <PinModal
        pin={pinData!.pin}
        warning={pinData!.warning}
        onClose={() => {
          onClose();
          router.push(`/informes/${pinData!.id}`);
        }}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl overflow-visible">
        <DialogHeader>
          <DialogTitle>Nuevo informe</DialogTitle>
        </DialogHeader>

        {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

        {step === "search" && (
          <div className="flex flex-col gap-4 py-4 min-h-[200px]">
            <p className="text-sm text-muted-foreground">Selecciona el cliente para el que vas a crear el informe.</p>
            <ClientAutocomplete
              placeholder="Escribe para buscar..."
              onSelect={handleSelectClient}
              onNoMatch={(q) => {
                setQuery(q);
                setStep("createClient");
              }}
            />
          </div>
        )}

        {step === "selectVertical" && (
          <form onSubmit={handleSelectVertical} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Selecciona el vertical del informe para el cliente <strong>{clientName}</strong>.
            </p>
            <VerticalSelect />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep("search")} className="rounded-xl">
                Volver
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl font-semibold">
                Continuar
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
