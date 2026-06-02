# SPEC-04: Espacios de Cliente

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Un espacio vincula a un cliente con un vertical. Agrupa todos los informes de ese cliente dentro de esa línea de negocio. El slug del espacio forma la primera parte de la URL pública de cada informe (`informes.immoral.es/[space-slug]/[report-slug]`). El slug es inmutable tras el primer guardado y se genera automáticamente desde el nombre del cliente.

Un cliente no puede tener dos espacios en el mismo vertical.

---

## Actores

- **Empleado / Admin:** Crea y elimina espacios de cliente
- **Sistema:** Genera slugs, valida unicidad global, controla colisiones con rutas reservadas y verticales

---

## Flujos Principales

### Flujo 1: Crear espacio de cliente

1. Desde la página de detalle de un cliente (`/clientes/[id]`), sección "Espacios", el empleado hace clic en "Nuevo espacio"
2. Se muestra un formulario con:
   - **Vertical** (selector con los verticales disponibles, requerido)
   - Preview del slug resultante: `informes.immoral.es/[slug generado desde el nombre del cliente]/...`
3. Advertencia visible: "El slug no podrá modificarse. La URL de los informes de este cliente comenzará por: `informes.immoral.es/[slug]/`"
4. Si el slug ya existe globalmente (otro espacio con el mismo nombre de cliente): el sistema sugiere una variante añadiendo un sufijo numérico (ej: `selvatico-2`)
5. Si el slug colisiona con una ruta reservada del sistema: el sistema bloquea con mensaje descriptivo
6. Si el cliente ya tiene un espacio en el vertical seleccionado: el sistema bloquea con "Este cliente ya tiene un espacio en [vertical]"
7. Al confirmar: el espacio queda creado con el slug derivado del nombre del cliente

### Flujo 2: Eliminar espacio de cliente

1. El empleado hace clic en "Eliminar" junto al espacio
2. El sistema verifica si el espacio tiene informes (`reports`) asociados
3. Si tiene informes: la acción se bloquea con "Este espacio tiene [N] informe(s). Elimínalos antes de continuar."
4. Si no tiene informes: diálogo de confirmación
5. Al confirmar: se elimina el espacio

### Flujo 3: Navegar al espacio

1. En la página del cliente, el empleado hace clic en un espacio
2. Va a `/espacios/[id]` donde ve el espacio y la lista de informes (placeholder hasta SPEC-05)

### Flujo 4: Visibilidad según rol

- **Empleado:** ve los espacios de los clientes que él creó
- **Admin:** ve todos los espacios de todos los clientes

---

## Flujos Alternativos / Edge Cases

- **Slug duplicado:** el sistema añade sufijo `-2`, `-3`... hasta encontrar uno libre. El usuario ve el slug final antes de confirmar.
- **Slug reservado** (`admin`, `login`, `auth`, `api`, `clientes`, `espacios`, `_next`): bloqueado con mensaje.
- **Slug colisiona con un vertical existente:** bloqueado — un slug de espacio no puede coincidir con un slug de vertical (ambos comparten el primer segmento de URL del panel).
- **Cliente ya tiene espacio en ese vertical:** bloqueado con "Este cliente ya tiene un espacio en [vertical]."

---

## Criterios de Aceptación

- [ ] CA-01: El slug se genera desde el nombre del cliente y no es editable por el usuario
- [ ] CA-02: El slug es único a nivel global (no solo dentro del cliente)
- [ ] CA-03: Se muestra advertencia sobre la inmutabilidad del slug con preview de la URL base antes de guardar
- [ ] CA-04: Si el slug colisiona, el sistema sugiere automáticamente una variante con sufijo numérico
- [ ] CA-05: El sistema bloquea slugs que coincidan con rutas reservadas del sistema
- [ ] CA-06: El sistema bloquea slugs que coincidan con slugs de verticales existentes
- [ ] CA-07: Un cliente no puede tener dos espacios en el mismo vertical
- [ ] CA-08: No se puede eliminar un espacio que tenga informes
- [ ] CA-09: Un empleado ve solo los espacios de sus clientes; un admin ve todos

---

## Modelo de Datos

Ver SPEC-00, sección `client_spaces`.

Migración: tabla `client_spaces` con `UNIQUE(client_id, vertical_id)` y `UNIQUE(slug)`.

---

## UI / Páginas Afectadas

### Páginas modificadas

| Ruta | Cambio |
|------|--------|
| `/clientes/[id]` | Reemplazar el placeholder de espacios por la lista real + botón "Nuevo espacio" |

### Páginas nuevas

| Ruta | Descripción |
|------|-------------|
| `/espacios/[id]` | Detalle del espacio: info (cliente, vertical, slug) + lista de informes (placeholder hasta SPEC-05) |

### Breakpoints obligatorios
375px · 768px · 1280px

---

## API / Endpoints

| Tipo | Nombre | Descripción | Auth |
|------|--------|-------------|------|
| Server Action | `createSpace(clientId, verticalId)` | Genera slug, verifica colisiones, crea espacio | creador del cliente ∨ admin |
| Server Action | `deleteSpace(spaceId)` | Verifica informes, elimina | creador del cliente ∨ admin |

---

## Notas de Seguridad

- El slug se genera siempre en el servidor desde `clients.name` con `slugify()`. No se acepta slug del cliente.
- La verificación de unicidad global usa `createAdminClient()` para ver todos los slugs independientemente de RLS.
- La verificación de "ya existe espacio en este vertical" usa el admin client para cubrir espacios de otros empleados.

---

## Plan de Implementación

### Arquitectura propuesta
- **DB-AGENT:** migración `client_spaces` + RLS + índices + regenerar tipos
- **BACKEND-AGENT:** `createSpace`, `deleteSpace` + helper `resolveSlug` (genera slug sin colisión)
- **FRONTEND-AGENT:** actualizar `/clientes/[id]` (sección espacios) + página `/espacios/[id]`

### Desglose de tareas
1. DB: migración `client_spaces` + RLS
2. DB: regenerar tipos
3. BACKEND: `resolveSlug` + `createSpace` + `deleteSpace`
4. FRONTEND: sección espacios en `/clientes/[id]` — lista + form
5. FRONTEND: página `/espacios/[id]` — detalle + placeholder informes
6. FRONTEND: dashboard `/` — cards de vertical con link a espacios

### Dependencias
- `01-auth` ✅, `02-verticals` ✅, `03-clients-and-recipients` ✅

---

## Tests Requeridos

Ninguno obligatorio (ver PROJECT-CONSTITUTION.md).

---

## Out of Scope

- Editar espacio (el slug es inmutable; el cliente y el vertical se cambian eliminando y recreando)
- Mover informes entre espacios
- Listar informes en el espacio (SPEC-05)

---

## Notas de Implementación

### `resolveSlug`: bucle con límite de 99 variantes
Si el slug base ya existe, el helper añade sufijo numérico (`-2`, `-3`...) hasta encontrar uno libre, con tope en 99. Si se llega a 99 colisiones se devuelve error (caso extremadamente improbable en uso real).

### Verificación de slug contra verticales: necesaria por el routing del viewer
La URL pública `informes.immoral.es/[space-slug]/[report-slug]` comparte el primer segmento con los slugs de verticales del panel. Si un space tuviera el mismo slug que un vertical, el proxy.ts no podría distinguirlos. `resolveSlug` siempre verifica contra `verticals.slug` antes de aceptar.

### `reports` puede no existir (SPEC-05 pendiente)
`deleteSpace` consulta la tabla `reports`. Si SPEC-05 aún no se ha ejecutado, la query lanza. Añadir `try/catch` si se ejecuta SPEC-04 antes de SPEC-05.

### `useState` con callback no ejecuta el efecto — usar `useEffect` para el preview de slug
En `NewSpaceModal`, el preview de slug se carga con `useState(() => { ... })` (patrón de lazy init). Esto ejecuta la función **síncronamente en el render**, no como efecto. Para llamadas async funciona porque se lanza la Promise en el render pero no espera — el estado se actualiza cuando la Promise resuelve. Es un patrón válido pero revisar si Next.js 16 lo advierte; si aparece warning, migrar a `useEffect`.

### `SpacesSection` recibe `verticals` filtrados del server — no recarga al crear
Al crear un espacio, `SpacesSection` actualiza el estado local (`setSpaces`) y llama `router.refresh()` para revalidar el server component padre. Los verticales disponibles se recargan en esa revalidación.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial | Claude Code |
| 1.1 | 2026-06-02 | Añadidas Notas de Implementación: resolveSlug bucle, colisión con verticales, reports try/catch, useState lazy vs useEffect, refresh | Claude Code |
