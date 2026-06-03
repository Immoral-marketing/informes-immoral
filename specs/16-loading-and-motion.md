# SPEC-16: Pantalla de Carga de Marca + Animación de Modales

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** fix-spec (capa de motion transversal; extiende [`14-theming-system.md`](14-theming-system.md) y [`15-ui-replication.md`](15-ui-replication.md); las specs originales NO se modifican)
**Prioridad:** 1 (es la base de motion que consumen 17, 18, 19)

---

## Descripción

Dos mejoras de *motion* transversales que no existían en `propuestas.immoral.es` y que se diseñan aquí desde cero aplicando los principios de **Emil Kowalski (design engineering)**:

1. **Pantalla de carga de marca** durante las navegaciones del panel que tardan (cambio de ruta con fetch server-side). Muestra el **ISO de Immoral** centrado y **frases de marca** que rotan según el tiempo de espera.
2. **Animación de apertura/cierre de los modales** (`Dialog`/`AlertDialog`). Hoy se ven "planos" porque las utilidades `animate-in`/`zoom-in-95`/`fade-in-0` de shadcn dependen de keyframes (`tailwindcss-animate`) que **no están cableados** en el setup de Tailwind v4 de este proyecto.

> **Por qué esta spec va primera:** las specs 17/18/19 abren modales y muestran loaders; necesitan que la capa de motion exista y sea coherente.

---

## Actores

- **Empleado / Admin:** ve la pantalla de carga al navegar por el panel y las animaciones al abrir modales.
- **Cliente (viewer público):** la pantalla de carga de marca también se reutiliza como loader del visor y de la presentación (ver dependencia con 19).

---

## Flujos Principales

### Flujo 1: Pantalla de carga durante navegación del panel
1. El usuario hace clic en un enlace que cambia de ruta dentro de `(panel)`.
2. Si la nueva ruta tarda en resolver sus Server Components (fetch a Supabase, signed URLs, etc.), Next.js muestra el `loading.tsx` de ese segmento de ruta.
3. El `loading.tsx` renderiza el componente `BrandLoader`: ISO de Immoral centrado + una frase de marca.
4. Si la espera supera ~2.5s, la frase **rota** a la siguiente (efecto de "está pasando algo, con personalidad").
5. Cuando la ruta termina de cargar, Next.js sustituye el loader por el contenido real (sin animación de salida — la transición la controla Next).

### Flujo 2: Apertura de un modal
1. El usuario dispara un modal (`Dialog` o `AlertDialog`).
2. El overlay hace **fade-in** (opacidad 0→1) y el contenido hace **scale-in desde 0.96 + fade-in**, con origen **centrado** (los modales no se anclan a un trigger).
3. Al cerrar: el contenido hace **scale-out a 0.96 + fade-out** y el overlay **fade-out**, **más rápido** que la entrada.

---

## Flujos Alternativos / Edge Cases

- **Navegación instantánea (ruta cacheada / sin fetch):** el `loading.tsx` puede no llegar a verse (parpadeo evitado por Next). Comportamiento correcto: no forzar un retardo artificial. No se añade `setTimeout` para "mostrar el loader sí o sí".
- **`prefers-reduced-motion`:** la pantalla de carga muestra el ISO **estático** (sin pulso/spin de movimiento; se permite un fade de opacidad). Los modales caen a un **fade simple** sin scale.
- **Frases agotadas:** si la espera es larguísima y se acaban las frases, la rotación hace *loop* a la primera frase. No se queda en blanco.
- **Touch / móvil:** el loader es full-screen y centrado en los tres breakpoints; el ISO no supera ~120px de ancho en 375px.

---

## Criterios de Aceptación

- [ ] **CA-16.1:** Existe `src/app/(panel)/loading.tsx` que renderiza `BrandLoader`. Al navegar a una ruta del panel con fetch server-side perceptible, se ve el ISO de Immoral centrado sobre el fondo del panel.
- [ ] **CA-16.2:** `BrandLoader` muestra una frase de marca y, si la espera supera ~2.5s, **rota** a la siguiente frase con un fade suave (no corte seco).
- [ ] **CA-16.3:** Las frases provienen de la lista definida en "Notas de Implementación" y respetan el tono de marca (directo, con personalidad, sin jerga vacía).
- [ ] **CA-16.4:** Al abrir un `Dialog` o `AlertDialog`, el overlay hace fade-in y el contenido hace scale-in desde 0.96 + fade-in con easing `ease-out` y duración 180–220ms. **No** arranca desde `scale(0)`.
- [ ] **CA-16.5:** Al cerrar, la animación de salida es **más rápida** que la de entrada (≤150ms) y el contenido sale hacia `scale(0.96)` + fade-out.
- [ ] **CA-16.6:** Con `prefers-reduced-motion: reduce`, ni el loader ni los modales aplican animación de **movimiento/escala** (solo se permite fade de opacidad).
- [ ] **CA-16.7:** El origen de la animación del modal es **centrado** (`transform-origin: center`); el modal no "sale" de una esquina.
- [ ] **CA-16.8:** `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).
- [ ] **CA-16.9:** Responsive correcto del loader en 375 / 768 / 1280 (ISO centrado, frase legible, sin overflow).

---

## Modelo de Datos

No aplica. Esta spec no toca base de datos.

---

## UI / Páginas Afectadas

### Páginas / archivos nuevos

- **`src/app/(panel)/loading.tsx`** — loading UI del grupo de rutas del panel. Server Component mínimo que renderiza `<BrandLoader />`.
- **`src/components/shared/BrandLoader.tsx`** — Client Component. Loader de marca reutilizable.

### Archivos modificados

- **`src/app/globals.css`** — añadir keyframes y selectores de animación para `Dialog`/`AlertDialog` (ver Plan de Implementación). Añadir keyframe del loader.
- **`src/components/ui/dialog.tsx`** y **`src/components/ui/alert-dialog.tsx`** — sustituir las clases `data-[state=*]:animate-in/animate-out/zoom-*/fade-*/slide-*` (que no funcionan sin el plugin) por las clases propias definidas en globals.css.

### Componentes reutilizables

- **`BrandLoader`** — recibe prop opcional `variant: "panel" | "dark"` (`panel` = fondo claro del panel con ISO negro; `dark` = fondo `#111111` con logo blanco, para el visor/presentación de la spec 19). Default `"panel"`.

### Breakpoints obligatorios

375px · 768px · 1280px

---

## API / Endpoints

No aplica.

---

## Notas de Seguridad

No aplica (no hay datos sensibles ni endpoints).

---

## Plan de Implementación

### Arquitectura propuesta

- **FRONTEND-AGENT:** crea `BrandLoader` y `loading.tsx`; reescribe las clases de animación en `dialog.tsx` / `alert-dialog.tsx`.
- **Sin BACKEND-AGENT ni DB-AGENT.**

### A) `BrandLoader.tsx`

```tsx
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
```

> **GOTCHA assets:** confirmar que `/public/ISO-Negro.png` existe (sí existe). El logo blanco es `/public/immoral-logo-blanco.png` (sí existe). No usar rutas con mayúsculas distintas a las reales del filesystem.

### B) `loading.tsx`

```tsx
import BrandLoader from "@/components/shared/BrandLoader";

export default function PanelLoading() {
  return <BrandLoader variant="panel" />;
}
```

### C) Keyframes en `globals.css`

Añadir junto al bloque `@keyframes fadeSlideIn` ya existente:

```css
/* Loader de marca */
@keyframes brandPhraseIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.brand-loader-iso {
  animation: brandIsoPulse 1.8s ease-in-out infinite;
}
@keyframes brandIsoPulse {
  0%, 100% { opacity: 0.55; transform: scale(0.98); }
  50%      { opacity: 1;    transform: scale(1); }
}

/* Modales: entrada/salida (sustituye a tailwindcss-animate) */
@keyframes dialogOverlayIn  { from { opacity: 0; } to { opacity: 1; } }
@keyframes dialogOverlayOut { from { opacity: 1; } to { opacity: 0; } }
@keyframes dialogContentIn  {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
  to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
@keyframes dialogContentOut {
  from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  to   { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
}

.dialog-overlay[data-state="open"]  { animation: dialogOverlayIn  180ms cubic-bezier(0.23, 1, 0.32, 1); }
.dialog-overlay[data-state="closed"]{ animation: dialogOverlayOut 130ms cubic-bezier(0.23, 1, 0.32, 1); }
.dialog-content[data-state="open"]  { animation: dialogContentIn  200ms cubic-bezier(0.23, 1, 0.32, 1); transform-origin: center; }
.dialog-content[data-state="closed"]{ animation: dialogContentOut 140ms cubic-bezier(0.23, 1, 0.32, 1); transform-origin: center; }

@media (prefers-reduced-motion: reduce) {
  .brand-loader-iso { animation: none; }
  .dialog-content[data-state="open"]  { animation: dialogOverlayIn 150ms ease; }
  .dialog-content[data-state="closed"]{ animation: dialogOverlayOut 120ms ease; }
}
```

> **GOTCHA Tailwind v4:** las utilidades `animate-in`, `zoom-in-95`, `fade-in-0`, `slide-in-from-*` provienen del plugin `tailwindcss-animate` (o `tw-animate-css`). Este proyecto **no** lo tiene cableado en `globals.css` (no hay `@plugin` ni `@import` del paquete), por eso los modales no animan. **No instalar el plugin**: se resuelve con los keyframes propios de arriba (control total + alineado con Emil). Si en el futuro se quiere el plugin, sería `@import "tw-animate-css";` en `globals.css`, pero queda fuera de alcance.

### D) Editar `dialog.tsx`

En `DialogOverlay`, reemplazar la className por:
```tsx
className={cn("dialog-overlay fixed inset-0 z-50 bg-black/80", className)}
```
En `DialogContent`, reemplazar la larga cadena `data-[state=...]:animate-in ...` por:
```tsx
className={cn(
  "dialog-content fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",
  className
)}
```
(Conservar el resto: el botón de cierre, el `DialogPortal`, etc.)

### E) Editar `alert-dialog.tsx`

Aplicar el mismo tratamiento: la clase del overlay pasa a incluir `dialog-overlay` y la del content a incluir `dialog-content` (reutilizamos los mismos keyframes), eliminando las clases `data-[state=*]:animate-*`.

### Desglose de tareas

1. Crear `BrandLoader.tsx` con la lista de frases y el pulso del ISO.
2. Crear `(panel)/loading.tsx`.
3. Añadir los keyframes a `globals.css`.
4. Reescribir las clases de animación en `dialog.tsx` y `alert-dialog.tsx`.
5. Verificar `prefers-reduced-motion` (DevTools → Rendering → Emulate CSS prefers-reduced-motion).
6. `pnpm build` verde.

### Dependencias con otras specs

- Ninguna entrante. **Saliente:** 17, 18 y 19 consumen `BrandLoader` y las animaciones de modal.

---

## Tests Requeridos

### Tests de integración obligatorios

Ninguno (capa puramente visual). Verificación manual de CA-16.1 a CA-16.9.

### Tests opcionales

- Snapshot del `BrandLoader` en variante `panel` y `dark`.

---

## Out of Scope (Explícito)

- Transiciones de página tipo *view transitions* / animación de salida del contenido (Next controla el reemplazo del loader).
- Instalar `tailwindcss-animate` / `tw-animate-css`.
- Animaciones de los dropdowns, tooltips o popovers (se mantienen como están).
- Barra de progreso de navegación tipo NProgress (no pedida).

---

## Notas de Implementación

- **Tono de las frases (CA-16.3):** las frases deben sonar a Immoral — directas, con personalidad, "provocador con sustancia", nunca jerga vacía de agencia. Lista aprobada (editable por el responsable): «Construyendo algo que sí suma…», «Immoralizando la interfaz…», «Generando cosas guapas…», «Cuestionando el status quo…», «Afilando los detalles…», «Menos ruido, más resultado…», «Poniendo orden en el caos…».
- **Emil — duración y easing:** modales 180–220ms entrada / ≤150ms salida, `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out fuerte). Nunca `ease-in` en UI. Salida más rápida que entrada (asimetría enter/exit).
- **Emil — nunca `scale(0)`:** el modal entra desde `scale(0.96)`, no desde 0.
- **Emil — origen centrado:** los modales se mantienen `transform-origin: center` (excepción a la regla de "origen en el trigger", que aplica a popovers, no a modales).
- **Por qué keyframes propios y no el plugin:** evita una dependencia nueva y da control exacto sobre curva/duración alineado con Emil.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Loader de marca + animación de modales (Emil). | Claude Code |
