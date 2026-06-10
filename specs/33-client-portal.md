# SPEC-33: Portal del Cliente (Client Space Portal)

**Versión:** 1.1
**Estado:** draft
**Tipo de proyecto:** web-app
**Última actualización:** 2026-06-10
**Owner:** Julian

---

## Descripción

Actualmente el cliente solo puede acceder a un documento concreto mediante magic link o PIN — no existe una vista donde pueda explorar todos sus documentos. Esta spec crea el portal del cliente: una página accesible desde una URL de espacio, con autenticación ligera de 48h por cookie, donde el cliente ve todos los informes de su espacio ordenados por fecha, puede abrirlos y descargar sus adjuntos. El diseño es moderno estilo Drive, con co-branding Immoral × cliente. El empleado genera y envía el link de acceso al portal desde el panel.

---

## Actores

- **Destinatario (cliente externo):** accede al portal con un magic link de espacio; ve y abre todos sus informes sin necesidad de PIN por cada uno.
- **Empleado / Admin:** genera el link de acceso al portal y lo envía al cliente desde el panel (desde la ficha del cliente o desde la vista del espacio).
- **Sistema:** valida la sesión de portal, sirve la lista de informes y gestiona el ciclo de vida del token.

---

## Flujos principales

### Flujo 1: Empleado genera y envía el link de portal

1. Desde la ficha del cliente (`/clientes/[id]`) o desde la vista del espacio en el panel, el empleado hace clic en "Compartir portal" (o equivalente).
2. Se abre un modal de confirmación que muestra:
   - La URL del portal: `informes.immoral.es/[space-slug]/portal`
   - Los destinatarios autorizados del cliente (con checkboxes para seleccionar a quién enviar).
   - Un campo de nota opcional (igual que el email de magic link de SPEC-32).
3. El empleado selecciona destinatarios y hace clic en "Enviar link de portal".
4. El sistema genera un token de portal (igual que el magic link de documento, pero scoped al espacio, no a un informe concreto):
   - Invalida tokens de portal anteriores no consumidos del mismo `(space_id, recipient_id)`.
   - Genera un token de 43 chars (nanoid).
   - Almacena el hash SHA-256+pepper en una nueva tabla `space_access_tokens`.
   - Construye la URL: `informes.immoral.es/[space-slug]/portal/r/[token]`
   - Envía el email al destinatario seleccionado vía Resend.
5. El modal muestra confirmación de envío.

### Flujo 2: Cliente accede al portal por primera vez (consumo de token)

1. El cliente hace clic en el link del email: `informes.immoral.es/[space-slug]/portal/r/[token]`
2. El sistema valida el token (mismo patrón que SPEC-07: hash + no consumido + no expirado + scoped a space).
3. Si válido: marca el token como consumido, crea una sesión de portal en `portal_sessions` con `session_type='portal'`, establece una cookie `portal_session` (HttpOnly, Secure, SameSite=Strict, 48h, scoped a `space_id`), y redirige a `/[space-slug]/portal`.
4. Si inválido (expirado, consumido o no encontrado): redirige a `/[space-slug]/portal?error=link_expired` con mensaje apropiado.

### Flujo 3: Cliente navega por el portal

1. El cliente accede a `/[space-slug]/portal` con cookie de sesión de portal válida.
2. La página muestra:
   - **Header:** logo de Immoral + logo del cliente (co-branding). Nombre del cliente.
   - **Lista de informes:** todos los informes del espacio ordenados por `updated_at` descendente (más reciente primero). Solo se muestran informes que tienen al menos una versión publicada (no borradores internos).
   - Cada informe muestra: nombre, fecha de última actualización, vertical (badge con color), miniatura o icono de tipo de documento.
   - Paginación o scroll infinito si hay muchos informes (más de 20).
3. El cliente hace clic en un informe → se abre el viewer existente (`/[space-slug]/[report-slug]`). La sesión de portal es suficiente para acceder sin PIN (ver Flujo 4).
4. El cliente cierra la pestaña y vuelve dentro de las 48h → la cookie sigue válida, accede directamente al portal.

### Flujo 4: Acceso al viewer desde el portal (sin PIN)

1. El cliente navega del portal a `/[space-slug]/[report-slug]`.
2. El viewer detecta que existe una cookie de sesión de portal válida para ese espacio.
3. Si el informe pertenece al espacio de la sesión de portal → se carga el viewer directamente sin pedir PIN ni magic link.
4. El viewer usa la sesión de portal para servir el contenido (endpoint `/api/reports/content` acepta sesiones de tipo `portal` además de `pin` y `magic_link`).
5. En el header del viewer hay un botón "Ver mi espacio" que lleva de vuelta a `/[space-slug]/portal`.

### Flujo 6: Acceso al portal vía magic link de informe (flujo unificado)

El consumo de un magic link de **informe** (SPEC-07) ahora crea **también** una `portal_session`. Esto significa que tras hacer clic en el email de un informe concreto, el cliente:
1. Accede al informe directamente sin PIN (comportamiento existente).
2. También tiene acceso al portal sin necesidad de un token de portal separado — el botón "Ver mi espacio" en el viewer ya funciona.
3. Puede navegar a `/[space-slug]/portal` y ver todos sus informes del espacio durante las 48h de sesión.

No es necesario que el empleado envíe un "link de portal" separado si ya ha enviado un magic link de informe. Ambos mecanismos de acceso al portal son válidos y complementarios.

### Flujo 5: Acceso directo al portal (sin token, con sesión activa)

1. El cliente accede directamente a `/[space-slug]/portal` (sin token en la URL) y tiene cookie de portal válida → ve el portal normalmente.
2. Si no tiene cookie → ve una página de acceso donde puede introducir su email para solicitar un nuevo link de portal.

---

## Flujos alternativos / Edge cases

- **Token de portal expirado o ya consumido:** redirige a `/[space-slug]/portal?error=link_expired`. La página de portal muestra un mensaje y permite solicitar un nuevo link introduciendo el email (igual que el modal de acceso del viewer).
- **Sin informes publicados en el espacio:** la página del portal muestra un empty state: "Aún no hay documentos disponibles en este espacio."
- **Destinatario sin acceso al espacio:** si el destinatario cuyo email se introduce no está registrado como recipient del cliente de ese espacio, la respuesta es genérica (no revela si el email existe).
- **Sesión de portal vs sesión de documento:** son cookies distintas con distintos scopes. Una sesión de portal válida da acceso a todos los informes del espacio; una sesión de documento solo da acceso a ese informe concreto. Si el cliente tiene ambas, las dos son válidas independientemente.
- **Informe con fecha de vigencia expirada (`expiry_date`):** se muestra en el portal con un badge "Caducado" pero es visible (no se oculta). El viewer sí puede bloquear el acceso si SPEC-18 implementa enforcement de caducidad — ese comportamiento lo gestiona el viewer, no el portal.
- **Muchos informes:** paginación a 20 por página. El cliente puede navegar entre páginas.
- **Cliente sin logo:** el header muestra solo el logo de Immoral.
- **Rate limit de solicitud de nuevo link:** mismas reglas que SPEC-07 (3 solicitudes / 10 min por IP + recipient).

---

## Criterios de aceptación

- [ ] CA-33.1: Existe la ruta `/[space-slug]/portal` que muestra el portal del cliente con todos los informes del espacio.
- [ ] CA-33.2: El portal requiere sesión de portal válida (cookie `portal_session`); sin ella muestra la pantalla de solicitud de acceso.
- [ ] CA-33.3: El token de portal se genera scoped a `(space_id, recipient_id)`, se consume en un solo uso y expira en 48h.
- [ ] CA-33.4: La ruta `/[space-slug]/portal/r/[token]` consume el token, crea la sesión, establece la cookie y redirige al portal limpiamente (sin el token en la URL final).
- [ ] CA-33.5: El portal muestra todos los informes del espacio con versión publicada, ordenados por `updated_at` descendente.
- [ ] CA-33.6: Cada informe muestra nombre, fecha de última actualización y vertical (badge con color).
- [ ] CA-33.7: Al hacer clic en un informe desde el portal, se abre el viewer sin pedir PIN (la sesión de portal es suficiente para ese espacio).
- [ ] CA-33.7b: Al consumir un magic link de informe (SPEC-07), se crea automáticamente una `portal_session` válida para el espacio — el cliente puede acceder al portal sin token de portal separado.
- [ ] CA-33.7c: El viewer muestra un botón "Ver mi espacio" en el header cuando el cliente tiene sesión activa; ese botón lleva a `/[space]/portal`.
- [ ] CA-33.7d: El portal muestra un botón "Cerrar sesión" que borra la cookie `portal_session` y redirige a la pantalla de solicitud de acceso.
- [ ] CA-33.8: El portal muestra co-branding: logo de Immoral + logo del cliente (si existe).
- [ ] CA-33.9: El empleado puede generar y enviar el link de portal desde la ficha del cliente o desde la pantalla del espacio en el panel.
- [ ] CA-33.10: Tokens de portal anteriores del mismo `(space_id, recipient_id)` se invalidan al generar uno nuevo.
- [ ] CA-33.11: El portal muestra un empty state cuando no hay informes publicados en el espacio.
- [ ] CA-33.12: La sesión de portal es una cookie distinta de la sesión de documento; ambas pueden coexistir.
- [ ] CA-33.13: El diseño del portal es responsive en 375px / 768px / 1280px.
- [ ] CA-33.14: Los adjuntos de cada informe son accesibles desde el portal (botón o enlace dentro del viewer, que ya es accesible desde la sesión de portal).
- [ ] CA-33.15: `pnpm build` pasa sin errores TypeScript.

---

## Modelo de datos

### Entidades nuevas

**`space_access_tokens`** — tokens de acceso al portal de espacio.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | Identificador |
| `space_id` | `uuid` FK → `client_spaces` | Espacio al que da acceso |
| `recipient_id` | `uuid` FK → `client_recipients` | Destinatario para quien se generó |
| `token_hash` | `text` | SHA-256+pepper del token raw |
| `expires_at` | `timestamptz` | `now() + 48h` |
| `consumed_at` | `timestamptz` | NULL hasta consumo; atómico |
| `created_at` | `timestamptz` | Fecha de generación |

RLS: deny-all (solo service_role puede leer/escribir).

**`portal_sessions`** — sesiones activas del portal de espacio.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | `uuid` PK | Identificador de sesión |
| `space_id` | `uuid` FK → `client_spaces` | Espacio al que da acceso |
| `recipient_id` | `uuid` FK → `client_recipients` | Destinatario con sesión activa |
| `session_token_hash` | `text` | SHA-256+pepper del token de sesión (cookie) |
| `expires_at` | `timestamptz` | `now() + 48h` |
| `created_at` | `timestamptz` | Fecha de creación |
| `last_accessed_at` | `timestamptz` | Última actividad (opcional, para auditoría) |

RLS: deny-all (solo service_role puede leer/escribir).

### Migraciones necesarias

- Crear tabla `space_access_tokens` con índices en `(space_id, recipient_id)` y `token_hash`.
- Crear tabla `portal_sessions` con índice en `session_token_hash` y `(space_id, expires_at)`.
- Regenerar `src/types/supabase.ts` tras aplicar.

### Relación con `report_sessions`

La tabla `report_sessions` existente gestiona sesiones a nivel de documento. Las `portal_sessions` son paralelas pero a nivel de espacio. El viewer debe aceptar ambos tipos para servir contenido.

---

## UI / Páginas afectadas

### Páginas nuevas

| Ruta | Descripción |
|------|-------------|
| `/[space-slug]/portal` | Portal del cliente: lista de informes del espacio, header co-branded. |
| `/[space-slug]/portal/r/[token]` | Route handler de consumo de token de portal → redirect al portal. |

### Páginas modificadas

| Ruta | Cambio |
|------|--------|
| `/clientes/[id]` | Añadir botón "Compartir portal" que abre el modal de generación y envío de link de portal. |
| `/espacios/[id]` (si existe en el panel) | Añadir botón "Compartir portal" equivalente. |
| `/[space]/[slug]` (viewer) | El viewer acepta cookie `portal_session` válida para ese espacio como forma de acceso, además de `report_session`. |
| `/api/reports/content` y `/api/reports/attachments/[id]` | Aceptar sesiones de tipo portal (verificar que el informe pertenece al espacio de la sesión). |

### Diseño del portal

El portal debe seguir la identidad visual de Immoral (`immoral_brand_guidelines.md`) y sentirse moderno y limpio:

- **Fondo:** oscuro consistente con la UI del panel y el viewer (`#111111` o similar).
- **Header:** logo Immoral (izquierda) + logo cliente (derecha) o centrado según layout. Nombre del cliente debajo.
- **Lista de informes:** cards o filas de tabla con hover effect; icono de tipo de documento (PDF/HTML); nombre en prominencia; fecha y vertical como metadatos secundarios. Sin densidad excesiva.
- **Paginación:** controles prev/next simples en el pie de la lista.
- **Empty state:** ilustración o icono + mensaje amigable.
- **Pantalla de solicitud de acceso:** campo de email + botón "Recibir link de acceso" — mismo estilo que `AccessModal` del viewer.

### Breakpoints obligatorios

375px · 768px · 1280px

---

## API / Endpoints

### Endpoints nuevos

| Tipo | Ruta / Nombre | Descripción | Auth |
|------|---------------|-------------|------|
| Route handler | `GET /[space-slug]/portal/r/[token]` | Consume token de portal → sesión → redirect | Pública |
| Server Action | `generateAndSendPortalLink(spaceId, recipientIds[], note?)` | Genera token de portal, invalida anteriores, envía email | Empleado autenticado |
| POST API | `/api/portal/request-access` | Cliente solicita nuevo link de portal (desde pantalla de acceso) | Pública |
| GET Server Action | `getPortalReports(spaceId)` | Lista los informes del espacio (con versión publicada) para mostrar en el portal | Sesión de portal válida |

### Modificados

- `POST /api/reports/content` — aceptar cookie `portal_session` válida para el espacio del informe.
- `GET /api/reports/attachments/[id]` — ídem.

---

## Notas de seguridad

### Datos sensibles involucrados

- Los tokens de portal son equivalentes en sensibilidad a los magic links de documento: one-time, expiración 48h, hash en BD.
- La cookie `portal_session` da acceso a TODOS los informes del espacio — su scope es más amplio que la cookie de documento, por lo que el riesgo si se compromete es mayor.
- Los informes del espacio se sirven solo si el `space_id` de la sesión de portal coincide con el `space_id` del informe solicitado.

### Validaciones server-side requeridas

- El token de portal se valida en el servidor: hash + no consumido + no expirado + `space_id` coincide con el slug de la URL.
- El consumo es atómico: `UPDATE space_access_tokens SET consumed_at = now() WHERE id = ? AND consumed_at IS NULL` — si afecta 0 filas, otro request ya lo consumió.
- `getPortalReports` valida que la cookie `portal_session` sea válida y esté scoped al `space_id` correcto antes de devolver datos.
- `/api/reports/content` y `/api/reports/attachments/[id]` verifican que el informe solicitado pertenece al espacio de la sesión de portal.

### Autenticación y autorización

- El empleado que genera el link de portal debe ser creador del cliente del espacio o admin (mismo patrón que `assertCanManageClient`).
- `generateAndSendPortalLink` solo puede ser invocada por un empleado autenticado.
- La pantalla de solicitud de acceso (`/api/portal/request-access`) es pública pero con rate limiting (3 req / 10 min por IP + recipient).

### Otros riesgos identificados

- **Scope creep de la sesión de portal:** si la validación en el content endpoint es laxa, un cliente podría acceder a informes de otros espacios. La verificación `informe.space_id === session.space_id` es obligatoria.
- **Enumeración de espacios:** la URL `/[space-slug]/portal` no debe revelar si un espacio existe cuando no hay sesión. La pantalla de "solicitar acceso" debe ser genérica.
- **Invalidación de sesiones de portal:** si el empleado revoca el acceso de un destinatario (SPEC-03), las sesiones de portal activas de ese destinatario deben expirar o invalidarse.

---

## Plan de implementación

### Arquitectura propuesta

- **DB-AGENT:** migraciones `space_access_tokens` y `portal_sessions`; RLS deny-all; índices; regenerar tipos.
- **BACKEND-AGENT:** route handler de consumo de token; server action `generateAndSendPortalLink`; endpoint `/api/portal/request-access`; server action `getPortalReports`; actualizar endpoints de content y attachments para aceptar sesión de portal.
- **FRONTEND-AGENT:** página `/[space-slug]/portal` (lista de informes, co-branding, paginación, empty state, pantalla de solicitud de acceso); modal "Compartir portal" en el panel del empleado; botones de acceso en `/clientes/[id]`.

### Desglose de tareas

1. **DB:** migración `space_access_tokens` + `portal_sessions` + RLS + índices + regenerar tipos.
2. **Backend:** helper `generatePortalToken(spaceId, recipientId)` — genera token, hashea, invalida anteriores, guarda en BD.
3. **Backend:** helper de email para el link de portal (template similar a SPEC-07/32 pero con texto de "acceso a tu espacio de documentos").
4. **Backend:** server action `generateAndSendPortalLink` — orquesta generación de token + envío de email.
5. **Backend:** route handler `/[space-slug]/portal/r/[token]` — consumo atómico + creación de sesión en `portal_sessions` + cookie + redirect.
6. **Backend:** server action `getPortalReports` — lista informes del espacio con versión publicada, scoped a sesión de portal válida.
7. **Backend:** endpoint `/api/portal/request-access` — rate limit + buscar recipient + generar y enviar token.
8. **Backend:** actualizar `/api/reports/content` y `/api/reports/attachments/[id]` para aceptar `portal_session`.
9. **Frontend:** página `/[space-slug]/portal` — layout co-branded, lista de informes, paginación, empty state.
10. **Frontend:** pantalla de solicitud de acceso dentro de `/[space-slug]/portal` (cuando no hay sesión).
11. **Frontend:** modal "Compartir portal" en `/clientes/[id]` y en la vista del espacio.
12. **Verificación:** confirmar que el viewer existente abre informes del espacio sin pedir PIN cuando hay sesión de portal activa.

### Dependencias con otras specs

- **SPEC-07** — el modelo de token y sesión de esta spec replica el patrón de SPEC-07 a nivel de espacio.
- **SPEC-25** — el co-branding con logo de cliente ya está implementado; se reutiliza en el header del portal.
- **SPEC-32** — el email de invitación al portal puede reutilizar el template base de SPEC-32 (asunto + nota opcionales).
- **SPEC-31** — la vista plana de informes en el panel (ya implementada) es la contraparte interna de lo que el portal muestra al cliente.

---

## Tests requeridos

### Tests de integración obligatorios

- Consumo de token de portal válido → sesión creada con `space_id` correcto + cookie 48h + redirect limpio.
- Consumo de token expirado → redirect con `?error=link_expired`.
- Consumo de token ya consumido → mismo error que expirado.
- `getPortalReports` con sesión de portal válida → devuelve informes del espacio correcto.
- `getPortalReports` con sesión de portal de espacio distinto → rechazado.
- `/api/reports/content` con sesión de portal válida para ese espacio → sirve el contenido.
- `/api/reports/content` con sesión de portal de espacio distinto → rechazado.

---

## Out of scope (explícito)

- Portal multi-espacio (vista de todos los espacios de un cliente en una sola pantalla). El portal es por espacio, no por cliente.
- Comentarios o feedback del cliente desde el portal (SPEC-08, futuro).
- Notificaciones al empleado cuando el cliente abre el portal (SPEC-10, futuro).
- Analytics de acceso (quién abrió qué y cuándo), más allá de `last_accessed_at` básico.
- Personalización del tema/colores del portal por espacio.
- Acceso al portal sin email (link público sin autenticación).
- Enforcement de `expiry_date` de informes en el portal (ese comportamiento lo gestiona el viewer, no el portal).

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-10 | Versión inicial | Claude Code |
| 1.1 | 2026-06-10 | Flujo 6 añadido: acceso al portal vía magic link de informe (sesión dual SPEC-07). CA-33.7b/7c/7d añadidos. | Claude Code |
