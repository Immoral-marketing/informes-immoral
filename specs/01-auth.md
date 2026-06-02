# SPEC-01: Autenticación y Autorización

**Versión:** 1.1
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Sistema de autenticación para empleados de Immoral que acceden al panel interno de informes. Solo empleados con email de un dominio autorizado pueden acceder. Los clientes externos (destinatarios de informes) **no usan este sistema** — acceden por magic link a su email autorizado o por PIN, regulados por SPEC-06 y SPEC-07. Los dominios autorizados son gestionables por el admin sin necesidad de modificar código.

Esta spec cubre exclusivamente la autenticación del panel interno. La autenticación del lado cliente (viewer) está definida en `06-report-viewer` y `07-magic-link-access`.

---

## Actores

- **Empleado:** Intenta iniciar sesión con su cuenta empresarial para acceder al panel interno
- **Admin:** Gestiona dominios autorizados y roles de empleados
- **Sistema:** Valida dominio, emite sesión, gestiona roles

---

## Flujos Principales

### Flujo 1: Login con Google OAuth

1. El empleado accede a `/login` — ve una página con **dos opciones en la misma pantalla**: botón "Continuar con Google" (parte superior) y, separado visualmente, un campo de email + botón "Enviarme un enlace" para magic link (parte inferior)
2. El empleado hace clic en "Continuar con Google"
3. Google OAuth solicita autenticación al empleado
4. El sistema recibe el email autenticado desde Google en `/auth/callback`
5. El sistema extrae el dominio del email (parte después del `@`)
6. El sistema verifica que el dominio existe en `authorized_domains` usando el cliente admin (service_role) — ver Notas de Implementación
7. Si el dominio **no está autorizado**: cierra la sesión de inmediato, invoca a Supabase Admin API para eliminar físicamente el usuario de `auth.users` y evitar registros huérfanos, y muestra el mensaje "Esta cuenta no tiene acceso a la plataforma"
8. Si el dominio **está autorizado**: crea o actualiza el perfil del usuario en `profiles` y redirige al dashboard (`/`)

### Flujo 2: Login con Magic Link

1. El empleado accede a `/login` (misma pantalla que Flujo 1)
2. Introduce su email empresarial en el campo de la sección "Acceder con enlace"
3. El sistema extrae el dominio y verifica que existe en `authorized_domains` **antes de enviar el email** (usando service_role — ver Notas de Implementación)
4. Si el dominio **no está autorizado**: muestra el mensaje "Si esta cuenta está registrada, recibirás un enlace de acceso" (mismo mensaje en ambos casos para no revelar información)
5. Si el dominio **está autorizado**: envía el magic link al email mediante el proveedor de autenticación
6. El empleado hace clic en el enlace del email
7. El sistema valida el token del magic link en `/auth/callback`
8. Crea o actualiza el perfil en `profiles` y redirige al dashboard (`/`)

### Flujo 3: Gestión de dominios autorizados (Admin)

1. El admin accede a `/admin/usuarios`, sección "Dominios autorizados"
2. Ve la lista de dominios actuales (ej: "immoral.es")
3. Puede añadir un dominio: introduce el dominio (sin `@`) y hace clic en "Añadir"
4. El sistema valida el formato del dominio antes de guardarlo (formato `xxx.yyy`, sin espacios, sin `@`)
5. Puede eliminar un dominio con confirmación: "¿Seguro? Los empleados con este dominio no podrán iniciar sesión de nuevo."
6. Si el dominio a eliminar coincide con el dominio del email del propio administrador, el sistema bloquea la eliminación con el mensaje: "No puedes eliminar tu propio dominio"
7. Los cambios tienen efecto inmediato para futuros intentos de login

### Flujo 4: Gestión de roles (Admin)

1. El admin accede a `/admin/usuarios`, sección "Empleados"
2. Ve la lista de empleados registrados con nombre, email y rol actual
3. Puede cambiar el rol de cualquier empleado entre `employee` y `admin` con un selector
4. Al intentar cambiar su propio rol: el sistema bloquea la acción con mensaje "No puedes cambiar tu propio rol"

### Flujo 5: Primer usuario del sistema

1. La primera migración SQL inserta automáticamente el dominio `immoral.es` en `authorized_domains` (seed)
2. El primer usuario que se registra con dominio `immoral.es` recibe automáticamente el rol `admin` — evaluado de forma atómica (conteo de `role='admin'` en `profiles` = 0 en el momento de la creación del perfil)
3. Los usuarios siguientes reciben el rol `employee` por defecto

### Flujo 6: Cierre de sesión

1. El empleado pulsa "Cerrar sesión" en el menú de usuario (accesible desde el navbar del panel)
2. El sistema invalida la sesión actual y redirige a `/login`

---

## Flujos Alternativos / Edge Cases

- **Dominio eliminado con sesiones activas:** Las sesiones activas no se interrumpen. En el próximo intento de login, el usuario es rechazado.
- **Sesión expirada:** El middleware redirige a `/login` con parámetro de mensaje. La duración de la sesión sigue la configuración de Supabase Auth: access token 1 hora, refresh token 7 días (auto-refresh en cada request vía el middleware).
- **Email sin dominio reconocible:** El sistema rechaza el intento con el mensaje genérico de magic link.
- **Token de magic link expirado o ya usado:** Mensaje "Este enlace ha expirado o ya fue utilizado. Solicita uno nuevo."
- **Intento de acceso a `/admin/*` por Empleado:** Redirigido a `/` con toast: "No tienes permisos para acceder a esta sección".
- **Ruta del panel sin sesión:** Cualquier ruta bajo `(panel)` redirige a `/login`.
- **Ruta `/[space]/[slug]` o `/[space]/[slug]/r/[token]`:** Accesibles sin sesión de empleado — se rigen por SPEC-06/07.
- **Race condition en primer admin:** Si dos usuarios con `immoral.es` se registran casi simultáneamente, la evaluación de "primer admin" debe estar protegida por transacción o verificación atómica en el trigger/server action de creación de perfil. El segundo en registrarse recibe rol `employee`.

---

## Criterios de Aceptación

- [ ] CA-01: Un email con dominio no autorizado no puede completar el login (ni por OAuth ni por Magic Link)
- [ ] CA-02: La verificación del dominio en Magic Link ocurre antes de llamar al servicio de envío de email
- [ ] CA-03: El mensaje de respuesta al Magic Link es idéntico si el dominio está autorizado o no
- [ ] CA-04: Un admin puede añadir y eliminar dominios desde `/admin/usuarios`, con efecto inmediato
- [ ] CA-05: Un admin no puede cambiar su propio rol
- [ ] CA-06: Todas las rutas bajo `(panel)` redirigen a `/login` si el usuario no está autenticado
- [ ] CA-07: Las rutas `/[space]/[slug]` y `/[space]/[slug]/r/[token]` son accesibles sin sesión de empleado
- [ ] CA-08: El primer usuario registrado con dominio `immoral.es` obtiene rol `admin` automáticamente
- [ ] CA-09: Los usuarios nuevos reciben rol `employee` por defecto
- [ ] CA-10: Un usuario con rol `employee` que intente acceder a `/admin/*` es redirigido a `/` con toast de error
- [ ] CA-11: Un admin no puede eliminar de `authorized_domains` el dominio de su propio email
- [ ] CA-12: En OAuth, si el dominio no está autorizado, el usuario es borrado físicamente de `auth.users`
- [ ] CA-13: El mensaje de error en login OAuth con dominio no autorizado es exactamente: "Esta cuenta no tiene acceso a la plataforma"
- [ ] CA-14: El cierre de sesión invalida la sesión y redirige a `/login`
- [ ] CA-15: La primera migración SQL incluye el seed de `immoral.es` en `authorized_domains`
- [ ] CA-16: La página `/login` muestra ambas opciones (OAuth y Magic Link) en la misma pantalla, separadas visualmente

---

## Modelo de Datos

### Tablas afectadas
- `profiles` — creación / actualización en cada login autorizado
- `authorized_domains` — gestión por admin; seed de `immoral.es` en primera migración

Ver SPEC-00 para definición completa de campos.

### Migración inicial (seed)
```sql
-- Seed del dominio por defecto. El primer usuario con este dominio se convierte en admin.
INSERT INTO authorized_domains (id, domain, created_at)
VALUES (gen_random_uuid(), 'immoral.es', now())
ON CONFLICT (domain) DO NOTHING;
```

---

## UI / Páginas Afectadas

### Páginas nuevas

| Ruta | Descripción |
|------|-------------|
| `/login` | Pantalla de inicio de sesión. Dos secciones en una misma pantalla: (1) botón "Continuar con Google"; (2) campo email + botón "Enviarme un enlace". Logo de Immoral centrado en la parte superior. Fondo oscuro con paleta aprobada. |
| `/admin/usuarios` | Panel de administración: sección "Dominios autorizados" (lista + add + delete) y sección "Empleados" (lista con selector de rol). Solo accesible para `role='admin'`. |

### Páginas modificadas
Ninguna — estas son las primeras páginas del proyecto.

### Componentes reutilizables
- `LoginCard` — contenedor de la página de login con logo, ambas secciones y mensajes de error/éxito
- `DomainManager` — lista de dominios con add/delete para `/admin/usuarios`
- `EmployeeRoleManager` — lista de empleados con selector de rol

### Breakpoints obligatorios
375px (mobile) · 768px (tablet) · 1280px (desktop)

---

## API / Endpoints

### Endpoints nuevos

| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| GET | `/auth/callback` | Callback OAuth y Magic Link. Valida dominio, crea/actualiza perfil, redirige. | Pública (token en query string del proveedor) |
| POST | Server action en `/login` | Validar dominio + disparar Magic Link vía Supabase Auth. | Pública |
| POST | Server action en `/admin/usuarios` | Añadir dominio autorizado. | `role='admin'` |
| DELETE | Server action en `/admin/usuarios` | Eliminar dominio autorizado. | `role='admin'` |
| PATCH | Server action en `/admin/usuarios` | Cambiar rol de empleado. | `role='admin'` |

### Contratos relevantes

**Server action — Magic Link:**
- Input: `{ email: string }`
- Validación: formato de email válido, dominio en `authorized_domains` (service_role)
- Output: `{ success: true }` o `{ error: string }` — ambos devuelven el mismo mensaje público

**GET `/auth/callback`:**
- Input: query params del proveedor (code / token)
- Valida dominio (service_role). Si no autorizado: borra usuario de `auth.users` + redirige a `/login?error=unauthorized`
- Si autorizado: crea/actualiza `profiles` + redirige a `/`

---

## Notas de Seguridad

- La verificación del dominio en Magic Link debe ocurrir en el servidor **antes** de llamar al proveedor de email.
- Los mensajes de error de login nunca revelan si una cuenta existe.
- Las sesiones de empleados usan el sistema de tokens de Supabase Auth (access + refresh). El middleware refresca automáticamente el access token en cada request.
- La protección de "no puedes actuar sobre ti mismo" se basa en el usuario obtenido de la sesión server-side, nunca en parámetros recibidos del cliente.
- El seed de `immoral.es` en la migración es la única forma de bootstrap del sistema. Sin él, ningún empleado puede entrar.
- SECURITY-AGENT aplicará el checklist de `.brianspec/security-checklists.md`.

---

## Plan de Implementación

### Arquitectura propuesta

- **DB-AGENT:** Migración con tablas `authorized_domains` + `profiles` (trigger o server action para crear perfil) + seed `immoral.es`
- **BACKEND-AGENT:** `/auth/callback` route, server actions de login (magic link) y admin (gestión de dominios y roles), middleware de Next.js para proteger rutas del panel
- **FRONTEND-AGENT:** Página `/login` con ambas secciones, layout del panel con navbar + auth guard, página `/admin/usuarios` con los dos gestores

### Desglose de tareas
1. DB: migración `authorized_domains` + `profiles` + seed `immoral.es`
2. BACKEND: helpers Supabase (server, client, admin) + middleware de sesión
3. BACKEND: `/auth/callback` — validación de dominio + creación de perfil + lógica de primer admin
4. BACKEND: server action de Magic Link con verificación de dominio pre-envío
5. BACKEND: server actions de admin (`addDomain`, `deleteDomain`, `updateRole`) con protección server-side de identidad
6. FRONTEND: página `/login` con `LoginCard` — ambas opciones + mensajes de error
7. FRONTEND: layout `(panel)` con navbar de usuario + guard de autenticación
8. FRONTEND: página `/admin/usuarios` con `DomainManager` + `EmployeeRoleManager`

### Dependencias con otras specs
- `setup.md` debe estar completamente implementada antes de iniciar esta spec (proyecto Next.js inicializado, Supabase configurado, estructura de carpetas creada)

---

## Tests Requeridos

### Tests de integración obligatorios
- **OAuth con dominio no autorizado:** el usuario es eliminado de `auth.users` y recibe el mensaje correcto
- **Magic Link con dominio no autorizado:** el email no se envía; la respuesta pública es la misma que con dominio autorizado
- **Primer admin:** el primer usuario con `immoral.es` recibe `role='admin'`; el segundo recibe `employee`

### Tests opcionales
- Unit test de la función de validación de formato de dominio
- Test de la protección server-side de "no puedes actuar sobre ti mismo" en `deleteDomain` y `updateRole`

---

## Out of Scope (Explícito)

- Autenticación SSO/SAML (planificada para Fase futura si el volumen lo justifica)
- Autenticación de dos factores (2FA)
- Opción "Recordarme X días" más allá del refresh token de Supabase (7 días)
- Log de historial de logins por empleado
- Página de "solicitud de acceso" para dominios no autorizados
- Gestión de sesiones simultáneas por empleado (Supabase Auth no lo soporta de forma nativa)
- Auth del cliente externo (Destinatario) — cubierto en SPEC-06 y SPEC-07

---

## Notas de Implementación

> Decisiones técnicas descubiertas durante la implementación. Leer antes de modificar esta spec o las que dependen de ella.

### Next.js 16 — `proxy.ts` en lugar de `middleware.ts`
El proyecto usa Next.js 16 (instalado como 16.2.6 aunque la spec mencionaba v15). En Next.js 16, el archivo de middleware cambió de nombre a `src/proxy.ts` y la función exportada de `middleware` a `proxy`. Sin este cambio, el build falla con "Proxy is missing expected function export name".

### Admin client sin genérico `Database` en Supabase
`createAdminClient()` retorna `SupabaseClient` plano (sin `Database`). El genérico `Database` aplicado al admin client causa errores de tipo `never` en inserts y updates porque Supabase v2 no resuelve correctamente el tipo con nuestro esquema manual. Los clientes de servidor y browser sí usan `Database` desde `@/types/supabase`.

### Queries de perfil retornan `never` sin cast explícito
`.from("profiles").select("role")` en el cliente tipado con `Database` retorna `never` si el esquema generado no coincide exactamente. Solución estándar usada en todo el proyecto:
```typescript
const { data: raw } = await supabase.from("profiles").select("role").eq("id", id).single();
const profile = raw as { role: "admin" | "employee" } | null;
```

### Verificación de dominio en callback OAuth: siempre `createAdminClient()`
En `/auth/callback`, el usuario recién autenticado tiene rol `employee` (o sin perfil). La RLS de `authorized_domains` bloquea el cliente estándar. Si se usa el cliente normal en el callback, todos los empleados no-admin serían borrados erróneamente. **El callback y el magic link action usan siempre `createAdminClient()` para leer `authorized_domains`.**

### Primer admin: verificación atómica con `count`
La lógica de "primer admin" consulta `count` de `profiles` con `role='admin'` usando el admin client antes de hacer upsert. No hay transacción explícita porque Supabase no la expone en el JS client, pero la ventana de race condition es mínima (solo en el primer deploy).

### `exactOptionalPropertyTypes: true` — props opcionales
Con esta opción del tsconfig, `prop?: string` no acepta `string | undefined` como valor explícito. Las props opcionales se tipan como `prop: string | undefined` (requerido pero puede ser undefined) para recibir valores de `searchParams` que devuelven `string | undefined`.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial (clon adaptado de SPEC-01 de propuestas) | Claude Code |
| 1.1 | 2026-06-02 | Añadidas secciones BrianSpec (UI, API, Plan, Tests, Out of scope). Corregidos: descripción UI de /login (ambas opciones misma pantalla), seed de authorized_domains en primera migración, duración de sesión de empleado explicitada, race condition de primer admin documentada | Claude Code |
| 1.2 | 2026-06-02 | Añadidas Notas de Implementación: proxy.ts, admin client sin genérico, cast de profiles, dominio en callback, primer admin, exactOptionalPropertyTypes | Claude Code |
