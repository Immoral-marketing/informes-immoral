# SPEC-03: Clientes y Destinatarios

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Un cliente representa a una empresa o persona real con la que Immoral trabaja, independientemente de los verticales contratados. Cada cliente tiene una lista de destinatarios autorizados: personas físicas (con email) que pueden recibir magic links para acceder a los informes del cliente. Un destinatario puede marcarse como primario para ser el destinatario por defecto en el auto-envío.

Esta spec cubre el CRUD de clientes y la gestión de sus destinatarios. Los espacios (cliente × vertical) se gestionan en SPEC-04.

---

## Actores

- **Empleado / Admin:** Crea, edita y elimina clientes y sus destinatarios
- **Sistema:** Valida unicidad de email por cliente, gestiona la marca de destinatario primario

---

## Flujos Principales

### Flujo 1: Crear cliente

1. El empleado accede a `/clientes` y hace clic en "Nuevo cliente"
2. Se muestra formulario con:
   - **Nombre** (texto, requerido) — ej: "Selvático"
   - **Persona de contacto** (texto, opcional)
   - **Teléfono** (texto, opcional)
   - **WhatsApp** (texto, opcional)
3. Al guardar, el cliente queda creado asociado al empleado autenticado
4. El sistema redirige al detalle del cliente recién creado

### Flujo 2: Editar cliente

1. Desde el detalle del cliente, el empleado hace clic en "Editar"
2. Puede modificar: nombre, persona de contacto, teléfono, WhatsApp
3. Al guardar, los cambios se aplican de inmediato

### Flujo 3: Eliminar cliente

1. El empleado hace clic en "Eliminar" en el detalle del cliente
2. El sistema verifica si el cliente tiene espacios de cliente (`client_spaces`) asociados
3. Si tiene espacios: la acción se bloquea con el mensaje "Este cliente tiene [N] espacio(s). Elimínalos antes de continuar."
4. Si no tiene espacios: se muestra diálogo de confirmación con el nombre del cliente
5. Al confirmar: se elimina el cliente (y sus destinatarios en cascada)

### Flujo 4: Añadir destinatario al cliente

1. En el detalle del cliente, sección "Destinatarios", el empleado hace clic en "Añadir destinatario"
2. Se muestra formulario con:
   - **Email** (email, requerido) — el email que recibirá los magic links
   - **Nombre completo** (texto, opcional)
   - **Cargo / rol** (texto, opcional) — ej: "Marketing Manager"
   - **Destinatario primario** (checkbox) — solo puede haber uno por cliente
3. Si el email ya existe en este cliente: error "Este email ya está registrado para este cliente"
4. Si se marca como primario y ya había otro primario: el anterior pierde la marca automáticamente
5. Al guardar, el destinatario queda añadido

### Flujo 5: Editar destinatario

1. El empleado hace clic en el ícono de edición del destinatario
2. Puede modificar: email, nombre completo, cargo, marca de primario
3. Validaciones de unicidad de email se aplican igual que en la creación

### Flujo 6: Eliminar destinatario

1. El empleado hace clic en "Eliminar" en el destinatario
2. Si el destinatario es el único del cliente y el cliente tiene informes enviados a él: mostrar advertencia "Este destinatario ha recibido magic links. Eliminarlo no revoca el acceso de sesiones activas."
3. Se muestra diálogo de confirmación con el email del destinatario
4. Al confirmar: se elimina el destinatario. Las sesiones activas (`report_sessions`) con `recipient_id` de este destinatario permanecen hasta que expiren.

### Flujo 7: Visibilidad según rol

**Empleado:**
- Ve los clientes que él creó
- No ve clientes de otros empleados

**Admin:**
- Ve todos los clientes de todos los empleados
- Ve el nombre del creador junto a cada cliente

---

## Flujos Alternativos / Edge Cases

- **Cliente sin destinatarios:** Permitido. Los informes se pueden crear sin destinatarios y enviar más adelante.
- **Email duplicado en el mismo cliente:** El sistema lo detecta y bloquea con error descriptivo.
- **Email duplicado en otro cliente:** Permitido — el mismo email puede ser destinatario de múltiples clientes.
- **Eliminar destinatario primario cuando hay otros:** El sistema no asigna automáticamente otro primario; el empleado debe marcarlo manualmente.
- **Empleado sin clientes propios:** Ve la página de lista vacía con CTA para crear el primero.

---

## Criterios de Aceptación

- [ ] CA-01: Un empleado puede crear un cliente con solo el nombre (resto opcionales)
- [ ] CA-02: Un empleado ve únicamente sus propios clientes; un admin ve todos con el creador
- [ ] CA-03: No se puede eliminar un cliente que tenga espacios asociados
- [ ] CA-04: Se puede añadir un destinatario a un cliente con solo el email
- [ ] CA-05: El email de un destinatario es único dentro del mismo cliente (no globalmente)
- [ ] CA-06: Solo puede haber un destinatario primario por cliente; marcar uno nuevo como primario desmarca el anterior automáticamente
- [ ] CA-07: Eliminar un destinatario muestra advertencia si ha recibido magic links previamente (tiene tokens en `magic_link_tokens`)
- [ ] CA-08: Eliminar un destinatario no revoca sus sesiones activas (las sesiones expiran por su propio TTL)
- [ ] CA-09: Eliminar un cliente elimina en cascada sus destinatarios (ON DELETE CASCADE)
- [ ] CA-10: La página `/clientes` lista los clientes con nombre, número de destinatarios y número de espacios
- [ ] CA-11: La página `/clientes/[id]` muestra el detalle del cliente + lista de destinatarios + lista de espacios (placeholder si aún no hay espacios)

---

## Modelo de Datos

Ver SPEC-00, secciones `clients` y `client_recipients`.

Migración: tablas `clients` + `client_recipients` con índice en `(client_id, email)` y constraint UNIQUE.

---

## UI / Páginas Afectadas

### Páginas nuevas

| Ruta | Descripción |
|------|-------------|
| `/clientes` | Lista de clientes (filtrada por rol). Card por cliente: nombre, nº destinatarios, nº espacios. |
| `/clientes/[id]` | Detalle: datos del cliente (editable), sección destinatarios (CRUD inline), sección espacios (placeholder para SPEC-04). |

### Componentes reutilizables
- `ClientCard` — nombre + stats + acciones
- `RecipientRow` — email + nombre + cargo + badge primario + acciones
- `ClientForm` — formulario crear/editar cliente (Dialog)
- `RecipientForm` — formulario añadir/editar destinatario (Dialog)

### Breakpoints obligatorios
375px · 768px · 1280px

---

## API / Endpoints

| Tipo | Nombre | Descripción | Auth |
|------|--------|-------------|------|
| Server Action | `createClient(formData)` | Crea cliente asociado al usuario | autenticado |
| Server Action | `updateClient(id, formData)` | Actualiza datos del cliente | creador ∨ admin |
| Server Action | `deleteClient(id)` | Verifica espacios + elimina | creador ∨ admin |
| Server Action | `addRecipient(clientId, formData)` | Añade destinatario; gestiona primario | creador del cliente ∨ admin |
| Server Action | `updateRecipient(id, formData)` | Edita destinatario; gestiona primario | creador del cliente ∨ admin |
| Server Action | `deleteRecipient(id)` | Elimina destinatario con advertencia si tiene tokens | creador del cliente ∨ admin |

---

## Notas de Seguridad

- Las server actions de destinatarios verifican que el usuario autenticado es creador del cliente o admin. No se acepta `clientId` como parámetro de autorización desde el cliente.
- El email del destinatario se normaliza a minúsculas antes de insertar (constraint `UNIQUE (client_id, lower(email))`).
- Eliminar un destinatario no invalida sus sesiones activas: las sesiones son el mecanismo de control de acceso al informe, no al destinatario. Si hace falta revocar acceso, el empleado debe regenerar el PIN del informe (SPEC-06).

---

## Plan de Implementación

### Arquitectura propuesta
- **DB-AGENT:** migración `clients` + `client_recipients` + RLS + índices + regenerar tipos
- **BACKEND-AGENT:** server actions CRUD de clientes y destinatarios + lógica de primario
- **FRONTEND-AGENT:** `/clientes` lista, `/clientes/[id]` detalle con secciones destinatarios y espacios

### Desglose de tareas
1. DB: migración `clients` + `client_recipients` + RLS
2. DB: regenerar `src/types/supabase.ts`
3. BACKEND: `createClient`, `updateClient`, `deleteClient`
4. BACKEND: `addRecipient`, `updateRecipient`, `deleteRecipient` (gestión de primario atómica)
5. FRONTEND: `/clientes` con `ClientCard` + dialog de creación
6. FRONTEND: `/clientes/[id]` con detalle editable + `RecipientRow` + `RecipientForm`
7. FRONTEND: actualizar Navbar para añadir link "Clientes"

### Dependencias con otras specs
- `setup.md` ✅, `01-auth.md` ✅, `02-verticals.md` ✅

---

## Tests Requeridos

Ninguno obligatorio en esta spec (ver política en PROJECT-CONSTITUTION.md).

---

## Out of Scope (Explícito)

- Importar clientes en bulk (CSV)
- Historial de cambios por cliente
- Múltiples emails primarios
- Gestión de espacios (SPEC-04)
- Envío de magic links (SPEC-07)

---

## Notas de Implementación

### `assertCanManageClient` retorna `supabaseAdmin` como opcional — estrechar con guarda
La función helper `assertCanManageClient` retorna `supabaseAdmin` como `SupabaseClient | undefined` porque en las ramas de error no se instancia. TypeScript no estrecha el tipo tras `if (perm.error) return`. Solución: siempre guardar con `if (perm.error || !perm.supabaseAdmin)`.

### `magic_link_tokens` puede no existir (SPEC-07 pendiente)
`deleteRecipient` consulta `magic_link_tokens` para CA-07. Si la tabla no existe aún, la query lanza. Añadir `try/catch` si se ejecuta SPEC-03 antes de SPEC-07.

### Unique index en email: `lower(email)` requiere índice separado, no constraint inline
PostgreSQL no admite expresiones como `lower(email)` en un constraint UNIQUE dentro del `CREATE TABLE`. Se crea con `CREATE UNIQUE INDEX` tras la tabla.

### Conteos en listado: sintaxis `client_recipients(count)` en PostgREST
Para obtener el conteo de registros relacionados sin traer todos los datos, se usa la sintaxis PostgREST: `.select("client_recipients(count)")`. Devuelve `[{ count: number }]` (array de un elemento).

### `createClient_` — evitar colisión de nombre con el helper de Supabase
La server action se exporta como `createClient_` (con underscore) porque `createClient` ya está importado en el mismo archivo como el helper de Supabase. No cambiar el nombre del helper.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial | Claude Code |
| 1.1 | 2026-06-02 | Añadidas Notas de Implementación: guarda supabaseAdmin, magic_link_tokens try/catch, unique index, conteos PostgREST, colisión createClient | Claude Code |
