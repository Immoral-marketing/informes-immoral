# informes.immoral.es — CLAUDE.md

> **Documento operativo para Claude Code.** Para el contexto completo de negocio, stack, restricciones y política de tests, ver [`PROJECT-CONSTITUTION.md`](PROJECT-CONSTITUTION.md). Para la gobernanza del sistema SDD, ver [`BRIANSPEC-CONSTITUTION.md`](BRIANSPEC-CONSTITUTION.md).

**Dominio:** informes.immoral.es · **Stack:** Next.js 16 + TS + Supabase (nuevo) + Tailwind v4 + shadcn/ui + Resend + PDF.js + Vercel · **Package manager:** pnpm

---

## Reglas del Proyecto (NO NEGOCIABLES)

1. **No inferir — preguntar siempre.** Ante cualquier ambigüedad, detente y pregunta con opciones argumentadas.
2. **Specs como fuente de verdad.** Nada se implementa sin spec aprobada. Nada en una spec se incumple sin actualizarla.
3. **Revisión de spec antes de ejecutar.** La spec se repasa con el responsable antes de escribir código.
4. **Documentar decisiones técnicas en la spec.** Toda decisión técnica no obvia descubierta durante la implementación (patrón de cast, comportamiento del framework, limitación de librería, workaround) se añade en la sección "Notas de Implementación" de la spec correspondiente **antes de cerrar el build**. Esto genera trazabilidad y evita repetir los mismos errores en specs futuras.
5. **Responsive obligatorio.** 375px / 768px / 1280px en todo componente.
6. **Seguridad por diseño.** El contenido del informe nunca viaja sin validación server-side de la sesión. Ver arquitectura en `PROJECT-CONSTITUTION.md` sección 9.
7. **Identidad visual Immoral.** Todo UI sigue `/immoral_brand_guidelines.md` (Lexend, paleta aprobada, logo correcto).
8. **TypeScript estricto.** Prohibido `any`. Todo tipado. Modo estricto sin excepciones.
9. **Sin comentarios innecesarios.** Solo cuando el WHY no es obvio.

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | **Next.js 16** App Router + TypeScript (instalado 16.2.6 — `proxy.ts` en lugar de `middleware.ts`) |
| Estilos | Tailwind CSS v4 + shadcn/ui + Lexend |
| Base de datos | Supabase (PostgreSQL + Auth + Storage + Realtime) — **proyecto nuevo** `yyjfsoobgvotquhjkcmc` |
| Auth empleados | Supabase Auth — Google OAuth + Magic Link — whitelist de dominios |
| Auth cliente | Magic link (email autorizado) + PIN de 4 dígitos — cookie 48h scoped a report |
| Storage | Supabase Storage — buckets privados: `report-documents`, `report-attachments`, `vertical-logos` |
| Render PDF | PDF.js (`pdfjs-dist`) — lazy import solo en cliente |
| Email | Resend |
| Hosting | Vercel |

---

## Patrones Técnicos Establecidos (leer antes de implementar)

Decisiones técnicas descubiertas durante implementación. **Aplicar siempre** — no redescubrir.

### Next.js 16: `proxy.ts` en lugar de `middleware.ts`
El proyecto está en Next.js 16, que renombra `middleware.ts` → `proxy.ts` y la función exportada `middleware` → `proxy`.
```typescript
// src/proxy.ts
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] };
```

### Supabase: Admin client sin genérico `Database`
`createAdminClient()` en `src/lib/supabase/admin.ts` retorna `SupabaseClient` sin el genérico `Database`. Los tipos generados de Supabase no son compatibles con el cliente admin cuando se usan joins complejos. Los clientes de servidor y browser sí usan `Database` desde `src/types/supabase.ts`.

### Supabase: queries con join retornan `never` sin cast
Cuando se hace `.select("campo_a, tabla_relacionada(campo_b)")`, TypeScript infiere el resultado como `never` o con `profiles: { full_name: any }[]` (array) en lugar de objeto. Solución estándar:
```typescript
const { data: raw } = await supabase.from("tabla").select("id, profiles(full_name)").single();
const record = raw as unknown as { id: string; profiles: { full_name: string | null } | null } | null;
```

### Supabase: tipos regenerar tras cada migración
Cada vez que se aplica una migración nueva, ejecutar:
```bash
npx supabase gen types typescript --project-id yyjfsoobgvotquhjkcmc > src/types/supabase.ts
```
Los tipos viven en `src/types/supabase.ts`. Los imports de `Database` apuntan a esta ruta (`@/types/supabase`), NO a `@/types`.

### Supabase: operaciones de Storage siempre con admin client
Upload, delete y signed URLs de Storage se hacen con `createAdminClient()` (service_role). El cliente autenticado del usuario tiene permisos limitados en los buckets privados.
```typescript
const supabaseAdmin = createAdminClient();
const { data } = await supabaseAdmin.storage.from("bucket").createSignedUrl(path, 3600);
```

### Storage: logo_url almacena el path, no la URL completa
Las columnas `logo_url`, `storage_path`, etc. almacenan el **path relativo dentro del bucket** (ej: `1717000000-abc.png`), no la URL completa. Las URLs completas se generan en runtime con `createSignedUrl`.

### `exactOptionalPropertyTypes`: tipar props opcionales como `prop: T | undefined`, no como `prop?: T`
Con esta opción activa, `prop?: string` solo acepta `string` como valor explícito (no `undefined`). Para props/estados que reciben valores que pueden ser `undefined` en runtime, declarar como `prop: string | undefined`. Afecta a interfaces de componentes, tipos de estado y parámetros de funciones que reciben valores de `searchParams`, resultados de queries o props opcionales.

### Tailwind v4: no usar modificadores de opacidad sobre CSS variables
`bg-[--color-brand]/20` NO funciona (Tailwind no puede resolver el color en build time). Usar `style={{ backgroundColor: "rgba(57,128,228,0.15)" }}` o inline styles con hex explícito. Los CSS custom properties en `@theme {}` SÍ funcionan en clases sin modificador de opacidad: `bg-[--color-brand]` → `background-color: var(--color-brand)` ✓.

### UI: usar inline styles con hex explícito en componentes con fondo oscuro
Elementos sobre fondo oscuro (`#111111`) que usan `bg-white/5`, `bg-white/10`, `border-white/10` resultan casi invisibles. Patrón correcto: `style={{ backgroundColor: "#1c1c1c", border: "1px solid #2e2e2e" }}`. Para colores de la paleta Immoral usar siempre los hex directos del brandguide, no las CSS variables con modificadores.

### proxy.ts: default export adapter para Turbopack dev mode
Next.js 16.2.6 con Turbopack no aplica el template de middleware en dev mode — carga el módulo raw. El servidor llama `adapterFn = middlewareModule.default` y falla si no existe. `proxy.ts` exporta un `default` que convierte `NodejsRequestData` → `NextRequest` y llama al handler. En producción webpack este default es sobreescrito por el template de Next.js. **No borrar este export default aunque parezca redundante**.

### Verificaciones de unicidad de slug: usar admin client
Los checks de slug (para evitar colisiones ocultas por RLS) deben hacerse con `createAdminClient()` para ver todos los registros independientemente del empleado creador.

---

## Convenciones de Código

| Elemento | Convención | Ejemplo |
|---------|-----------|---------|
| Componentes | PascalCase | `ReportCard.tsx` |
| Hooks | camelCase + `use` | `useReports.ts` |
| Utils | camelCase | `formatSlug.ts` |
| Tipos | PascalCase | `Report`, `ReportCardProps` |
| API routes | kebab-case | `/api/reports/[id]/request-magic-link` |
| Env vars | UPPER_SNAKE_CASE | `SUPABASE_ANON_KEY` |
| Migraciones | snake_case descriptivo | `create_verticals` |

---

## Estructura de Archivos

```
informes-immoral/
├── CLAUDE.md                    ← Este archivo (resumen operativo)
├── PROJECT-CONSTITUTION.md      ← Contexto completo BrianSpec
├── BRIANSPEC-CONSTITUTION.md    ← Principios globales (no editar)
├── AGENTS.md                    ← Agentes de construcción + formato spec
├── EXECUTION-GUIDE.md           ← Prompts copy-paste para LLMs
├── immoral_brand_guidelines.md  ← Brand guide (no editar)
├── specs/
│   ├── setup.md · 00-overview.md · 01-auth.md · 02-verticals.md
│   ├── 03-clients-and-recipients.md · 04-client-spaces.md
│   ├── 05-reports.md · 06-report-viewer.md · 07-magic-link-access.md
│   ├── 08-client-feedback.md · 09-presentation-mode.md
│   ├── 10-notifications.md · 11-security.md
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (panel)/             ← Navbar + auth guard
│   │   │   ├── layout.tsx · page.tsx
│   │   │   ├── admin/verticales/ · admin/usuarios/
│   │   │   └── clientes/        ← /clientes y /clientes/[id]
│   │   ├── [space]/[slug]/      ← Viewer público
│   │   │   └── r/[token]/       ← Consumo magic link
│   │   ├── api/reports/         ← verify, request-magic-link, content, attachments
│   │   └── auth/callback/
│   ├── components/ui/ · reports/ · verticals/ · clients/ · shared/
│   ├── lib/supabase/ · auth/ · pdf/ · tokens/ · utils/
│   └── types/supabase.ts        ← Tipos generados por Supabase CLI
├── supabase/migrations/
└── public/immoral-logo-blanco.png · ISO-Negro.png
```

---

## Specs Index

| Spec | Descripción | Fase | Estado |
|------|-------------|------|--------|
| [setup](specs/setup.md) | Bootstrap del proyecto | 1 | implementada |
| [00-overview](specs/00-overview.md) | Visión general, actores, modelo de datos | 1 | aprobada |
| [01-auth](specs/01-auth.md) | Auth empleados OAuth + Magic Link | 1 | implementada |
| [02-verticals](specs/02-verticals.md) | Gestión de verticales (admin) | 1 | implementada |
| [03-clients-and-recipients](specs/03-clients-and-recipients.md) | Clientes + destinatarios autorizados | 1 | implementada |
| [04-client-spaces](specs/04-client-spaces.md) | Espacios cliente × vertical | 1 | implementada |
| [05-reports](specs/05-reports.md) | Informes: principal + adjuntos + versiones | 1 | implementada |
| [06-report-viewer](specs/06-report-viewer.md) | Viewer cliente cookie-first (PDF/HTML) | 1 | implementada |
| [07-magic-link-access](specs/07-magic-link-access.md) | Flujo magic link al destinatario | 1 | implementada |
| 08-client-feedback | Comentarios anclados cliente↔empleado | 2 | pendiente |
| 09-presentation-mode | Modo presentación sincronizado | 3 | pendiente |
| 10-notifications | Notificaciones in-app + email | 2 | pendiente |
| [11-security](specs/11-security.md) | Arquitectura de seguridad consolidada | 1 | implementada |
