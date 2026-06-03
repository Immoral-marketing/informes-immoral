# SPEC-20: Notas de Orador ancladas ("Anotar")

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** spec de funcionalidad (implementa el botón "Anotar"; **NO** es la planificada `08-client-feedback`, que era bidireccional cliente↔empleado — ver Out of Scope)
**Prioridad:** 5 (después de [`18-report-manage-screen.md`](18-report-manage-screen.md))

---

## Descripción

Permite al empleado crear **notas internas ancladas a elementos concretos** de un informe (botón **"Anotar"** de la pantalla de gestión y panel de notas en la presentación). Las notas son **estrictamente internas**: nunca se muestran al cliente. Sirven como guion del presentador. Replica las "Notas de Orador" de propuestas. Las notas se anclan por **selector DOM** en informes **HTML** (no aplica a PDF en v1).

---

## Actores

- **Empleado creador / Admin:** crea, edita, elimina y consulta notas de un informe. **Único** actor; el cliente nunca ve ni interactúa con las notas.

---

## Flujos Principales

### Flujo 1: Crear una nota
1. En la pantalla de gestión, el empleado activa **Anotar** (el preview pasa a modo anotación: `?mode=annotate`).
2. Hace clic sobre un elemento del informe HTML; el sistema captura un **selector DOM único** de ese elemento.
3. Escribe el contenido de la nota y guarda. La nota queda anclada a ese selector y versión.

### Flujo 2: Consultar / navegar notas
1. El panel de notas lista las notas de la versión activa.
2. Al hacer clic en una nota, el preview **desplaza y resalta** el elemento anclado.

### Flujo 3: Editar / eliminar
1. El empleado edita el texto de una nota → se registra en el historial (log).
2. Elimina una nota → **soft delete** (`deleted_at`), también registrado.

### Flujo 4: Nueva versión del informe
1. Al subir una nueva versión (HTML), el sistema ofrece **copiar las notas** de la versión anterior.
2. Las notas copiadas se reanclan por selector; si el selector ya no existe en el nuevo HTML, la nota se marca **huérfana** (`is_orphan = true`) y se muestra aparte para revisión.

---

## Flujos Alternativos / Edge Cases

- **Informe PDF:** el modo Anotar **no está disponible** (las notas por selector DOM son solo para HTML). El botón Anotar se muestra deshabilitado con tooltip "Disponible solo para informes HTML".
- **Selector roto tras nueva versión:** nota marcada `is_orphan`; visible en una sección "Notas sin ancla" para que el empleado la reubique o elimine.
- **Elemento sin id/atributo estable:** el algoritmo genera un selector de ruta (`body > div:nth-child(2) > ...`); funcional aunque más frágil.
- **Concurrencia:** dos empleados editan la misma nota → última escritura gana; el log conserva el `previous_content`.

---

## Criterios de Aceptación

- [ ] **CA-20.1:** En un informe **HTML**, al activar "Anotar" y hacer clic en un elemento, se puede crear una nota anclada a ese elemento (se guarda `dom_selector` + `content` + `report_version_id`).
- [ ] **CA-20.2:** El panel de notas lista las notas de la versión activa; al hacer clic en una, el preview desplaza y resalta el elemento anclado.
- [ ] **CA-20.3:** Editar una nota registra una entrada en `report_note_logs` con `previous_content`; eliminar hace soft delete (`deleted_at`) y registra el log.
- [ ] **CA-20.4:** Al subir una nueva versión HTML, se ofrece copiar las notas; las que no reanclan quedan `is_orphan = true` y se muestran en una sección aparte.
- [ ] **CA-20.5:** Las notas **nunca** se incluyen en el contenido servido al cliente (`/api/reports/content`, viewer, magic link, presentación del espectador).
- [ ] **CA-20.6:** En informe **PDF**, "Anotar" está deshabilitado con tooltip explicativo.
- [ ] **CA-20.7:** Migración aplicada: tablas `report_notes` y `report_note_logs` con sus RLS (según AGENTS.md); tipos Supabase regenerados.
- [ ] **CA-20.8:** El `created_by` y `performed_by` se derivan **siempre** de la sesión del empleado server-side, nunca del cliente.
- [ ] **CA-20.9:** `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

### Migración nueva: `YYYYMMDDHHMMSS_create_report_notes.sql`

```sql
CREATE TYPE report_note_action AS ENUM ('created', 'updated', 'deleted', 'copied');

CREATE TABLE report_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_version_id uuid NOT NULL REFERENCES report_versions(id) ON DELETE CASCADE,
  dom_selector text NOT NULL,
  content text NOT NULL,
  is_orphan boolean NOT NULL DEFAULT false,
  copied_from_note_id uuid REFERENCES report_notes(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz DEFAULT NULL
);
CREATE INDEX idx_report_notes_version ON report_notes(report_version_id) WHERE deleted_at IS NULL;

CREATE TABLE report_note_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES report_notes(id) ON DELETE CASCADE,
  action report_note_action NOT NULL,
  previous_content text DEFAULT NULL,
  performed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  performed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE report_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_note_logs ENABLE ROW LEVEL SECURITY;
```

### RLS (según la tabla de AGENTS.md, adaptada a notas SOLO de empleado)

- **`report_notes`:**
  - SELECT: autor (empleado) ∨ creador del informe padre ∨ admin.
  - INSERT: empleado autenticado que sea creador del informe ∨ admin.
  - UPDATE: autor de la nota.
  - DELETE: (no hard delete; soft delete vía UPDATE de `deleted_at`).
- **`report_note_logs`:** SELECT mismo acceso que la nota; INSERT solo server (append-only); sin UPDATE/DELETE.

> **NOTA de divergencia con AGENTS.md:** la tabla RLS de AGENTS.md contemplaba que un *recipient con sesión activa* pudiera leer/crear notas (eso era la visión bidireccional de la planificada 08-client-feedback). En esta spec las notas son **solo de empleado** (parity con propuestas). Por tanto, **no** se conceden permisos a recipients. La variante cliente↔empleado queda fuera de alcance (futura).

Tras la migración: `npx supabase gen types typescript --project-id yyjfsoobgvotquhjkcmc > src/types/supabase.ts`.

---

## UI / Páginas Afectadas

### Páginas modificadas

- **`src/app/(panel)/informes/[id]/ReportManageClient.tsx`** — botón "Anotar" (toggle del modo anotación del preview) + `NotesPanel` lateral.
- **`src/app/(panel)/informes/[id]/presentar/PresenterClient.tsx`** (spec 19) — el panel del presentador muestra `NotesPanel` (solo lectura/guion) si hay notas.

### Componentes nuevos

- **`src/app/(panel)/informes/[id]/NotesPanel.tsx`** — lista, crea, edita, elimina notas; al clic en una nota emite `postMessage({ type:'highlight-note', selector })` al iframe.

### Breakpoints obligatorios

375px · 768px · 1280px (el panel de notas se apila bajo el preview en móvil).

---

## API / Endpoints

### Modificación de endpoint de contenido (empleado, modo anotación)

- El preview del empleado en modo anotación necesita servir el HTML con un **script capturador de clics** que devuelve el selector. Igual que la spec 19, esto requiere un endpoint que **inyecte** el script en el HTML.
  - Opción recomendada: reusar `/api/presentation/[token]/content` no aplica aquí (es para espectador). En su lugar, crear/usar un endpoint de preview de empleado que inyecte el script de anotación cuando `?mode=annotate`. P. ej. `/api/reports/[id]/preview?version=N&mode=annotate` que valida sesión de **empleado** (creador/admin), descarga el HTML y le inyecta el script capturador antes de servirlo.
  - Para `mode` normal (sin anotar), el preview sigue usando la signed URL (spec 18).

### Server actions nuevas (`src/app/(panel)/informes/[id]/notes-actions.ts`)

| Acción | Descripción | Auth |
|--------|-------------|------|
| `getNotes(reportVersionId)` | Lista notas no borradas de la versión. | creador ∨ admin |
| `createNote(reportVersionId, domSelector, content)` | Crea nota + log `created`. | creador ∨ admin |
| `updateNote(noteId, content)` | Actualiza + log `updated` con `previous_content`. | autor |
| `deleteNote(noteId)` | Soft delete + log `deleted`. | autor |
| `copyNotesFromPreviousVersion(reportId, fromVersionId, toVersionId)` | Copia notas reanclando por selector; marca huérfanas. | creador ∨ admin |
| `getNoteHistory(noteId)` | Devuelve los logs de la nota. | creador ∨ admin |

### Bridge de anotación (inyectado en el HTML del preview, `mode=annotate`)
- En `click`: calcula un **selector único** del elemento (preferir `#id` o `[data-*]`, si no, ruta `nth-child`) → `parent.postMessage({ type:'annotate-target', selector })`.
- En `message` con `{ type:'highlight-note', selector }`: hace `scrollIntoView` + aplica un resaltado temporal al elemento.

---

## Notas de Seguridad

- **Aislamiento total del cliente:** las notas no se sirven jamás en el contenido del informe del cliente (viewer, magic link, presentación del espectador). El script de anotación solo se inyecta en el **preview del empleado** (`mode=annotate`), nunca en `/api/reports/content` ni en `/api/presentation/[token]/content`.
- **Autoría server-side:** `created_by`/`performed_by` derivados de la sesión del empleado; nunca confiar en valores del cliente.
- **RLS activas** en `report_notes` y `report_note_logs`; recipients sin acceso.
- **Log append-only:** `report_note_logs` no admite UPDATE/DELETE.
- **SECURITY-AGENT** verifica que el contenido del cliente no contenga notas y que la inyección del script de anotación esté restringida al preview autenticado.

---

## Plan de Implementación

### Arquitectura propuesta

- **DB-AGENT:** migración de tablas + RLS + tipos.
- **BACKEND-AGENT:** server actions de notas + endpoint de preview con inyección de script de anotación.
- **FRONTEND-AGENT:** `NotesPanel`, integración en gestión y en presentación, bridge de anotación.

### Desglose de tareas

1. Migración `report_notes` + `report_note_logs` + enum + RLS; regenerar tipos.
2. Endpoint de preview de empleado con inyección de script (`?mode=annotate`).
3. Bridge de anotación (captura selector / resalta).
4. Server actions (`getNotes`, `createNote`, `updateNote`, `deleteNote`, `copyNotesFromPreviousVersion`, `getNoteHistory`).
5. `NotesPanel` + integración en `ReportManageClient` (toggle Anotar) y `PresenterClient` (guion).
6. Enganche de `copyNotesFromPreviousVersion` al subir nueva versión (spec 18).
7. `pnpm build` verde + responsive.

### Dependencias con otras specs

- **Entrante:** [`18`](18-report-manage-screen.md) (host del botón Anotar y del preview). 
- **Cruzada:** [`19`](19-presentation-mode.md) (el panel del presentador muestra las notas como guion).

---

## Tests Requeridos

### Tests de integración obligatorios

- `createNote`/`updateNote`/`deleteNote` escriben los logs correctos y respetan autoría server-side.
- El contenido servido al cliente (`/api/reports/content`) **no** contiene notas ni el script de anotación.
- Un recipient no puede leer ni crear notas (RLS).

### Tests opcionales

- `copyNotesFromPreviousVersion` marca huérfanas correctamente cuando el selector no existe.

---

## Out of Scope (Explícito)

- **Comentarios bidireccionales cliente↔empleado** (la visión original de `08-client-feedback`): NO se implementa aquí. Las notas son solo internas. Queda como spec futura si se desea feedback del cliente.
- **Anotaciones en PDF:** solo HTML en v1.
- Notificaciones por nota.
- Resolución/estado de hilos (no hay "resuelto"; son notas planas con historial).
- Tiempo real en la creación de notas (se recargan vía server action, como propuestas).

---

## Notas de Implementación

- **Patrón propuestas confirmado:** notas internas ancladas por `dom_selector`, `is_orphan` para selectores rotos, `copied_from_note_id` al copiar entre versiones, log de acciones; sin Realtime; nunca visibles al cliente.
- **Anclaje:** preferir selectores estables (`#id`, `[data-*]`) antes que rutas `nth-child`.
- **Inyección de script:** mismo enfoque que la spec 19 (descargar HTML del Storage e inyectar `<script>` antes de `</body>`), pero el script de anotación solo en el preview autenticado del empleado.
- **Detección de huérfanas (perezosa):** `copyNotesFromPreviousVersion` copia todas las notas tal cual (no parsea HTML server-side). La marca `is_orphan` se establece **del lado cliente**: cuando el `NotesPanel` carga e intenta resolver cada `dom_selector` en el iframe y el elemento no existe, llama a una server action ligera para marcar la nota `is_orphan = true`. Evita parseo de DOM en servidor.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Notas de orador internas ancladas por selector DOM (HTML), con historial y copia entre versiones. | Claude Code |
