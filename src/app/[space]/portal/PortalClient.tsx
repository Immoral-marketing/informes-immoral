"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";
import { Mail, FileText, Calendar, ArrowRight, LogOut } from "lucide-react";
import { logoutPortal } from "./actions";

export interface PortalReport {
  id: string;
  name: string;
  slug: string;
  updated_at: string;
  verticals: { name: string; color_hex: string } | null;
}

interface PortalSpace {
  id: string;
  slug: string;
  clientName: string;
  clientLogoUrl: string | null;
  reports: PortalReport[];
}

export default function PortalClient({
  space,
  sessionValid,
  errorParam,
}: {
  space: PortalSpace;
  sessionValid: boolean;
  errorParam?: string;
}) {
  if (!sessionValid) {
    return <RequestAccessView space={space} {...(errorParam ? { errorParam } : {})} />;
  }

  return <AuthenticatedPortalView space={space} spaceSlug={space.slug} />;
}

function RequestAccessView({ space, errorParam }: { space: PortalSpace; errorParam?: string }) {
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(
    errorParam === "link_expired"
      ? { type: "error", text: "Este enlace ha caducado. Solicita uno nuevo introduciendo tu email." }
      : errorParam === "link_invalid"
      ? { type: "error", text: "El enlace es inválido o ya ha sido usado." }
      : errorParam === "invalid_space"
      ? { type: "error", text: "Espacio no encontrado." }
      : null
  );
  const [isPending, startTransition] = useTransition();

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setFeedback(null);
      const res = await fetch(`/api/portal/request-access/${space.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && !data.error) {
        setFeedback({ type: "success", text: "El enlace ha sido enviado. Por favor, revisa también tu carpeta de spam." });
        setEmail("");
      } else {
        setFeedback({ type: "error", text: data.error || data.message || "Error al enviar el enlace" });
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#111111]">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <CoBrandLockup
          clientLogoUrl={space.clientLogoUrl}
          titleText={space.clientName}
          variant="modal"
          theme="dark"
        />

        <div
          className="w-full rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
          style={{ backgroundColor: "#1e1e1e", border: "1px solid #333333" }}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#a1a1aa" }}>Portal Seguro</p>
            <h1 className="text-slate-100 font-bold text-base truncate">Documentos de {space.clientName}</h1>
          </div>

          <div className="flex rounded-xl overflow-hidden text-sm" style={{ border: "1px solid #333333" }}>
            <div className="flex-1 py-2.5 font-medium transition-colors text-center bg-[#2d2d2d] text-slate-200">
              <span className="flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" /> Enlace de acceso
              </span>
            </div>
          </div>

          {feedback && (
            <p
              className="text-xs text-center px-3 py-2 rounded-lg"
              style={
                feedback.type === "error"
                  ? { backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }
                  : { backgroundColor: "rgba(57,128,228,0.1)", color: "#60a5fa", border: "1px solid rgba(57,128,228,0.2)" }
              }
            >
              {feedback.text}
            </p>
          )}

          <form onSubmit={submitEmail} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full rounded-xl px-4 py-3 text-slate-100 text-sm outline-none transition-all"
              style={{ backgroundColor: "#111111", border: "1px solid #333333" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#333333"; }}
            />
            <button
              type="submit"
              disabled={isPending || !email}
              className="w-full text-white font-semibold rounded-xl py-3 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {isPending ? "Enviando…" : "Enviarme un enlace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function AuthenticatedPortalView({ space, spaceSlug }: { space: PortalSpace; spaceSlug: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [isLoggingOut, startLogout] = useTransition();
  const itemsPerPage = 20;

  const totalPages = Math.ceil(space.reports.length / itemsPerPage);
  const paginatedReports = space.reports.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  function handleLogout() {
    startLogout(async () => {
      await logoutPortal(spaceSlug);
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-[#111111] text-slate-100 flex flex-col">
      <header className="border-b border-[#222] bg-[#1a1a1a]">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <CoBrandLockup
            clientLogoUrl={space.clientLogoUrl}
            titleText={space.clientName}
            variant="header"
            theme="dark"
          />
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{isLoggingOut ? "Saliendo…" : "Cerrar sesión"}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Informes disponibles</h1>
          <p className="text-slate-400 text-sm">Explora los documentos y reportes que Immoral ha preparado para ti.</p>
        </div>

        {space.reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-[#222] rounded-2xl bg-[#1a1a1a]">
            <div className="w-16 h-16 rounded-full bg-[#222] flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium mb-1">Aún no hay documentos disponibles</h3>
            <p className="text-sm text-slate-400 max-w-md">
              Cuando el equipo de Immoral publique un informe para este espacio, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedReports.map((r) => (
              <a
                key={r.id}
                href={`/${space.slug}/${r.slug}`}
                className="group flex flex-col bg-[#1a1a1a] border border-[#333] rounded-2xl p-5 hover:border-brand/50 transition-colors"
                style={{ "--brand": "255, 60, 0" } as any}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-[#222] rounded-lg group-hover:bg-[#2a2a2a] transition-colors">
                    <FileText className="w-5 h-5 text-slate-300" />
                  </div>
                  {r.verticals && (
                    <span 
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{ 
                        backgroundColor: `${r.verticals.color_hex}15`, 
                        color: r.verticals.color_hex 
                      }}
                    >
                      {r.verticals.name}
                    </span>
                  )}
                </div>
                
                <h3 className="font-medium text-lg leading-tight mb-2 group-hover:text-brand transition-colors text-slate-100">
                  {r.name}
                </h3>
                
                <div className="mt-auto flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-[#333]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(r.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand font-medium">
                    Ver informe <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-[#333] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-300"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-400">
              {page} de {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-[#333] hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-300"
            >
              Siguiente
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
