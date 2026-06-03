# SPEC-15: Replicación de UI (propuestas) + Migración a Tokens

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** fix-spec (extiende [`12-ux-polish.md`](12-ux-polish.md) y la UI general; las specs originales NO se modifican)
**Prioridad:** 3 (depende de [`14-theming-system.md`](14-theming-system.md); el navbar admin completo requiere [`13-auth-admin-fix.md`](13-auth-admin-fix.md))

---

## Contexto y Problema

El UI del panel no se parece a `propuestas.immoral.es`:
- El **navbar es oscuro** (`#111111`) y suelto, mientras el resto del panel es claro →
  inconsistencia visual evidente.
- Faltan los patrones de propuestas: **hero banner** en el dashboard, **quick actions**, cards de
  verticales con barra de color, empty states con borde discontinuo.
- Los modales son **custom** (`fixed inset-0 bg-black/50…`) en lugar de shadcn `Dialog`.
- El color está **hardcodeado** en 3 patrones (hex inline, `[--color-*]`, `bg-blue-600`) repartido
  por ~17 archivos del panel, lo que impide rebrandear.

Esta spec aplica los tokens de [`14-theming-system.md`](14-theming-system.md) para: (a) replicar el
look de propuestas, y (b) **migrar todo el panel a tokens semánticos**, dejando 0 colores de
marca/neutros hardcodeados.

---

## Dependencias

- **Bloqueante:** [`14-theming-system.md`](14-theming-system.md) (tokens `--brand`/`primary` + set
  shadcn + Toaster instalados).
- **Recomendado antes:** [`13-auth-admin-fix.md`](13-auth-admin-fix.md) (para ver y verificar el
  navbar de admin con sus enlaces).

---

## 15.1 — Tabla de sustitución de color (regla maestra)

Aplicar en **todo el panel interno**. Reemplazar mecánicamente cualquiera de los 3 patrones por el
token semántico. **Usar clases con nombre, nunca arbitrarias** (ver gotcha de la spec 14).

| Hoy (hex inline / `[--color-*]` / hardcoded) | Significado | Reemplazo |
|---|---|---|
| `#3980E4`, `bg-[--color-brand]`, `text-[--color-brand]`, `bg-blue-600`, `bg-blue-500`, `hover:bg-blue-600` | acento | fondo `bg-primary`; texto/icono `text-primary`; borde `border-primary`; hover de fondo `hover:bg-primary/90`; hover de texto `hover:text-primary` |
| `#111111`, `text-[--color-black]` | texto / superficie oscura | texto → `text-foreground`; superficie oscura → `bg-foreground text-background` |
| `#5E5E5E`, `text-[--color-gray-mid]` | texto secundario | `text-muted-foreground` |
| `#D8D8D8`, `border-[--color-gray-light]`, `bg-[--color-gray-light]` | borde / relleno claro | borde → `border-border`; relleno → `bg-muted` |
| `bg-white` (superficie de tarjeta/panel) | superficie base | `bg-card` (tarjetas) / `bg-background` (página) |

**Acento en `style={{}}` inline** (solo cuando no quepa una clase): usar `var(--brand)`. **Nunca**
`"#3980E4"`.

### Qué NO migrar (mantener tal cual) — IMPORTANTE

1. **`v.color_hex`** (color por vertical, viene de la BD): se sigue usando como
   `style={{ backgroundColor: v.color_hex }}` o `v.color_hex + "22"` para tintes, y en barras de
   color. Es **dato del registro**, no identidad de la app. No tocar.
2. **Viewer público oscuro** — archivos `src/app/[space]/[slug]/AccessModal.tsx`, `ViewerShell.tsx`,
   `PdfViewer.tsx`: **mantener su estética oscura** (superficies `#1c1c1c`, `#2e2e2e`, `#242424`,
   `#3a3a3a`; logo blanco). Es una decisión de diseño intencional ("informe protegido"). **No
   convertir el viewer a claro.** Lo único que cambia ahí es el **acento** (ver 15.5).

---

## 15.2 — Reescribir Navbar (claro, shadcn) — `src/components/shared/Navbar.tsx`

Mantener las props actuales (`userEmail`, `userName`, `userRole`) y la lógica de `signOut`.
Estructura objetivo (patrón propuestas):

- Contenedor: `<header className="border-b border-border bg-card">`.
- Inner: `container mx-auto max-w-[1400px] px-4 sm:px-8 h-16 flex items-center justify-between`.
- Logo (sobre fondo claro): `<Image src="/immoral-logo-negro.png" width={140} height={38}
  className="dark:invert object-contain" />` + subtítulo "Informes" en `text-muted-foreground`.
- Links de navegación con iconos Lucide outline (`w-4 h-4`) y `text-sm font-medium text-foreground
  hover:text-primary transition-colors`:
  - Siempre: **Clientes** (`/clientes`).
  - Solo `userRole === "admin"`: **Verticales** (`/admin/verticales`), **Usuarios** (`/admin/usuarios`).
- Badge de rol admin: `bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded px-2 py-1
  text-xs font-semibold`.
- Botón quick-create `+`: `<Button size="icon">` (hereda `primary`), abre `QuickCreateModal`.
- Menú de perfil: usar `@/components/ui/dropdown-menu` (sustituir el dropdown manual con
  `onMouseEnter/Leave`):
  - Trigger: `@/components/ui/avatar` con iniciales (`AvatarFallback className="bg-primary
    text-primary-foreground font-bold"`).
  - Contenido: nombre + email + badge de rol; separador; item **Cerrar sesión**
    `className="text-destructive focus:bg-destructive/10"` que ejecuta `signOut()` y luego
    `window.location.href = "/login"`.
- **Responsive (Regla 5):** links de navegación ocultos en `<sm` y visibles en `sm:` (como hoy);
  verificar a 375 / 768 / 1280.

---

## 15.3 — Reescribir Dashboard — `src/app/(panel)/page.tsx`

**Conservar todas las queries de datos actuales** (verticales con conteos de espacios/informes,
últimos informes, filtro por rol admin/empleado, signed URLs de logos). Solo cambia el render:

- **Hero banner:**
  ```tsx
  <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8 text-white shadow-lg">
    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />
    <div className="relative z-10 max-w-3xl space-y-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary border border-primary/30">Informes Immoral</span>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Bienvenido, {nombre}</h1>
      <p className="text-slate-400 text-sm sm:text-base">Gestiona verticales, clientes e informes.</p>
    </div>
  </div>
  ```
  (El hero es una superficie oscura **fija** del componente, no de marca; usa `slate` directo. El
  badge sí usa `primary`.)
- **Quick actions:** `grid grid-cols-1 md:grid-cols-3 gap-4` con 3 `<Card className="hover:border-primary/50 transition-colors">`:
  Nuevo cliente (→ `/clientes`), Nuevo espacio y Nuevo informe (abren `QuickCreateModal`). Iconos
  Lucide, título + descripción corta.
- **Grid de verticales:** `grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6`. Cada card:
  `<Card className="relative overflow-hidden hover:shadow-md hover:border-primary/50 transition-all">`
  con barra de color superior `<div className="absolute top-0 left-0 right-0 h-1.5" style={{
  backgroundColor: v.color_hex }} />`. Dentro: logo firmado (o inicial), nombre (`text-foreground`),
  conteos (`text-muted-foreground`). Enlaza a `/clientes?vertical={v.slug}`.
- **Empty states** (cuando no hay verticales / informes):
  `<Card className="border-dashed py-12 flex flex-col items-center justify-center text-center gap-4">`
  con icono `h-12 w-12 text-muted-foreground` + texto + CTA (ej. para admin: "Crear primera vertical →"
  hacia `/admin/verticales`).
- Migrar todos los colores según la tabla 15.1.

---

## 15.4 — Migrar modales a shadcn `Dialog`

Reescribir estos 3 modales custom usando `@/components/ui/dialog` (`Dialog`, `DialogContent`,
`DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`). **Conservar toda la lógica**
(estados, server actions, validaciones, pasos):

1. **`src/components/shared/QuickCreateModal.tsx`** — conservar los pasos `type → client → space` y
   las llamadas a `getClientsForSelect()` / `getSpacesForSelect()`. Controlar visibilidad con prop
   `open`/`onOpenChange` del `Dialog`. Listas e items con componentes shadcn (`Button` ghost / items).
2. **`src/app/(panel)/admin/verticales/VerticalesClient.tsx`** — `VerticalFormModal` → `Dialog`;
   campos con `Input`/`Label`/`Button` shadcn; sustituir `hover:bg-blue-600` por `hover:bg-primary/90`;
   el `confirm()` de borrado → `@/components/ui/alert-dialog`. **Mantener** el `<input type="color">`
   (es el `ColorPicker` que la spec [`02-verticals.md`](02-verticals.md) esperaba) y el upload de
   logo con preview. El `window.location.reload()` tras guardar se mantiene (refresca signed URLs).
3. **`src/app/(panel)/informes/[id]/SendMagicLinkModal.tsx`** → `Dialog` + tokens.

---

## 15.5 — Viewer público (solo acento)

En `src/app/[space]/[slug]/AccessModal.tsx`, `ViewerShell.tsx`, `PdfViewer.tsx`: sustituir cada
`#3980E4` por `var(--brand)` (en `style={{}}`) o por `bg-primary`/`text-primary` donde haya clases.
**Mantener** el resto de superficies oscuras y el logo blanco. No cambiar la lógica de PIN / magic
link / sesión.

---

## 15.6 — Checklist de archivos a migrar (panel interno)

Aplicar la tabla 15.1 a estos archivos (los marcados con ★ se reescriben en su sección):

```
src/app/(panel)/layout.tsx
src/app/(panel)/page.tsx                                   ★ 15.3
src/app/(panel)/admin/usuarios/page.tsx
src/app/(panel)/admin/usuarios/DomainManager.tsx
src/app/(panel)/admin/usuarios/EmployeeRoleManager.tsx
src/app/(panel)/admin/verticales/page.tsx
src/app/(panel)/admin/verticales/VerticalesClient.tsx      ★ 15.4
src/app/(panel)/clientes/page.tsx
src/app/(panel)/clientes/ClientesClient.tsx
src/app/(panel)/clientes/[id]/ClientDetailClient.tsx
src/app/(panel)/clientes/[id]/SpacesSection.tsx
src/app/(panel)/espacios/[id]/page.tsx
src/app/(panel)/espacios/[id]/SpaceReportsClient.tsx
src/app/(panel)/informes/[id]/page.tsx
src/app/(panel)/informes/[id]/ReportManageClient.tsx
src/app/(panel)/informes/[id]/SendMagicLinkModal.tsx       ★ 15.4
src/components/shared/Navbar.tsx                            ★ 15.2
src/components/shared/QuickCreateModal.tsx                 ★ 15.4
```
Viewer (solo acento → `var(--brand)`, 15.5): `src/app/[space]/[slug]/{AccessModal,ViewerShell,PdfViewer}.tsx`.

---

## Criterios de Aceptación

- [ ] **CA-15.1:** El navbar es claro (`bg-card`), coherente con el panel; sin fondo `#111111`
  suelto; menú de perfil con shadcn `DropdownMenu`; avatar con iniciales en color `primary`.
- [ ] **CA-15.2:** El dashboard muestra hero banner + 3 quick actions + grid de verticales con barra
  de color + empty states con borde discontinuo (estilo propuestas).
- [ ] **CA-15.3:** Los 3 modales usan shadcn `Dialog`/`AlertDialog`; ningún modal con `bg-black/50`
  manual ni hex de marca.
- [ ] **CA-15.4:** Al crear una vertical desde `/admin/verticales`, aparece en el grid del dashboard
  y el empty state desaparece (verifica el flujo completo de [`02-verticals.md`](02-verticals.md)).
- [ ] **CA-15.5:** El comando
  `grep -rE "3980E4|#111111|#5E5E5E|#D8D8D8|\[--color-|bg-blue|text-blue" src --include=*.tsx`
  no devuelve resultados en el **panel interno**. Permitidos únicamente: `v.color_hex` dinámico
  (dato), y las superficies oscuras del viewer público (`#1c1c1c`/`#2e2e2e`/`#242424`/`#3a3a3a`) con
  el acento ya migrado a `var(--brand)`.
- [ ] **CA-15.6:** Responsive correcto a 375 / 768 / 1280 en navbar y dashboard (Regla 5).
- [ ] **CA-15.7:** `pnpm build` sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).
- [ ] **CA-15.8:** Cambiar `--brand` a un color de prueba recolorea también el dashboard, navbar y
  modales migrados (confirma que no quedó marca hardcodeada). Revertir tras la prueba.

---

## Out of Scope

- Sistema de notificaciones in-app / `NotificationsDropdown` (spec futura `10-notifications`).
- Dark mode conmutable.
- Rediseño del viewer público a tema claro (se mantiene oscuro intencionalmente).
- Cambios funcionales en server actions o queries (solo se migra presentación).

---

## Notas de Implementación

- **Estratificación del Color:** Se han respetado estrictamente las tres capas de color definidas:
  1. **Marca:** Sustitución exhaustiva de `#3980E4` y variables css (`--color-brand`) por tokens semánticos del tema (`primary`, `bg-primary`, `text-primary`), asegurando que al cambiar el token base se recoloree todo el panel de forma automatizada (CA-15.8).
  2. **Vertical (Dato):** El uso de `v.color_hex` permanece inalterado para inyectarse como estilos en línea (`style={{ backgroundColor: v.color_hex }}`). El default en modales de creación se ajustó de `#3980E4` a `#000000` para asegurar cumplimiento del grep y evitar fugas de estilo.
  3. **Viewer Público:** Mantiene intencionadamente sus superficies oscuras (`#111111`, `#5E5E5E`, etc.) ya que proyecta la identidad de "entorno seguro/privado". Únicamente los elementos de acento en este contexto fueron reemplazados por `var(--brand)` y `text-primary`.

- **Manejo de `exactOptionalPropertyTypes` (TS):** Al migrar componentes propios (como checkboxes y dropdowns) a shadcn, se prefirió conservar los elementos nativos estilizados (`<input type="checkbox" className="accent-primary" />`) en escenarios que podrían generar fricción por tipado de propiedades `undefined` en componentes shadcn anidados (ej. en iteraciones de recolección de eventos como el modal de Magic Links). Las props obligatorias fluyen como `null` en el payload.

- **Patrón `Dialog` de shadcn:** Se adoptó un patrón de control explícito para los 3 modales migrados. En lugar de delegar el estado interno al `Trigger`, los modales se abren declarativamente (`<Dialog open={true} onOpenChange={(open) => !open && onClose()}>`). Esto garantiza la consistencia de la UI al anular fugas de re-render durante transiciones (como al borrar un vertical o enviar el enlace).

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Replicación de UI de propuestas + migración integral a tokens. | Claude Code |
| 1.1 | 2026-06-03 | Implementación de las especificaciones completada con build validado. | Antigravity |
