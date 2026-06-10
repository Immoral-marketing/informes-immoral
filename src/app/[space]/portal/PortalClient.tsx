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
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "#F8F9FA" }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <CoBrandLockup
          clientLogoUrl={space.clientLogoUrl}
          titleText={space.clientName}
          variant="modal"
          theme="light"
        />

        <div
          className="w-full rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
          style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
        >
          <div className="text-center">
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#5E5E5E" }}>Portal de documentos</p>
            <h1 className="text-slate-900 font-bold text-base truncate">Documentos de {space.clientName}</h1>
          </div>

          <div className="flex rounded-xl overflow-hidden text-sm" style={{ border: "1px solid #e2e8f0" }}>
            <div className="flex-1 py-2.5 font-medium transition-colors text-center" style={{ backgroundColor: "#f1f5f9", color: "#0f172a" }}>
              <span className="flex items-center justify-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-500" /> Enlace de acceso
              </span>
            </div>
          </div>

          {feedback && (
            <p
              className="text-xs text-center px-3 py-2 rounded-lg"
              style={
                feedback.type === "error"
                  ? { backgroundColor: "rgba(239,68,68,0.08)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }
                  : { backgroundColor: "rgba(57,128,228,0.08)", color: "#1d4ed8", border: "1px solid rgba(57,128,228,0.2)" }
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
              className="w-full rounded-xl px-4 py-3 text-slate-900 text-sm outline-none transition-all"
              style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F8F9FA" }}>
      <header className="shrink-0" style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0" }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <CoBrandLockup
            clientLogoUrl={space.clientLogoUrl}
            titleText={space.clientName}
            variant="header"
            theme="light"
          />
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: "#64748b" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#0f172a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#64748b"; }}
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{isLoggingOut ? "Saliendo…" : "Cerrar sesión"}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2 text-slate-900">Documentos disponibles</h1>
          <p className="text-sm" style={{ color: "#64748b" }}>Explora los documentos y reportes que Immoral ha preparado para ti.</p>
        </div>

        {space.reports.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-2xl"
            style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
          >
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "#f1f5f9" }}>
              <FileText className="w-8 h-8" style={{ color: "#94a3b8" }} />
            </div>
            <h3 className="text-lg font-medium mb-1 text-slate-800">Aún no hay documentos disponibles</h3>
            <p className="text-sm max-w-md" style={{ color: "#64748b" }}>
              Cuando el equipo de Immoral publique un documento para este espacio, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedReports.map((r) => (
              <a
                key={r.id}
                href={`/${space.slug}/portal/${r.slug}`}
                className="group flex flex-col rounded-2xl p-5 transition-all"
                style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.06)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 rounded-lg transition-colors" style={{ backgroundColor: "#f1f5f9" }}>
                    <FileText className="w-5 h-5" style={{ color: "#64748b" }} />
                  </div>
                  {r.verticals && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full font-medium"
                      style={{
                        backgroundColor: `${r.verticals.color_hex}18`,
                        color: r.verticals.color_hex,
                      }}
                    >
                      {r.verticals.name}
                    </span>
                  )}
                </div>

                <h3 className="font-medium text-base leading-tight mb-2 text-slate-800 group-hover:text-slate-900 transition-colors">
                  {r.name}
                </h3>

                <div className="mt-auto flex items-center justify-between text-xs pt-4" style={{ color: "#94a3b8", borderTop: "1px solid #f1f5f9" }}>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(r.updated_at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <span className="flex items-center gap-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all font-medium" style={{ color: "var(--brand)" }}>
                    Ver <ArrowRight className="w-3.5 h-3.5" />
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
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: "1px solid #e2e8f0", color: "#64748b", backgroundColor: "#ffffff" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              Anterior
            </button>
            <span className="text-sm" style={{ color: "#94a3b8" }}>
              {page} de {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ border: "1px solid #e2e8f0", color: "#64748b", backgroundColor: "#ffffff" }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = "#f8fafc"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#ffffff"; }}
            >
              Siguiente
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
