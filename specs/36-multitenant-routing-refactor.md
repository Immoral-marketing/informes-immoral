# SPEC-36: Refactor de Enrutamiento y Portales Multitenant v2

**Fase:** 5
**Estado:** aprobada
**Prerequisito hard:** SPEC-35 (migración de BD completada, tipos regenerados, `namespace_slug` poblado)
**Impacto en specs:** SPEC-04 (deprecada — UI eliminada), SPEC-05 (creación de informe actualizada), SPEC-07 (magic link), SPEC-33 (portal), SPEC-22 (fixes de sesión)

---

## 1. Objetivo

Migrar todo el código que depende de `client_spaces` y `space_id` al nuevo modelo donde el namespace es `report_namespaces.slug`. Comprende el routing público, el portal de cliente unificado, el panel de empleados y la limpieza final de columnas y tablas legacy.

---

## 2. Tipos de namespace y comportamiento diferencial

| Tipo namespace | URL pública | Acceso | Portal |
|----------------|-------------|--------|--------|
| `client` | `/{client-slug}/{report-slug}` | PIN obligatorio (pin_hash NOT NULL) | Sí: `/{client-slug}/portal` |
| `vertical` (dossier) | `/{vertical-slug}/{dossier-slug}` | Libre si `pin_hash IS NULL`; PIN si no | No (404) |

---

## 3. Routing — resolución de `[space]`

### 3.1 Lookup principal

La función que actualmente resuelve `client_spaces WHERE slug = params.space` pasa a:

```
report_namespaces WHERE slug = params.space → obtener entity_type + client_id/vertical_id
→ reports WHERE namespace_slug = params.space AND slug = params.slug
```

### 3.2 Fallback 301 para slugs legacy

Si `params.space` no existe en `report_namespaces`:
1. Buscar en `client_spaces WHERE slug = params.space`
2. Si existe → obtener `clients.slug` del cliente dueño → redirect 301 permanente a `/{clients.slug}/{params.slug}`
3. Si tampoco existe → 404

### 3.3 Viewer (`[space]/[slug]/page.tsx`)

**Para namespace tipo `client`:**
- Comportamiento idéntico al actual
- Requiere sesión válida (PIN o magic link o portal_session)
- Muestra enlace al portal: `/{client-slug}/portal`
- Sesión de portal scoped por `namespace_slug`

**Para namespace tipo `vertical` (dossier):**
- Si `pin_hash IS NULL` → renderizar contenido directamente sin modal de acceso (`sessionValid = true` sin validar cookie)
- Si `pin_hash IS NOT NULL` → flujo PIN estándar
- No mostrar enlace al portal
- No crear `portal_session` al consumir magic link (no aplica)
- No mostrar co-branding de cliente (no hay cliente)

### 3.4 Consumo de magic link (`[space]/[slug]/r/[token]/route.ts`)

- Para namespace tipo `client`: comportamiento actual. Al crear `report_session`, también crear `portal_session` con `namespace_slug` (en lugar de `space_id`)
- Para namespace tipo `vertical`: crear `report_session` solo. No crear `portal_session`.

---

## 4. Sesiones — migración de `space_id` a `namespace_slug`

### 4.1 `portal_sessions`

Toda lectura y escritura de `portal_sessions` usa `namespace_slug` en lugar de `space_id`. El campo `space_id` se elimina en la fase de cleanup (sección 8).

### 4.2 `space_access_tokens`

Ídem: `namespace_slug` reemplaza `space_id`.

### 4.3 Validación `hasValidPortalSession`

```
portal_sessions WHERE session_token_hash = hash AND namespace_slug = <namespace actual> AND expires_at > now()
```

Solo aplica a namespaces tipo `client`. Para tipo `vertical`: devolver false siempre (los dossiers no tienen portal).

---

## 5. Portal de cliente unificado

### 5.1 URL y acceso

- URL: `/{client-slug}/portal`
- Si el namespace no existe o es tipo `vertical`: devolver 404
- Requiere sesión de portal válida (cookie `portal_session`)

### 5.2 Contenido

- Lista **todos los informes del cliente** donde `reports.namespace_slug = clients.slug`
- Sin agrupar por vertical (lista plana)
- Columna "Vertical" visible: `reports.vertical_id → verticals.name` (vacío si null)
- Ordenados por `updated_at DESC`
- Solo informes con `current_version IS NOT NULL` (publicados)

### 5.3 Token de portal

- `generateAndSendPortalLink` recibe `namespace_slug` en lugar de `space_id`/`space_slug`
- Inserta en `space_access_tokens` con `namespace_slug`
- URL del email: `/{namespace_slug}/portal/r/{token}` (sin cambios estructurales)

---

## 6. Panel de empleados — Vista de cliente (`/clientes/[id]`)

### 6.1 Eliminar sección "Espacios de cliente"

- Eliminar la UI de `client_spaces`: crear/editar/ver espacios
- No se puede crear un espacio nuevo (la funcionalidad deja de existir en UI)

### 6.2 Lista unificada de informes

- Mostrar todos los informes del cliente: `reports WHERE namespace_slug = clients.slug`
- Columna "Vertical" en la tabla (desde `reports.vertical_id → verticals.name`, vacío si null)
- Columna "Estado", "Versión", "Fecha" (igual que antes)
- CTA "Nuevo informe" sin paso intermedio de "seleccionar espacio"

### 6.3 Creación de informe para un cliente

Al crear un informe desde esta vista:
- `namespace_slug` = `clients.slug` del cliente actual
- Campo "Vertical" opcional: selector dropdown de verticales existentes → guarda en `reports.vertical_id`
- PIN requerido (no puede ser null para informes de cliente)
- Si la vertical seleccionada no tiene fila en `report_namespaces`, **no** crearla aquí (la vertical solo obtiene namespace cuando se crea un dossier, no cuando se usa como tag)

---

## 7. Panel de empleados — Dossiers de vertical

### 7.1 Pantalla de vertical (`/admin/verticales/[slug]` o equivalente)

- Añadir sección "Dossiers" debajo del contenido existente
- Lista los informes donde `namespace_slug = verticals.slug`
- Columnas: nombre, slug, versión actual, acceso (libre/PIN), fecha
- CTA "Nuevo dossier"

### 7.2 Creación de dossier

Al crear un dossier:
- `namespace_slug` = `verticals.slug` de la vertical actual
- `reports.vertical_id` = id de esa vertical (misma que el namespace)
- No hay campo "cliente"
- PIN opcional: si se deja vacío → `pin_hash = NULL` (acceso libre con URL)
- Si se introduce PIN → bcrypt cost 12, comportamiento estándar
- Si la vertical no tiene fila en `report_namespaces`, insertarla antes de crear el informe usando `createAdminClient()`:
  ```
  INSERT INTO report_namespaces (slug, entity_type, vertical_id) VALUES (vertical.slug, 'vertical', vertical.id)
  ON CONFLICT DO NOTHING
  ```

---

## 8. Dashboard — filtro por vertical

- El dashboard de empleados (`/`) puede filtrar informes por vertical
- Filtro actúa sobre `reports.vertical_id`: muestra todos los informes con esa vertical, independientemente del cliente o si es dossier
- Al seleccionar una vertical, aparecen informes de múltiples clientes + dossiers de esa vertical

---

## 9. API routes — actualización

| Archivo | Cambio |
|---------|--------|
| `src/app/api/reports/verify/route.ts` | `portal_sessions`: escribir `namespace_slug`, no `space_id` |
| `src/app/api/reports/content/route.ts` | Validar sesión con `namespace_slug`; para dossiers sin PIN, servir sin sesión |
| `src/app/api/reports/attachments/[id]/route.ts` | Ídem |
| `src/app/api/reports/request-magic-link/route.ts` | Obtener `namespace_slug` desde report; construir URL |
| `src/app/api/portal/request-access/[space]/route.ts` | Resolver contra `report_namespaces`, usar `namespace_slug` |

---

## 10. Cleanup final (último paso, después de verificar CA-01 a CA-16)

Una vez que todo el código migra a `namespace_slug` y `pnpm build` está en verde:

```sql
-- Migración: 20260617000002_multitenant_v2_cleanup.sql
ALTER TABLE reports              DROP COLUMN space_id;
ALTER TABLE portal_sessions      DROP COLUMN space_id;
ALTER TABLE space_access_tokens  DROP COLUMN space_id;

DROP TABLE client_spaces CASCADE;
```

Después del cleanup: regenerar tipos.

```bash
npx supabase gen types typescript --project-id yyjfsoobgvotquhjkcmc > src/types/supabase.ts
```

> El DROP de `client_spaces` es irreversible. Verificar que los 301 redirects del punto 3.2 ya no necesitan la tabla (o exportar los datos a un archivo CSV antes de borrar).

---

## 11. Criterios de aceptación

### Routing
- CA-01: `/{client-slug}/{report-slug}` resuelve correctamente para informes migrados
- CA-02: `/{vertical-slug}/{dossier-slug}` resuelve para dossiers
- CA-03: `/{old-space-slug}/{report-slug}` (slug legacy de client_spaces) devuelve redirect 301 al nuevo URL canónico
- CA-04: Un slug inexistente devuelve 404

### Dossiers
- CA-05: Un dossier con `pin_hash IS NULL` muestra contenido sin modal
- CA-06: Un dossier con `pin_hash IS NOT NULL` muestra modal PIN estándar
- CA-07: El viewer de un dossier no muestra enlace al portal

### Portal
- CA-08: `/{client-slug}/portal` muestra todos los informes del cliente (cross-vertical)
- CA-09: `/{vertical-slug}/portal` devuelve 404
- CA-10: Columna "Vertical" visible en la lista del portal
- CA-11: Sesión de portal valida con `namespace_slug`, no con `space_id`
- CA-12: Una sesión de portal del cliente A no da acceso a informes del cliente B

### Panel
- CA-13: `/clientes/[id]` no muestra sección "Espacios"
- CA-14: Informes del cliente se listan con columna "Vertical"
- CA-15: Crear informe para un cliente no tiene paso "seleccionar espacio"
- CA-16: En pantalla de vertical existe sección "Dossiers" con lista y CTA crear

### Cleanup
- CA-17: `space_id` eliminado de `reports`, `portal_sessions`, `space_access_tokens`
- CA-18: Tabla `client_spaces` eliminada de la BD
- CA-19: `pnpm build` sin errores TypeScript tras cleanup y regeneración de tipos

---

## 12. Notas de implementación

- **El folder `[space]/` no se renombra**: solo cambia la lógica de resolución. Renombrarlo rompería todas las referencias a `params.space` simultáneamente.
- **Dossiers sin PIN y la API de contenido**: `src/app/api/reports/content/route.ts` actualmente rechaza requests sin sesión. Para dossiers con `pin_hash IS NULL`, debe servir el contenido sin validar cookie. Distinguir por `namespace.entity_type` antes de llamar a `hasValidSession`.
- **Leer rol con admin client (RLS recursiva)**: cualquier nueva lectura de `profiles.role` debe usar `createAdminClient()`. Ver patrón en CLAUDE.md.
- **Server actions con admin client re-verifican permisos**: toda escritura con `createAdminClient()` debe incluir verificación manual de que el usuario es creador del recurso o admin.
- **301 vs 307**: usar redirect permanente (301) para los slugs legacy, no temporal. Los slugs de `client_spaces` nunca volverán a ser válidos.
- **Exportar `client_spaces` antes del DROP**: antes de ejecutar el cleanup, exportar `SELECT * FROM client_spaces` a CSV como respaldo. No es rollbackeable.
