# SPEC-02: Gestión de Verticales

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Los verticales representan las unidades de negocio de Immoral (immoralia, imfashion, imfilms, etc.). Son el nivel más alto de la jerarquía de contenido. Solo los administradores pueden crear, editar y eliminar verticales. Los empleados los visualizan para organizar sus espacios e informes.

---

## Actores

- **Admin:** Operaciones CRUD completas sobre verticales
- **Empleado:** Visualización de verticales disponibles
- **Sistema:** Genera slugs, gestiona logos en Storage

---

## Flujos Principales

### Flujo 1: Crear vertical (Admin)

1. El admin accede a `/admin/verticales`
2. Hace clic en "Nuevo vertical"
3. Se muestra un formulario con:
   - **Nombre** (texto, requerido) — ej: "immoralia"
   - **Color** (selector de color hexadecimal, requerido)
   - **Logo** (zona de upload por arrastre o clic, requerido — acepta PNG o SVG, máx 2MB)
4. A medida que el admin escribe el nombre, el sistema genera y muestra el slug resultante en tiempo real (ej: "Im Moralia" → `im-moralia`)
5. Si el slug ya existe: aparece aviso informando que ya existe un vertical con ese nombre y se bloquea el guardado
6. El admin sube el logo. Aparece preview antes de guardar.
7. El admin hace clic en "Guardar"
8. El servidor: (a) genera el slug desde el nombre — nunca del cliente, (b) sube el logo al bucket `vertical-logos`, (c) guarda el vertical en BD
9. El nuevo vertical aparece en la lista

### Flujo 2: Editar vertical (Admin)

1. El admin hace clic en el ícono de edición de un vertical en la lista
2. Se muestra el formulario pre-rellenado con los datos actuales
3. El nombre y el color son editables
4. El logo puede reemplazarse (el logo anterior se elimina del bucket antes de subir el nuevo)
5. El slug se muestra como solo lectura con indicación "El slug no puede modificarse"
6. Al guardar, los cambios se reflejan inmediatamente en toda la plataforma

### Flujo 3: Eliminar vertical (Admin)

1. El admin hace clic en el ícono de eliminar de un vertical
2. El sistema verifica si el vertical tiene espacios de cliente (`client_spaces`) asociados
3. Si tiene espacios: la acción se bloquea con el mensaje "Este vertical tiene [N] espacios de cliente. Elimínalos antes de continuar."
4. Si no tiene espacios: se muestra diálogo de confirmación con el nombre del vertical
5. Al confirmar: se elimina el logo del bucket y el vertical de la BD

### Flujo 4: Ver verticales — Vista Admin en dashboard

1. El admin accede al dashboard principal `/`
2. Ve todos los verticales existentes en forma de cards con: logo, nombre, badge de color, creador
3. Al hacer clic en un vertical: ve todos los espacios de cliente de ese vertical

### Flujo 5: Ver verticales — Vista Empleado en dashboard

1. El empleado accede al dashboard principal `/`
2. Ve únicamente los verticales donde tiene actividad (espacios de cliente creados por él)
3. Al hacer clic en un vertical: ve solo sus espacios en ese vertical

---

## Flujos Alternativos / Edge Cases

- **Formato no permitido:** El sistema rechaza con "Solo se aceptan archivos PNG o SVG".
- **Logo >2MB:** El sistema rechaza con "El archivo no puede superar 2MB".
- **Slug duplicado:** Se notifica en tiempo real y se bloquea el guardado.
- **Cancelar edición:** Se descartan los cambios sin persistir nada.
- **Tabla `client_spaces` aún no existe** (si se ejecuta antes de SPEC-04): el filtro del empleado usa `try/catch` y muestra la lista vacía sin error.

---

## Criterios de Aceptación

- [ ] CA-01: Solo un admin puede crear, editar y eliminar verticales
- [ ] CA-02: El formulario de creación requiere nombre, color y logo (los tres obligatorios)
- [ ] CA-03: El slug se genera automáticamente desde el nombre en tiempo real y no es editable
- [ ] CA-04: Si el slug generado ya existe, se muestra aviso y se bloquea el guardado
- [ ] CA-05: Solo se aceptan logos PNG o SVG con tamaño máximo 2MB
- [ ] CA-06: No se puede eliminar un vertical con espacios de cliente asociados
- [ ] CA-07: Al editar o eliminar, el logo antiguo se elimina físicamente del bucket `vertical-logos`
- [ ] CA-08: Los cambios se reflejan en toda la plataforma sin reinicio
- [ ] CA-09: Un empleado puede ver verticales pero no crear, editar ni eliminar ninguno
- [ ] CA-10: El admin ve el nombre del creador junto a cada vertical en el dashboard
- [ ] CA-11: `verticals` permite SELECT a todos los usuarios autenticados
- [ ] CA-12: El dashboard del empleado filtra visualmente los verticales mostrando solo aquellos donde tiene actividad

---

## Modelo de Datos

Ver SPEC-00, sección `verticals`. El bucket de Storage es `vertical-logos` (privado, creado en SPEC-SETUP).

Migración: crear tabla `verticals` con índice en `slug`.

---

## UI / Páginas Afectadas

### Páginas nuevas

| Ruta | Descripción |
|------|-------------|
| `/admin/verticales` | CRUD de verticales. Lista con cards + formulario en modal o drawer. Solo admins. |

### Páginas modificadas

| Ruta | Cambio |
|------|--------|
| `/` (dashboard) | Añadir sección de verticales — lista filtrada según rol |

### Componentes reutilizables
- `VerticalCard` — logo + nombre + badge de color + acciones (editar/eliminar)
- `VerticalForm` — formulario crear/editar dentro de un Dialog
- `ColorPicker` — input `type="color"` con preview del hex

### Breakpoints obligatorios
375px · 768px · 1280px

---

## API / Endpoints

| Tipo | Ruta / Nombre | Descripción | Auth |
|------|---------------|-------------|------|
| Server Action | `createVertical(formData)` | Crea vertical: slug generado server-side, logo subido a Storage | admin |
| Server Action | `updateVertical(id, formData)` | Actualiza nombre/color/logo; elimina logo antiguo si cambia | admin |
| Server Action | `deleteVertical(id)` | Verifica espacios, elimina logo y registro | admin |
| Server Action | `checkSlug(name)` | Verifica disponibilidad del slug antes de guardar | autenticado |

---

## Notas de Seguridad

- El slug nunca se lee del cliente — siempre se deriva del `name` con `slugify()` en el server action.
- `color_hex` se valida con `/^#[0-9A-Fa-f]{6}$/` en el servidor.
- El logo se sube al bucket privado `vertical-logos` (sin URL pública). Para mostrarlo en el cliente se genera una URL firmada o se sirve vía endpoint autenticado. **Para el MVP se usa `createSignedUrl` de Supabase con TTL de 1 hora.**
- Las operaciones de Storage (upload/delete) se hacen con `createAdminClient()` (service_role), no con el cliente autenticado del usuario.

---

## Plan de Implementación

### Arquitectura propuesta
- **DB-AGENT:** migración `verticals` + RLS + índices + regenerar tipos Supabase
- **BACKEND-AGENT:** server actions (`createVertical`, `updateVertical`, `deleteVertical`, `checkSlug`) + helper `getSignedLogoUrl`
- **FRONTEND-AGENT:** `/admin/verticales` con lista + Dialog de creación/edición + `VerticalCard`; actualizar dashboard `/` para mostrar verticales filtrados por rol

### Desglose de tareas
1. DB: migración tabla `verticals` + RLS + índice en `slug`
2. DB: regenerar `src/types/supabase.ts` con los nuevos tipos
3. BACKEND: server actions CRUD + `checkSlug` + `getSignedLogoUrl`
4. FRONTEND: `/admin/verticales` — lista de verticales + Dialog con `VerticalForm`
5. FRONTEND: `VerticalCard` con logo firmado, badge de color, acciones admin
6. FRONTEND: dashboard `/` — sección de verticales filtrada por rol

### Dependencias con otras specs
- `setup.md` ✅, `01-auth.md` ✅

---

## Tests Requeridos

### Tests de integración obligatorios
Ninguno en esta spec (la lógica de acceso seguro — Storage privado, signed URLs — se verifica en SPEC-06/07).

### Tests opcionales
- Unit test de `slugify()` con strings con acentos y caracteres especiales

---

## Out of Scope (Explícito)

- Ordenar verticales manualmente (drag & drop)
- Archivar/desactivar verticales sin eliminarlos
- Límite de número de verticales por cuenta
- Vista pública de verticales (son internos de Immoral)

---

## Notas de Implementación

> Decisiones técnicas descubiertas durante la implementación. Leer antes de modificar esta spec o las que dependen de ella.

### Joins con `profiles(full_name)`: cast `as unknown as`
Cuando Supabase devuelve un join con una tabla relacionada (ej: `profiles(full_name)` en una query de `verticals`), TypeScript infiere `profiles` como `{ full_name: any }[]` (array), no como `{ full_name: string | null } | null` (objeto). El cast directo falla; se requiere pasar por `unknown`:
```typescript
const records = data as unknown as Array<{ profiles: { full_name: string | null } | null }>;
```

### Storage: `logo_url` almacena el path relativo, no la URL completa
La columna `logo_url` guarda el path dentro del bucket (ej: `1717000000-abc.png`). Las URLs de visualización se generan en runtime con `createSignedUrl(path, 3600)` usando el admin client. **Nunca almacenar la URL firmada** — expira en 1 hora.

### Upload/delete de Storage: siempre con admin client
El bucket `vertical-logos` es privado. Las operaciones de upload y remove deben hacerse con `createAdminClient()` (service_role). El cliente del usuario autenticado no tiene permisos en este bucket.

### Slug del vertical: generado en server action, nunca leído del cliente
`createVertical` y `updateVertical` derivan el slug con `slugify(name)` en el servidor. El `FormData` no incluye el slug. El cliente muestra el slug en tiempo real (UX), pero no lo envía como campo del form.

### `window.location.reload()` tras guardar para refrescar signed URLs
Las signed URLs expiran. Tras crear/editar un vertical, el componente llama a `window.location.reload()` para forzar una nueva renderización del Server Component y obtener URLs firmadas frescas. No es ideal a largo plazo — cuando se añada ISR o invalidación de caché se revisará.

### Verificación de `client_spaces` con `try/catch`
El dashboard verifica la existencia de `client_spaces` del usuario para filtrar verticales. Cuando SPEC-03 aún no se ha ejecutado, la tabla no existe y la query lanza. El `try/catch` evita que el dashboard rompa antes de SPEC-03.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial, adaptada de SPEC-02 de propuestas | Claude Code |
| 1.1 | 2026-06-02 | Añadidas Notas de Implementación: cast unknown, storage path vs URL, upload con admin, slug server-side, reload, try/catch client_spaces | Claude Code |
