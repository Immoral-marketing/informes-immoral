"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { NewClientDialog } from "@/components/clients/NewClientDialog";
import { NewReportFlow } from "@/components/shared/NewReportFlow";

export default function DashboardQuickActions() {
  const router = useRouter();
  const [newClient, setNewClient] = useState(false);
  const [newReport, setNewReport] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div onClick={() => setNewClient(true)}>
          <Card className="p-5 flex flex-col gap-2 hover:border-primary/50 transition-colors h-full cursor-pointer shadow-sm">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Nuevo cliente</p>
              <p className="text-xs text-muted-foreground">Añade un nuevo cliente a la plataforma</p>
            </div>
          </Card>
        </div>

        <div onClick={() => setNewReport(true)}>
          <Card className="p-5 flex flex-col gap-2 hover:border-primary/50 transition-colors h-full cursor-pointer shadow-sm">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Nuevo informe</p>
              <p className="text-xs text-muted-foreground">Sube un informe a un espacio cliente</p>
            </div>
          </Card>
        </div>
      </div>

      {newClient && (
        <NewClientDialog
          onClose={() => setNewClient(false)}
          onCreated={(r) => {
            setNewClient(false);
            router.push(`/clientes/${r.clientId}`);
          }}
        />
      )}
      {newReport && <NewReportFlow onClose={() => setNewReport(false)} />}
    </>
  );
}
