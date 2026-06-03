# SPEC-14: Sistema de Theming Intercambiable + Set shadcn/ui

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** fix-spec / fundación transversal (extiende [`setup.md`](setup.md); las specs originales NO se modifican)
**Prioridad:** 2 (fundamento de diseño — requisito de [`15-ui-replication.md`](15-ui-replication.md))

---

## Contexto y Problema

El clon desde `propuestas.immoral.es` reconstruyó el UI a mano usando **tres patrones de color
mezclados e inconsistentes**:

1. **Hex inline:** `style={{ color: "#3980E4" }}` (dashboard, navbar, modales, viewer).
2. **Clases arbitrarias con CSS var:** `bg-[--color-brand]`, `text-[--color-gray-mid]` (panel
   admin, clientes, espacios, informes).
3. **Tailwind hardcodeado:** `hover:bg-blue-600` (no sigue ningún token).

Consecuencias: imposible rebrandear sin tocar decenas de archivos, y aspecto incoherente. Además
**no se instaló el set de componentes shadcn/ui** (solo existen `button`, `card`, `input`, `label`),
mientras que propuestas se apoya en `dialog`, `select`, `badge`, `avatar`, `dropdown-menu`, `sonner`
(Toaster), etc.

### Decisión de diseño del responsable

Replicar el diseño de propuestas (tema claro), **pero con theming centralizado**: cada plataforma
del ecosistema Immoral debe poder tener un **color de identidad distinto** (p. ej. informes en
azul `#3980E4`, otra plataforma en naranja `#FF7A00`). El cambio de identidad debe ser **editar 1-2
variables** en un único sitio, sin tocar componentes. La paleta Immoral es válida tanto en claro
como en oscuro según el brand guide (web = fondo blanco predominante).

---

## Objetivo

1. Definir **una sola fuente de verdad** para el acento de la plataforma en `globals.css`.
2. Que **todos** los componentes (shadcn y propios) deriven su color de acento de ese token.
3. Instalar el set shadcn/ui completo que usa propuestas y montar el `Toaster`.
4. Dejar el proyecto preparado para que [`15-ui-replication.md`](15-ui-replication.md) migre todo el
   panel a tokens.

---

## Estado técnico actual (verificado)

- Tailwind **v4** (`@import "tailwindcss"` + `@theme inline` en
  [`src/app/globals.css`](../src/app/globals.css)); sin `tailwind.config`.
- shadcn configurado en `components.json` (`baseColor: slate`, `cssVariables: true`, alias
  `@/components/ui`, `utils: @/lib/utils`). `cn()` vive en `src/lib/utils.ts` ✓.
- Componentes shadcn presentes: `button`, `card`, `input`, `label`. `button.tsx` tiene un defecto:
  la variante `outline` usa `bg-white` hardcodeado (debería ser `bg-background`).
- `globals.css` ya define los tokens semánticos shadcn (`--primary`, `--ring`, `--foreground`,
  `--muted-foreground`, `--card`, `--border`, etc.) y la paleta Immoral (`--color-brand`, etc.).
- `next-themes` **no** está instalado.
- TypeScript estricto con `exactOptionalPropertyTypes: true` (afecta props de componentes).

---

## Cambios

### 14.1 — Tokens de identidad en `src/app/globals.css`

**Estrategia:** el acento de la plataforma se enruta a través del token shadcn `--primary` (y
`--ring`), que ya es usado por todos los componentes shadcn (p. ej. `Button` usa
`bg-primary hover:bg-primary/90`). Así, cambiar el acento recolorea automáticamente toda la librería.

Editar el bloque `:root` para que el acento se defina **una sola vez** como `--brand` y los tokens
shadcn se deriven de él. Mantener el resto de tokens neutros sin cambios:

```css
:root {
  /* ===== IDENTIDAD DE PLATAFORMA — editar SOLO esto para rebrandear ===== */
  --brand:            #3980E4;   /* acento principal. Ej: #FF7A00 para naranja */
  --brand-foreground: #FFFFFF;   /* texto/icono sobre el acento */

  /* tokens shadcn DERIVADOS del brand (no tocar al rebrandear) */
  --primary:            var(--brand);
  --primary-foreground: var(--brand-foreground);
  --ring:               var(--brand);

  /* ── resto de tokens neutros shadcn: SIN CAMBIOS ──
     --background, --foreground, --card, --card-foreground, --popover(*),
     --secondary(*), --muted, --muted-foreground, --accent(*), --destructive,
     --border, --input, --radius  (conservar los valores actuales) */

  /* paleta Immoral de referencia (se conserva) */
  --color-accent:     #A8FFFF;
  --color-black:      #111111;
  --color-white:      #FFFFFF;
  --color-gray-light: #D8D8D8;
  --color-gray-mid:   #5E5E5E;

  /* colores de verticales de ejemplo (referencia; los reales viven en BD) */
  --color-immoralia: #3980E4;
  --color-imfashion: #751423;
  --color-imfilms:   #F5D849;
}
```

En el bloque `@theme inline` **mantener** `--color-brand: var(--brand)` para conservar también los
alias `bg-brand` / `text-brand`. El resto del mapping `@theme inline` ya es correcto y no se toca.

> **GOTCHA Tailwind v4 (ya documentado en CLAUDE.md):** una clase arbitraria con CSS var + opacidad
> como `bg-[--color-brand]/20` **NO funciona** (Tailwind no resuelve el color en build). En cambio,
> `bg-primary`, `bg-primary/90`, `text-primary`, `border-primary` **SÍ** funcionan porque `primary`
> es un color **registrado en `@theme`** y Tailwind aplica `color-mix` para la opacidad. Por eso:
> - El acento se enruta por **`primary`** y se usan **clases con nombre** (`bg-primary`, `bg-primary/90`).
> - **Nunca** clases arbitrarias para el acento (`bg-[--color-brand]`).
> - En `style={{}}` inline (cuando sea inevitable), el acento se escribe **`var(--brand)`**.

### 14.2 — Instalar set shadcn/ui (gestor: **pnpm**)

```bash
pnpm dlx shadcn@latest add dialog select badge avatar dropdown-menu separator sheet alert-dialog table textarea sonner --overwrite
pnpm dlx shadcn@latest add button card input label --overwrite
```

- **`--overwrite` de `button card input label` es intencional:** canonicaliza los 4 existentes. En
  particular, el `button.tsx` canónico usa `bg-background` en la variante `outline` (en vez del
  `bg-white` hardcodeado actual) y añade soporte `asChild` vía `@radix-ui/react-slot` (necesario
  para envolver `<Link>` con estilo de botón). Tras sobrescribir, verificar que importan `cn` desde
  `@/lib/utils`.
- **GOTCHA `sonner` (rompe el build si no se trata):** el `src/components/ui/sonner.tsx` generado por
  shadcn importa `useTheme` de `next-themes`, que **no está instalado**. Solución elegida: **editar
  `sonner.tsx` para eliminar la dependencia de `next-themes`** y fijar el tema a claro. El componente
  debe quedar sin import de `next-themes` y renderizar:
  ```tsx
  <Sonner theme="light" className="toaster group" {...props} />
  ```
  (No instalar `next-themes` ni añadir un `ThemeProvider` de dark mode: está fuera de alcance en esta
  fase — el theming intercambiable es del **acento**, no de claro/oscuro.)
- Los paquetes `@radix-ui/*` que arrastra shadcn son compatibles con React 19 / Next 16.

### 14.3 — Montar Toaster en `src/app/layout.tsx`

```tsx
import { Toaster } from "@/components/ui/sonner";

// ...dentro de <body>:
<body className="font-sans">
  {children}
  <Toaster />
</body>
```

---

## Criterios de Aceptación

- [ ] **CA-14.1:** Cambiar `--brand` (y `--brand-foreground`) en `globals.css` recolorea botones,
  enlaces de acento, iconos de acento, focus rings y avatar en **toda** la app sin tocar ningún
  componente. (Prueba: poner `--brand: #FF7A00`, comprobar, revertir a `#3980E4`.)
- [ ] **CA-14.2:** Existen en `src/components/ui/` los componentes: `dialog`, `select`, `badge`,
  `avatar`, `dropdown-menu`, `separator`, `sheet`, `alert-dialog`, `table`, `textarea`, `sonner`,
  `button`, `card`, `input`, `label`. El proyecto compila: `pnpm build` sin errores.
- [ ] **CA-14.3:** `<Toaster />` está montado en `layout.tsx`; un `toast()` de prueba se muestra.
- [ ] **CA-14.4:** `button.tsx` variante `outline` usa `bg-background` (no `bg-white`) y el botón
  soporta `asChild`.
- [ ] **CA-14.5:** `sonner.tsx` no importa `next-themes` y el build no falla por esa dependencia.

---

## Out of Scope

- Modo claro/oscuro conmutable (dark mode toggle) y `next-themes`/`ThemeProvider`.
- Migrar los componentes del panel a los tokens (eso es [`15-ui-replication.md`](15-ui-replication.md)).
- Cambiar la paleta neutra shadcn o el `baseColor`.

---

## Notas de Implementación

## Notas de Implementación

- Patrón de opacidad con acento: Para modificar la opacidad del acento en Tailwind v4 se deben usar las clases con nombre base de shadcn como `bg-primary/10`, `border-primary/30` o `text-primary/90`. Las clases arbitrarias como `bg-[--color-brand]/10` NO se compilan correctamente porque Tailwind no evalúa el color en build time para la función `color-mix`.
- El componente `sonner.tsx` fue ajustado explícitamente para eliminar la dependencia de `next-themes` (`useTheme`). Se eliminó su import y en la invocación de `<Sonner>` se pasó el prop fijo `theme="light"`, manteniendo así el proyecto sin dependencias extra para temas oscuros, que están fuera de alcance.
- El acento global de la plataforma es unificado; cualquier rebrand (como cambiar de azul a naranja) se gestiona modificando únicamente el token `--brand` (y opcionalmente `--brand-foreground`) en la raíz de `globals.css`. Los tokens `--primary` y `--ring` (de shadcn) derivan de `--brand`.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Theming centralizado por `--brand` + instalación del set shadcn + Toaster. | Claude Code |
