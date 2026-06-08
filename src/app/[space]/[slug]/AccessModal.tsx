"use client";

import { useState, useRef, useTransition } from "react";
import { CoBrandLockup } from "@/components/shared/CoBrandLockup";
import { KeyRound, Mail } from "lucide-react";

type Tab = "pin" | "email";

export default function AccessModal({
  reportId,
  reportName,
  clientName,
  clientLogoUrl,
  onAuthenticated,
  linkExpired,
}: {
  reportId: string;
  reportName: string;
  clientName: string;
  clientLogoUrl: string | null;
  onAuthenticated: () => void;
  linkExpired: boolean;
}) {
  const [tab, setTab] = useState<Tab>(linkExpired ? "email" : "pin");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(
    linkExpired
      ? { type: "error", text: "Este enlace ha caducado. Puedes acceder con el PIN o solicitar uno nuevo." }
      : null
  );
  const [isPending, startTransition] = useTransition();
  const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  function handlePinChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...pin];
    next[idx] = digit;
    setPin(next);
    if (digit && idx < 3) inputs[idx + 1]?.current?.focus();
    if (!digit && idx > 0) inputs[idx - 1]?.current?.focus();
  }

  function handlePaste(idx: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    
    const nextPin = [...pin];
    for (let i = 0; i < pasted.length && idx + i < 4; i++) {
      nextPin[idx + i] = pasted[i] ?? "";
    }
    setPin(nextPin);
    
    const nextIdx = Math.min(idx + pasted.length, 3);
    inputs[nextIdx]?.current?.focus();
  }

  function handlePinKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !pin[idx] && idx > 0) {
      inputs[idx - 1]?.current?.focus();
    }
    if (e.key === "Enter") submitPin();
  }

  function submitPin() {
    const fullPin = pin.join("");
    if (fullPin.length !== 4) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await fetch("/api/reports/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: fullPin, report_id: reportId }),
      });
      if (res.ok) {
        onAuthenticated();
      } else {
        setFeedback({ type: "error", text: "PIN incorrecto o cuenta bloqueada" });
        setPin(["", "", "", ""]);
        inputs[0]?.current?.focus();
      }
    });
  }

  function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      setFeedback(null);
      await fetch("/api/reports/request-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, report_id: reportId }),
      });
      setFeedback({ type: "success", text: "Si este email está registrado, recibirás un enlace de acceso." });
      setEmail("");
    });
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-8">
      <CoBrandLockup
        clientLogoUrl={clientLogoUrl}
        titleText={clientName}
        variant="modal"
        theme="light"
      />

      <div
        className="w-full rounded-2xl p-6 flex flex-col gap-5 shadow-xl"
        style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0" }}
      >
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "#5E5E5E" }}>Informe protegido</p>
          <h1 className="text-slate-900 font-bold text-base truncate">{reportName}</h1>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden text-sm" style={{ border: "1px solid #e2e8f0" }}>
          {(["pin", "email"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setFeedback(null); }}
              className="flex-1 py-2.5 font-medium transition-colors"
              style={
                tab === t
                  ? { backgroundColor: "#f1f5f9", color: "#0f172a" }
                  : { backgroundColor: "transparent", color: "#64748b" }
              }
            >
              {t === "pin" ? (
                <span className="flex items-center justify-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-slate-500" /> PIN
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-500" /> Enlace
                </span>
              )}
            </button>
          ))}
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

        {tab === "pin" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 justify-center">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputs[idx]}
                  type="tel"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(idx, e)}
                  onPaste={(e) => handlePaste(idx, e)}
                  className="w-14 h-14 text-center text-2xl font-bold text-slate-900 rounded-xl outline-none transition-all"
                  style={{ backgroundColor: "#ffffff", border: "1px solid #cbd5e1" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "var(--brand)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "#cbd5e1"; }}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
            <button
              onClick={submitPin}
              disabled={isPending || pin.join("").length < 4}
              className="w-full text-white font-semibold rounded-xl py-3 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: "var(--brand)" }}
            >
              {isPending ? "Verificando…" : "Acceder"}
            </button>
          </div>
        )}

        {tab === "email" && (
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
        )}
      </div>
    </div>
  );
}
