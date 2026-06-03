"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, ChevronRight } from "lucide-react";
import { getClientsForSelect } from "@/app/(panel)/clientes/actions";
import { getSpacesForSelect } from "@/app/(panel)/espacios/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Step = "type" | "client" | "space";
type CreateType = "space" | "informe";

export default function QuickCreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("type");
  const [type, setType] = useState<CreateType | null>(null);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [spaces, setSpaces] = useState<Array<{ id: string; slug: string; verticals: { name: string } | null }>>([]);
  const [selectedClient, setSelectedClient] = useState<{ id: string; name: string } | null>(null);
  const [loading, startTransition] = useTransition();

  function pickType(t: CreateType) {
    setType(t);
    setStep("client");
    startTransition(async () => {
      const data = await getClientsForSelect();
      setClients(data);
    });
  }

  function pickClient(c: { id: string; name: string }) {
    setSelectedClient(c);
    if (type === "space") {
      onClose();
      router.push(`/clientes/${c.id}?openSpace=1`);
    } else {
      setStep("space");
      startTransition(async () => {
        const data = await getSpacesForSelect(c.id);
        setSpaces(data);
      });
    }
  }

  function pickSpace(s: { id: string; slug: string }) {
    onClose();
    router.push(`/espacios/${s.id}?openReport=1`);
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border m-0">
          <DialogTitle className="flex items-center gap-2 text-sm text-foreground">
            {step !== "type" && (
              <button onClick={() => setStep(step === "space" ? "client" : "type")} className="text-muted-foreground hover:text-foreground">←</button>
            )}
            <span>
              {step === "type" && "¿Qué quieres crear?"}
              {step === "client" && `Selecciona cliente`}
              {step === "space" && `Selecciona espacio`}
            </span>
          </DialogTitle>
          <DialogDescription className="hidden">Modal de creación rápida</DialogDescription>
        </DialogHeader>

        <div className="p-4 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {step === "type" && (
            <>
              <Button
                variant="outline"
                className="w-full h-auto flex items-center justify-start gap-3 px-4 py-3 border-border hover:bg-accent"
                onClick={() => pickType("space")}
              >
                <Building2 className="w-5 h-5 shrink-0 text-primary" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">Nuevo espacio</p>
                  <p className="text-xs text-muted-foreground font-normal">Asocia un vertical a un cliente</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-auto flex items-center justify-start gap-3 px-4 py-3 border-border hover:bg-accent"
                onClick={() => pickType("informe")}
              >
                <FileText className="w-5 h-5 shrink-0 text-primary" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">Nuevo informe</p>
                  <p className="text-xs text-muted-foreground font-normal">Sube un PDF o HTML a un espacio</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Button>
            </>
          )}

          {step === "client" && (
            loading ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Cargando clientes…</p>
            ) : clients.length === 0 ? (
              <div className="text-center py-4 flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">No hay clientes todavía.</p>
                <Button variant="link" className="text-primary h-auto p-0" onClick={() => { onClose(); router.push("/clientes"); }}>
                  Crear primer cliente →
                </Button>
              </div>
            ) : clients.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                className="w-full h-auto flex items-center justify-between px-4 py-3 border-border hover:bg-accent"
                onClick={() => pickClient(c)}
              >
                <span className="text-sm font-medium text-foreground">{c.name}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            ))
          )}

          {step === "space" && (
            loading ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Cargando espacios…</p>
            ) : spaces.length === 0 ? (
              <div className="text-center py-4 flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  {selectedClient?.name} no tiene espacios.
                </p>
                <Button variant="link" className="text-primary h-auto p-0" onClick={() => { if (selectedClient) { onClose(); router.push(`/clientes/${selectedClient.id}?openSpace=1`); } }}>
                  Crear espacio primero →
                </Button>
              </div>
            ) : spaces.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                className="w-full h-auto flex items-center justify-between px-4 py-3 border-border hover:bg-accent text-left"
                onClick={() => pickSpace(s)}
              >
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">{s.slug}</span>
                  {s.verticals?.name && <span className="text-xs text-muted-foreground font-normal">{s.verticals.name}</span>}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
