# SPEC-SETUP: Inicialización del Proyecto

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02

---

## Descripción

Configura el entorno de desarrollo completo del proyecto desde cero: estructura de directorios, dependencias, variables de entorno, fuentes, conexión con los servicios externos (base de datos, autenticación, email) y la creación de un proyecto nuevo de Supabase exclusivo para informes. Al finalizar esta spec, el proyecto debe arrancar en local sin errores y tener la estructura de carpetas lista para recibir implementaciones de las specs funcionales.

Esta spec se ejecuta **una única vez**, antes que cualquier otra.

> **Independencia de propuestas:** este proyecto NO comparte código, base de datos ni credenciales con `propuestas.immoral.es`. Las migraciones, RLS, storage buckets y usuarios son nuevos y exclusivos.

---

## Requisitos previos

- Node.js 20 o superior instalado
- pnpm instalado globalmente
- Cuenta en Supabase con permisos para crear un proyecto nuevo
- Cuenta en Resend con el dominio `immoral.es` verificado (puede compartirse con propuestas)
- Acceso al repositorio Git del proyecto (a crear)
- Acceso a las cuentas de Vercel (para el despliegue posterior)

---

## Flujos Principales

### Flujo 1: Inicializar proyecto Next.js

1. Crear un nuevo proyecto Next.js con las siguientes opciones:
   - TypeScript: sí
   - ESLint: sí
   - App Router: sí
   - `src/` directory: sí
   - Tailwind CSS: **no** (se instala manualmente en el paso siguiente para usar v4)
   - Import alias: `@/*` apuntando a `src/*`
2. Inicializar repositorio Git si no existe y crear un commit inicial
3. Verificar que el proyecto arranca sin errores en modo desarrollo

### Flujo 2: Instalar y configurar Tailwind CSS v4

1. Instalar Tailwind CSS v4 y su integración con Next.js siguiendo la guía oficial de v4
2. Configurar el archivo de estilos global para usar las directivas de Tailwind v4
3. Definir las variables CSS de la paleta de colores del proyecto en el archivo de estilos global:
   - `--color-brand: #3980E4`
   - `--color-accent: #A8FFFF`
   - `--color-black: #111111`
   - `--color-white: #FFFFFF`
   - `--color-gray-light: #D8D8D8`
   - `--color-gray-mid: #5E5E5E`
4. Verificar que las clases de Tailwind se aplican correctamente en la página de inicio

### Flujo 3: Configurar tipografía Lexend

1. Integrar la fuente Lexend desde Google Fonts usando el sistema de fuentes del framework
2. Aplicar Lexend como fuente por defecto en toda la aplicación (body y html)
3. Hacer disponibles todos los pesos: 100 (Thin) hasta 900 (Black)
4. Verificar que la fuente carga correctamente en el navegador

### Flujo 4: Instalar y configurar shadcn/ui

1. Inicializar shadcn/ui en el proyecto con compatibilidad para Tailwind v4
2. Configurar el sistema de temas de shadcn para que use las variables CSS de la paleta de Immoral definidas en el Flujo 2
3. Instalar los componentes base que se usarán en la Fase 1:
   - Button
   - Input
   - Dialog / Modal
   - Dropdown Menu
   - Badge
   - Card
   - Toast / Sonner
   - Avatar
   - Separator
   - Label
   - Form
   - Tabs
4. Verificar que los componentes renderizan correctamente

### Flujo 5: Instalar dependencias del proyecto

Instalar las siguientes dependencias de producción:

| Paquete | Propósito |
|---------|-----------|
| `@supabase/supabase-js` | Cliente de Supabase |
| `@supabase/ssr` | Helpers para Supabase con App Router |
| `resend` | Envío de emails transaccionales (magic links + notificaciones) |
| `bcryptjs` | Hashing de PINs |
| `jose` | Generación y verificación de JWTs (cuando aplique) |
| `zod` | Validación de schemas |
| `pdfjs-dist` | Render embebido de PDFs en el viewer + anclaje de coordenadas |
| `nanoid` | Generación de tokens criptográficamente seguros (magic link + sesión) |
| `next-themes` | Gestión de tema (claro/oscuro) si aplica |

Instalar las siguientes dependencias de desarrollo:

| Paquete | Propósito |
|---------|-----------|
| `@types/bcryptjs` | Tipos TypeScript para bcryptjs |
| `supabase` (CLI) | Aplicar migraciones al proyecto de Supabase |

### Flujo 6: Crear proyecto Supabase nuevo

1. Acceder a Supabase y crear un proyecto nuevo con nombre `informes-immoral` (región europea)
2. Anotar la `project ref`, la `URL`, la `anon key` y la `service_role key`
3. Habilitar Google OAuth en Authentication → Providers, configurando las credenciales de Google Cloud
4. Configurar la URL de redirección de OAuth: `https://informes.immoral.es/auth/callback` (y `http://localhost:3000/auth/callback` para desarrollo)
5. En Storage, crear los siguientes buckets privados (acceso solo vía service_role):
   - `report-documents` — almacena el documento principal de cada versión de informe (PDF/HTML)
   - `report-attachments` — almacena los adjuntos descargables
   - `vertical-logos` — almacena los logos de los verticales
6. Verificar que los buckets están en modo privado (no se pueden listar ni descargar archivos por URL pública)

### Flujo 7: Configurar variables de entorno

1. Crear `.env.local` en la raíz del proyecto con las credenciales del proyecto Supabase recién creado
2. Crear `.env.local.example` con las mismas claves pero sin valores, comitado al repositorio
3. Verificar que `.env.local` está en `.gitignore`

Las variables requeridas son:

```
# Supabase (proyecto nuevo informes-immoral)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=informes@immoral.es

# JWT (para tokens internos si aplican; los magic link tokens NO usan JWT)
JWT_SECRET=

# Cifrado de PINs (para mostrar PIN activo a empleados — opcional MVP)
# Generarla con: openssl rand -hex 32  (64 chars = 256 bits de entropía)
# Si cambia, los pin_encrypted existentes quedan indescifrables (no afecta a verificación de PINs).
PIN_ENCRYPTION_KEY=

# Secret para hashear tokens de sesión y magic link en BD
# Generarla con: openssl rand -hex 32
SESSION_TOKEN_HASH_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://informes.immoral.es
```

> **Para desarrollo local:** `NEXT_PUBLIC_APP_URL` puede cambiarse a `http://localhost:3000`. El resto de credenciales apuntan al mismo proyecto Supabase que en producción (no hay instancia local de Supabase en este proyecto).

### Flujo 8: Configurar cliente de Supabase

1. Crear los helpers de Supabase para uso en el servidor (Server Components, API routes, Server Actions) en `src/lib/supabase/server.ts`
2. Crear los helpers de Supabase para uso en el cliente (Client Components) en `src/lib/supabase/client.ts`
3. Crear el cliente admin (service_role) en `src/lib/supabase/admin.ts` — único punto de instanciación del cliente con service_role
4. Crear el middleware de Next.js para gestionar la sesión de autenticación en cada request en `src/lib/supabase/middleware.ts`
5. Verificar que la conexión con Supabase funciona correctamente

### Flujo 9: Configurar estructura de directorios

Crear la siguiente estructura dentro de `src/`:

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (panel)/
│   │   ├── layout.tsx                 ← Navbar + auth guard
│   │   ├── page.tsx                   ← Dashboard principal (/)
│   │   ├── clientes/
│   │   └── admin/
│   ├── [space]/
│   │   └── [slug]/
│   │       ├── page.tsx               ← Viewer del informe
│   │       └── r/
│   │           └── [token]/
│   │               └── route.ts        ← Consumo de magic link
│   ├── api/
│   │   └── reports/
│   │       ├── verify/                 ← validar PIN
│   │       ├── request-magic-link/
│   │       ├── content/                ← servir HTML / PDF protegido
│   │       └── attachments/
│   ├── auth/
│   │   └── callback/                   ← OAuth callback
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── ui/              ← componentes shadcn/ui
│   ├── reports/
│   ├── verticals/
│   ├── clients/
│   └── shared/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── admin.ts
│   │   └── middleware.ts
│   ├── auth/
│   ├── pdf/                            ← wrappers PDF.js + anclaje coordenadas
│   ├── tokens/                         ← generación y hash de magic link y session tokens
│   └── utils/
│       └── slugify.ts                  ← función de generación de slugs
└── types/
    └── index.ts                        ← tipos globales del modelo de datos
```

### Flujo 10: Configurar TypeScript estricto

1. Verificar que `tsconfig.json` tiene activado el modo estricto (`"strict": true`)
2. Añadir las siguientes opciones adicionales si no están presentes:
   - `"noUncheckedIndexedAccess": true`
   - `"exactOptionalPropertyTypes": true`
3. Verificar que el proyecto compila sin errores de TypeScript con la configuración estricta

### Flujo 11: Configurar assets de marca

1. Copiar los siguientes archivos a `public/` desde el proyecto de propuestas (mismos assets):
   - `immoral-logo-blanco.png` (logo completo, blanco)
   - `ISO-Negro.png` (imagotipo para QRs y avatares)
2. Copiar `immoral_brand_guidelines.md` a la raíz del proyecto (mismo contenido que en propuestas)
3. Verificar que los archivos de `public/` son accesibles desde el navegador en `/immoral-logo-blanco.png` y `/ISO-Negro.png`

### Flujo 12: Configurar Supabase CLI para migraciones

1. Autenticarse en Supabase CLI: `npx supabase login` (requiere token de acceso personal de Supabase)
2. Vincular el proyecto: `npx supabase link --project-ref [project-ref-del-nuevo-proyecto]`
3. Crear el directorio `supabase/migrations/`
4. Para aplicar migraciones nuevas: `npx supabase db push`

### Flujo 13: Configurar utilidades de tokens y PDF

1. Crear `src/lib/utils/slugify.ts` con la función de slug (minúsculas, sin acentos, sin guiones extremos)
2. Crear `src/lib/tokens/generate.ts` con dos funciones:
   - `generateMagicLinkToken()` → string aleatorio de 32 bytes en base64url (no JWT)
   - `generateSessionToken()` → string aleatorio de 32 bytes en base64url
3. Crear `src/lib/tokens/hash.ts` con la función `hashToken(token: string): string` que devuelve `SHA-256(token + SESSION_TOKEN_HASH_SECRET)` en hex
4. Crear `src/lib/pdf/loader.ts` con un wrapper que cargue `pdfjs-dist` solo en cliente (lazy import) y exponga una función `loadPdfFromBytes(bytes: Uint8Array)`

### Flujo 14: Verificación final

1. El proyecto arranca en modo desarrollo sin errores ni warnings críticos
2. La página de inicio renderiza con la fuente Lexend y los colores de Immoral
3. Los componentes de shadcn/ui están disponibles e importables
4. La conexión con Supabase responde correctamente
5. TypeScript no reporta errores en ningún archivo
6. `pdfjs-dist` se carga lazy y no rompe el build de SSR
7. La estructura de carpetas coincide con la definida en CLAUDE.md

---

## Criterios de Aceptación

- [ ] CA-01: El proyecto arranca con `pnpm dev` sin errores
- [ ] CA-02: TypeScript compila sin errores con modo estricto activado (`noUncheckedIndexedAccess` y `exactOptionalPropertyTypes` incluidos)
- [ ] CA-03: Tailwind v4 aplica estilos correctamente en el navegador
- [ ] CA-04: Las variables CSS de la paleta de Immoral están definidas y accesibles globalmente
- [ ] CA-05: La fuente Lexend carga y se aplica como fuente por defecto en toda la aplicación
- [ ] CA-06: Los componentes shadcn/ui instalados importan y renderizan sin errores
- [ ] CA-07: El archivo `.env.local.example` existe en el repositorio con todas las variables (sin valores)
- [ ] CA-08: El archivo `.env.local` está en `.gitignore` y no se comita
- [ ] CA-09: Los helpers de Supabase para servidor, cliente y admin están creados y tipados
- [ ] CA-10: El middleware de Next.js gestiona la sesión en cada request
- [ ] CA-11: La estructura de directorios coincide con la definida en esta spec y en CLAUDE.md
- [ ] CA-12: Los assets de marca (`immoral-logo-blanco.png`, `ISO-Negro.png`) están en `public/` y son accesibles
- [ ] CA-13: El directorio `supabase/migrations/` existe y está preparado para recibir migraciones
- [ ] CA-14: La función `slugify` existe en `src/lib/utils/slugify.ts` y convierte texto a slug válido
- [ ] CA-15: El archivo `src/types/index.ts` existe y contiene las interfaces iniciales del modelo de datos creadas manualmente
- [ ] CA-16: El proyecto Supabase nuevo está creado, vinculado por CLI, con Google OAuth habilitado
- [ ] CA-17: Los buckets `report-documents`, `report-attachments` y `vertical-logos` existen en Supabase Storage y son privados
- [ ] CA-18: Las utilidades de generación y hash de tokens (`generateMagicLinkToken`, `generateSessionToken`, `hashToken`) existen en `src/lib/tokens/`
- [ ] CA-19: El wrapper de PDF.js en `src/lib/pdf/loader.ts` se importa solo en cliente y no rompe el build SSR

---

## Notas de Implementación

- Usar `pnpm` como gestor de paquetes en todos los comandos de instalación
- El archivo `src/types/index.ts` debe exportar los tipos del modelo de datos definidos en SPEC-00 desde el primer momento, aunque las tablas de Supabase aún no existan
- La función `slugify` de `src/lib/utils/slugify.ts` será usada por múltiples specs — implementarla correctamente: minúsculas, sin acentos, espacios y caracteres especiales → guión, sin guiones al inicio o final
- `pdfjs-dist` debe importarse dinámicamente (`await import('pdfjs-dist')`) dentro de un componente cliente o un `useEffect`; nunca a nivel de módulo en archivos compartidos con SSR
- Los tokens de magic link y de sesión NO son JWT — son strings aleatorios. JWT solo se usa si una spec futura lo requiere
- El secret `SESSION_TOKEN_HASH_SECRET` se usa como "pepper" en el hash de tokens, de modo que un dump de la BD no permita reconstruir los tokens incluso conociendo el algoritmo
