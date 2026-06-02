# SPEC-06: Viewer del Informe (Vista Cliente)

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Vista pública del informe a la que accede el cliente. No requiere cuenta. El acceso se establece mediante sesión cookie de 48h, que se crea bien verificando el PIN o bien consumiendo un magic link (SPEC-07). La página es un shell HTML vacío que, tras validar la sesión, carga el documento principal (PDF o HTML) y la lista de adjuntos descargables desde endpoints protegidos server-side. El contenido nunca viaja en la carga inicial de la página.

---

## Actores

- **Cliente / Destinatario:** Accede al informe mediante PIN o magic link. Solo lectura.
- **Sistema:** Valida sesión, sirve contenido desde Storage, gestiona rate limiting de PIN.

---

## Flujos Principales

### Flujo 1: Acceso a la URL del informe — cookie válida

1. El cliente abre `informes.immoral.es/[space-slug]/[report-slug]`
2. El servidor detecta la cookie de sesión `informes_session` y verifica:
   - El hash del token existe en `report_sessions`
   - El `report_id` de la sesión coincide con el informe solicitado (scope)
   - `expires_at > now()`
3. Si la sesión es válida: el servidor renderiza el shell del viewer con la sesión activa
4. El cliente carga el contenido del informe vía fetch a `/api/reports/content`
5. El documento se renderiza (PDF.js para PDF, blob iframe para HTML)
6. Los adjuntos se muestran en la sección inferior con botones de descarga

### Flujo 2: Acceso a la URL del informe — sin cookie o cookie inválida

1. El cliente abre la URL del informe
2. El servidor detecta que no hay sesión válida
3. Se renderiza el shell de la página con el **modal de acceso** (el documento no se carga)
4. El modal muestra dos opciones:
   - **Pestaña "Acceder con PIN":** campo numérico de 4 dígitos + botón "Acceder"
   - **Pestaña "Recibir enlace":** campo de email + botón "Enviarme un enlace"
5. El cliente elige una opción

### Flujo 3: Acceso por PIN

1. El cliente introduce el PIN de 4 dígitos y hace clic en "Acceder"
2. El navegador hace POST a `/api/reports/verify` con `{ pin, report_id }`
3. El servidor:
   a. Verifica si la IP+report_id está bloqueada (rate limiting)
   b. Recupera el `pin_hash` del informe usando el admin client
   c. Compara con bcrypt
   d. Si correcto: genera session token, lo hashea, lo guarda en `report_sessions`, devuelve `Set-Cookie` (HttpOnly, Secure, SameSite=Strict, 48h)
   e. Si incorrecto: incrementa `pin_attempts`; si supera 5 → bloqueo 30 min
4. En respuesta exitosa: el cliente carga el documento (Flujo 1 desde paso 4)
5. Mensaje de error genérico ante PIN incorrecto o bloqueo (mismo mensaje — no revela el motivo)

### Flujo 4: Solicitar magic link desde el modal

1. El cliente introduce su email en la pestaña "Recibir enlace" y hace clic en "Enviarme un enlace"
2. El navegador hace POST a `/api/reports/request-magic-link` con `{ email, report_id }`
3. El servidor verifica si el email es un destinatario registrado para el cliente de este informe
4. Independientemente del resultado, responde con: "Si este email está registrado, recibirás un enlace de acceso."
5. Si el email es válido: genera magic link token, lo envía por email (SPEC-07)
6. Rate limiting: máx 3 solicitudes por (IP + recipient_id) en 10 min

### Flujo 5: Renderizar documento PDF

1. El cliente carga el viewer (sesión válida)
2. Se hace fetch a `/api/reports/content?report_id=[id]&version=[current]`
3. El servidor valida sesión y devuelve el PDF en binario
4. El cliente renderiza con PDF.js a pantalla completa con controles de paginación (página anterior/siguiente, número de página)
5. En mobile (ancho < 768px): se añade botón "Descargar PDF" como alternativa si el renderizado es limitado

### Flujo 6: Renderizar documento HTML

1. El cliente carga el viewer (sesión válida)
2. Se hace fetch a `/api/reports/content?report_id=[id]&version=[current]`
3. El servidor valida sesión y devuelve el HTML como texto
4. El cliente crea un `Blob URL` del HTML y lo asigna como `src` de un iframe
5. El iframe ocupa el área principal de la pantalla

### Flujo 7: Descargar adjunto

1. El cliente hace clic en un adjunto en la sección de adjuntos del viewer
2. El navegador hace GET a `/api/reports/attachments/[attachment_id]`
3. El servidor valida sesión + que el adjunto pertenece al informe de la sesión
4. Devuelve el archivo con las cabeceras `Content-Disposition: attachment; filename="[filename]"`

### Flujo 8: Sesión expirada durante la visita

1. El cliente tiene el viewer abierto
2. La cookie expira (48h transcurridas)
3. En el próximo intento de carga de contenido (`/api/reports/content`), el servidor devuelve 401
4. El viewer detecta el 401 y redirige a la URL del informe (sin parámetros) → se muestra el modal de acceso

---

## Flujos Alternativos / Edge Cases

- **Informe no encontrado** (space o slug no existen): el servidor devuelve 404 con página genérica.
- **IP bloqueada por rate limiting:** El modal muestra "Demasiados intentos. Inténtalo de nuevo en 30 minutos." sin revelar si el PIN es incorrecto.
- **Cookie de un informe diferente:** Rechazada — el scope de sesión valida que `report_sessions.report_id` coincide con el informe solicitado.
- **HTML con recursos externos (CSS, imágenes por URL):** El iframe los carga si están disponibles en línea.
- **PDF muy grande (>20MB):** PDF.js puede tardar. Se muestra spinner de carga durante la descarga.
- **Informe sin adjuntos:** La sección de adjuntos no aparece.
- **Magic link ya consumido o expirado** (Flujo 4 mal utilizado): ver SPEC-07.

---

## Criterios de Aceptación

- [ ] CA-01: La URL del informe es accesible sin autenticación de empleado
- [ ] CA-02: Si hay sesión cookie válida y scoped al informe, el viewer carga el documento directamente sin mostrar el modal de acceso
- [ ] CA-03: Si no hay sesión válida, se muestra el modal de acceso (no el documento)
- [ ] CA-04: El documento principal (PDF o HTML) nunca aparece en la respuesta inicial de la página antes de validar sesión
- [ ] CA-05: El PIN incorrecto incrementa el contador de intentos. Al superar 5 intentos, la IP queda bloqueada 30 minutos para ese informe
- [ ] CA-06: El bloqueo de PIN persiste en base de datos (no solo en memoria)
- [ ] CA-07: El mensaje de error de PIN incorrecto y el de IP bloqueada son idénticos (no revelan el motivo)
- [ ] CA-08: La sesión cookie se crea con flags HttpOnly, Secure, SameSite=Strict y duración 48h
- [ ] CA-09: La sesión cookie está scoped a un report_id concreto — una sesión de informe A no da acceso a informe B
- [ ] CA-10: PDF se renderiza con PDF.js con controles de paginación
- [ ] CA-11: HTML se renderiza en iframe con blob URL (el HTML servido no se inyecta en el DOM de la página)
- [ ] CA-12: Los adjuntos se descargan vía endpoint autenticado con `Content-Disposition: attachment`
- [ ] CA-13: El endpoint `/api/reports/attachments/[id]` valida que el adjunto pertenece al informe de la sesión activa
- [ ] CA-14: La solicitud de magic link desde el modal devuelve el mismo mensaje independientemente de si el email está registrado o no
- [ ] CA-15: Cuando la sesión expira durante la visita, el viewer detecta el 401 y redirige al modal de acceso
- [ ] CA-16: En mobile (< 768px), el viewer PDF muestra botón "Descargar PDF" como alternativa

---

## Modelo de Datos

Ver SPEC-00, secciones `report_sessions` y `pin_attempts`.

No se crean tablas nuevas en esta spec. Se usan las migradas en SPEC-05 y las de rate limiting de SPEC-00 (migrar `pin_attempts` y `magic_link_requests` en esta spec).

**Migración adicional en esta spec:** tabla `report_sessions` y `pin_attempts` (necesarias para el flujo de sesiones y rate limiting).

---

## UI / Páginas Afectadas

### Páginas nuevas

| Ruta | Descripción |
|------|-------------|
| `/[space-slug]/[report-slug]` | Shell del viewer público. Sin layout del panel (sin Navbar). |

### Layout del viewer

```
┌────────────────────────────────────────────────────┐
│ [Logo Immoral pequeño]   [Nombre del informe]  [Adjuntos ▾]  │  ← Header minimal fijo
├────────────────────────────────────────────────────┤
│                                                    │
│            Documento principal                     │  ← PDF.js o iframe HTML
│         (ocupa el espacio restante)                │
│                                                    │
└────────────────────────────────────────────────────┘
```

- Header fijo de ~48px con: logo Immoral (pequeño, enlaza a immoral.marketing), nombre del informe (truncado), dropdown de adjuntos (si los hay)
- El documento ocupa `height: calc(100vh - 48px)`
- En mobile: header simplificado, botón de descarga en lugar del dropdown

### Componentes reutilizables
- `AccessModal` — modal de acceso con dos pestañas (PIN / Email)
- `PinInput` — campo de 4 dígitos con auto-avance entre cifras
- `PdfViewer` — wrapper PDF.js con controles de página
- `ViewerHeader` — header fijo con logo, nombre e icono de adjuntos

### Breakpoints obligatorios
375px · 768px · 1280px

---

## API / Endpoints

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/reports/verify` | Valida PIN + rate limit → Set-Cookie sesión 48h | Pública |
| GET | `/api/reports/content` | Sirve documento desde Storage | Cookie `informes_session` |
| GET | `/api/reports/attachments/[id]` | Sirve adjunto con `Content-Disposition: attachment` | Cookie `informes_session` |
| POST | `/api/reports/request-magic-link` | Solicita magic link al email (SPEC-07) | Pública |

### Cookie de sesión

```
Nombre: informes_session
Valor:  [session_token raw — 43 chars base64url]
Flags:  HttpOnly; Secure; SameSite=Strict
Max-Age: 172800 (48h en segundos)
Path:   /
```

### POST /api/reports/verify — Request/Response

```
Request:  { pin: string (4 dígitos), report_id: string (uuid) }
Response éxito:    { ok: true }  + Set-Cookie informes_session
Response error:    { error: "PIN incorrecto o cuenta bloqueada" }
Response bloqueado: { error: "PIN incorrecto o cuenta bloqueada" }  ← mismo mensaje (CA-07)
```

### GET /api/reports/content — Query params

```
?report_id=[uuid]&version=[number, opcional — si se omite, usa current_version]
```

Response: binario PDF (`Content-Type: application/pdf`) o texto HTML (`Content-Type: text/html`)

---

## Notas de Seguridad

- El contenido del informe (PDF o HTML) NUNCA aparece en el HTML de la página antes de validar la sesión.
- El HTML de informes se sirve como `text/html` puro y el cliente lo carga en un blob URL / iframe — nunca se inyecta en el DOM de la página del viewer para evitar XSS.
- La cookie `informes_session` es HttpOnly (JavaScript no puede leerla). SameSite=Strict (no se envía en requests cross-site). Secure (solo HTTPS).
- El token de sesión se almacena en BD como hash SHA-256+pepper. El token raw solo existe en la cookie del cliente.
- Rate limiting de PIN: persiste en BD, clave `(ip_address, report_id)`. 5 intentos → bloqueo 30 min.
- El endpoint de content verifica: (1) cookie presente, (2) hash del token en BD, (3) `report_id` de la sesión coincide con el solicitado, (4) `expires_at > now()`.
- El endpoint de adjuntos verifica adicionalmente que `report_attachments.report_id` coincide con el `report_id` de la sesión.
- SECURITY-AGENT aplicará el checklist de `.brianspec/security-checklists.md`.

---

## Plan de Implementación

### Arquitectura propuesta
- **DB-AGENT:** migración `report_sessions` + `pin_attempts` + RLS (service_role only) + regenerar tipos
- **BACKEND-AGENT:** `/api/reports/verify`, `/api/reports/content`, `/api/reports/attachments/[id]`, `/api/reports/request-magic-link` (placeholder SPEC-07)
- **FRONTEND-AGENT:** `/[space]/[slug]/page.tsx` (shell server) + `AccessModal` + `PdfViewer` + `ViewerHeader`

### Desglose de tareas
1. DB: migración `report_sessions` + `pin_attempts` (RLS service_role only) + regenerar tipos
2. BACKEND: `POST /api/reports/verify` — rate limit + bcrypt + Set-Cookie
3. BACKEND: `GET /api/reports/content` — validar sesión + servir binario
4. BACKEND: `GET /api/reports/attachments/[id]` — validar sesión + scope + servir archivo
5. BACKEND: `POST /api/reports/request-magic-link` — placeholder hasta SPEC-07
6. FRONTEND: `/[space]/[slug]/page.tsx` — lookup informe + check cookie server-side + render shell
7. FRONTEND: `AccessModal` con `PinInput` + email tab
8. FRONTEND: `PdfViewer` con PDF.js
9. FRONTEND: `ViewerHeader` con adjuntos dropdown

### Dependencias
- `01-auth` ✅ · `05-reports` ✅ · SPEC-07 (magic link — el botón es placeholder)

---

## Tests Requeridos

### Tests de integración obligatorios (PROJECT-CONSTITUTION.md)
- Acceso con PIN correcto → Set-Cookie → contenido accesible
- Acceso con PIN incorrecto × 5 → bloqueo 30 min → mismo mensaje
- Cookie de informe A usada en informe B → 401

---

## Out of Scope (Explícito)

- Magic link completo (lógica de envío y consumo — SPEC-07)
- Modo presentación sincronizado (SPEC-09)
- Feedback / comentarios del cliente (SPEC-08)
- Visor de versiones anteriores para el cliente (solo ve la versión activa)
- Modo "solo lectura compartido" tipo viewer_only de propuestas (no aplica — el acceso es siempre por sesión autenticada)

---

## Notas de Implementación

### PDF.js v6 — `render()` requiere `canvas` en `RenderParameters`
En pdfjs-dist v6 (la versión instalada), `page.render()` exige el campo `canvas` (el elemento HTMLCanvasElement) además de `canvasContext`. Sin él, TypeScript falla con "Property 'canvas' is missing in type 'RenderParameters'". Pasar siempre `{ canvasContext: ctx, viewport, canvas }`.

### Viewer shell como Server Component — cookies validadas en servidor
La página `/[space]/[slug]/page.tsx` es un Server Component que valida la cookie `informes_session` con el admin client antes de renderizar. Si la sesión es válida, el `ViewerShell` arranca en estado `authenticated=true` y la carga del documento empieza inmediatamente (sin pestañeo del modal de acceso).

### `inform_session` cookie: `secure: true` solo en producción
La cookie usa `secure: process.env.NODE_ENV === "production"` para funcionar en localhost (HTTP) durante desarrollo sin HTTPS. En producción siempre se marca como Secure.

### HTML viewer: `sandbox="allow-same-origin allow-scripts"` en el iframe
Sin `allow-scripts`, los HTMLs con JS propio no se ejecutan. Con `allow-same-origin allow-scripts` se habilita el comportamiento de un HTML normal. No se añade `allow-forms` ni `allow-popups` para limitar la superficie. Si un HTML específico lo necesita, revisar caso a caso.

### PDF blob URL: carga doble de bytes en PdfViewer
El PDF ya está disponible como blob URL (ObjectURL del ArrayBuffer). `PdfViewer` lo fetchea de nuevo con `fetch(url)` para obtener los bytes. Esta doble carga se puede optimizar en el futuro pasando el ArrayBuffer directamente como prop. En MVP es aceptable.

### `/api/reports/request-magic-link` es un placeholder hasta SPEC-07
El endpoint existe y devuelve el mensaje genérico correcto, pero no envía ningún email ni crea tokens. SPEC-07 completará este endpoint.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial | Claude Code |
| 1.1 | 2026-06-02 | Añadidas Notas de Implementación: pdfjs-dist v6 canvas, server component cookie, secure en prod, iframe sandbox, blob URL doble fetch, magic-link placeholder | Claude Code |
