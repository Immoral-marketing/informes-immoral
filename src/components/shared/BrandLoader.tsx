"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const PHRASES = [
  "Construyendo algo que sí suma…",
  "Immoralizando la interfaz…",
  "Generando cosas guapas…",
  "Cuestionando el status quo…",
  "Afilando los detalles…",
  "Menos ruido, más resultado…",
  "Poniendo orden en el caos…",
];

const ROTATE_MS = 2500;
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

export default function BrandLoader({ variant = "panel" }: { variant?: "panel" | "dark" }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const isDark = variant === "dark";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6"
      style={{ backgroundColor: isDark ? "#111111" : "var(--background)" }}
    >
      <div className="brand-loader-iso">
        <Image
          src={isDark ? "/immoral-logo-blanco.png" : "/ISO-Negro.png"}
          alt="Immoral"
          width={isDark ? 180 : 96}
          height={isDark ? 50 : 96}
          priority
          className="object-contain"
        />
      </div>
      <p
        key={index}
        className="text-sm font-medium px-6 text-center"
        style={{
          color: isDark ? "rgba(255,255,255,0.7)" : "var(--muted-foreground)",
          animation: `brandPhraseIn 320ms ${EASE_OUT} both`,
        }}
      >
        {PHRASES[index]}
      </p>
    </div>
  );
}
