# SPEC-23: Flujos de Creación Rápida y Navegación

**Versión:** 2.1
**Estado:** draft
**Última actualización:** 2026-06-04
**Owner:** Julian
**Tipo:** fix-spec (itera sobre [`12-ux-polish.md`](12-ux-polish.md) Issues 2 y 5, y [`17-screen-replication.md`](17-screen-replication.md) navbar/dashboard; las specs originales NO se modifican)
**Prioridad:** 1
**Implementador previsto:** Gemini (la spec debe ser autosuficiente; nombres de archivos, firmas y contratos verificados contra el código vivo el 2026-06-04).

---

## Descripción

Reescribe los flujos de creación rápida (cliente e informe) para que sean fluidos y coherentes con el modelo de datos, y mejora la navegación del panel. Sustituye el `QuickCreateModal` de stepper genérico y el botón `+` del navbar por dos acciones explícitas ("Nuevo cliente", "Nuevo informe") con formularios reales, y añade navegación visible (enlaces + breadcrumbs) para orientarse y volver atrás con facilidad.

---

## Actores

- **Empleado:** crea clientes e informes; ve sus propios recursos.
- **Admin:** ídem, ve todo.

---

## Decisiones de producto (resueltas con el responsable, NO inferir)

1. **Nuevo cliente → vertical obligatoria.** Al crear un cliente se exige seleccionar una vertical; se crea el cliente **y** su primer espacio (`client_space`) en esa vertical, y se redirige a `/espacios/{spaceId}` listo para subir un informe.
2. **Nuevo informe → cliente, luego espacio.** Buscar cliente por autocompletar; tras elegirlo se resuelve el espacio (vertical). Si no existe el cliente, se crea inline y se continúa sin perder el contexto.
3. **Navegación → breadcrumbs + enlaces.** El navbar muestra enlaces visibles (Dashboard, Clientes, y Verticales para admin) y las subpáginas muestran breadcrumbs contextuales.
4. **Navbar → dos botones separados visibles** (decisión del responsable): "Nuevo cliente" y "Nuevo informe" como botones independientes en el navbar (no un dropdown "Crear"). En móvil (`< sm`) se compactan (solo icono, o se reubican; ver UI).
5. **Nunca un cliente sin vertical** (decisión del responsable): TODA creación de cliente exige seleccionar una vertical y crea su primer espacio. No existe un formulario de "crear cliente sin vertical". Esto aplica también a la creación desde la lista `/clientes`, que adopta `NewClientWithVerticalDialog`. (Editar un cliente NO pide vertical; los espacios adicionales se añaden desde la ficha del cliente / desde la vertical, spec 24.)
6. **Redirección tras crear cliente:** en los tres puntos de entrada (navbar, dashboard, lista `/clientes`) se redirige a `/espacios/{spaceId}` del espacio recién creado (coherente: el objetivo es subir un informe). Documentado; si el responsable prefiere quedarse en `/clientes` al crear desde la lista, es un cambio de una línea.

---

## Inventario de artefactos reutilizables (VERIFICADO contra el código)

> Gemini DEBE reutilizar estos artefactos existentes. No reimplementar.

### Server actions existentes
- **`getSpacesForSelect(clientId: string)`** en `src/app/(panel)/espacios/actions.ts` → `Promise<Array<{ id: string; slug: string; verticals: { name: string } | null }>>`. (Usa admin client; **no** filtra por `created_by`.)
- **`createSpace(clientId: string, verticalId: string, clientName: string)`** en `src/app/(panel)/espacios/actions.ts` → `{ success: true; id: string; slug: string } | { error: string }`. Ya valida que el cliente no tenga otro espacio en esa vertical y resuelve el slug (sufijos `-2`, colisión con verticales y slugs reservados). Internamente llama a `assertCanManageClient(clientId)` (creador ∨ admin).
- **`getSlugPreview(clientName: string)`** en `src/app/(panel)/espacios/actions.ts` → `{ slug: string } | { error: string }`.
- **`createClient_(formData: FormData)`** en `src/app/(panel)/clientes/actions.ts` → `{ success: true; id: string } | { error: string }`. Campos de FormData: `name` (obligatorio), `contact_name`, `contact_phone`, `contact_whatsapp`. Fija `created_by = user.id`.
- **`createReport(spaceId: string, formData: FormData)`** en `src/app/(panel)/informes/actions.ts` → `{ reportId: string; pin: string; autoSendWarning?: string } | { error: string }`. Campos de FormData: `name`, `slug`, `auto_send` (`"true"|"false"`), `document` (File PDF/HTML ≤ 50MB). Genera el PIN y lo cifra.
- **`checkReportSlug(spaceId, name)`** y **`checkReportName(spaceId, name)`** en `informes/actions.ts` → `{ taken: boolean }`.
- **`getClientsForSelect()`** en `clientes/actions.ts` → `{ id; name }[]`. **OJO (bug a corregir):** hoy devuelve TODOS los clientes sin filtrar por `created_by`. NO usar para el autocompletar; usar la nueva `searchClients` (ver abajo). Su único consumidor (`QuickCreateModal`) se elimina en esta spec, por lo que `getClientsForSelect` puede borrarse.

### Componentes existentes
- **`ClientFormModal`** exportado desde `src/app/(panel)/clientes/ClientesClient.tsx` (named export al final del archivo). Props: `{ client?: {name; contact_name; contact_phone; contact_whatsapp}; onClose: () => void; onSubmit: (fd: FormData) => Promise<void> }`. Renderiza los 4 campos vía `new FormData(form)`. **Esta spec extrae sus campos a un componente reutilizable** (ver UI).
- **`CreateReportModal`** y **`PinModal`**: funciones **locales** dentro de `src/app/(panel)/espacios/[id]/SpaceReportsClient.tsx` (NO exportadas). `CreateReportModal` props: `{ spaceId: string; spaceSlug: string; onClose: () => void; onCreated: (id: string, pin: string, warning?: string) => void }`. Contienen la lógica de slug/nombre, validación de archivo (PDF/HTML ≤50MB), preview en iframe y auto-send. **Esta spec los extrae a un módulo compartido** (ver UI).
- **`QuickCreateModal`** en `src/components/shared/QuickCreateModal.tsx`: stepper genérico de 3 pasos. **Se elimina** en esta spec.

### Componentes UI disponibles (`src/components/ui/`)
`alert-dialog, avatar, badge, button, card, checkbox, dialog, dropdown-menu, input, label, select, separator, sheet, sonner, table, textarea`.
**NO existe** `command`/`combobox` (autocompletar). El autocompletar de cliente se construye con `Input` + lista filtrada renderizada bajo el input (popover manual con `div` absoluto), reutilizando los estilos del proyecto. NO añadir dependencias nuevas.

### Utilidades
- `slugify` en `src/lib/utils/slugify.ts`.
- Patrón de auth en server actions: `createClient()` (server) para identidad + `createAdminClient()` para datos; re-verificar permisos en código (RLS no aplica al service_role).

---

## Flujos Principales

### Flujo 1: Nuevo cliente (con vertical) — standalone
1. El usuario abre "Nuevo cliente" (desde el botón del navbar, la tarjeta del dashboard, o el botón "+ Nuevo cliente" de la lista `/clientes`).
2. Se abre un `Dialog` con el **formulario de cliente reutilizable**: nombre (obligatorio), persona de contacto, teléfono, WhatsApp, logo (opcional — solo si [`25`](25-client-logo.md) está implementada) y **selector de vertical (obligatorio)**.
3. Al montar, se cargan las verticales con `getVerticalsForSelect()` (nueva acción).
4. El usuario rellena y envía.
5. Se invoca `createClientWithSpace(formData, verticalId)` (nueva acción). Devuelve `{ clientId, spaceId, spaceSlug }`.
6. Se cierra el modal y se hace `router.push('/espacios/{spaceId}')`.

### Flujo 2: Nuevo informe (autocompletar de cliente → espacio → formulario)
Modal/overlay con máquina de estados (`step`):

- **`step = "search"`**: `Input` de búsqueda de cliente. En cada cambio (con debounce ~250ms o `useTransition`) se llama a `searchClients(query)` (nueva acción, rol-aware). Se muestra la lista filtrada.
  - El usuario selecciona un cliente existente → `step = "resolveSpace"`.
  - Si la lista está vacía y `query.trim().length > 0` → se muestra el CTA **"Crear cliente «{query}»"** → `step = "createClient"`.
- **`step = "resolveSpace"`**: se llama a `getSpacesForSelect(clientId)`.
  - 0 espacios → mostrar selector de vertical (`getVerticalsForSelect()`), crear con `createSpace(clientId, verticalId, clientName)`, obtener `{id, slug}` → `step = "reportForm"` con ese espacio.
  - 1 espacio → auto-seleccionar → `step = "reportForm"`.
  - >1 espacio → lista para elegir (mostrando `verticals.name` y `slug`) → `step = "reportForm"`.
- **`step = "reportForm"`**: renderizar el **formulario de informe extraído** (`CreateReportForm`) con `spaceId` y `spaceSlug` resueltos. Conserva toda la lógica existente (validación nombre/slug, upload, auto-send). Al éxito (`onCreated(id, pin, warning?)`) → `step = "pin"`.
- **`step = "pin"`**: mostrar el `PinModal` extraído con el PIN. Al cerrar: `router.push('/informes/{reportId}')` (o cerrar y refrescar; ver Edge Cases).

### Flujo 3: Nuevo informe — el cliente no existe (creación inline)
1. Desde `step = "search"`, el CTA "Crear cliente «{query}»" lleva a `step = "createClient"`.
2. Se renderiza el **formulario de cliente reutilizable** (nombre prerrellenado con `query`, + contacto, + logo opcional, + **vertical obligatoria**).
3. Al enviar → `createClientWithSpace(formData, verticalId)` → `{ clientId, spaceId, spaceSlug }`.
4. El flujo continúa automáticamente a `step = "reportForm"` con ese espacio (sin reabrir nada).

### Flujo 4: Navegación (navbar + breadcrumbs)
1. El navbar (`src/components/shared/Navbar.tsx`) muestra, además del logo y el menú de usuario:
   - En `sm:` y superior: cluster de **enlaces horizontales** visibles → "Dashboard" (`/`), "Clientes" (`/clientes`), y "Verticales" (`/admin/verticales`) + "Usuarios" (`/admin/usuarios`) solo si admin.
   - **Dos botones separados** (decisión 4): "Nuevo cliente" y "Nuevo informe". "Nuevo informe" como botón primario; "Nuevo cliente" como secundario (`variant="outline"`).
   - En móvil (`< sm`): los enlaces siguen accesibles desde el dropdown de usuario (ya existen ahí desde la spec 17). Los dos botones de creación se compactan a solo-icono (`UserPlus` para cliente, `FilePlus`/`Plus` para informe) con `title`/`aria-label`; no se ocultan.
2. Cada subpágina renderiza, como primer elemento de su contenido, un componente **`<Breadcrumbs>`** con la ruta jerárquica navegable (ver UI → Breadcrumbs).

---

## Flujos Alternativos / Edge Cases

- **Sin verticales creadas:** el selector de vertical muestra estado vacío. Admin: enlace a `/admin/verticales`. Empleado no-admin: mensaje "No hay verticales disponibles; contacta con un administrador". No se puede completar la creación de cliente sin vertical (el botón de envío queda deshabilitado).
- **Colisión de slug de espacio:** la resuelve `createSpace`/`resolveSlug` (sufijos, colisión con verticales y slugs reservados). No reimplementar.
- **Autocompletar sin resultados (informe):** se ofrece el CTA de creación inline (Flujo 3). Nunca callejón sin salida.
- **Búsqueda case-insensitive:** `searchClients` usa `ilike '%query%'` sobre `name`. El match por acentos es deseable pero no bloqueante.
- **Cancelar a mitad del Flujo 3:** si el usuario cancela tras crear el cliente pero antes de crear el informe, el cliente y su espacio quedan creados (no se revierten). Se documenta; sin rollback transaccional.
- **Subida de archivo y navegación:** el `File` del documento NO puede viajar por `router.push`; por eso el Flujo 2/3 renderiza el formulario de informe **dentro del overlay** (no navega al espacio para subirlo). Requisito de implementación, no opcional.
- **Permisos:** crear cliente/espacio/informe sigue RLS (autenticado inserta; lectura/edición creador ∨ admin). Las acciones con admin client re-verifican autorización en código (patrón CLAUDE.md / SPEC-22.3). `createSpace` ya lo hace.
- **Autocompletar y privacidad:** `searchClients` filtra por `created_by` para no-admin (admin ve todos). No debe permitir enumerar clientes ajenos.
- **`?openSpace=1` / `?openReport=1`:** estos auto-open en `SpacesSection.tsx` y `SpaceReportsClient.tsx` (legado de `QuickCreateModal`) quedan sin disparador tras eliminar el stepper. Dejarlos no rompe nada; **limpieza opcional** (eliminar el `useEffect` que los lee). Documentar en Notas de Implementación qué se hizo.

---

## Criterios de Aceptación

- [ ] CA-23.1: El navbar muestra **dos botones separados** "Nuevo cliente" y "Nuevo informe"; el botón `+` y `QuickCreateModal` se eliminan del código.
- [ ] CA-23.1b: Toda creación de cliente (navbar, dashboard y lista `/clientes`) exige vertical y crea client + space; no queda en el código ningún camino que cree un cliente sin espacio.
- [ ] CA-23.2: El navbar muestra enlaces horizontales visibles (≥`sm`) a Dashboard y Clientes (y Verticales + Usuarios si admin), además del menú de usuario.
- [ ] CA-23.3: "Nuevo cliente" abre un `Dialog` con el formulario de cliente (nombre, contacto, teléfono, WhatsApp, logo opcional) **más un selector de vertical obligatorio** poblado por `getVerticalsForSelect()`.
- [ ] CA-23.4: Al enviar "Nuevo cliente" (desde cualquiera de los tres puntos de entrada) se invoca `createClientWithSpace`, se crean `client` + `client_space`, y se hace `router.push('/espacios/{spaceId}')`.
- [ ] CA-23.5: "Nuevo informe" presenta un autocompletar de cliente construido con `Input` + lista filtrada, alimentado por `searchClients(query)` (rol-aware).
- [ ] CA-23.6: Tras elegir cliente: con 1 espacio se auto-selecciona; con varios se ofrece elegir (mostrando vertical + slug); con 0 se pide vertical y se crea con `createSpace`.
- [ ] CA-23.7: Si el cliente buscado no existe, aparece "Crear cliente «{query}»" → formulario inline (vertical obligatoria) → `createClientWithSpace` → continúa **automáticamente** al formulario de informe del espacio creado.
- [ ] CA-23.8: El formulario de informe del nuevo flujo es el **`CreateReportForm` extraído** y conserva toda la lógica (validación nombre/slug únicos vía `checkReportName`/`checkReportSlug`, upload PDF/HTML ≤50MB, preview, auto-send, `createReport`, muestra de PIN vía `PinModal`).
- [ ] CA-23.9: `SpaceReportsClient.tsx` sigue funcionando usando los mismos componentes extraídos (`CreateReportForm` + `PinModal`); no hay regresión en la creación de informe desde el espacio.
- [ ] CA-23.10: La tarjeta "Nuevo espacio" se elimina del dashboard (`DashboardQuickActions.tsx`); permanecen "Nuevo cliente" y "Nuevo informe" abriendo los flujos nuevos.
- [ ] CA-23.11: Las páginas `/clientes`, `/clientes/[id]`, `/espacios/[id]`, `/informes/[id]`, `/verticales/[slug]`, `/admin/verticales`, `/admin/usuarios` renderizan `<Breadcrumbs>` con la jerarquía correcta y segmentos intermedios enlazados.
- [ ] CA-23.12: Responsive correcto en 375 / 768 / 1280 (enlaces del navbar colapsan a dropdown en `< sm`; breadcrumbs con truncado/scroll-x en móvil; overlay de "Nuevo informe" usable en móvil).
- [ ] CA-23.13: `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

No introduce tablas ni columnas nuevas. Usa `clients` (insert), `client_spaces` (insert), `verticals` (lectura), `reports` + `report_versions` (insert, lógica existente). La columna `clients.logo_url` la añade [`SPEC-25`](25-client-logo.md); el campo de logo del formulario solo es funcional con 25 implementada (si no, se omite el campo).

---

## UI / Páginas Afectadas

### Componentes nuevos

- **`src/components/clients/ClientFields.tsx`** (o ubicación equivalente) — campos reutilizables del formulario de cliente (nombre, contacto, teléfono, WhatsApp; logo opcional cuando exista 25). Extraídos del actual `ClientFormModal`. Se usan en: edición de cliente, modal "Nuevo cliente" standalone y paso inline del flujo de informe.
- **`src/components/clients/VerticalSelect.tsx`** (o inline) — `<select>` de verticales poblado por `getVerticalsForSelect()`, con estados vacío/cargando.
- **`src/components/clients/NewClientWithVerticalDialog.tsx`** — `Dialog` que combina `ClientFields` + `VerticalSelect`. Props mínimas: `{ defaultName?: string; onClose: () => void; onCreated: (r: { clientId: string; spaceId: string; spaceSlug: string }) => void }`. Llama a `createClientWithSpace`. Usado standalone (con `onCreated` → redirect) y embebido en el flujo de informe (con `onCreated` → avanzar a `reportForm`).
- **`src/components/reports/CreateReportForm.tsx`** y **`PinModal`** — extraídos de `SpaceReportsClient.tsx` SIN cambiar su lógica. `CreateReportForm` props: `{ spaceId; spaceSlug; onClose; onCreated(id, pin, warning?) }`. `SpaceReportsClient` pasa a importarlos en vez de definirlos localmente.
- **`src/components/shared/NewReportFlow.tsx`** — overlay (`Dialog`) con la máquina de estados del Flujo 2/3 (`search → [createClient] → resolveSpace → reportForm → pin`). Reutiliza `ClientAutocomplete`, `NewClientWithVerticalDialog`/`ClientFields`, `getSpacesForSelect`, `createSpace`, `CreateReportForm`, `PinModal`.
- **`src/components/shared/ClientAutocomplete.tsx`** — `Input` + lista filtrada (popover manual), alimentado por `searchClients`. Reutilizable también por [`24`](24-vertical-screen.md). Props: `{ onSelect: (c: {id; name}) => void; onNoMatch?: (query: string) => void; placeholder?: string }`.
- **`src/components/shared/Breadcrumbs.tsx`** — presentacional. Props: `{ items: Array<{ label: string; href?: string }> }`. El último ítem sin `href` (página actual). Responsive: `overflow-x-auto` con separadores `/` o icono `ChevronRight`.

### Páginas modificadas

- **`src/components/shared/Navbar.tsx`** — eliminar el botón `+` y el estado/uso de `QuickCreateModal`; añadir cluster de enlaces horizontales (`sm:flex`, oculto en móvil) y **dos botones separados** ("Nuevo cliente" outline, "Nuevo informe" primario) que montan respectivamente `NewClientWithVerticalDialog` (standalone, `onCreated` → redirect a `/espacios/{spaceId}`) y `NewReportFlow`. En móvil los botones quedan solo-icono. Mantener el dropdown de usuario (con sus enlaces, ya existentes).
- **`src/app/(panel)/DashboardQuickActions.tsx`** — eliminar la tarjeta "Nuevo espacio"; "Nuevo cliente" abre `NewClientWithVerticalDialog`; "Nuevo informe" abre `NewReportFlow`. (Hoy "Nuevo cliente" solo hace `Link href="/clientes"` y las otras abren `QuickCreateModal`.)
- **`src/app/(panel)/clientes/ClientesClient.tsx`** — el botón "+ Nuevo cliente" abre `NewClientWithVerticalDialog` (con vertical obligatoria), igual que navbar y dashboard; al crear, redirige a `/espacios/{spaceId}`. Se elimina el antiguo `ClientFormModal` sin vertical para creación (ya no hay camino que cree cliente sin espacio — decisión 5). **Edición de cliente:** la ficha `/clientes/[id]` sigue usando un form de edición SIN vertical (editar no toca espacios); ese form reutiliza `ClientFields`. `createClient_` deja de invocarse desde UI (queda como building block de `createClientWithSpace`).
- **`src/app/(panel)/espacios/[id]/SpaceReportsClient.tsx`** — importar `CreateReportForm` y `PinModal` extraídos (sin cambios de comportamiento).
- **Páginas con breadcrumbs** (renderizar `<Breadcrumbs>` como primer hijo del contenido, usando los datos que el Server Component ya carga):
  - `/clientes/page.tsx`: `[{label:"Dashboard",href:"/"},{label:"Clientes"}]`
  - `/clientes/[id]/page.tsx`: `… ,{label:"Clientes",href:"/clientes"},{label: client.name}]`
  - `/espacios/[id]/page.tsx`: `… ,{label:"Clientes",href:"/clientes"},{label: client.name, href:"/clientes/{client.id}"},{label: vertical.name}]`
  - `/informes/[id]/page.tsx`: `… ,{label: client.name, href:"/clientes/{client.id}"},{label: vertical.name, href:"/espacios/{space.id}"},{label: report.name}]`
  - `/verticales/[slug]/page.tsx`: `[{label:"Dashboard",href:"/"},{label:"Verticales",href:"/admin/verticales"}, {label: vertical.name}]` — si el usuario no es admin, el segmento "Verticales" puede ir sin `href` (no tiene acceso a `/admin/verticales`).
  - `/admin/verticales`, `/admin/usuarios`: `[{label:"Dashboard",href:"/"},{label:"Verticales"|"Usuarios"}]`

### Breakpoints obligatorios
375px · 768px · 1280px.

---

## API / Endpoints

No aplica (todo vía server actions del panel).

### Server actions nuevas (firmas exactas a implementar)

En `src/app/(panel)/clientes/actions.ts`:

- **`getVerticalsForSelect(): Promise<Array<{ id: string; name: string; color_hex: string }>>`** — lee `verticals` (admin client; RLS permite a cualquier autenticado), ordenado por `name`.
- **`searchClients(query: string): Promise<Array<{ id: string; name: string }>>`** — admin client + identidad por sesión; si el perfil no es admin, filtra `.eq('created_by', user.id)`; `ilike('name', '%'+query+'%')`; `limit(20)`; ordena por `name`. Devuelve `[]` si no autenticado o `query` vacío.
- **`createClientWithSpace(formData: FormData, verticalId: string): Promise<{ clientId: string; spaceId: string; spaceSlug: string } | { error: string }>`** — orquesta `createClient_(formData)`; si OK, `createSpace(clientId, verticalId, name)`; devuelve ids + slug. Si `createSpace` falla, devolver el error (el cliente queda creado; documentado). `name` se toma de `formData.get('name')`.

> `getClientsForSelect()` queda obsoleta (su consumidor se elimina); puede borrarse o dejarse sin uso. Documentar en Notas de Implementación.

---

## Notas de Seguridad

- No se expone contenido de informe en estos flujos (solo metadatos y creación).
- `searchClients` y el autocompletar respetan `created_by` para no-admin (no enumerar clientes ajenos). El rol se lee con admin client (patrón anti-recursión RLS de CLAUDE.md).
- Las acciones que escriben con admin client re-verifican creador ∨ admin (RLS no aplica al service_role). `createSpace`/`createClient_` ya cumplen; `createClientWithSpace` hereda sus checks.
- `createReport` mantiene sus validaciones (MIME, tamaño, unicidad). No relajar.

---

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT:** extracción de `ClientFields` y `CreateReportForm`/`PinModal`; `ClientAutocomplete`; `NewClientWithVerticalDialog`; `NewReportFlow`; `Breadcrumbs`; navbar (enlaces + dropdown "Crear"); limpieza del dashboard; render de breadcrumbs por página.
- **BACKEND-AGENT:** `getVerticalsForSelect`, `searchClients`, `createClientWithSpace`.
- **DB-AGENT:** no aplica.

### Desglose de tareas (orden sugerido)
1. **Backend:** `getVerticalsForSelect`, `searchClients`, `createClientWithSpace` en `clientes/actions.ts`.
2. **Extracción sin cambio de comportamiento:** `CreateReportForm` + `PinModal` desde `SpaceReportsClient.tsx` a `src/components/reports/`; reimportar en `SpaceReportsClient` y verificar paridad (CA-23.9).
3. **Extracción `ClientFields`** desde `ClientFormModal`.
4. `ClientAutocomplete` (Input + lista filtrada, sin `command`).
5. `NewClientWithVerticalDialog` (ClientFields + VerticalSelect + `createClientWithSpace`).
6. `NewReportFlow` (máquina de estados search→createClient→resolveSpace→reportForm→pin).
7. Navbar: quitar `+`/`QuickCreateModal`; añadir enlaces + dropdown "Crear"; borrar `QuickCreateModal.tsx`.
8. Dashboard: quitar "Nuevo espacio"; cablear las otras dos tarjetas.
9. `Breadcrumbs` + render en las 7 páginas listadas.
10. Limpieza opcional de `?openSpace`/`?openReport`.
11. `pnpm build` verde + revisión responsive 375/768/1280.

### Dependencias con otras specs
- **Cruzada con [`25-client-logo.md`](25-client-logo.md):** el campo "logo" de `ClientFields` solo es funcional con 25 implementada; si no, se omite (no rompe).
- **Provee a [`24-vertical-screen.md`](24-vertical-screen.md):** `ClientAutocomplete` y `searchClients` los reutiliza la spec 24.

---

## Tests Requeridos

### Tests de integración obligatorios
- `createClientWithSpace`: crea `client` + `client_space` en la vertical dada y devuelve `spaceId`/`spaceSlug` correctos; si la vertical ya estuviera usada por ese cliente, propaga el error de `createSpace`.
- `searchClients`: un empleado no-admin no recibe clientes de otro empleado; admin sí.
- Nuevo informe con cliente de varios espacios: el informe se crea en el `space_id` elegido (no en otro).

### Tests opcionales
- E2E: navbar → "Nuevo informe" → cliente inexistente → crear inline → informe creado y PIN mostrado.

---

## Out of Scope (Explícito)

- Filtros avanzados o paginación del autocompletar (búsqueda simple por nombre, `limit(20)`).
- Edición masiva o reasignación de espacios entre verticales.
- Rollback transaccional al cancelar el Flujo 3 (se documenta el comportamiento, no se implementa).
- Cambios en el viewer público o en el modo presentación.
- Migración de clientes existentes que pudieran no tener espacio (si los hubiera): esta spec garantiza que **a partir de ahora** no se crean clientes sin vertical; no audita ni corrige datos previos.

---

## Notas de Implementación

- **Cross-spec: la eliminación de `QuickCreateModal` rompía la pantalla de vertical.** `src/app/(panel)/verticales/[slug]/VerticalDetailClient.tsx` (territorio de la spec 24) seguía importando/usando `QuickCreateModal`, que esta spec borra. Al eliminarlo, el build fallaba por módulo inexistente. **Resolución (stopgap):** se migró el botón de esa pantalla a "Agregar cliente" usando `ClientAutocomplete` + `createSpace` + redirect a `/espacios/{id}` (conducta ya aprobada para la spec 24). El resto del rediseño de esa pantalla (logo moderado, tabla, paginación) queda para la spec 24. **Lección:** al borrar un componente compartido, listar TODOS sus consumidores en la spec antes de eliminarlo.
- **Fix de build en `ClientesClient.tsx`:** tras vaciar `handleCreate` quedó un `}` colgante (error de sintaxis) y estado `error`/`setError` muerto + un `ClientFormModal` exportado sin consumidores. Se eliminaron; la creación de cliente desde `/clientes` usa `NewClientWithVerticalDialog` (vertical obligatoria) y redirige al espacio.
- **`?openSpace=1` / `?openReport=1`:** los `useEffect` de auto-apertura en `SpacesSection.tsx` y `SpaceReportsClient.tsx` quedan dormidos (sin disparador tras eliminar `QuickCreateModal`). Se dejaron por ser inocuos; `SpacesSection` conserva su propio botón "+ Nuevo espacio" en la ficha del cliente.
- **Revisión:** REVIEW-AGENT y SECURITY-AGENT ejecutados. Seguridad APROBADA (sin CRÍTICOS/ALTOS); `searchClients` rol-aware verificado. Pendientes no bloqueantes para la spec 24: M1 (añadir `assertCanManageClient` a `getSpacesForSelect`, hoy reutilizada por el flujo de informe) y B1 (escapar wildcards `%`/`_` en el `ilike` de `searchClients`).
- **Build:** verificar `pnpm build` en entorno con toolchain Node (no disponible en la sesión de revisión).

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-04 | Versión inicial — flujos de creación y navegación. | Claude Code |
| 2.0 | 2026-06-04 | Reescritura para implementación por Gemini: inventario de artefactos verificado, firmas exactas de acciones nuevas, extracción de `CreateReportForm`/`PinModal`/`ClientFields`, autocompletar sin primitivo `command`, breadcrumbs por-página (no en layout), constraint de upload de archivo, fix de `searchClients` rol-aware. | Claude Code |
| 2.1 | 2026-06-04 | Decisiones del responsable: navbar con dos botones separados (no dropdown); nunca un cliente sin vertical → toda creación (incl. `/clientes`) usa `NewClientWithVerticalDialog` y redirige a `/espacios/{spaceId}`; edición de cliente sigue sin vertical. | Claude Code |
