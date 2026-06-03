"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, Building2, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import QuickCreateModal from "@/components/shared/QuickCreateModal";

export default function DashboardQuickActions() {
  const [quickCreate, setQuickCreate] = useState(false);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/clientes">
          <Card className="p-5 flex flex-col gap-2 hover:border-primary/50 transition-colors h-full cursor-pointer shadow-sm">
            <Users className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Nuevo cliente</p>
              <p className="text-xs text-muted-foreground">Añade un nuevo cliente a la plataforma</p>
            </div>
          </Card>
        </Link>
        
        <div onClick={() => setQuickCreate(true)}>
          <Card className="p-5 flex flex-col gap-2 hover:border-primary/50 transition-colors h-full cursor-pointer shadow-sm">
            <Building2 className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Nuevo espacio</p>
              <p className="text-xs text-muted-foreground">Asocia un vertical a un cliente existente</p>
            </div>
          </Card>
        </div>

        <div onClick={() => setQuickCreate(true)}>
          <Card className="p-5 flex flex-col gap-2 hover:border-primary/50 transition-colors h-full cursor-pointer shadow-sm">
            <FileText className="w-6 h-6 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Nuevo informe</p>
              <p className="text-xs text-muted-foreground">Sube un informe a un espacio cliente</p>
            </div>
          </Card>
        </div>
      </div>

      {quickCreate && <QuickCreateModal onClose={() => setQuickCreate(false)} />}
    </>
  );
}
