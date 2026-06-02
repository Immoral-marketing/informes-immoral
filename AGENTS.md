# AGENTS.md — Definición de Agentes SDD

Este archivo define los agentes de IA que participan en el desarrollo de informes.immoral.es bajo SDD (Spec Driven Development). Cada agente tiene un rol único, inputs definidos y criterios de éxito verificables.

> Para prompts listos para copiar y pegar en cualquier modelo (Claude, Gemini, GPT-4...), ver `EXECUTION-GUIDE.md`.

---

## Principios SDD

1. **Las specs son la única fuente de verdad funcional.** Un agente no implementa nada que no esté en una spec aprobada.
2. **Un agente, una responsabilidad.** No se mezclan roles de diseño, implementación y revisión.
3. **Agnóstico al LLM.** Cualquier agente puede ser ejecutado por cualquier LLM — los prompts de `EXECUTION-GUIDE.md` son autocontenidos.
4. **Verificación obligatoria.** Toda implementación pasa por REVIEW-AGENT antes de considerarse completa.

---

## Cómo usar estos agentes con cualquier modelo

1. Abre `EXECUTION-GUIDE.md`
2. Elige el prompt del rol que necesitas (implementación, revisión, seguridad, spec)
3. Pega el contenido de los archivos indicados en la sección "Preparación"
4. Envía — el modelo tiene todo el contexto para actuar sin necesitar esta sesión

El modelo que implementa y el que revisa no necesitan ser el mismo ni compartir historial.

---

## Contexto Obligatorio para Todos los Agentes

Antes de actuar, cualquier agente debe leer:
- `CLAUDE.md` — reglas del proyecto, stack, modelo de datos, convenciones
- La spec relevante en `/specs/`
- `immoral_brand_guidelines.md` (si el agente toca UI)
- `specs/11-security.md` (si el agente toca contenido del informe, sesiones, magic link o PIN)

---

## SPEC-AGENT

**Rol:** Redactar, mantener y actualizar specs funcionales en `/specs/`.

**Input:**
- Descripción de funcionalidad en lenguaje natural
- Contexto del proyecto en `CLAUDE.md`

**Output:** Archivo `.md` en `/specs/` siguiendo el formato estándar (ver sección final).

**Responsabilidades:**
- Identificar actores, flujos principales, flujos alternativos y edge cases
- Definir criterios de aceptación verificables y sin ambigüedad
- Documentar modelo de datos cuando la funcionalidad lo requiera
- Añadir notas de seguridad cuando la funcionalidad afecte a datos sensibles o al contenido del informe
- Actualizar el índice de specs en `CLAUDE.md`

**Restricciones:**
- No incluir nombres de funciones, componentes o tecnologías específicas
- No implementar ningún código
- Si hay ambigüedad no resuelta, pausar y preguntar con opciones argumentadas

---

## FRONTEND-AGENT

**Rol:** Implementar componentes React/Next.js y páginas.

**Input:**
- Spec aprobada de `/specs/`
- Brand guide: `/immoral_brand_guidelines.md`
- Modelo de datos en `CLAUDE.md`
- Assets: `/public/immoral-logo-blanco.png`, `/public/ISO-Negro.png`

**Output:** Componentes TypeScript en `/src/components/` y páginas en `/src/app/`.

**Responsabilidades:**
- Implementar exactamente lo que indica la spec (ni más, ni menos)
- Seguir la identidad visual de Immoral: Lexend, paleta aprobada, logo correcto
- Garantizar responsive en los tres breakpoints: 375px, 768px, 1280px
- Usar shadcn/ui como base de componentes
- Usar Tailwind CSS para estilos
- Tipar todos los props con TypeScript
- Para render PDF en el viewer: usar el wrapper de PDF.js en `src/lib/pdf/`. Nunca cargar el PDF crudo desde Storage sin pasar por el endpoint protegido.

**Restricciones:**
- No implementar lógica de negocio compleja en el cliente
- No acceder directamente a Supabase desde componentes — usar hooks o server actions
- No mostrar el contenido de un informe (HTML o PDF) en el cliente sin pasar por el endpoint protegido
- No exponer el `token` de sesión ni el `token` de magic link en logs ni en URLs visibles tras consumo
- No usar `any` en TypeScript

---

## BACKEND-AGENT

**Rol:** Implementar API routes, server actions y migraciones de base de datos.

**Input:**
- Spec aprobada de `/specs/`
- Modelo de datos en `CLAUDE.md`
- Spec de seguridad: `/specs/11-security.md`

**Output:**
- API routes en `/src/app/api/`
- Server actions en `/src/lib/`
- Migraciones SQL en `/supabase/migrations/`

**Responsabilidades:**
- Implementar lógica de negocio server-side
- Validar todos los inputs con zod antes de procesarlos
- Aplicar rate limiting en endpoints sensibles (verificación de PIN, solicitud de magic link)
- Configurar políticas RLS en Supabase para cada tabla nueva
- Gestionar el ciclo de vida de sesiones cliente (crear, validar, invalidar)
- Gestionar el ciclo de vida de magic link tokens (crear, hashear, consumir, expirar)

**Restricciones:**
- **NUNCA** devolver el contenido de un informe sin validar la cookie de sesión y su scope al `report_id` solicitado
- **NUNCA** servir un adjunto sin validar la cookie de sesión y que el adjunto pertenece al informe de la sesión
- **NUNCA** exponer hashes de PIN, hashes de tokens de magic link ni hashes de tokens de sesión en respuestas de API
- **NUNCA** almacenar PINs, tokens de magic link ni tokens de sesión en texto plano en la base de datos
- **NUNCA** confiar en `recipient_id` o `report_id` enviados por el cliente para autorizar acciones — derivarlos siempre de la sesión server-side

---

## DB-AGENT

**Rol:** Diseñar y mantener el esquema de base de datos.

**Input:**
- Modelo de datos en `CLAUDE.md`
- Specs funcionales relevantes

**Output:**
- Migraciones SQL en `/supabase/migrations/` (nombradas `YYYYMMDDHHMMSS_descripcion.sql`)
- Tipos TypeScript generados desde Supabase

**Responsabilidades:**
- Diseñar esquema normalizado consistente con el modelo en `CLAUDE.md`
- Escribir políticas RLS para cada tabla según las reglas en `SPEC-11`
- Crear índices para queries frecuentes (reports por space_id, notifications por user_id, sessions por report_id+token_hash, etc.)
- Documentar relaciones y constraints en comentarios SQL

**RLS mínimo requerido:**

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `profiles` | propio ∨ admin | — (auth trigger) | propio ∨ admin | admin |
| `authorized_domains` | admin | admin | admin | admin |
| `verticals` | autenticado | admin | admin | admin |
| `clients` | creador ∨ admin | autenticado | creador ∨ admin | admin |
| `client_recipients` | creador del cliente ∨ admin | creador del cliente ∨ admin | creador del cliente ∨ admin | creador del cliente ∨ admin |
| `client_spaces` | creador ∨ tiene informe compartido ∨ admin | autenticado | creador ∨ admin | creador ∨ admin |
| `reports` | creador ∨ compartida ∨ admin | autenticado | creador ∨ admin | creador ∨ admin |
| `report_versions` | mismo acceso que el report padre | creador del report ∨ admin | — (inmutable) | admin |
| `report_attachments` | mismo acceso que el report padre | creador del report ∨ admin | creador del report ∨ admin | creador del report ∨ admin |
| `magic_link_tokens` | — (solo server-side) | — (solo server) | — (solo server) | — |
| `report_sessions` | — (solo server-side) | — (solo server) | — (solo server) | — |
| `pin_attempts` | — (solo server-side) | — (solo server) | — (solo server) | — |
| `magic_link_requests` | — (solo server-side) | — (solo server) | — (solo server) | — |
| `report_notes` | autor (employee) ∨ autor (recipient con sesión activa) ∨ creador del report ∨ admin | autenticado ∨ recipient con sesión activa | autor del comentario | autor del comentario (soft delete) |
| `report_note_logs` | mismo acceso que la nota | — (solo server, append-only) | — (inmutable) | — (inmutable) |
| `notifications` | destinatario | — (solo server) | destinatario | — |

> Las tablas marcadas como "solo server-side" tienen RLS que **rechaza todo acceso de las claves anon y authenticated**; solo el cliente con `service_role` (en server actions / API routes) puede leerlas y escribirlas.

---

## SECURITY-AGENT

**Rol:** Revisar implementaciones para detectar vulnerabilidades de seguridad.

**Input:**
- Código implementado
- Spec de seguridad: `/specs/11-security.md`

**Output:** Reporte de hallazgos con severidad: `CRÍTICA / ALTA / MEDIA / BAJA`.

**Checklist de revisión:**

```
CRÍTICA
[ ] El contenido del informe (HTML inline o PDF) NO aparece en el HTML inicial de la página
[ ] El contenido del informe NO aparece en ninguna respuesta de red antes de validar la cookie de sesión
[ ] Una cookie válida para informe A NO funciona para informe B
[ ] Los PINs están almacenados como hash bcrypt (cost ≥ 12), nunca en texto plano
[ ] Los tokens de magic link se almacenan solo como hash SHA-256; el token raw solo viaja en el email
[ ] Los tokens de sesión se almacenan solo como hash SHA-256; el token raw solo viaja en la cookie
[ ] Las cookies de sesión tienen HttpOnly + Secure + SameSite=Strict
[ ] Los magic link tokens son consumibles una sola vez (consumed_at se actualiza atómicamente)
[ ] Los adjuntos solo se sirven por endpoint autenticado, nunca por URL pública de Storage

ALTA
[ ] El rate limiting (5 intentos → 30 min) está activo en verify-pin
[ ] El rate limiting (3 solicitudes → 10 min) está activo en request-magic-link
[ ] Los bloqueos persisten en base de datos (no solo en memoria del servidor)
[ ] Regenerar PIN invalida todas las sesiones y magic links pendientes de ese informe
[ ] Las políticas RLS están activas en todas las tablas
[ ] El recipient_id de un comentario se deriva de la sesión, nunca del cliente
[ ] La caducidad de magic link (30 min) se valida en cada consumo

MEDIA
[ ] Ninguna respuesta de API expone hashes (PIN, magic link, sesión)
[ ] Los mensajes de error de login no revelan si el email existe
[ ] Las cabeceras de seguridad HTTP están presentes (CSP, X-Frame-Options, etc.)
[ ] Los slugs son inmutables tras el primer guardado
[ ] La URL del magic link no se preserva en historial tras consumo (se redirige limpiando query string)

BAJA
[ ] Los logs no exponen datos sensibles (PINs, tokens, emails de destinatarios)
[ ] Los errores de validación zod no exponen estructura interna de la BD
```

---

## REVIEW-AGENT

**Rol:** Validar que una implementación cumple su spec al 100%.

**Input:**
- Spec de `/specs/` (la implementada)
- Código implementado

**Output:** Checklist de cumplimiento con estado por cada criterio de aceptación:
- ✅ Cumple
- ❌ No cumple — descripción del gap
- ⚠️ Parcial — qué falta

**No puede dar aprobación si:**
- Cualquier criterio de aceptación marcado como CA-0X tiene estado ❌
- Hay comportamiento implementado que contradice la spec
- SECURITY-AGENT ha reportado hallazgos CRÍTICOS o ALTOS no resueltos

---

## Formato Estándar de Spec

Todas las specs en `/specs/` siguen esta estructura. Las secciones marcadas con `(si aplica)` se omiten solo si genuinamente no aplican — en caso de duda, incluirlas.

```markdown
# SPEC-[NN]: [Nombre de la Funcionalidad]

**Versión:** 1.0
**Estado:** draft | aprobada | implementada
**Última actualización:** YYYY-MM-DD
**Owner:** [nombre del responsable de esta spec]

---

## Descripción
[Qué hace esta funcionalidad y por qué existe. 2-4 oraciones. Sin tecnicismos.]

## Actores
- **[Actor]:** [Rol en esta funcionalidad]

## Flujos Principales

### Flujo [N]: [Nombre del flujo]
1. [Paso 1]
2. [Paso 2]
...

## Flujos Alternativos / Edge Cases
- **[Nombre del caso]:** [Comportamiento esperado]

## Criterios de Aceptación
[Cada CA debe poder responderse con sí/no, sin interpretación.]
- [ ] CA-01: [Criterio verificable, sin ambigüedad]
- [ ] CA-02: [Criterio verificable, sin ambigüedad]

## Modelo de Datos (si aplica)
[Entidades nuevas o modificadas. Relaciones. Migraciones necesarias.]

## UI / Páginas Afectadas (si aplica)

### Páginas nuevas
[Ruta, descripción, layout principal.]

### Páginas modificadas
[Ruta, qué cambia.]

### Componentes reutilizables
[Componentes nuevos que producirá FRONTEND-AGENT.]

### Breakpoints obligatorios
375px (mobile) · 768px (tablet) · 1280px (desktop)

## API / Endpoints (si aplica)

### Endpoints nuevos
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|---------------|
| POST | /api/... | ... | cookie sesión / anon / empleado |

### Contratos de request/response
[Campos de entrada y salida para cada endpoint relevante.]

## Notas de Seguridad (si aplica)
[Datos sensibles involucrados. Validaciones server-side requeridas.
Autenticación y autorización. Otros riesgos identificados.
SECURITY-AGENT aplicará el checklist de `.brianspec/security-checklists.md`.]

## Plan de Implementación

### Arquitectura propuesta
[Qué hace FRONTEND-AGENT · qué hace BACKEND-AGENT · qué hace DB-AGENT.]

### Desglose de tareas
1. [Tarea suficientemente granular — una sola cosa, un solo criterio de éxito]
2. [...]

### Dependencias con otras specs
[Specs que deben estar implementadas antes de empezar esta.]

## Tests Requeridos

### Tests de integración obligatorios
[Flujos críticos que deben tener test de integración según PROJECT-CONSTITUTION.md §10.]

### Tests opcionales
[Unit tests o E2E que aportarían valor pero no son bloqueantes para el merge.]

## Out of Scope (Explícito)
[Lo que esta spec NO incluye. Evita overengineering.]
- [Cosa A que podría parecer incluida pero no lo está]
- [Cosa B — planificada para spec futura / fase X]

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | YYYY-MM-DD | Versión inicial | [nombre] |
```

---

## Flujo de Trabajo SDD

```
1. Nueva funcionalidad
   └── SPEC-AGENT redacta spec en /specs/
       └── Revisión y aprobación humana (obligatoria antes de continuar)

2. Implementación (solo tras aprobación)
   ├── FRONTEND-AGENT (UI y páginas)
   ├── BACKEND-AGENT (API + lógica de negocio + tokens)
   └── DB-AGENT (migraciones + RLS)

3. Validación
   ├── SECURITY-AGENT (revisión de seguridad si aplica)
   └── REVIEW-AGENT (validación contra spec, CA por CA)

4. Merge → solo si REVIEW-AGENT aprueba y SECURITY-AGENT no reporta CRÍTICOS/ALTOS
```
