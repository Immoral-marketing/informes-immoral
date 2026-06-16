# Immoral — Brand Identity

## Quiénes somos

Immoral es una agencia de marketing boutique española. Trabajamos con marcas que quieren resultados reales. El tono es directo, confiado y profesional — sin florituras ni relleno corporativo. Hablamos claro.

---

## Paleta de colores

### Colores de marca (CSS custom properties)

```css
/* En globals.css bajo :root */
--color-brand: #3980E4;       /* Azul Immoral — CTA principal, active states, brand accent */
--color-accent: #A8FFFF;      /* Cian — accent secundario, highlights especiales */
--color-black: #111111;       /* Negro de marca — no puro, más suave */
--color-white: #FFFFFF;       /* Blanco */
--color-gray-light: #D8D8D8;  /* Gris claro — bordes, skeletons, divisores sutiles */
--color-gray-mid: #5E5E5E;    /* Gris medio — texto secundario, iconos inactivos */
```

### Tokens Tailwind (disponibles como clases)

```
bg-brand        → #3980E4
text-brand      → #3980E4
border-brand    → #3980E4
bg-brand/5      → #3980E4 al 5% opacidad (fondos activos sutiles)
bg-brand/10     → fondos hover en brand contexts
bg-brand/40     → bordes semitransparentes brand
```

### Colores de sistema (shadcn/Tailwind)

```
bg-background       → blanco (light) / oscuro (dark)
bg-muted            → gris muy suave, fondos de sección
bg-muted/50         → hover en rows, fondos alternados
bg-accent           → equivale a muted en light mode
text-foreground     → negro principal
text-muted-foreground → gris medio para texto secundario
border-border       → borde estándar del sistema
bg-card             → fondo de tarjetas (= background)
```

### Colores semánticos de estado

```
Éxito:     bg-emerald-500, bg-emerald-100, text-emerald-700 (checkmarks, completado)
Error:     bg-red-50, border-red-300, text-red-700
Warning:   bg-amber-50, border-amber-200, text-amber-700
Info/Brand: bg-brand/5, border-brand/40, text-brand
Pendiente: bg-blue-100, text-blue-800
Caducado:  bg-orange-100, text-orange-800
```

---

## Tipografía

### Fuente principal

**Lexend** — cargada vía `next/font/google`

```tsx
// src/app/layout.tsx
import { Lexend } from 'next/font/google'
const lexend = Lexend({ subsets: ['latin'] })
```

```css
/* globals.css @theme inline */
--font-sans: var(--font-lexend), ui-sans-serif, system-ui, sans-serif;
```

Lexend mejora la legibilidad a tamaños pequeños. No usar serif ni monospace para UI excepto slugs y paths (`font-mono`).

### Escala tipográfica usada

| Uso | Clases Tailwind |
|-----|-----------------|
| Título de página | `text-xl font-bold` o `text-2xl font-bold` |
| Título de sección / card | `text-base font-semibold` |
| Label de sección (uppercase) | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Nombre de cliente en card | `text-xl font-bold capitalize` |
| Cuerpo / descripción | `text-sm text-muted-foreground` |
| Texto de body largo | `text-base leading-relaxed` |
| Meta info / timestamps | `text-xs text-muted-foreground` |
| Slug / path técnico | `font-mono text-xs` |
| Sublabel de stepper | `text-[10px] text-muted-foreground` |

---

## Logo

Archivo: `/public/immoral-logo-negro.png`

Uso en Navbar (fondo oscuro):
```tsx
<Image
  src="/immoral-logo-negro.png"
  alt="Immoral"
  width={140}
  height={38}
  className="invert object-contain"
/>
```

La clase `invert` convierte el logo negro en blanco sobre el fondo `bg-zinc-950` del Navbar.

---

## Voz y tono

- **Directo**: "Nueva propuesta", "Ver propuestas", "Gestionar" — no "Crear nueva propuesta comercial"
- **En español**: toda la UI está en español. Fechas en `toLocaleDateString('es-ES')`.
- **Sin jerga interna expuesta**: el cliente ve "Ver propuestas", el equipo ve la gestión completa.
- **Confiado**: los CTAs son afirmativos, los errores son claros sin disculpas exageradas.
- **Consistente**: los mismos patrones de label, mismos nombres de acciones en todos los sitios.
