# SPEC-11: Arquitectura de Seguridad Consolidada

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Auditoría de seguridad del MVP y consolidación de los controles implementados en las specs 01–07. Esta spec no añade features de usuario — añade capas de hardening transversales al proyecto (headers HTTP, validaciones defensivas de input, documentación del modelo de amenazas) y garantiza que no existen huecos entre specs.

---

## Actores

- **Sistema:** Todo el stack (Next.js, Supabase, Storage, proxy.ts)
- **Atacante externo:** Objetivo: acceder a informes sin sesión válida, extraer tokens, hacer clickjacking, enumerar recursos

---

## Flujos / Controles de Seguridad

### Control 1: HTTP Security Headers (global)

Todos los responses de Next.js deben incluir headers de seguridad configurados en `next.config.ts`:

| Header | Valor | Propósito |
|--------|-------|-----------|
| `X-Frame-Options` | `DENY` | Evita clickjacking (nuestras páginas no se incrustan en iframes externos) |
| `X-Content-Type-Options` | `nosniff` | Evita MIME type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limita info en Referer header |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Fuerza HTTPS en todos los subdomios (solo prod) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Deshabilita APIs de HW no usadas |

**No** se implementa `Content-Security-Policy` en esta fase — PDF.js requiere `blob:` workers y el viewer HTML usa `<iframe>` con scripts; la CSP completa es compleja y se deja para un hardening posterior al go-live.

### Control 2: Validación defensiva de inputs en API routes públicas

Endpoints públicos (`/api/reports/verify`, `/api/reports/request-magic-link`) deben validar:
- `report_id`: formato UUID válido (regex) antes de cualquier query a BD
- `email`: longitud máxima 254 chars (RFC 5321) + trim
- `pin`: ya validado con `/^\d{4}$/`

Propósito: evitar queries innecesarias con inputs malformados, reducir superficie de SQL injection (aunque Supabase usa queries parametrizadas, la defensa en profundidad aplica).

### Control 3: Modelo de datos de sesión — revisión

Verificar que todas las tablas sensibles tienen RLS deny-all y son accesibles únicamente por `service_role`:

| Tabla | RLS | Acceso |
|-------|-----|--------|
| `report_sessions` | `FOR ALL USING (false)` | service_role only |
| `pin_attempts` | `FOR ALL USING (false)` | service_role only |
| `magic_link_tokens` | `FOR ALL USING (false)` | service_role only |
| `magic_link_requests` | `FOR ALL USING (false)` | service_role only |
| `profiles` | SELECT propia fila | employee autenticado |
| `reports` | SELECT si empleado | employee autenticado |
| `client_spaces` | SELECT si empleado | employee autenticado |
| `client_recipients` | SELECT si empleado | employee autenticado |
| `verticals` | SELECT pública | todos |

### Control 4: Variables de entorno — segregación

| Variable | Visibilidad | Propósito |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Pública (cliente) | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Pública (cliente) | Anon key (RLS activo) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** | Admin client — bypassa RLS |
| `SESSION_TOKEN_HASH_SECRET` | **Solo servidor** | Pepper HMAC para token hashes |
| `RESEND_API_KEY` | **Solo servidor** | Envío de emails |

Regla: **ninguna variable `NEXT_PUBLIC_*` puede contener secrets**. El service_role key y los peppers nunca deben aparecer en el bundle de cliente.

### Control 5: Contenido protegido — flujo de acceso

El contenido de los informes (PDF/HTML) nunca se sirve directamente desde Storage URLs públicas. El flujo es:

```
Cliente → GET /api/reports/content?report_id=X
         → validateSession() (token hash en BD, expiry check)
         → Admin client download from private bucket
         → Stream bytes con Cache-Control: private, no-store
```

Este control garantiza que aunque alguien conozca el `storage_path`, no puede acceder al archivo sin sesión válida.

### Control 6: Iframe HTML — sandbox

El viewer HTML usa `<iframe sandbox="allow-same-origin allow-scripts">`. Los permisos concedidos son mínimos:
- `allow-same-origin`: necesario para scripts en el HTML del cliente
- `allow-scripts`: los HTMLs de informe pueden incluir interactividad básica

No se incluye `allow-forms`, `allow-popups`, `allow-top-navigation` — el iframe no puede navegar fuera ni enviar formularios al dominio padre.

---

## Criterios de Aceptación

- [ ] CA-01: Security headers globales configurados en `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS, Permissions-Policy)
- [ ] CA-02: `/api/reports/verify` valida que `report_id` sea UUID válido antes de query a BD
- [ ] CA-03: `/api/reports/request-magic-link` valida UUID en `report_id` y max-length 254 en `email`
- [ ] CA-04: `SUPABASE_SERVICE_ROLE_KEY` y `SESSION_TOKEN_HASH_SECRET` nunca en variables `NEXT_PUBLIC_*`
- [ ] CA-05: Build de producción pasa sin errores con los nuevos headers
- [ ] CA-06: Los headers de seguridad no interfieren con el funcionamiento del viewer PDF ni del iframe HTML

---

## Modelo de Amenazas (out of scope documentado)

### Amenazas mitigadas por este MVP
- **Clickjacking** → X-Frame-Options: DENY
- **MIME sniffing** → X-Content-Type-Options: nosniff
- **Fuerza bruta PIN** → Rate limiting 5/30min + bcrypt cost 12
- **Magic link replay** → Consumo atómico + one-time
- **Enumeración de emails** → Respuesta genérica siempre
- **Token theft en tránsito** → HTTPS only (HSTS) + cookie Secure
- **Token theft en BD** → Solo hashes almacenados, nunca tokens raw
- **Acceso no autorizado al contenido** → Todos los binarios servidos via API con validación de sesión
- **CSRF en panel empleado** → Next.js Server Actions tienen CSRF protection built-in via origin header check

### Amenazas out of scope (post-go-live)
- **Content Security Policy completa** — compleja con PDF.js blob workers; se deja para hardening posterior
- **Subresource Integrity** para assets externos
- **WAF / DDoS protection** — responsabilidad de Vercel/Supabase
- **Audit log de accesos** — SPEC-10/futuro
- **Revocación de sesiones activas** — solo se invalida via regenerate PIN

---

## Plan de Implementación

### BACKEND-AGENT
1. Añadir security headers en `next.config.ts` → `headers()` config
2. Añadir validación UUID en `/api/reports/verify`
3. Añadir validación UUID + email length en `/api/reports/request-magic-link`

### Sin cambios en BD ni Storage
Esta spec no requiere migraciones nuevas.

---

## Tests Requeridos

- Build de producción pasa (`pnpm build`)
- Verificar en browser devtools que los headers están presentes en responses

---

## Out of Scope (Explícito)

- Content-Security-Policy (hardening post go-live)
- Audit log de accesos de clientes
- WAF / DDoS
- Análisis de dependencias npm (supply chain)

---

## Notas de Implementación

### Security headers en `next.config.ts` con `headers()` — no en proxy.ts
Los headers de seguridad se configuran en `next.config.ts` mediante la función `headers()` y aplican a todas las rutas `/(.*)}`. Se eligió este enfoque (en lugar de añadirlos en `proxy.ts`) porque `next.config.ts` aplica los headers antes de que el proxy procese la request, es la ubicación estándar de Next.js y no requiere importar módulos adicionales en el edge runtime.

### HSTS activado también en desarrollo
`Strict-Transport-Security` se añade en todos los entornos (no solo producción) porque: (1) en desarrollo el valor es inerte sin HTTPS real, (2) no genera errores ni warnings en localhost, (3) simplifica la configuración al evitar condicionales por entorno.

### Content-Security-Policy diferida — complejidad con PDF.js blob workers
PDF.js v6 carga el worker como `blob:` URL generado en runtime. Una CSP que incluya `worker-src blob:` es posible pero requiere testing extensivo con el viewer. Se documenta como hardening post go-live.

### UUID_REGEX definido localmente en cada route — no como util compartido
Se decidió no extraer el regex a un módulo compartido porque solo se usa en 2 rutas públicas y crear un módulo `src/lib/utils/validation.ts` para un único regex sería over-engineering. Si en specs futuras hay más validaciones de inputs, se extrae entonces.

### `emailTrimmed` en lugar de `email.trim()` — eliminación de doble trim
El input `email` del body podía ser `undefined` (TypeScript lo tipaba como `string | undefined`). Se creó `emailTrimmed` como variable para (1) el guard de null/undefined, (2) la validación de length, y (3) el uso en la query `.ilike()`. Esto evita el patrón `email?.trim() ?? ""` repetido.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial | Claude Code |
| 1.1 | 2026-06-02 | Implementada. Añadidas Notas de Implementación: headers en next.config vs proxy, HSTS en dev, CSP diferida, UUID_REGEX local, emailTrimmed | Claude Code |
