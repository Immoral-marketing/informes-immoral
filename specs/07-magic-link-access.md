# SPEC-07: Acceso por Magic Link

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Sistema de acceso por magic link para destinatarios de informes. El empleado envía un enlace de un solo uso al email autorizado del cliente. Al hacer clic, el destinatario accede directamente al informe sin necesidad de PIN, y se crea una sesión cookie de 48h con su identidad asociada. Los magic links son one-time (un clic los consume), tienen una caducidad de 48 horas desde su generación y están scoped a un informe y un destinatario concretos. Cuando el link ha expirado, la redirección muestra el modal de acceso normal (con opción de PIN o nuevo enlace) — no una página de error.

---

## Actores

- **Empleado / Admin:** Genera y envía magic links a los destinatarios del cliente
- **Destinatario (cliente externo):** Recibe el link por email, hace clic y accede al informe
- **Sistema:** Genera token, envía email, valida consumo, crea sesión

---

## Flujos Principales

### Flujo 1: Empleado envía magic link desde el panel del informe

1. En `/informes/[id]`, el empleado hace clic en "Enviar al cliente"
2. Se muestra un modal con la lista de destinatarios autorizados del cliente
3. Cada destinatario muestra: email, nombre, cargo, badge "Primario" si aplica
4. El empleado selecciona uno o varios destinatarios y hace clic en "Enviar enlace"
5. El sistema:
   - Invalida tokens anteriores no consumidos del mismo `(report_id, recipient_id)` — solo el nuevo es válido
   - Genera un token de 43 chars (nanoid base64url)
   - Almacena el hash SHA-256+pepper del token en `magic_link_tokens`
   - Construye la URL: `informes.immoral.es/[space-slug]/[report-slug]/r/[token]`
   - Envía el email al destinatario vía Resend
6. El modal muestra confirmación: "Enlace enviado a [email]" por cada destinatario seleccionado
7. Si no hay destinatarios en el cliente: el botón está deshabilitado con tooltip "El cliente no tiene destinatarios registrados"

### Flujo 2: Auto-envío al publicar (completar SPEC-05 CA-14)

1. Cuando el empleado crea un informe o sube una nueva versión con `auto_send_on_publish = true`
2. El sistema busca el destinatario primario del cliente del espacio
3. Si existe: genera y envía magic link automáticamente (igual que Flujo 1)
4. Si no existe: crea el informe correctamente y devuelve el aviso ya definido en SPEC-05

### Flujo 3: Destinatario solicita nuevo enlace desde el modal de acceso

1. En el viewer (`/[space]/[slug]`), el destinatario va a la pestaña "Enlace" del `AccessModal`
2. Introduce su email y hace clic en "Enviarme un enlace"
3. El sistema:
   - Identifica el `recipient_id` buscando el email en `client_recipients` del cliente de este informe
   - Si no existe: respuesta genérica (no revela si el email está registrado)
   - Si existe: verifica rate limit (3 solicitudes / 10 min por `(IP, recipient_id)`)
   - Si supera el rate limit: misma respuesta genérica
   - Si pasa: genera token, envía email, actualiza `magic_link_requests`
4. Siempre responde: "Si este email está registrado, recibirás un enlace de acceso." (CA-14 de SPEC-06)

### Flujo 4: Consumo del magic link por el destinatario

1. El destinatario hace clic en el enlace del email: `informes.immoral.es/[space]/[slug]/r/[token]`
2. El sistema (route handler `/[space]/[slug]/r/[token]/route.ts`):
   a. Resuelve el informe desde `space` + `slug` en la BD
   b. Calcula el hash del token recibido
   c. Busca en `magic_link_tokens`: token_hash coincide + report_id coincide + consumed_at IS NULL + expires_at > now()
   d. Si no válido: redirige a `/[space]/[slug]?error=link_expired` (se muestra error en el modal de acceso)
   e. Si válido: marca `consumed_at = now()` de forma atómica
   f. Crea sesión en `report_sessions` con `session_type='magic_link'` y `recipient_id` del token
   g. Establece cookie `informes_session` (HttpOnly, Secure, SameSite=Strict, 48h)
   h. Redirige a `/[space]/[slug]` (sin el token en la URL — la URL queda limpia en el historial del navegador)

---

## Flujos Alternativos / Edge Cases

- **Link expirado (>48h):** Redirige a `/[space]/[slug]?error=link_expired`. El `AccessModal` muestra: "Este enlace ha caducado. Puedes acceder con el PIN o solicitar uno nuevo." — el cliente puede entrar con PIN o pedir un nuevo enlace.
- **Link ya consumido:** Mismo comportamiento que expirado — redirige al modal de acceso con el mismo mensaje (no revela si fue consumido o expirado).
- **Destinatario sin acceso registrado (email no en recipients):** Respuesta genérica. No revela si el email está registrado.
- **Rate limit de solicitudes:** Misma respuesta genérica. No revela el bloqueo.
- **Empleado intenta enviar a destinatario de otro cliente:** Imposible — la UI solo muestra destinatarios del cliente del informe.
- **Informe regenera PIN después de enviar magic link:** Los magic links pendientes no se ven afectados por el cambio de PIN. El PIN y el magic link son mecanismos de acceso independientes.

---

## Criterios de Aceptación

- [ ] CA-01: El empleado puede seleccionar uno o varios destinatarios y enviar magic link a cada uno
- [ ] CA-02: Al generar un nuevo magic link para el mismo `(report_id, recipient_id)`, los tokens anteriores no consumidos se invalidan
- [ ] CA-03: El magic link expira 48 horas después de su generación. Al expirar, redirige al modal de acceso (no a una página de error) con mensaje "Este enlace ha caducado."
- [ ] CA-04: El token raw solo viaja en el email y en la URL de consumo — en BD solo se almacena el hash SHA-256+pepper
- [ ] CA-05: Al consumir el magic link, el token se marca como consumido atómicamente antes de crear la sesión
- [ ] CA-06: Un magic link solo puede consumirse una vez
- [ ] CA-07: Tras el consumo, la redirección va a `/[space]/[slug]` sin el token en la URL (URL limpia)
- [ ] CA-08: La sesión creada por magic link tiene `session_type='magic_link'` y `recipient_id` poblado
- [ ] CA-09: El endpoint de solicitud de magic link siempre devuelve el mismo mensaje independientemente de si el email está registrado o no
- [ ] CA-10: Rate limiting de solicitudes: máx 3 por `(IP, recipient_id)` en 10 min
- [ ] CA-11: El email enviado contiene el nombre del informe, el nombre del cliente y el link de acceso
- [ ] CA-12: El botón "Enviar al cliente" en el panel del informe está deshabilitado si el cliente no tiene destinatarios
- [ ] CA-13: Auto-envío al publicar (SPEC-05 CA-14 completado): si `auto_send_on_publish=true` y hay destinatario primario, se envía magic link al crear/versionar el informe

---

## Modelo de Datos

Migración: tabla `magic_link_tokens`.

Ver SPEC-00 para definición completa. Campos clave:
- `token_hash`: SHA-256+pepper del token raw
- `expires_at`: `now() + 48h`
- `consumed_at`: NULL hasta consumo; se establece atómicamente en el consumo
- `recipient_id`: destinatario al que se envió
- `report_id`: informe al que da acceso

---

## UI / Páginas Afectadas

### Páginas modificadas

| Ruta | Cambio |
|------|--------|
| `/informes/[id]` | Reemplazar botón "Enviar al cliente (próximamente)" con botón funcional que abre el `SendMagicLinkModal` |
| `/[space]/[slug]` | Actualizar mensaje de error en `AccessModal` para `?error=link_expired` |

### Componentes nuevos
- `SendMagicLinkModal` — lista de destinatarios con checkboxes + botón enviar + feedback por destinatario

### Breakpoints obligatorios
375px · 768px · 1280px

---

## API / Endpoints

| Tipo | Ruta | Descripción | Auth |
|------|------|-------------|------|
| POST | `/api/reports/request-magic-link` | Solicita magic link desde modal de acceso (cliente) | Pública |
| Server Action | `sendMagicLinks(reportId, recipientIds[])` | Empleado envía links a destinatarios seleccionados | autenticado |
| GET | `/[space]/[slug]/r/[token]` (route handler) | Consume token → Set-Cookie → redirect | Pública |

### Email template

```
Asunto: Tienes acceso a un informe de Immoral

Hola [nombre_destinatario o vacío],

[nombre_empleado] de Immoral te ha compartido el informe "[nombre_informe]"
para [nombre_cliente].

Accede al informe haciendo clic en el siguiente enlace:
[URL — válido 48 horas]

Si no esperabas este email, puedes ignorarlo.

— Immoral Group
```

---

## Notas de Seguridad

- El token raw (43 chars nanoid) NUNCA se almacena en BD — solo el hash SHA-256+pepper.
- La marcación de `consumed_at` debe ser atómica: se hace con un UPDATE que verifica `consumed_at IS NULL` en la misma query, no en dos pasos. Si dos requests llegan simultáneamente con el mismo token, solo uno puede consumirlo.
- La URL del magic link no debe preservarse en el historial del navegador tras el consumo — la redirección final va a `/[space]/[slug]` sin el token.
- Los mensajes de error para link expirado y link ya consumido son idénticos.
- Rate limiting de solicitudes desde el modal persiste en `magic_link_requests` en BD.
- SECURITY-AGENT aplicará el checklist de `.brianspec/security-checklists.md`.

---

## Plan de Implementación

### Arquitectura propuesta
- **DB-AGENT:** migración `magic_link_tokens` + RLS deny-all + regenerar tipos
- **BACKEND-AGENT:**
  - Route handler `/[space]/[slug]/r/[token]/route.ts` — consumo atómico + sesión + redirect
  - Actualizar `POST /api/reports/request-magic-link` con lógica real
  - Server action `sendMagicLinks(reportId, recipientIds[])` para el panel del empleado
  - Helper `generateAndSendMagicLink(reportId, recipientId, spaceSlug, reportSlug)` — reutilizable desde auto-send y envío manual
  - Completar auto-send en SPEC-05 `createReport` y `addVersion`
- **FRONTEND-AGENT:**
  - `SendMagicLinkModal` en `/informes/[id]`
  - Actualizar `AccessModal` para mostrar error de link expirado

### Desglose de tareas
1. DB: migración `magic_link_tokens` + RLS + regenerar tipos
2. BACKEND: helper `generateAndSendMagicLink` (genera token, hashea, guarda, envía email vía Resend, invalida anteriores)
3. BACKEND: route handler `/[space]/[slug]/r/[token]` — consumo atómico + Set-Cookie + redirect
4. BACKEND: actualizar `/api/reports/request-magic-link` con lógica real + rate limiting
5. BACKEND: server action `sendMagicLinks` para el panel + completar auto-send en SPEC-05
6. FRONTEND: `SendMagicLinkModal` con lista de destinatarios + feedback
7. FRONTEND: actualizar `AccessModal` para mensaje de link expirado

### Dependencias
- `01-auth` ✅ · `03-clients-and-recipients` ✅ · `05-reports` ✅ · `06-report-viewer` ✅

---

## Tests Requeridos

### Tests de integración obligatorios (PROJECT-CONSTITUTION.md)
- Consumo de token válido → sesión creada con `recipient_id` + cookie 48h + redirect limpio
- Consumo de token expirado → redirect con `?error=link_expired`
- Consumo de token ya consumido → mismo error que expirado
- Doble consumo simultáneo → solo uno crea sesión (atomicidad)

---

## Out of Scope (Explícito)

- Modo presentación (SPEC-09)
- Notificaciones in-app al empleado cuando el cliente abre el informe (SPEC-10)
- Historial de envíos de magic links por informe
- Revocar magic links enviados (el empleado puede regenerar el PIN para invalidar todo el acceso)

---

## Notas de Implementación

### Atomicidad del consumo: UPDATE con `.is("consumed_at", null)` como guarda
El consumo atómico se implementa con dos pasos: (1) fetch del token para validar, (2) UPDATE con condición `.is("consumed_at", null)`. Si el UPDATE afecta 0 filas, otro request lo consumió primero. Supabase PostgREST no expone `UPDATE ... RETURNING WHERE` de forma directa — esta es la alternativa disponible. La ventana de race condition es mínima (microsegundos entre fetch y update en el mismo servidor).

### Token expiry: 48 horas (diferente a SPEC-00 que decía 30 minutos)
Durante la revisión de SPEC-07, se acordó cambiar la expiración de 30 minutos a 48 horas para acomodar clientes que no revisan el email inmediatamente. Actualizado en SPEC-07 y en `src/lib/magic-link/send.ts` (`TOKEN_HOURS = 48`).

### Auto-send en `createReport` / `addVersion`: `checkPrimaryRecipient` extendida
La función `checkPrimaryRecipient` fue extendida para devolver también `recipientId`, `spaceSlug` y `clientName`, necesarios para llamar a `generateAndSendMagicLink` directamente desde las server actions de SPEC-05.

### Resend: fallback a console.log si `RESEND_API_KEY` no está definida
En desarrollo sin `RESEND_API_KEY`, `generateAndSendMagicLink` imprime la URL del magic link en la consola en lugar de enviar el email. Esto permite probar el flujo sin necesitar Resend configurado.

### `linkExpired` como prop de `ViewerShell` y `AccessModal`
El servidor renderiza `linkExpired=true` cuando `searchParams.error === "link_expired"`. El `AccessModal` inicializa su `feedback` state con el mensaje de caducidad directamente en la construcción del estado — no necesita `useEffect`.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial | Claude Code |
| 1.1 | 2026-06-02 | Expiración cambiada de 30 min a 48 horas. Añadidas Notas de Implementación: atomicidad, token expiry, auto-send extendido, Resend fallback, linkExpired prop | Claude Code |
