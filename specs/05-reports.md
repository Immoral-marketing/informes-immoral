# SPEC-05: Creación y Gestión de Informes

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Los informes son el núcleo del sistema. Un empleado sube un documento principal (PDF o HTML) a un espacio de cliente, el sistema genera un PIN de 4 dígitos y una URL protegida. Los informes mantienen historial de versiones. Se pueden añadir adjuntos descargables independientemente del versionado del documento principal.

---

## Actores

- **Empleado / Admin:** Crea y gestiona informes en los espacios de sus clientes
- **Sistema:** Genera PIN, slug, almacena documentos en Storage, gestiona versiones

---

## Flujos Principales

### Flujo 1: Crear informe nuevo

1. Desde `/espacios/[id]`, el empleado hace clic en "Nuevo informe"
2. Se muestra formulario con:
   - **Nombre** (texto, requerido) — ej: "Informe Mensual Junio 2026"
   - **Slug** (generado automáticamente desde el nombre, visible en tiempo real, editable antes del primer guardado)
   - Advertencia permanente: "El slug no podrá modificarse. La URL del informe será: `informes.immoral.es/[space-slug]/[report-slug]`"
   - **Documento principal** (zona de upload, requerido — acepta PDF o HTML, máx 50MB)
   - **Enviar automáticamente al publicar** (checkbox, por defecto desmarcado)
3. Si el slug ya existe dentro del mismo espacio: aviso en tiempo real y guardado bloqueado
4. El empleado sube el documento principal
5. Preview del documento antes de guardar:
   - PDF: visor PDF.js integrado con paginación
   - HTML: iframe cargando el archivo localmente
6. Al hacer clic en "Guardar":
   - El documento se sube al bucket `report-documents`
   - Se genera un PIN de 4 dígitos aleatorio criptográficamente seguro
   - El PIN se hashea con bcrypt (cost 12) — nunca en texto plano
   - El PIN se muestra al empleado una única vez con instrucción: "Comparte este PIN con tu cliente. No volverá a mostrarse."
   - Si `auto_send_on_publish` está marcado: se envía el magic link al destinatario primario del cliente (ver SPEC-07)
   - El informe queda creado con `current_version = 1`

### Flujo 2: Ver lista de informes en el espacio

1. En `/espacios/[id]`, el empleado ve la lista de informes del espacio
2. Cada informe muestra: nombre, slug, versión activa, fecha de creación, formato del documento
3. Al hacer clic en un informe: va al panel de gestión del informe

### Flujo 3: Panel de gestión del informe

1. El empleado accede al panel del informe (`/informes/[id]`)
2. Ve en la parte superior:
   - Nombre del informe
   - URL completa (con botón de copiar)
   - Versión activa
   - Formato (PDF o HTML)
3. Sección de **Historial de versiones**:
   - Lista de versiones (v1, v2...) con fecha, autor, formato
   - Badge "Activa" en la versión actual
   - Al hacer clic en una versión: preview de esa versión (PDF.js o iframe)
   - Botón "Subir nueva versión"
4. Sección de **Adjuntos**:
   - Lista de adjuntos con nombre, tamaño, tipo
   - Botón "Añadir adjunto"
5. Sección de **Acceso**:
   - Botón "Regenerar PIN" (con advertencia)
   - Botón "Enviar al cliente" → abre panel de envío magic link (SPEC-07)

### Flujo 4: Subir nueva versión

1. El empleado hace clic en "Subir nueva versión"
2. Aparece zona de upload (mismos requisitos que en creación)
3. Preview del nuevo documento antes de confirmar
4. Al confirmar:
   - El nuevo documento se sube como `version_number = N+1`
   - Pasa a ser la versión activa (`current_version = N+1`)
   - Las versiones anteriores se conservan
   - Si `auto_send_on_publish` está marcado: se envía magic link al destinatario primario (SPEC-07)
   - El slug, PIN y URL no cambian

### Flujo 5: Gestión de adjuntos

1. El empleado hace clic en "Añadir adjunto"
2. Selecciona un archivo (cualquier formato, máx 50MB)
3. El sistema muestra el nombre del archivo y su tamaño antes de subir
4. Al confirmar: el adjunto se sube al bucket `report-attachments`
5. El adjunto aparece en la lista ordenado por fecha de subida
6. El empleado puede eliminar un adjunto en cualquier momento (se elimina del bucket)

### Flujo 6: Regenerar PIN

1. El empleado hace clic en "Regenerar PIN"
2. Diálogo de advertencia: "Regenerar el PIN invalidará todas las sesiones activas y magic links pendientes de este informe. El cliente necesitará el nuevo PIN o un nuevo magic link para acceder."
3. Al confirmar:
   - Nuevo PIN de 4 dígitos generado criptográficamente
   - `pin_hash` y `pin_updated_at` actualizados en BD
   - Todos los registros de `report_sessions` del informe se eliminan
   - Todos los tokens de `magic_link_tokens` del informe con `consumed_at = NULL` se marcan como expirados (o se eliminan)
   - El nuevo PIN se muestra una única vez
4. El PIN anterior queda completamente inutilizable

### Flujo 7: Eliminar informe

1. El empleado hace clic en "Eliminar informe" en el panel de gestión
2. Diálogo de confirmación con el nombre del informe
3. Al confirmar:
   - Se eliminan todos los documentos de versiones del bucket `report-documents`
   - Se eliminan todos los adjuntos del bucket `report-attachments`
   - Se elimina el informe y todos sus registros relacionados (cascada en BD)

---

## Flujos Alternativos / Edge Cases

- **Formato no admitido:** El sistema rechaza con "Solo se aceptan archivos PDF o HTML".
- **Archivo >50MB:** Rechazado con "El archivo no puede superar 50MB".
- **Slug duplicado dentro del espacio:** Aviso en tiempo real, guardado bloqueado.
- **Espacio sin destinatario primario y auto_send_on_publish marcado:** El informe se crea correctamente pero no se envía magic link (sin destinatario primario no hay a quién enviar). El empleado ve un aviso: "Auto-envío activado pero el cliente no tiene destinatario primario. Añade uno en [enlace al cliente]."
- **HTML con referencias externas:** Se acepta y renderiza normalmente en el iframe.
- **Eliminar informe con sesiones activas:** Las sesiones se eliminan en cascada — el acceso cesa inmediatamente.

---

## Criterios de Aceptación

- [ ] CA-01: Solo se aceptan archivos PDF o HTML, máx 50MB
- [ ] CA-02: El slug se genera en tiempo real desde el nombre; es editable antes del primer guardado y no editable después
- [ ] CA-03: Se muestra advertencia sobre la inmutabilidad del slug con la URL completa antes de guardar
- [ ] CA-04: Si el slug ya existe en el mismo espacio, se muestra aviso y se bloquea el guardado
- [ ] CA-04b: El nombre del informe debe ser único dentro del mismo espacio (case-insensitive). Si ya existe un informe con ese nombre en el espacio, se muestra aviso y se bloquea el guardado. El nombre no puede modificarse tras el primer guardado.
- [ ] CA-05: El PIN de 4 dígitos se muestra solo en el momento de creación y regeneración
- [ ] CA-06: El PIN se almacena como hash bcrypt (cost ≥ 12), nunca en texto plano
- [ ] CA-07: Preview del documento disponible antes de guardar (PDF.js para PDF, iframe para HTML)
- [ ] CA-08: "Subir nueva versión" no modifica el slug, el PIN ni la URL del informe
- [ ] CA-09: Al subir una nueva versión, la versión anterior se conserva en el historial y en Storage
- [ ] CA-10: Los adjuntos se pueden añadir y eliminar independientemente de las versiones
- [ ] CA-11: "Regenerar PIN" invalida todas las sesiones activas y magic links pendientes del informe
- [ ] CA-12: El nuevo PIN tras regeneración se muestra una única vez
- [ ] CA-13: Eliminar un informe elimina todos sus archivos del Storage
- [ ] CA-14: Si `auto_send_on_publish` está marcado y hay destinatario primario, se envía magic link al crear o actualizar versión
- [ ] CA-15: Si `auto_send_on_publish` está marcado pero no hay destinatario primario, el informe se crea correctamente con aviso visible

---

## Modelo de Datos

Ver SPEC-00, secciones `reports`, `report_versions`, `report_attachments`.

Migración: tablas `reports` + `report_versions` + `report_attachments`.

---

## UI / Páginas Afectadas

### Páginas modificadas

| Ruta | Cambio |
|------|--------|
| `/espacios/[id]` | Reemplazar placeholder con lista real de informes + botón "Nuevo informe" |

### Páginas nuevas

| Ruta | Descripción |
|------|-------------|
| `/informes/[id]` | Panel de gestión: info, historial de versiones, adjuntos, acceso (PIN, send) |

### Componentes reutilizables
- `ReportCard` — nombre, slug, versión, formato, fecha
- `VersionHistory` — lista de versiones con preview al clic
- `AttachmentList` — lista de adjuntos con add/delete
- `PinModal` — muestra el PIN una sola vez tras crear/regenerar
- `DocumentUpload` — zona de arrastre + preview (PDF.js o iframe)
- `DocumentPreview` — visor PDF.js / iframe según formato

### Breakpoints obligatorios
375px · 768px · 1280px

---

## API / Endpoints

| Tipo | Nombre | Descripción | Auth |
|------|--------|-------------|------|
| Server Action | `createReport(spaceId, formData)` | Crea informe: sube doc, genera PIN, auto-send si aplica | autenticado |
| Server Action | `addVersion(reportId, formData)` | Sube nueva versión; auto-send si aplica | creador ∨ admin |
| Server Action | `addAttachment(reportId, formData)` | Sube adjunto al bucket | creador ∨ admin |
| Server Action | `deleteAttachment(attachmentId, reportId)` | Elimina adjunto de BD y Storage | creador ∨ admin |
| Server Action | `regeneratePin(reportId)` | Nuevo PIN + invalida sesiones y magic links | creador ∨ admin |
| Server Action | `deleteReport(reportId)` | Elimina informe + Storage en cascada | creador ∨ admin |
| GET | `/api/reports/content` | Sirve contenido del informe (SPEC-06) | sesión cliente |

---

## Notas de Seguridad

- El slug de informe se sanitiza en el servidor con `slugify()`. No se acepta del cliente.
- El PIN se genera con `crypto.getRandomValues()` (criptográficamente seguro), nunca con `Math.random()`.
- El PIN hasheado con bcrypt cost ≥ 12. Nunca en texto plano en BD, logs ni respuestas de API.
- Los documentos del informe se almacenan en el bucket privado `report-documents`. Ninguna URL pública directa.
- Los adjuntos se almacenan en `report-attachments`, también privado. Descarga siempre vía endpoint autenticado (SPEC-06).
- Scope de sesión: el token de sesión está scoped a un `report_id`. Una sesión de un informe no da acceso a otro.

---

## Plan de Implementación

### Arquitectura propuesta
- **DB-AGENT:** migración `reports` + `report_versions` + `report_attachments` + RLS + regenerar tipos
- **BACKEND-AGENT:** server actions CRUD + `generatePin()` + lógica de auto-send (integra SPEC-07 cuando esté disponible)
- **FRONTEND-AGENT:** lista en `/espacios/[id]`, formulario creación, panel `/informes/[id]` con versiones + adjuntos + acceso

### Desglose de tareas
1. DB: migración + RLS + índices
2. DB: regenerar tipos
3. BACKEND: `generatePin()` + `createReport` + `addVersion` + `deleteReport`
4. BACKEND: `addAttachment` + `deleteAttachment`
5. BACKEND: `regeneratePin`
6. FRONTEND: lista informes en `/espacios/[id]` + `ReportCard`
7. FRONTEND: formulario creación con `DocumentUpload` + `DocumentPreview` + `PinModal`
8. FRONTEND: `/informes/[id]` — `VersionHistory` + `AttachmentList` + sección acceso
9. FRONTEND: actualizar Navbar con acceso a informes si aplica

### Dependencias
- `01-auth` ✅, `02-verticals` ✅, `03-clients-and-recipients` ✅, `04-client-spaces` ✅

---

## Tests Requeridos

### Tests de integración obligatorios (ver PROJECT-CONSTITUTION.md)
- `regeneratePin`: verificar que las sesiones activas se eliminan y el PIN anterior deja de funcionar
- `createReport` con `auto_send_on_publish = true` sin destinatario primario: el informe se crea, no se lanza error, se devuelve aviso

---

## Out of Scope (Explícito)

- Visor del cliente (SPEC-06)
- Envío real de magic links (SPEC-07 — el botón "Enviar" en el panel abre el flujo definido en SPEC-07)
- Conversión PPTX/Keynote → PDF
- Google Slides / Canva embebidos
- Estado del informe desde el cliente (aceptado/rechazado — informes es solo lectura para el cliente)
- Analytics de vistas
- Editar el nombre del informe después de guardarlo — el nombre es inmutable tras el primer guardado (igual que el slug). Si necesitan otro nombre, crean un nuevo informe.
- Reordenar adjuntos (orden fijo por fecha de subida en MVP)

---

## Notas de Implementación

### `exactOptionalPropertyTypes`: usar `prop: string | undefined` en lugar de `prop?: string` para estados y props con valores opcionales
Con `exactOptionalPropertyTypes: true`, pasar `string | undefined` a un prop tipado como `prop?: string` es un error. La solución estándar en todo el proyecto: tipar explícitamente como `prop: string | undefined` en interfaces de componentes que reciben valores opcionales que pueden ser `undefined`.

### `generatePin()` usa `crypto.getRandomValues()` (no `Math.random()`)
El PIN se genera con `Uint32Array` + `crypto.getRandomValues()` en Node.js (disponible como global en Next.js server actions). El módulo `crypto` de Node.js no requiere import explícito en el contexto de server actions de Next.js 16.

### `assertCanManageReport` devuelve `report` con campos limitados
La query de `assertCanManageReport` solo selecciona `created_by` y `space_id`. Si una acción posterior necesita más campos del report (ej: `current_version`), debe hacer una segunda query en la misma acción. Ver `addVersion`.

### Auto-send en SPEC-05 es un placeholder para SPEC-07
Las server actions `createReport` y `addVersion` tienen un comentario `// SPEC-07: sendMagicLinkToPrimary(reportId)`. Cuando SPEC-07 esté implementada, se llama aquí. Por ahora, el toggle se guarda en BD pero no activa ningún envío.

### Preview del documento: iframe con `objectURL` en el cliente
El preview antes de guardar usa `URL.createObjectURL(file)` para generar una URL temporal del archivo seleccionado y renderizarla en un iframe. Esta URL es local al navegador y desaparece al cerrar el modal. No hay upload previo al preview.

### `delete_report` limpia Storage después de borrar BD
El orden es: primero borrar el registro (que en cascada borra versiones y adjuntos), luego borrar los archivos del Storage. Si el Storage falla, los archivos quedan huérfanos (no crítico, se pueden limpiar manualmente). No se hace al revés (borrar Storage primero) porque si la BD falla, el informe queda sin archivos pero con el registro.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial | Claude Code |
| 1.1 | 2026-06-02 | Añadido CA-04b (unicidad de nombre). Name inmutable tras guardar. | Claude Code |
| 1.2 | 2026-06-02 | Añadidas Notas de Implementación: exactOptionalPropertyTypes, generatePin, assertCanManageReport, auto-send placeholder, preview objectURL, delete order | Claude Code |
