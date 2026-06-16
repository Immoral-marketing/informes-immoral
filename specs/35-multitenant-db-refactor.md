# SPEC-35: Refactor de Modelo de Datos Multitenant v2

**Fase:** 5
**Estado:** aprobada
**Prerequisito de:** SPEC-36
**Impacto en specs existentes:** SPEC-04 (deprecada), SPEC-33 (sesiones migran), SPEC-05 (reports), SPEC-07 (magic links), SPEC-22 (fixes de sesión)

---

## 1. Objetivo

Migrar el modelo de datos de la jerarquía `Cliente → Espacio (client_spaces) → Informe` a `Namespace (Cliente | Vertical) → Informe`, eliminando `client_spaces` como entidad estructural. La vertical pasa a ser metadato del informe (tag de filtro), no un ancla estructural. Los dossiers de vertical son informes sin cliente, agrupados bajo el slug de la vertical.

---

## 2. Definición de negocio

| Concepto | Antes | Después |
|----------|-------|---------|
| Informe de cliente | `client_spaces.slug + reports.slug` | `clients.slug + reports.slug` |
| Dossier de vertical | No existía | `verticals.slug + reports.slug` (público) |
| Vertical en informe de cliente | Ancla estructural (via space) | Metadato opcional (tag de filtro) |
| Portal de cliente | Scoped a un `client_space` | Scoped a un `client` (todos sus informes) |
| URL pública | `/{space-slug}/{report-slug}` | `/{namespace-slug}/{report-slug}` |

---

## 3. Cambios de esquema

### 3.1 Nueva tabla `report_namespaces`

```sql
CREATE TABLE report_namespaces (
  slug          text        PRIMARY KEY,
  entity_type   text        NOT NULL CHECK (entity_type IN ('client', 'vertical')),
  client_id     uuid        REFERENCES clients(id)   ON DELETE CASCADE,
  vertical_id   uuid        REFERENCES verticals(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_xor CHECK (
    (entity_type = 'client'   AND client_id IS NOT NULL   AND vertical_id IS NULL) OR
    (entity_type = 'vertical' AND vertical_id IS NOT NULL AND client_id IS NULL)
  )
);

CREATE UNIQUE INDEX rn_client_unique   ON report_namespaces(client_id)   WHERE client_id IS NOT NULL;
CREATE UNIQUE INDEX rn_vertical_unique ON report_namespaces(vertical_id) WHERE vertical_id IS NOT NULL;
```

### 3.2 Modificaciones a `clients`

```sql
ALTER TABLE clients ADD COLUMN slug text;
-- Se puebla en migración de datos antes de añadir NOT NULL
ALTER TABLE clients ADD CONSTRAINT clients_slug_unique UNIQUE (slug);
```

### 3.3 Modificaciones a `reports`

```sql
ALTER TABLE reports ADD COLUMN namespace_slug text REFERENCES report_namespaces(slug) ON DELETE RESTRICT;
ALTER TABLE reports ADD COLUMN vertical_id    uuid REFERENCES verticals(id) ON DELETE SET NULL;

-- pin_hash pasa a nullable (dossiers públicos sin PIN)
ALTER TABLE reports ALTER COLUMN pin_hash DROP NOT NULL;

-- Índice de unicidad dentro del namespace
CREATE UNIQUE INDEX reports_slug_per_namespace
  ON reports(namespace_slug, slug)
  WHERE namespace_slug IS NOT NULL;
```

> `space_id` se mantiene hasta SPEC-36. No se elimina en esta spec.

### 3.4 Modificaciones a `portal_sessions` y `space_access_tokens`

```sql
ALTER TABLE portal_sessions
  ADD COLUMN namespace_slug text REFERENCES report_namespaces(slug) ON DELETE CASCADE;

ALTER TABLE space_access_tokens
  ADD COLUMN namespace_slug text REFERENCES report_namespaces(slug) ON DELETE CASCADE;

CREATE UNIQUE INDEX sat_namespace_recipient_unique
  ON space_access_tokens(namespace_slug, recipient_id)
  WHERE namespace_slug IS NOT NULL;
```

> `space_id` se mantiene en ambas tablas hasta SPEC-36. El cleanup es responsabilidad de esa spec.

### 3.5 Deshabilitar inserts en `client_spaces` (deprecación suave)

```sql
-- RLS: solo admin puede insertar. En la práctica se deja de crear desde código.
-- No se elimina la tabla: sirve de fuente para 301 redirects en SPEC-36.
```

---

## 4. Migración de datos

Orden de ejecución dentro de la misma transacción:

### Paso 1: Poblar `clients.slug`

```sql
-- Función auxiliar slugify inline (minúsculas, sin acentos, guiones)
-- Para cada cliente: slugify(clients.name)
-- Colisión: añadir sufijo -2, -3, etc.
UPDATE clients c
SET slug = (
  WITH base AS (
    SELECT regexp_replace(
      lower(translate(name,
        'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
        'aaaaaeeeeiiiiooooouuuuncAAAAAEEEEIIIIOOOOOUUUUNC'
      )),
      '[^a-z0-9]+', '-', 'g'
    ) AS s
  )
  SELECT regexp_replace(trim(both '-' from s), '-+', '-', 'g') FROM base
)
WHERE slug IS NULL;

-- Resolver colisiones (si el mismo slug aparece en más de un cliente)
-- Script ejecutado en bucle hasta que no haya duplicados:
-- UPDATE clients SET slug = slug || '-2' WHERE slug IN (
--   SELECT slug FROM clients GROUP BY slug HAVING COUNT(*) > 1
-- ) AND id NOT IN (
--   SELECT MIN(id) FROM clients GROUP BY slug HAVING COUNT(*) > 1
-- );
```

> Para la resolución de colisiones en producción, verificar con:
> `SELECT slug, COUNT(*) FROM clients GROUP BY slug HAVING COUNT(*) > 1;`
> Si hay resultados, resolver manualmente antes de SET NOT NULL.

### Paso 2: SET NOT NULL en `clients.slug`

```sql
ALTER TABLE clients ALTER COLUMN slug SET NOT NULL;
```

### Paso 3: Poblar `report_namespaces` para clientes

```sql
INSERT INTO report_namespaces (slug, entity_type, client_id)
SELECT slug, 'client', id FROM clients
ON CONFLICT (slug) DO NOTHING;
```

### Paso 4: Poblar `report_namespaces` para verticales

```sql
INSERT INTO report_namespaces (slug, entity_type, vertical_id)
SELECT slug, 'vertical', id FROM verticals
ON CONFLICT (slug) DO NOTHING;
```

> Si hay colisión entre un slug de cliente y uno de vertical, se reporta el error y se resuelve manualmente antes de continuar. Verificar previamente con:
> `SELECT v.slug FROM verticals v JOIN clients c ON c.slug = v.slug;`

### Paso 5: Poblar `reports.namespace_slug`

```sql
UPDATE reports r
SET namespace_slug = (
  SELECT c.slug
  FROM client_spaces cs
  JOIN clients c ON c.id = cs.client_id
  WHERE cs.id = r.space_id
);
```

### Paso 6: Poblar `reports.vertical_id` (metadato)

```sql
UPDATE reports r
SET vertical_id = (
  SELECT cs.vertical_id
  FROM client_spaces cs
  WHERE cs.id = r.space_id
);
```

### Paso 7: Migrar sesiones activas

```sql
-- portal_sessions activas
UPDATE portal_sessions ps
SET namespace_slug = (
  SELECT c.slug
  FROM client_spaces cs
  JOIN clients c ON c.id = cs.client_id
  WHERE cs.id = ps.space_id
)
WHERE ps.expires_at > now();

-- space_access_tokens activos
UPDATE space_access_tokens sat
SET namespace_slug = (
  SELECT c.slug
  FROM client_spaces cs
  JOIN clients c ON c.id = cs.client_id
  WHERE cs.id = sat.space_id
)
WHERE sat.consumed_at IS NULL AND sat.expires_at > now();
```

### Paso 8: Verificar integridad

```sql
-- No debe devolver filas
SELECT id FROM reports WHERE namespace_slug IS NULL;
SELECT id FROM clients WHERE slug IS NULL;
SELECT COUNT(*) FROM report_namespaces WHERE entity_type = 'client';  -- debe igualar COUNT(*) FROM clients
SELECT COUNT(*) FROM report_namespaces WHERE entity_type = 'vertical'; -- debe igualar COUNT(*) FROM verticals
```

---

## 5. RLS

### `report_namespaces`

```sql
ALTER TABLE report_namespaces ENABLE ROW LEVEL SECURITY;

-- Todos los empleados autenticados pueden leer
CREATE POLICY "rn_select_authenticated" ON report_namespaces
  FOR SELECT TO authenticated USING (true);

-- Inserts y deletes solo desde admin client (service_role bypasea RLS)
-- No se necesita política de INSERT para usuarios autenticados normales
```

### `reports` — actualizar políticas existentes

Añadir `OR namespace_slug IS NOT NULL` como cláusula de compatibilidad transitoria donde las políticas actuales filtran por `space_id`. El objetivo es que ambos campos sean válidos hasta SPEC-36.

### `portal_sessions` y `space_access_tokens` — ídem

Políticas existentes siguen funcionando vía `space_id`. El código nuevo usará `namespace_slug`; las políticas se actualizarán al limpiar en SPEC-36.

---

## 6. Cambios en server actions y API routes

> **Sin cambios de UI en esta spec.** Solo se actualiza la capa de datos.

Los siguientes archivos deben escribir **ambos campos** (`space_id` y `namespace_slug`) en las operaciones de escritura, para mantener compatibilidad total hasta SPEC-36:

| Archivo | Cambio |
|---------|--------|
| `src/lib/portal/send.ts` | `generateAndSendPortalLink` acepta y escribe `namespace_slug` además de `space_id` |
| `src/lib/portal/session.ts` | `hasValidPortalSession` valida contra `namespace_slug` además de `space_id` |
| `src/app/api/reports/verify/route.ts` | Al crear `portal_session`, poblar `namespace_slug` |
| `src/app/api/reports/request-magic-link/route.ts` | Ídem |
| `src/app/(panel)/clientes/actions.ts` | Al crear cliente, insertar también en `report_namespaces` con `createAdminClient()` |

**Patrón para insertar en `report_namespaces` desde server action:**

```typescript
const supabaseAdmin = createAdminClient();
// Insertar namespace (idempotente con ON CONFLICT DO NOTHING)
await supabaseAdmin
  .from("report_namespaces")
  .insert({ slug: client.slug, entity_type: "client", client_id: client.id });
```

---

## 7. Regenerar tipos

```bash
npx supabase gen types typescript --project-id yyjfsoobgvotquhjkcmc > src/types/supabase.ts
```

Ejecutar **después** de aplicar la migración. Verificar que `report_namespaces`, `clients.slug`, `reports.namespace_slug` y `reports.vertical_id` aparecen en los tipos generados.

---

## 8. Criterios de aceptación

- CA-01: Tabla `report_namespaces` creada con constraint `entity_xor` funcional
- CA-02: `clients.slug` NOT NULL para todos los registros, valores únicos
- CA-03: Todos los clientes tienen fila en `report_namespaces` (type='client')
- CA-04: Todas las verticales tienen fila en `report_namespaces` (type='vertical')
- CA-05: Todos los informes existentes tienen `namespace_slug` poblado
- CA-06: Todos los informes existentes tienen `vertical_id` poblado (metadato de migración)
- CA-07: Sesiones activas (`expires_at > now()`) tienen `namespace_slug` poblado
- CA-08: Índice `reports_slug_per_namespace` funcional (no permite duplicados)
- CA-09: `reports.pin_hash` admite NULL sin error
- CA-10: `supabase.ts` regenerado con las nuevas columnas
- CA-11: `pnpm build` sin errores TypeScript tras regenerar tipos
- CA-12: Al crear un cliente desde el panel, se inserta fila en `report_namespaces`
- CA-13: Funcionalidad existente (viewer, portal, magic link) no se rompe (smoke test manual)

---

## 9. Lo que NO hace esta spec

- No elimina `space_id` de ninguna tabla
- No elimina ni altera la tabla `client_spaces`
- No cambia ninguna página de UI
- No cambia el routing `[space]/[slug]`
- No elimina la columna `space_id` de `portal_sessions` ni `space_access_tokens`

Todo eso es responsabilidad de SPEC-36.

---

## 10. Notas de implementación

- **Colisión slug cliente/vertical**: Verificar `SELECT v.slug FROM verticals v JOIN clients c ON c.slug = v.slug` antes de ejecutar la migración de datos. Si hay resultados, resolver manualmente (renombrar el slug del cliente o de la vertical).
- **Clientes sin nombre o con nombres idénticos**: `slugify` puede producir slugs vacíos o duplicados. Verificar antes del SET NOT NULL.
- **Zero-downtime**: El orden de la migración es aditivo — se añaden columnas nullables, se pueblan, luego se añade NOT NULL donde procede. El código existente no se rompe porque `space_id` sigue existiendo y funcionando.
- **Admin client para report_namespaces**: Toda operación de INSERT/DELETE en `report_namespaces` debe usar `createAdminClient()`. RLS no tiene política de insert para usuarios normales.
