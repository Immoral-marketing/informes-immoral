"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CreateReportForm } from "@/components/reports/CreateReportForm";
import { PinModal } from "@/components/reports/PinModal";
import { slugify } from "@/lib/utils/slugify";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Phone, Mail, MessageSquare, Calendar, UserPlus, ExternalLink } from "lucide-react";

interface ReportRow {
  id: string;
  name: string;
  slug: string;
  current_version: number;
  auto_send_on_publish: boolean;
  created_at: string;
  report_versions: Array<{ format: string }>;
}

export default function SpaceReportsClient({
  spaceId,
  spaceSlug,
  reports: initial,
  canEdit,
  contactData,
}: {
  spaceId: string;
  spaceSlug: string;
  reports: ReportRow[];
  canEdit: boolean;
  contactData: {
    contact_name: string | null;
    contact_phone: string | null;
    contact_whatsapp: string | null;
    email: string | null;
    created_by_name: string;
    created_at: string;
  };
}) {
  const [showForm, setShowForm] = useState(false);
  const [pinModal, setPinModal] = useState<{ pin: string; warning: string | undefined } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Auto-open from QuickCreateModal (?openReport=1)
  useEffect(() => {
    if (searchParams.get("openReport") === "1" && canEdit) setShowForm(true);
  }, [searchParams, canEdit]);

  function handleCreated(reportId: string, pin: string, warning?: string) {
    setShowForm(false);
    setPinModal({ pin, warning });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* ── Columna Izquierda: Informes ──────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-foreground">Informes ({initial.length})</h2>
          {canEdit && (
            <Button onClick={() => setShowForm(true)} className="rounded-xl font-semibold">
              + Nuevo informe
            </Button>
          )}
        </div>

        {initial.length === 0 ? (
          <Card className="border-dashed py-16 flex flex-col items-center justify-center text-center gap-4">
            <p className="text-sm text-muted-foreground">No hay informes en este espacio todavía.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {initial.map((r) => {
              const format = r.report_versions.find((_, i) => i === 0)?.format ?? "pdf";
              const date = new Date(r.created_at).toLocaleDateString("es-ES", {
                day: "numeric", month: "short", year: "numeric",
              });
              return (
                <Card key={r.id} className="p-4 flex items-center justify-between gap-4 hover:border-primary/50 transition-colors">
                  <div className="flex-1 min-w-0 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <span className="text-lg">{format === "pdf" ? "📄" : "🌐"}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{r.name}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded uppercase font-semibold">
                          {format}
                        </span>
                        <span>v{r.current_version}</span>
                        <span>{date}</span>
                        <span className="font-mono text-[10px]">/{spaceSlug}/{r.slug}</span>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 h-8">
                      <Link href={`/informes/${r.id}`}>
                        Gestionar <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Columna Derecha: Datos de Contacto ───────────────────────────────── */}
      <aside>
        <Card className="p-6 flex flex-col gap-6">
          <h2 className="font-bold text-foreground">Datos de Contacto</h2>
          <div className="flex flex-col gap-4 text-sm text-muted-foreground">
            {contactData.contact_name && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 shrink-0" />
                <span className="truncate">{contactData.contact_name}</span>
              </div>
            )}
            {contactData.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 shrink-0" />
                <span className="truncate">{contactData.email}</span>
              </div>
            )}
            {contactData.contact_phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 shrink-0" />
                <span>{contactData.contact_phone}</span>
              </div>
            )}
            {contactData.contact_whatsapp && (
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>{contactData.contact_whatsapp}</span>
              </div>
            )}

            {(!contactData.contact_name && !contactData.email && !contactData.contact_phone && !contactData.contact_whatsapp) && (
              <p className="italic">No hay datos de contacto registrados para este cliente.</p>
            )}

            <div className="h-px bg-border my-1" />

            <div className="flex items-center gap-3">
              <UserPlus className="w-4 h-4 shrink-0" />
              <span>Creado por: <span className="font-medium text-foreground">{contactData.created_by_name}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 shrink-0" />
              <span>Fecha: {contactData.created_at}</span>
            </div>
          </div>
        </Card>
      </aside>

      {showForm && (
        <CreateReportForm
          spaceId={spaceId}
          spaceSlug={spaceSlug}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}

      {pinModal && (
        <PinModal
          pin={pinModal.pin}
          warning={pinModal.warning}
          onClose={() => setPinModal(null)}
        />
      )}
    </div>
  );
}
