"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientAutocomplete } from "./ClientAutocomplete";
import { NewClientWithVerticalDialog } from "@/components/clients/NewClientWithVerticalDialog";
import { CreateReportForm } from "@/components/reports/CreateReportForm";
import { PinModal } from "@/components/reports/PinModal";
import { getSpacesForSelect, createSpace } from "@/app/(panel)/espacios/actions";
import { VerticalSelect } from "@/components/clients/VerticalSelect";

type Step = "search" | "resolveSpace" | "createClient" | "reportForm" | "pin";

export function NewReportFlow({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("search");

  // State variables for the flow
  const [query, setQuery] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>("");

  const [spaces, setSpaces] = useState<Array<{ id: string; slug: string; verticals: { name: string } | null }>>([]);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [spaceSlug, setSpaceSlug] = useState<string | null>(null);

  const [pinData, setPinData] = useState<{ id: string; pin: string; warning?: string } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSelectClient(c: { id: string; name: string }) {
    setClientId(c.id);
    setClientName(c.name);
    setStep("resolveSpace");

    const clientSpaces = await getSpacesForSelect(c.id);
    const firstSpace = clientSpaces[0];
    if (clientSpaces.length === 1 && firstSpace) {
      setSpaceId(firstSpace.id);
      setSpaceSlug(firstSpace.slug);
      setStep("reportForm");
    } else {
      setSpaces(clientSpaces);
    }
  }

  function handleCreateSpace(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clientId) return;
    const fd = new FormData(e.currentTarget);
    const verticalId = fd.get("vertical_id") as string;
    if (!verticalId) return;

    startTransition(async () => {
      setError(null);
      const res = await createSpace(clientId, verticalId, clientName);
      if ("error" in res) {
        setError(res.error);
      } else {
        setSpaceId(res.id);
        setSpaceSlug(res.slug);
        setStep("reportForm");
      }
    });
  }

  if (step === "createClient") {
    return (
      <NewClientWithVerticalDialog
        defaultName={query}
        onClose={onClose}
        onCreated={(r) => {
          setClientId(r.clientId);
          setSpaceId(r.spaceId);
          setSpaceSlug(r.spaceSlug);
          setStep("reportForm");
        }}
      />
    );
  }

  if (step === "reportForm") {
    return (
      <CreateReportForm
        spaceId={spaceId!}
        spaceSlug={spaceSlug!}
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

        {step === "resolveSpace" && spaces.length === 0 && (
          <form onSubmit={handleCreateSpace} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              El cliente <strong>{clientName}</strong> no tiene ningún espacio. Selecciona una vertical para crearlo.
            </p>
            <VerticalSelect />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep("search")} className="rounded-xl">
                Volver
              </Button>
              <Button type="submit" disabled={isPending} className="rounded-xl font-semibold">
                {isPending ? "Creando…" : "Continuar"}
              </Button>
            </div>
          </form>
        )}

        {step === "resolveSpace" && spaces.length > 1 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              El cliente <strong>{clientName}</strong> tiene varios espacios. ¿En cuál quieres crear el informe?
            </p>
            <div className="flex flex-col gap-2">
              {spaces.map((s) => (
                <Button
                  key={s.id}
                  variant="outline"
                  className="justify-start h-auto py-3 rounded-xl"
                  onClick={() => {
                    setSpaceId(s.id);
                    setSpaceSlug(s.slug);
                    setStep("reportForm");
                  }}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{s.verticals?.name ?? "Sin nombre"}</span>
                    <span className="text-xs text-muted-foreground font-mono">/{s.slug}</span>
                  </div>
                </Button>
              ))}
            </div>
            <div className="flex justify-end pt-4">
              <Button type="button" variant="ghost" onClick={() => setStep("search")} className="rounded-xl">
                Volver
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
