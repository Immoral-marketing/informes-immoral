# Immoral UI Tokens — Implementation Reference

> Este archivo contiene el código exacto para replicar el diseño de propuestas-immoral.
> Stack: Next.js 15 App Router · Tailwind CSS v4 (CSS-first) · shadcn/ui · Framer Motion v11

---

## 1. Setup y configuración

### globals.css (extracto clave)

```css
@import "tailwindcss";

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222.2 84% 4.9%);
  --muted: hsl(210 40% 96.1%);
  --muted-foreground: hsl(215.4 16.3% 46.9%);
  --accent: hsl(210 40% 96.1%);
  --border: hsl(214.3 31.8% 91.4%);
  --radius: 0.5rem;

  --color-brand: #3980E4;
  --color-accent: #A8FFFF;
  --color-black: #111111;
  --color-gray-light: #D8D8D8;
  --color-gray-mid: #5E5E5E;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-border: var(--border);
  --color-brand: var(--color-brand);
  --font-sans: var(--font-lexend), ui-sans-serif, system-ui, sans-serif;
}
```

### Dependencias requeridas

```bash
npm install framer-motion
npx shadcn@latest add button badge card input label select
```

---

## 2. Layout Shell

### Estructura HTML del panel

```tsx
// src/app/(panel)/layout.tsx
<div className="flex flex-col min-h-screen bg-background">
  <Navbar />                          {/* h-16, bg-zinc-950, border-b border-zinc-800 */}
  <div className="flex flex-1 min-h-0">
    <Sidebar />                       {/* w-56, border-r border-border */}
    <MotionMain>                      {/* flex-1 overflow-auto p-6 relative */}
      {children}
    </MotionMain>
  </div>
</div>
```

### MotionMain — wrapper de transiciones de página

```tsx
// src/components/shared/MotionMain.tsx
'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { variants } from '@/lib/motion'

export function MotionMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname}
        className="flex-1 overflow-auto p-6 relative"
        variants={variants.page}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  )
}
```

**CRÍTICO**: El `<main>` tiene `p-6`. Ninguna página del panel debe agregar su propio padding o max-width encima de esto. El outer wrapper de cada página es siempre solo `<div className="space-y-N">`.

---

## 3. Navbar

```tsx
// Fondo oscuro, separado del contenido claro del panel
<header className="border-b border-zinc-800 bg-zinc-950">
  <div className="w-full px-6 h-16 flex items-center justify-between">
    {/* Logo — width 140px, invertido para blanco sobre negro */}
    <Link href="/">
      <Image src="/immoral-logo-negro.png" alt="Immoral" width={140} height={38} className="invert object-contain" />
    </Link>

    <div className="flex items-center gap-4">
      {/* Badge admin */}
      <span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-1 rounded border border-amber-500/30">
        <Shield className="w-3 h-3" /> Admin
      </span>

      {/* Avatar con iniciales de marca */}
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-brand text-white font-bold">{initials}</AvatarFallback>
      </Avatar>
    </div>
  </div>
</header>
```

---

## 4. Sidebar

```tsx
// w-56, fondo bg-background, borde derecho
<nav className="w-56 border-r border-border px-3 py-4 flex flex-col gap-0.5 flex-shrink-0 bg-background overflow-y-auto">
  
  {/* Item de nav activo */}
  <Link className="px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5 bg-accent text-foreground font-medium">
    <Icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
    Dashboard
  </Link>

  {/* Item de nav inactivo */}
  <Link className="px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5 text-muted-foreground hover:bg-accent hover:text-foreground">
    <Icon size={15} strokeWidth={1.8} className="flex-shrink-0" />
    Clientes
  </Link>

  {/* Sección con dropdown de verticales */}
  <div className="mt-1">
    <button className="w-full px-3 py-2 rounded-md text-sm flex items-center gap-2.5 text-muted-foreground hover:bg-accent hover:text-foreground">
      <FolderTree size={15} strokeWidth={1.8} />
      <span className="flex-1 text-left">Líneas de negocio</span>
      <ChevronDown size={13} strokeWidth={1.8} className="transition-transform rotate-180" />
    </button>
    {/* Sub-items indentados */}
    <div className="mt-0.5 ml-3 pl-3 border-l border-border flex flex-col gap-0.5">
      <Link className="px-2 py-1.5 rounded-md text-sm flex items-center gap-2 text-muted-foreground hover:bg-accent hover:text-foreground">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3980E4' }} />
        <span className="truncate capitalize">Nombre vertical</span>
      </Link>
    </div>
  </div>

  {/* Sección admin */}
  <div className="pt-3 mt-1 border-t border-border">
    <p className="px-3 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      Configuración
    </p>
  </div>
</nav>
```

---

## 5. Estructura de página

### Outer wrapper — SIEMPRE así, nunca con max-width ni padding propio

```tsx
// Página simple
<div className="space-y-8">
  {/* contenido */}
</div>

// Página con grid de dos columnas (contenido + sidebar)
<div className="space-y-8">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 space-y-6">{/* main */}</div>
    <div className="space-y-6">{/* sidebar */}</div>
  </div>
</div>
```

### Header de página (con border-b)

```tsx
<div className="flex items-start justify-between pb-6 border-b">
  <div>
    <h1 className="text-xl font-bold">Título de Página</h1>
    <p className="text-sm text-muted-foreground mt-1">Subtítulo descriptivo opcional</p>
  </div>
  <Button className="bg-brand hover:bg-brand/90 text-white">
    <Plus className="w-4 h-4 mr-2" /> Acción principal
  </Button>
</div>
```

### Header de sección dentro de página (con border-b)

```tsx
<div className="flex items-center justify-between pb-4 border-b">
  <h2 className="text-base font-semibold flex items-center gap-2">
    <Icon className="h-4 w-4 text-muted-foreground" />
    Nombre de sección
  </h2>
  <Button className="bg-brand hover:bg-brand/90 text-white shrink-0">
    <Plus className="w-4 h-4 mr-2" /> Nueva acción
  </Button>
</div>
```

### Label de sección (uppercase — patrón omnipresente)

```tsx
<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
  Nombre de sección
</p>
```

---

## 6. Botones

```tsx
{/* CTA principal — siempre bg-brand */}
<Button className="bg-brand hover:bg-brand/90 text-white">
  <Plus className="w-4 h-4 mr-2" /> Nueva propuesta
</Button>

{/* Acción secundaria */}
<Button variant="outline" size="sm">Gestionar</Button>

{/* Acción terciaria / icono */}
<Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
  <ExternalLink className="w-4 h-4" />
</Button>

{/* Destructivo */}
<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
  <Trash2 className="h-4 w-4" />
</Button>

{/* Link que parece botón — bg-brand */}
<Link className="w-full inline-flex items-center justify-center rounded-md bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2 transition-colors">
  Ver propuestas <ExternalLink className="w-3.5 h-3.5 ml-2" />
</Link>

{/* Selector de versión — brand */}
<SelectTrigger className="w-auto h-9 text-sm font-medium bg-brand text-white border-brand hover:bg-brand/90 gap-2 px-3">
```

---

## 7. Badges y estados

```tsx
{/* Pendiente */}
<Badge variant="secondary" className="bg-blue-100 text-blue-800">
  <Clock className="w-3 h-3 mr-1" /> Pendiente
</Badge>

{/* Aceptado */}
<Badge variant="secondary" className="bg-green-100 text-green-800">
  <CheckCircle2 className="w-3 h-3 mr-1" /> Aceptada
</Badge>

{/* Rechazado */}
<Badge variant="secondary" className="bg-red-100 text-red-800">
  <XCircle className="w-3 h-3 mr-1" /> Rechazada
</Badge>

{/* Caducado */}
<Badge variant="secondary" className="bg-orange-100 text-orange-800">Caducada</Badge>

{/* Badge completado — texto con fondo emerald */}
<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
  Completo
</span>

{/* Badge outline para info */}
<Badge variant="outline" className="text-xs">Sector</Badge>

{/* Badge admin en Navbar */}
<span className="bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-1 rounded border border-amber-500/30">
  Admin
</span>
```

---

## 8. Cards

### Card estándar — shadcn/ui

```tsx
<Card className="flex flex-col justify-between h-full">
  <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
    <div className="space-y-1 pr-4">
      <CardTitle className="text-xl font-bold truncate capitalize">{name}</CardTitle>
      <CardDescription className="font-mono text-xs truncate">/{slug}</CardDescription>
    </div>
    <div className="flex gap-1 shrink-0">{/* actions */}</div>
  </CardHeader>
  <CardContent className="space-y-4 pt-0">
    {/* Contact details con border-t */}
    <div className="space-y-2 border-t pt-3 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 shrink-0 text-muted-foreground/75" />
        <span className="truncate">Nombre contacto</span>
      </div>
    </div>
  </CardContent>
</Card>
```

### Card vacío / empty state con border-dashed

```tsx
<Card className="border-dashed py-12 flex flex-col items-center justify-center text-center space-y-3">
  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
    <Icon className="h-5 w-5 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <CardTitle className="text-base">No se encontraron elementos</CardTitle>
    <CardDescription className="max-w-sm mx-auto">Mensaje de ayuda.</CardDescription>
  </div>
</Card>
```

### Empty state sin Card (en listas)

```tsx
<div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
    <Icon className="h-6 w-6 text-muted-foreground" />
  </div>
  <div className="space-y-1">
    <h3 className="font-medium">No hay elementos</h3>
    <p className="text-sm text-muted-foreground max-w-sm">Descripción de qué hacer.</p>
  </div>
</div>
```

---

## 9. Inputs y formularios

```tsx
{/* Input de búsqueda con icono */}
<div className="relative flex-1 max-w-sm">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
  <Input
    placeholder="Buscar por cliente, contacto..."
    className="pl-9 border-2"
  />
</div>

{/* Input estándar */}
<Input placeholder="Texto..." />

{/* Select */}
<Select>
  <SelectTrigger className="h-9 text-sm">
    <SelectValue placeholder="Seleccionar..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="value">Opción</SelectItem>
  </SelectContent>
</Select>
```

---

## 10. List rows (propuestas, leads, etc.)

```tsx
{/* Row en lista con hover y datos */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4">
  <div className="space-y-1">
    <div className="flex items-center gap-3">
      <Link className="font-semibold text-lg hover:underline">{name}</Link>
      <Badge>{status}</Badge>
    </div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="font-mono bg-muted px-1.5 py-0.5 rounded">/{slug}</span>
      <span>v{version}</span>
      <span>•</span>
      <span>Creada el {date}</span>
    </div>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <Button variant="outline" size="sm">Gestionar</Button>
    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
      <ExternalLink className="w-4 h-4" />
    </Button>
  </div>
</div>
```

---

## 11. Sidebar de info (dentro de una página con grid)

```tsx
{/* Bloque de info en sidebar — sin CardTitle, solo label uppercase */}
<div className="rounded-lg border p-4 space-y-3">
  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
    Datos de contacto
  </p>
  <div className="space-y-2 text-sm">
    <div className="flex items-center gap-2 text-muted-foreground">
      <User className="h-3.5 w-3.5 shrink-0" />
      <span>Nombre</span>
    </div>
    <div className="flex items-center gap-2 text-muted-foreground">
      <Mail className="h-3.5 w-3.5 shrink-0" />
      <span>email@ejemplo.com</span>
    </div>
  </div>
</div>
```

---

## 12. Colecciones de datos (dossier blocks, alternating bg)

```tsx
{/* Bloques alternados — par: fondo transparente, impar: bg-muted/60 */}
<div className="w-1/2 mx-auto space-y-3">
  {blocks.map((block, i) => (
    <div
      key={i}
      className={i % 2 === 1 ? 'bg-muted/60 rounded-xl px-4 py-4' : 'px-4 py-4'}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {block.label}
      </p>
      <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
        {block.text}
      </p>
    </div>
  ))}
</div>
```

---

## 13. Warnings / alerts inline

```tsx
{/* Warning brand (cuestiones a resolver) */}
<div className="rounded-lg border border-brand/30 bg-brand/5 p-4 space-y-3">
  <div className="flex items-center gap-2">
    <HelpCircle className="h-4 w-4 text-brand" />
    <p className="text-sm font-semibold text-brand">Cuestiones a resolver</p>
  </div>
</div>

{/* Warning amber (forzado manual) */}
<div className="mx-0.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
  Fase forzada manualmente.
</div>

{/* Warning red — no encontrado */}
<div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
  <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
    <AlertCircle className="h-4 w-4 shrink-0" />
    Información no encontrada
  </div>
</div>
```

---

## 14. Sistema de animación — motion.ts

Archivo: `src/lib/motion.ts` — source of truth para todas las animaciones.

```ts
import type { Variants, Transition } from 'framer-motion'

export const duration = {
  instant: 0.1,
  fast:    0.18,
  normal:  0.25,
  slow:    0.4,
  slower:  0.6,
} as const

export const ease = {
  smooth: [0.4, 0, 0.2, 1]    as [number, number, number, number],
  out:    [0, 0, 0.2, 1]      as [number, number, number, number],
  in:     [0.4, 0, 1, 1]      as [number, number, number, number],
  bounce: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
} as const

export const transition = {
  instant:   { duration: duration.instant, ease: ease.smooth } satisfies Transition,
  fast:      { duration: duration.fast,    ease: ease.smooth } satisfies Transition,
  smooth:    { duration: duration.normal,  ease: ease.smooth } satisfies Transition,
  slow:      { duration: duration.slow,    ease: ease.out    } satisfies Transition,
  spring:    { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } satisfies Transition,
  springFast:{ type: 'spring', stiffness: 500, damping: 35, mass: 0.6 } satisfies Transition,
} as const

export const stagger = {
  fast:   0.04,
  normal: 0.07,
  slow:   0.12,
} as const

export const variants = {
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: transition.smooth },
  } satisfies Variants,

  slideUp: {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: transition.smooth },
  } satisfies Variants,

  slideDown: {
    hidden:  { opacity: 0, y: -8 },
    visible: { opacity: 1, y: 0, transition: transition.smooth },
  } satisfies Variants,

  scaleIn: {
    hidden:  { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1, transition: transition.spring },
  } satisfies Variants,

  scaleInSubtle: {
    hidden:  { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: transition.smooth },
  } satisfies Variants,

  staggerFast: {
    hidden:  {},
    visible: { transition: { staggerChildren: stagger.fast,   delayChildren: 0.05 } },
  } satisfies Variants,

  stagger: {
    hidden:  {},
    visible: { transition: { staggerChildren: stagger.normal, delayChildren: 0.08 } },
  } satisfies Variants,

  staggerSlow: {
    hidden:  {},
    visible: { transition: { staggerChildren: stagger.slow,   delayChildren: 0.1  } },
  } satisfies Variants,

  page: {
    hidden:  { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0,  transition: { duration: duration.normal, ease: ease.out } },
    exit:    { opacity: 0, y: -6, transition: { duration: duration.fast,   ease: ease.in  } },
  } satisfies Variants,
} as const

export const interactive = {
  card: {
    whileHover: { y: -2, transition: transition.fast },
    whileTap:   { scale: 0.99 },
  },
  button: {
    whileTap: { scale: 0.97, transition: transition.instant },
  },
  row: {
    whileHover: { x: 2,    transition: transition.fast },
    whileTap:   { scale: 0.995 },
  },
} as const
```

### Cuándo usar cada variante

| Variante | Usar en |
|----------|---------|
| `variants.page` | `MotionMain` — transición al cambiar de página |
| `variants.slideUp` | Bloques de contenido, secciones, FlowPoints |
| `variants.scaleIn` | Cards en grid, badges, modales |
| `variants.stagger` | Grid de cards (padre) — children usan `scaleIn` |
| `variants.staggerFast` | Listas cortas (padre) — children usan `slideUp` |
| `interactive.card` | Cards clickeables (`whileHover y:-2`, `whileTap scale:0.99`) |
| `interactive.row` | Rows de lista (`whileHover x:2`, `whileTap scale:0.995`) |
| `interactive.button` | Botones con `motion.button` (`whileTap scale:0.97`) |

### Patrón stagger en lista

```tsx
import { motion } from 'framer-motion'
import { variants, interactive } from '@/lib/motion'

// Lista animada con stagger
<motion.div
  className="space-y-3"
  variants={variants.staggerFast}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={variants.slideUp}
      {...interactive.row}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
    >
      {/* contenido */}
    </motion.div>
  ))}
</motion.div>
```

### Patrón stagger en grid de cards

```tsx
<motion.div
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  variants={variants.stagger}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div key={item.id} variants={variants.scaleIn} {...interactive.card}>
      <Card className="flex flex-col justify-between h-full">
        {/* contenido */}
      </Card>
    </motion.div>
  ))}
</motion.div>
```

---

## 15. Componente: FlowPoint

Componente base para secciones de trabajo por fases. Cada "punto" tiene un header con número, título, estado, y un body con contenido dinámico.

```tsx
// src/components/leads/design-system/FlowPoint.tsx
import { motion } from 'framer-motion'
import { variants, transition } from '@/lib/motion'

type FlowPointStatus = 'empty' | 'in_progress' | 'completed' | 'loading' | 'error'

// Border colors por estado
const borderClass = {
  error:     'border-red-300 bg-red-50/30',
  active:    'border-[#3980E4]/40 bg-white',
  completed: 'border-emerald-200 bg-white',
  default:   'border-[#D8D8D8] bg-white/60',
}

// Header bg por estado
const headerBg = {
  error:     'bg-red-50',
  completed: 'bg-emerald-50',
  active:    'bg-brand/5',
  default:   'bg-muted/50',
}

<motion.section
  variants={variants.slideUp}
  initial="hidden"
  animate="visible"
  className={`rounded-xl border transition-colors ${borderClass}`}
>
  {/* Header */}
  <div className={`flex items-start gap-3 px-4 py-3 border-b border-inherit ${headerBg}`}>
    {/* Number badge con layout spring */}
    <motion.div
      layout
      transition={transition.spring}
      className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
      // active: bg-[#3980E4] text-white
      // completed: bg-emerald-100 text-emerald-700
      // error: bg-red-100 text-red-600
      // default: bg-[#D8D8D8] text-[#5E5E5E]
    >
      {/* completed: <CheckCircle2 h-4 w-4 text-emerald-600> con scaleIn spring */}
      {/* error: <AlertCircle h-4 w-4 text-red-500> */}
      {/* default: {number} */}
    </motion.div>

    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold leading-tight tracking-tight text-[#111111]">
        {title}
      </h3>
      <p className="text-xs text-[#5E5E5E] mt-0.5 leading-snug">{subtitle}</p>
    </div>

    {/* "Completo" badge — scaleIn spring */}
    {status === 'completed' && (
      <motion.span
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={transition.spring}
        className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium"
      >
        Completo
      </motion.span>
    )}
  </div>

  {/* Body */}
  <motion.div
    className="p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.08, ...transition.smooth }}
  >
    {/* skeleton, error, empty, o children */}
  </motion.div>
</motion.section>
```

---

## 16. Componente: PhasesStepper

Stepper de 4 fases con `layoutId` para animación de indicador activo.

```tsx
// Contenedor — fondo muted con padding interno
<div className="rounded-xl border bg-muted/50 p-1.5 space-y-1.5">

  {/* Grid de 4 botones — desktop */}
  <div className="hidden sm:grid grid-cols-4 gap-1">
    {([1, 2, 3, 4] as const).map((phase) => (
      <motion.button
        key={phase}
        type="button"
        onClick={() => onPhaseChange(phase)}
        whileTap={{ scale: 0.97 }}
        transition={transition.fast}
        className={cn(
          'group flex flex-col items-center gap-2 px-3 py-3.5 rounded-lg transition-all relative',
          isActive
            ? 'bg-background shadow-sm border border-border/80'
            : 'hover:bg-muted cursor-pointer'
        )}
      >
        {/* Indicador activo con layoutId — se mueve fluidamente entre fases */}
        {isActive && (
          <motion.span
            layoutId="phase-active-bg"
            className="absolute inset-0 rounded-lg bg-background shadow-sm border border-border/80"
            transition={transition.spring}
            style={{ zIndex: -1 }}
          />
        )}

        {/* Círculo numerado */}
        <div className={cn(
          'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all',
          isActive    ? 'bg-brand border-brand text-white' :
          done        ? 'bg-emerald-500 border-emerald-500 text-white' :
                        'bg-card border-border text-muted-foreground/60'
        )}>
          {done && !isActive
            ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
            : <span className="text-xs font-bold">{phase}</span>
          }
        </div>

        {/* Label */}
        <p className="text-xs font-semibold text-center">{info.label}</p>
        <p className="text-[10px] text-muted-foreground text-center leading-tight">{info.sublabel}</p>
      </motion.button>
    ))}
  </div>

  {/* Mobile — Select */}
  <div className="sm:hidden">
    <Select>
      <SelectTrigger className="h-9 text-sm bg-background">
        <span className="h-5 w-5 rounded-full bg-brand text-white flex items-center justify-center text-[10px] font-bold">
          {currentView}
        </span>
      </SelectTrigger>
    </Select>
  </div>
</div>
```

---

## 17. Página: Lista de clientes (spaceSlug index)

**URL**: `/{vertical-slug}` — muestra los clientes de esa línea de negocio.

```tsx
// Outer wrapper
<div className="space-y-8">

  {/* Header */}
  <div className="flex items-start justify-between pb-6 border-b">
    <div>
      <h1 className="text-xl font-bold capitalize">{verticalName}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        {spaces.length} espacio{spaces.length !== 1 ? 's' : ''} de cliente
      </p>
    </div>
  </div>

  {/* ClientSpacesList */}
  <div className="space-y-6">
    {/* Búsqueda + botón nuevo */}
    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input placeholder="Buscar..." className="pl-9 border-2" />
      </div>
      <Button className="bg-brand hover:bg-brand/90 text-white">
        <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
      </Button>
    </div>

    {/* Grid de cards — 3 columnas en desktop */}
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      variants={variants.stagger}
      initial="hidden"
      animate="visible"
    >
      {spaces.map(space => (
        <motion.div key={space.id} variants={variants.scaleIn} {...interactive.card}>
          <Card className="flex flex-col justify-between h-full">
            <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
              <div className="space-y-1 pr-4">
                <CardTitle className="text-xl font-bold truncate capitalize">{name}</CardTitle>
                <CardDescription className="font-mono text-xs truncate">/{slug}</CardDescription>
              </div>
              <div className="flex gap-1 shrink-0">
                {/* Edit, Delete buttons — ghost, h-8 w-8 */}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-2 border-t pt-3 text-sm text-muted-foreground">
                {/* Contact info rows */}
              </div>
              <Link
                href={`/${slug}`}
                className="w-full inline-flex items-center justify-center rounded-md bg-brand hover:bg-brand/90 text-white text-sm font-medium py-2 transition-colors mt-2"
              >
                Ver propuestas <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  </div>
</div>
```

---

## 18. Página: Espacio de cliente (propuestas)

**URL**: `/{client-slug}` — muestra propuestas de ese cliente + info de contacto.

```tsx
// Grid principal 3 columnas
<div className="space-y-8">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

    {/* Columna principal — 2/3 */}
    <div className="lg:col-span-2 space-y-6">
      <ProposalsList proposals={proposals} spaceSlug={spaceSlug} />
    </div>

    {/* Sidebar — 1/3 */}
    <div className="space-y-6">
      {/* Info de contacto */}
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Datos de contacto
        </p>
        {/* Rows con icono + texto */}
      </div>
    </div>

  </div>
</div>
```

---

## 19. Página: Gestión de propuesta

**URL**: `/{client-slug}/p/{proposal-slug}`

```tsx
<motion.div
  className="space-y-8"
  variants={variants.staggerFast}
  initial="hidden"
  animate="visible"
>
  {/* Header con border-b */}
  <motion.div className="pb-6 border-b" variants={variants.slideUp}>
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{proposal.name}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">/{proposal.slug}</span>
          {statusBadge}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">{/* actions */}</div>
    </div>
  </motion.div>

  {/* Grid de contenido */}
  <motion.div variants={variants.slideUp} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    {/* Main content — 2/3 */}
    <div className="lg:col-span-2 space-y-6">
      {/* Versiones, preview, etc. */}
    </div>
    {/* Sidebar — 1/3 */}
    <div className="space-y-4">
      {/* Info labels en uppercase */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
    </div>
  </motion.div>
</motion.div>
```

---

## 20. Reglas críticas — no violar nunca

1. **Sin max-width en páginas de panel.** El layout ya tiene `p-6`. Outer wrapper = solo `<div className="space-y-N">`.
2. **Headers de página con `pb-6 border-b`**, siempre. No usar `<CardHeader>` para headers de página.
3. **Labels de sección en uppercase**: `text-xs font-semibold uppercase tracking-wider text-muted-foreground` — nunca `<CardTitle>` para labels internos.
4. **CTA principal = `bg-brand hover:bg-brand/90 text-white`**. Nunca `variant="default"` de shadcn (que usa `--primary`).
5. **Importar animaciones de `@/lib/motion`**, no definir transiciones inline en cada componente.
6. **`'use client'`** solo en componentes que usan hooks, eventos o Framer Motion. Páginas y layouts = server components por defecto.
7. **Framer Motion en listas siempre con stagger**: padre tiene `variants.stagger` o `variants.staggerFast`, hijos tienen `variants.slideUp` o `variants.scaleIn`.
8. **Sidebar items de info** nunca usan `<CardTitle>` ni `<CardDescription>`. Siempre el patrón `<p className="text-xs font-semibold uppercase...">`.
9. **Imágenes del logo** siempre con `className="invert"` en contextos de fondo oscuro.
10. **Fechas y textos en español**: `toLocaleDateString('es-ES')`, mensajes en español.
11. **Sin breadcrumbs.** Nunca usar `Dashboard > Sección > Subsección`. No existe este patrón en el sistema.
12. **Sin botones de acción en el Navbar.** El Navbar solo lleva: logo izquierda, notificaciones + avatar derecha. Los CTAs van en el contenido de la página.
13. **El header de una vertical/sección nunca es una Card.** Es siempre el patrón `pb-6 border-b` con `h1` + descripción en `text-sm text-muted-foreground`.

---

## 21. Anti-patrones — detectar y corregir

### ❌ Breadcrumbs

```tsx
// MAL — no existe este patrón
<nav>Dashboard &gt; Verticales &gt; immoralia</nav>
<Breadcrumb>...</Breadcrumb>
```

```tsx
// BIEN — el título de página ya da contexto suficiente
<h1 className="text-xl font-bold capitalize">immoralia</h1>
```

---

### ❌ Botón de acción en el Navbar

```tsx
// MAL — el Navbar no lleva acciones de negocio
<header className="...">
  <div>Logo</div>
  <Button>Nuevo cliente</Button>   {/* ← ELIMINAR */}
  <Avatar />
</header>
```

```tsx
// BIEN — el CTA va en el header de la página
<div className="flex items-start justify-between pb-6 border-b">
  <h1 className="text-xl font-bold">Clientes</h1>
  <Button className="bg-brand hover:bg-brand/90 text-white">
    <Plus className="w-4 h-4 mr-2" /> Nuevo cliente
  </Button>
</div>
```

---

### ❌ Header de vertical como Card

```tsx
// MAL — la vertical no es una Card con logo + descripción flotante
<Card>
  <CardHeader>
    <Image src={logo} />
    <CardTitle>immoralia</CardTitle>
    <CardDescription>Administración de informes...</CardDescription>
  </CardHeader>
  <Button>+ Nuevo informe sin cliente</Button>
</Card>
```

```tsx
// BIEN — logo inline + barra de color + back link (código exacto de propuestas)

{/* Back link */}
<Link
  href="/"
  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
>
  <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Dashboard
</Link>

{/* Header de vertical */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
  <div className="flex items-center gap-4">
    {vertical.logo_url && (
      <img
        src={vertical.logo_url}
        alt={vertical.name}
        className="h-12 w-auto object-contain"
      />
    )}
    <div>
      {!vertical.logo_url && (
        <h1 className="text-3xl font-extrabold tracking-tight capitalize">
          {vertical.name}
        </h1>
      )}
      <p className="text-muted-foreground mt-1">
        Administración de espacios de cliente en esta línea de negocio.
      </p>
    </div>
  </div>
  {/* Barra de color de la vertical */}
  <div
    className="w-24 h-1.5 rounded-full shrink-0"
    style={{ backgroundColor: vertical.color_hex }}
  />
</div>
```

**Claves de este patrón:**
- Back link siempre arriba, `text-sm text-muted-foreground hover:text-foreground`
- Logo con `h-12 w-auto object-contain` — NO `<Image>` de Next.js, usar `<img>`
- Si no hay logo: `h1` es `text-3xl font-extrabold tracking-tight capitalize`
- Barra de color: `w-24 h-1.5 rounded-full` con `style={{ backgroundColor: color_hex }}`
- El CTA ("Nuevo informe sin cliente") va en la sección de contenido debajo, NO en este header

---

### Header de espacio de cliente (página `/{client-slug}`)

```tsx
{/* Back link hacia la vertical */}
<Link
  href={`/${vertical.slug}`}
  className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
>
  <ArrowLeft className="mr-2 h-4 w-4" /> Volver a {vertical.name}
</Link>

{/* Header del cliente */}
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
  <div>
    {/* Dot + label de vertical en uppercase */}
    <div className="flex items-center gap-2 mb-2">
      <span
        className="w-3 h-3 rounded-full inline-block"
        style={{ backgroundColor: vertical.color_hex }}
      />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {vertical.name}
      </span>
    </div>
    {/* Nombre del cliente */}
    <h1 className="text-3xl font-bold tracking-tight capitalize flex items-center gap-3">
      {client.name}
      <Badge variant="outline" className="font-mono text-xs font-normal">cliente</Badge>
    </h1>
    <p className="text-muted-foreground">
      Espacio de cliente. Propuestas comerciales y datos de contacto.
    </p>
  </div>
</div>
```

---

### ❌ Título de sección sin `border-b`

```tsx
// MAL — título suelto, sin separador visual
<h2 className="font-bold text-lg">Clientes con informes</h2>
<Input placeholder="Buscar cliente..." />
```

```tsx
// BIEN — sección con border-b y CTA/search alineados
<div className="flex items-center justify-between pb-4 border-b">
  <h2 className="text-base font-semibold flex items-center gap-2">
    <Users className="h-4 w-4 text-muted-foreground" />
    Clientes con informes
  </h2>
  <div className="relative max-w-sm">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    <Input placeholder="Buscar cliente..." className="pl-9 border-2" />
  </div>
</div>
```

---

### ❌ Sidebar con solo 2 items sin iconos consistentes

El sidebar siempre lleva iconos de Lucide (`size={15} strokeWidth={1.8}`). Nunca texto solo. Los items mínimos son los que estén en la navegación principal definida en el proyecto.

```tsx
// BIEN — cada item con su icono Lucide
<Link className="px-3 py-2 rounded-md text-sm flex items-center gap-2.5 ...">
  <LayoutDashboard size={15} strokeWidth={1.8} className="flex-shrink-0" />
  Dashboard
</Link>
<Link className="px-3 py-2 rounded-md text-sm flex items-center gap-2.5 ...">
  <Briefcase size={15} strokeWidth={1.8} className="flex-shrink-0" />
  Clientes
</Link>
```

---

## 22. Responsive — Sidebar colapsable y drawer mobile

El layout del panel tiene dos comportamientos responsivos gestionados por `PanelShell`.

### Breakpoints usados

| Breakpoint | Clase Tailwind | Uso en el panel |
|---|---|---|
| < 768px (mobile) | (default) | Sidebar oculto, drawer sobre el contenido |
| ≥ 768px (md) | `md:` | Sidebar fijo en la izquierda, animado |

---

### PanelShell — shell del panel con estado colapsado

`src/components/shared/PanelShell.tsx` gestiona el estado del sidebar.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from '@/components/Sidebar'
import { MotionMain } from '@/components/shared/MotionMain'
import { Navbar } from '@/components/Navbar'
import { transition } from '@/lib/motion'

export function PanelShell({ children, user, verticals, initialUnreadCount, pinSetup }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Persistir estado en localStorage
  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  const toggleCollapsed = () => {
    setCollapsed(v => {
      localStorage.setItem('sidebar-collapsed', String(!v))
      return !v
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar user={user} initialUnreadCount={initialUnreadCount} onMenuToggle={() => setMobileOpen(v => !v)} />

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar — width animado entre 56px (icono) y 224px (expandido) */}
        <motion.div
          className="hidden md:block flex-shrink-0 border-r border-border overflow-hidden"
          animate={{ width: collapsed ? 56 : 224 }}
          transition={transition.smooth}
        >
          <Sidebar userRole={user.role} verticals={verticals} collapsed={collapsed} onToggle={toggleCollapsed} />
        </motion.div>

        {/* Mobile: backdrop semitransparente */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition.fast}
              onClick={() => setMobileOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile: drawer deslizante desde la izquierda */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              className="fixed left-0 top-16 bottom-0 z-50 md:hidden"
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={transition.smooth}
            >
              <Sidebar userRole={user.role} verticals={verticals} collapsed={false} onToggle={() => setMobileOpen(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        <MotionMain>
          {children}
          {pinSetup}
        </MotionMain>
      </div>
    </div>
  )
}
```

---

### Sidebar — props collapsed + onToggle

```tsx
interface SidebarProps {
  userRole: 'admin' | 'employee'
  verticals: Vertical[]
  collapsed?: boolean    // si es true: w-14, solo iconos con title tooltip
  onToggle?: () => void  // botón al final del sidebar para colapsar/expandir
}
```

**Modo expandido** (`collapsed=false`): `w-56`, texto + icono, `ChevronLeft` al fondo.
**Modo colapsado** (`collapsed=true`): `w-14`, solo iconos centrados (`h-9 w-9 mx-auto`), `title` con tooltip nativo, `ChevronRight` al fondo.

```tsx
// Botón toggle al fondo del sidebar
<div className="mt-auto pt-3 border-t border-border">
  <button
    onClick={onToggle}
    title={collapsed ? 'Expandir menú' : 'Cerrar menú'}
    className="w-full h-9 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
  >
    {collapsed ? <ChevronRight size={15} strokeWidth={1.8} /> : <ChevronLeft size={15} strokeWidth={1.8} />}
  </button>
</div>
```

---

### Navbar — prop onMenuToggle

Muestra un botón hamburguesa solo en mobile (`md:hidden`):

```tsx
interface NavbarProps {
  user: { ... }
  initialUnreadCount?: number
  onMenuToggle?: () => void   // si se pasa, aparece el botón hamburguesa en mobile
}

// En el JSX, antes del logo:
{onMenuToggle && (
  <button
    onClick={onMenuToggle}
    className="md:hidden flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:bg-white/10 transition-colors"
    aria-label="Abrir menú"
  >
    <Menu size={18} />
  </button>
)}
```

---

### Grids responsivos usados en las páginas

```tsx
// Lista de cards (clientes, espacios, etc.)
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Página de detalle con sidebar de info
<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
  <div className="lg:col-span-2 space-y-6">  {/* contenido principal */}
  <div className="space-y-6">                {/* sidebar de info */}
</div>

// Header de página — columna en mobile, fila en desktop
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">

// Texto que se trunca en mobile
<span className="truncate capitalize">{name}</span>
```

---

### Regla: el layout.tsx del panel NO renderiza Navbar/Sidebar directamente

`layout.tsx` es un server component. Solo llama a `<PanelShell>` pasándole los datos.
`PanelShell` es un client component que maneja toda la interactividad.

```tsx
// MAL — layout.tsx renderizando directamente
<div className="flex flex-col min-h-screen">
  <Navbar user={userData} />
  <div className="flex flex-1 min-h-0">
    <Sidebar userRole={...} verticals={...} />
    <MotionMain>{children}</MotionMain>
  </div>
</div>

// BIEN — layout.tsx delega a PanelShell
<PanelShell user={userData} verticals={verticals ?? []} initialUnreadCount={count ?? 0} pinSetup={pinSetup}>
  {children}
</PanelShell>
```
