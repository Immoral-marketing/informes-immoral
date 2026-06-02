# PROJECT-CONSTITUTION.md

**Proyecto:** informes.immoral.es
**Versión de Constitution del proyecto:** 1.0
**Hereda de:** BRIANSPEC-CONSTITUTION.md v1.0
**Última actualización:** 2026-06-02
**Owner del proyecto:** David (immoralia)

> Este archivo define las decisiones fundacionales específicas de este proyecto. Hereda y complementa los principios globales de `BRIANSPEC-CONSTITUTION.md` — nunca los contradice. Fue generado durante la sesión de bootstrap del proyecto (2026-06-02).

---

## 1. Descripción del Proyecto

**Tipo de proyecto:** web-app

**Qué problema resuelve:**
Los informes y reportes de clientes se entregan actualmente por email o Drive: sin control de acceso, sin versiones, sin confirmación de lectura, sin posibilidad de feedback estructurado. `informes.immoral.es` centraliza la entrega: cada informe tiene URL pública protegida por magic link (al email autorizado del cliente) o PIN, el documento principal se renderiza en el navegador (PDF o HTML), el cliente puede descargar adjuntos y, en Fase 2, dejar comentarios anclados al documento que el empleado responde en hilo.

**Actores principales:**
- **Admin:** Empleado con acceso total. Gestiona verticales, dominios autorizados, usuarios.
- **Empleado:** Crea y gestiona sus informes. Gestiona destinatarios de los clientes que ha creado.
- **Destinatario (cliente externo):** Persona externa con email autorizado. Recibe magic links y/o accede por PIN. Su identidad queda asociada a cada acceso y comentario.

**Alcance del MVP (Fase 1):**
Auth empleados · gestión de verticales · gestión de clientes + destinatarios · espacios cliente × vertical · creación de informes (PDF o HTML) + adjuntos + versionado + envío manual con toggle de auto-envío · viewer cookie-first (magic link + PIN) · render PDF/HTML protegido · descarga de adjuntos protegida · dashboards empleado y admin · arquitectura de seguridad.

**Fuera de alcance (explícito en MVP):**
- Conversión automática PPTX/Keynote → PDF (el empleado exporta manualmente)
- Google Slides / Canva embebidos
- Feedback del cliente / comentarios anclados (Fase 2)
- Modo presentación sincronizado (Fase 3)
- Analytics (Fase 3)
- Tests automatizados del panel interno (solo flujos de acceso críticos — ver sección 9)

---

## 2. Stack Tecnológico

### Lenguajes y runtime
- TypeScript 5 sobre Node.js 20
- Modo estricto: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- Prohibido `any` en todo el codebase

### Frameworks y librerías principales

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Next.js App Router | 15 |
| Estilos | Tailwind CSS + shadcn/ui | v4 |
| Tipografía | Lexend (Google Fonts) | todos los pesos |
| Auth | Supabase Auth (Google OAuth + Magic Link) | — |
| ORM / BD | Supabase JS Client (`@supabase/supabase-js`, `@supabase/ssr`) | — |
| Email | Resend | — |
| PDF render | PDF.js (`pdfjs-dist`) | — |
| Tokens | nanoid (generación) + SHA-256 nativo (hash) | — |
| Hashing PIN | bcryptjs (cost ≥ 12) | — |
| Validación | zod | — |
| Package manager | pnpm | — |

### Servicios y plataformas

| Servicio | Propósito |
|---------|-----------|
| Supabase (proyecto nuevo) | PostgreSQL + Auth + Storage (privado) + Realtime |
| Resend | Magic links al cliente + notificaciones al empleado |
| Vercel | Hosting + preview branches |

### Justificación del stack
Stack idéntico a `propuestas.immoral.es` (ya validado en producción) con la adición de PDF.js para el viewer de PDF. La decisión de Supabase nuevo (en lugar de compartido) se tomó para aislar completamente los datos de clientes y los tokens de acceso entre los dos productos.

---

## 3. Integraciones Externas

### Skills externas
Ninguna en Fase 1.

### MCPs
Ninguno en Fase 1.

### APIs de terceros

| Servicio | Propósito | Auth |
|---------|-----------|------|
| Resend API | Envío de emails | API Key en variable de entorno |
| Google OAuth | Auth de empleados | Client ID + Secret en Supabase Auth |

---

## 4. Herramienta de IA Principal

**Copiloto declarado:** Claude Code

**Archivos de contexto generados:**
- `CLAUDE.md` — resumen operativo para sesiones de Claude Code
- `AGENTS.md` — agentes de construcción + formato estándar de spec
- `EXECUTION-GUIDE.md` — prompts copy-paste para implementar/revisar specs

---

## 5. Agentes de Construcción

Los agentes universales (SPEC-AGENT, REVIEW-AGENT, SECURITY-AGENT) vienen del sistema BrianSpec y están definidos en `.brianspec/agents.md`. Los agentes de construcción específicos de este proyecto están en `AGENTS.md`:

| Agente | Responsabilidad |
|--------|----------------|
| FRONTEND-AGENT | Componentes React/Next.js, páginas, viewer PDF/HTML, UI del panel |
| BACKEND-AGENT | API routes, server actions, lógica de tokens, ciclo de sesiones |
| DB-AGENT | Migraciones SQL, políticas RLS, índices |

---

## 6. Convenciones de Código

### Nomenclatura

| Elemento | Convención | Ejemplo |
|---------|-----------|---------|
| Componentes React | PascalCase | `ReportCard.tsx` |
| Hooks | camelCase + prefijo `use` | `useReports.ts` |
| Utils y libs | camelCase | `formatSlug.ts` |
| Tipos / Interfaces | PascalCase | `Report`, `ReportCardProps` |
| API routes | kebab-case | `/api/reports/[id]/request-magic-link` |
| Variables de entorno | UPPER_SNAKE_CASE | `SUPABASE_ANON_KEY` |
| Migraciones SQL | timestamp + descripción | `20260601000000_create_reports.sql` |

### Estructura de archivos
Ver sección "Estructura de Archivos del Proyecto" en `CLAUDE.md`.

### Estilo
- Sin comentarios salvo que el WHY no sea obvio (constraint oculto, invariante no evidente)
- Sin backwards-compatibility hacks (renombrar `_vars`, re-exportar tipos de código eliminado)
- No usar `any` en TypeScript

### Breakpoints responsive
| Nombre | Ancho | Uso |
|--------|-------|-----|
| mobile | 375px | Viewer + UI |
| tablet | 768px | Viewer + UI |
| desktop | 1280px | Viewer + UI (default) |

---

## 7. Modelo de Datos

Ver `specs/00-overview.md`, sección "Modelo de Datos Completo". Las migraciones SQL son la fuente autoritativa; los tipos TypeScript se generan desde Supabase o se mantienen manualmente en `src/types/index.ts`.

---

## 8. Convenciones Operativas

### Git
- **Naming de ramas:** `feat/nombre-spec`, `fix/descripcion`, `chore/tarea`
- **Convención de commits:** Convencional Commits (`feat:`, `fix:`, `chore:`, `docs:`) en inglés
- **Política de PRs:** Una PR por spec implementada. Requiere aprobación de REVIEW-AGENT antes de merge.

### Despliegue
Vercel con deploy automático en rama `main`. Preview automático por rama con URL única.
Variables de entorno configuradas en Vercel (no en el repo).

### Variables de entorno

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL              # informes@immoral.es
JWT_SECRET
PIN_ENCRYPTION_KEY             # openssl rand -hex 32
SESSION_TOKEN_HASH_SECRET      # openssl rand -hex 32
NEXT_PUBLIC_APP_URL            # https://informes.immoral.es
```

---

## 9. Restricciones Específicas del Proyecto

### Seguridad — Principios Arquitectónicos

**El contenido del informe nunca viaja sin autenticación server-side.** Flujo de acceso:

```
GET /[space]/[slug]
  → Si cookie scoped válida → viewer carga
  → Si no → modal: [Pegar PIN] | [Reenviarme magic link]

POST /api/reports/verify (PIN)
  → bcrypt + rate limit (5 intentos/IP/informe → bloqueo 30 min)
  → Set-Cookie HttpOnly Secure SameSite=Strict 48h scoped a report_id

POST /api/reports/request-magic-link
  → genera token 32 bytes, persiste SHA-256, envía email, rate limit (3 solicitudes/10 min)

GET /[space]/[slug]/r/[token]
  → valida hash + no consumido + no expirado → consumed_at → Set-Cookie 48h → redirect viewer

GET /api/reports/content
  → valida cookie + scope report_id → sirve contenido desde Storage

GET /api/reports/attachments/[id]
  → valida cookie + scope + adjunto ∈ informe → sirve archivo
```

| Regla | Detalle |
|-------|---------|
| Cookie | HttpOnly, Secure, SameSite=Strict, 48h, scoped a report_id |
| PIN | bcrypt cost ≥ 12, nunca texto plano, nunca en API responses |
| Magic link token | 32 bytes mínimo, solo SHA-256 en BD, one-time (consumed_at), expiración 30 min |
| Session token | 32 bytes mínimo, solo SHA-256+pepper en BD, cookie lleva el raw |
| Rate limit PIN | 5 intentos fallidos → bloqueo 30 min, persistido en BD |
| Rate limit magic link | 3 solicitudes → 10 min, persistido en BD |
| Slugs | Inmutables tras primer guardado |
| Adjuntos | Nunca URL pública de Storage |

### Restricciones de acceso a BD
Las tablas de sesiones y tokens (`report_sessions`, `magic_link_tokens`, `pin_attempts`, `magic_link_requests`) tienen RLS que rechaza todo acceso de claves `anon` y `authenticated`. Solo el cliente con `service_role` (instanciado en `src/lib/supabase/admin.ts`) puede leerlas.

### Restricción de tipado
Prohibido `any`. Prohibido tipo explícito `unknown` sin narrowing inmediato. TypeScript modo estricto sin excepciones.

---

## 10. Cómo Aplica BrianSpec a Este Proyecto

### Umbral para spec

**Requiere spec:**
- Cualquier cambio que afecte al usuario final (empleado o cliente)
- Cualquier cambio en el modelo de datos
- Cualquier cambio en los flujos de autenticación o autorización
- Cualquier integración con servicio externo nuevo

**NO requiere spec:**
- Hotfixes evidentes (typos, null checks, fixes menores sin impacto en comportamiento)
- Refactors internos sin cambio funcional
- Cambios de copy sin cambio de comportamiento
- Añadir un componente UI genérico al directorio `ui/` si no hay nueva funcionalidad

### Política de tests (P9 — Tests donde aportan valor)

**Tests de integración OBLIGATORIOS** (flujos de acceso al informe):
- Validación de PIN: intento correcto, intento incorrecto, bloqueo tras 5 intentos
- Consumo de magic link: válido, expirado, ya consumido
- Acceso a contenido sin cookie, con cookie válida, con cookie de informe distinto

**Opcionales / no obligatorios en MVP:**
- Tests unitarios de utilidades (slugify, hashToken) — se prueban implícitamente en integración
- Tests E2E del panel interno
- Tests del viewer PDF (complejidad alta, valor bajo en MVP)

### Ciclo de trabajo

```
brianspec-spec    → Generar/clarificar specs nuevas
brianspec-build   → Implementar spec con revisión automática (REVIEW + SECURITY)
brianspec-archive → Cerrar y archivar spec implementada
```

---

## 11. Enmiendas a Esta Constitution del Proyecto

Esta Constitution puede modificarse cuando una decisión fundacional cambie. Cualquier cambio se versiona en `CHANGELOG.md` del proyecto y se comunica al equipo antes de aplicarse.

Las enmiendas a `BRIANSPEC-CONSTITUTION.md` global siguen su propio proceso (sección 4 de ese documento). Este proyecto no puede modificar la Constitution global.

---

*Proyecto informes.immoral.es — Generado con BrianSpec v1.0 el 2026-06-02*
*Owner: David (immoralia) · Visión: Marco Sapiña (CEO de Immoral Group)*
