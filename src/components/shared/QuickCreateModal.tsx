"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Building2, FileText, ChevronRight } from "lucide-react";
import { getClientsForSelect } from "@/app/(panel)/clientes/actions";
import { getSpacesForSelect } from "@/app/(panel)/espacios/actions";

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#D8D8D8" }}>
          <div className="flex items-center gap-2 text-sm" style={{ color: "#5E5E5E" }}>
            {step !== "type" && (
              <button onClick={() => setStep(step === "space" ? "client" : "type")} className="hover:text-black">←</button>
            )}
            <span className="font-semibold" style={{ color: "#111111" }}>
              {step === "type" && "¿Qué quieres crear?"}
              {step === "client" && `Selecciona cliente`}
              {step === "space" && `Selecciona espacio`}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col gap-2 max-h-80 overflow-y-auto">
          {/* Step: type */}
          {step === "type" && (
            <>
              <button
                onClick={() => pickType("space")}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-50 border transition-colors"
                style={{ borderColor: "#D8D8D8" }}
              >
                <Building2 className="w-5 h-5 shrink-0" style={{ color: "#3980E4" }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#111111" }}>Nuevo espacio</p>
                  <p className="text-xs" style={{ color: "#5E5E5E" }}>Asocia un vertical a un cliente</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D8D8D8" }} />
              </button>
              <button
                onClick={() => pickType("informe")}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-left hover:bg-gray-50 border transition-colors"
                style={{ borderColor: "#D8D8D8" }}
              >
                <FileText className="w-5 h-5 shrink-0" style={{ color: "#3980E4" }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: "#111111" }}>Nuevo informe</p>
                  <p className="text-xs" style={{ color: "#5E5E5E" }}>Sube un PDF o HTML a un espacio</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0" style={{ color: "#D8D8D8" }} />
              </button>
            </>
          )}

          {/* Step: client */}
          {step === "client" && (
            loading ? (
              <p className="text-sm text-center py-4" style={{ color: "#5E5E5E" }}>Cargando clientes…</p>
            ) : clients.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm mb-2" style={{ color: "#5E5E5E" }}>No hay clientes todavía.</p>
                <button onClick={() => { onClose(); router.push("/clientes"); }} className="text-sm font-medium" style={{ color: "#3980E4" }}>
                  Crear primer cliente →
                </button>
              </div>
            ) : clients.map((c) => (
              <button
                key={c.id}
                onClick={() => pickClient(c)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-gray-50 border transition-colors"
                style={{ borderColor: "#D8D8D8" }}
              >
                <p className="text-sm font-medium" style={{ color: "#111111" }}>{c.name}</p>
                <ChevronRight className="w-4 h-4" style={{ color: "#D8D8D8" }} />
              </button>
            ))
          )}

          {/* Step: space */}
          {step === "space" && (
            loading ? (
              <p className="text-sm text-center py-4" style={{ color: "#5E5E5E" }}>Cargando espacios…</p>
            ) : spaces.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm mb-2" style={{ color: "#5E5E5E" }}>
                  {selectedClient?.name} no tiene espacios.
                </p>
                <button
                  onClick={() => { if (selectedClient) { onClose(); router.push(`/clientes/${selectedClient.id}?openSpace=1`); } }}
                  className="text-sm font-medium"
                  style={{ color: "#3980E4" }}
                >
                  Crear espacio primero →
                </button>
              </div>
            ) : spaces.map((s) => (
              <button
                key={s.id}
                onClick={() => pickSpace(s)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-left hover:bg-gray-50 border transition-colors"
                style={{ borderColor: "#D8D8D8" }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "#111111" }}>{s.slug}</p>
                  {s.verticals?.name && <p className="text-xs" style={{ color: "#5E5E5E" }}>{s.verticals.name}</p>}
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "#D8D8D8" }} />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
