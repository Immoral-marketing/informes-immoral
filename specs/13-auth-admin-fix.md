# SPEC-13: Fix de Auth — Rol inmutable tras creación (bootstrap de admin)

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** fix-spec (corrige un defecto de [`01-auth.md`](01-auth.md) — la spec original NO se modifica)
**Prioridad:** 1 (bloqueante — desbloquea toda la administración)

---

## Contexto y Problema

La plataforma está en un **punto muerto operativo**. Estado real de la base de datos
(`yyjfsoobgvotquhjkcmc`, consultado en vivo el 2026-06-03):

| Tabla | Filas |
|-------|------:|
| `profiles` | 3 |
| `authorized_domains` | 1 (`immoral.es`) |
| `verticals` | 0 |
| `clients` | 1 |
| `client_spaces` | 0 |
| `reports` | 0 |
| **profiles con `role='admin'`** | **0** |

Los 3 perfiles existentes son `julian@immoral.es`, `david@immoral.es` y `marco@immoral.es`, **todos
con `role='employee'`**. Como las rutas `/admin/*` redirigen a cualquier usuario no-admin, **nadie
puede acceder al panel de administración** para crear verticales ni gestionar usuarios. De ahí el
síntoma reportado: *"no se visualizan verticales"* — literalmente hay 0 verticales y nadie con
permisos para crearlas.

La spec original [`01-auth.md`](01-auth.md) define (CA-08) que el primer usuario del dominio
`immoral.es` debe convertirse en `admin`. Esa intención es correcta; la **implementación tiene un
bug** que se documenta abajo.

---

## Causa raíz

Archivo: [`src/app/auth/callback/route.ts`](../src/app/auth/callback/route.ts), bloque de asignación
de rol (líneas ~79-95):

```typescript
const { count: adminCount } = await supabaseAdmin
  .from("profiles")
  .select("id", { count: "exact", head: true })
  .eq("role", "admin");

const isFirstAdmin = (adminCount ?? 0) === 0 && domain === "immoral.es";
const role = isFirstAdmin ? "admin" : "employee";

await supabaseAdmin.from("profiles").upsert(
  { id: user.id, full_name: ..., role, notification_email_enabled: true },
  { onConflict: "id", ignoreDuplicates: false }   // ← reescribe SIEMPRE
);
```

El `upsert` con `ignoreDuplicates: false` **recalcula y reescribe `role` en CADA inicio de sesión**,
no solo al crear el perfil. El cálculo `isFirstAdmin` cuenta los admins existentes. Secuencia que
produce el bug:

1. Julian inicia sesión por primera vez → `adminCount=0` → `role=admin`. ✅
2. David y Marco inician sesión → `adminCount=1` → `role=employee`. ✅ (correcto)
3. **Julian vuelve a iniciar sesión** → el `count` lo cuenta a él mismo (`adminCount=1`) →
   `isFirstAdmin=false` → `role=employee` → **el `upsert` lo degrada a `employee`**. ❌

Resultado: el único admin se autodegrada al volver a entrar. El rol **nunca debió tocarse después de
crear el perfil**.

---

## Objetivo

1. Que el `role` de un perfil **sea inmutable tras su creación** (un re-login jamás lo cambia).
2. Restaurar a `julian@immoral.es` como `admin` para desbloquear la administración.

---

## Cambios

### Cambio 1 — Datos (ejecutar PRIMERO, antes del cambio de código)

Promover a Julian vía Supabase (SQL editor del dashboard, o MCP `execute_sql` con
service_role). El UUID es estable y conocido:

```sql
update profiles set role = 'admin'
where id = '73e086d8-08c5-4059-90db-d1bf8dbfbace';   -- julian@immoral.es
```

Verificación inmediata:

```sql
select p.role, u.email
from profiles p join auth.users u on u.id = p.id
order by p.created_at;
-- Esperado: julian@immoral.es = admin · david@immoral.es = employee · marco@immoral.es = employee
```

> David y Marco permanecen como `employee`. Una vez Julian es admin, podrá cambiar roles desde
> `/admin/usuarios` (el componente `EmployeeRoleManager.tsx` ya existe y funciona). No se promueve a
> nadie más en esta spec (decisión del responsable: admin único = Julian).

### Cambio 2 — Código (`src/app/auth/callback/route.ts`)

Reemplazar el bloque de asignación de rol (el `count` + `isFirstAdmin` + `upsert`) por una lógica
**"insertar solo si el perfil no existe"** que nunca sobrescribe `role`:

```typescript
// Solo asignar rol al CREAR el perfil. En re-login no se toca el rol.
const { data: existingProfile } = await supabaseAdmin
  .from("profiles")
  .select("id")
  .eq("id", user.id)
  .maybeSingle();

if (!existingProfile) {
  // Perfil nuevo: calcular el rol una sola vez
  const { count: adminCount } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  const isFirstAdmin = (adminCount ?? 0) === 0 && domain === "immoral.es";

  await supabaseAdmin.from("profiles").insert({
    id: user.id,
    full_name: user.user_metadata["full_name"] ?? user.email.split("@")[0],
    role: isFirstAdmin ? "admin" : "employee",
    notification_email_enabled: true,
  });
}
// Si el perfil YA existe: no se modifica `role` (ni ningún otro campo crítico).
```

**Restricciones para el ejecutor:**
- Usar `.maybeSingle()` (devuelve `null` sin error cuando no hay fila). **No** usar `.single()` aquí.
- Mantener intacto todo lo demás del archivo: el intercambio `exchangeCodeForSession(code)`, la
  verificación de dominio contra `authorized_domains`, el `deleteUser` cuando el dominio no está
  autorizado, y el `return response` con las cookies de sesión adjuntas.
- No cambiar la firma del handler ni las rutas de redirección.
- Respetar TypeScript estricto (sin `any`).

---

## Criterios de Aceptación

- [ ] **CA-13.1:** Tras aplicar el fix, cerrar sesión y volver a iniciar sesión como Julian → su
  `role` permanece `admin`. Verificable: `select role from profiles where
  id='73e086d8-08c5-4059-90db-d1bf8dbfbace'` devuelve `admin` de forma estable tras múltiples logins.
- [ ] **CA-13.2:** Julian ve en el navbar los enlaces "Verticales" y "Usuarios", y puede entrar a
  `/admin/verticales` y `/admin/usuarios` sin ser redirigido a `/`.
- [ ] **CA-13.3:** Un nuevo usuario `@immoral.es` que inicie sesión se crea como `employee` (ya
  existe un admin), no como admin.
- [ ] **CA-13.4:** Un perfil existente (cualquiera) conserva exactamente su `role` previo tras
  re-login (no hay reescritura).
- [ ] **CA-13.5:** Un usuario de dominio no autorizado sigue siendo rechazado y su usuario eliminado
  (comportamiento de `01-auth` intacto).

---

## Out of Scope

- Promover a David o Marco a admin (se hará, si procede, desde `/admin/usuarios`).
- Reescribir o tocar [`01-auth.md`](01-auth.md) (trazabilidad: la original no se modifica).
- Cambios en el flujo de Magic Link de empleados o en `login/actions.ts`.

---

## Notas de Implementación

- El `upsert` original usaba `ignoreDuplicates: false`, lo cual causaba que en cada inicio de sesión se evaluara y reescribiera toda la fila del perfil (incluyendo el `role`). Al calcular `isFirstAdmin`, el sistema encontraba que ya existía un admin (¡el propio usuario!), por lo que `isFirstAdmin` era falso y degradaba al admin actual a `employee`.
- La solución implementada utiliza un `select().maybeSingle()` primero. Si no existe un perfil, se calcula el rol y se hace un `insert`. De este modo, en los re-logins posteriores no se ejecuta ninguna operación de escritura sobre la tabla `profiles`, garantizando que el `role` sea inmutable tras la creación del perfil.
- Si en el futuro se quiere actualizar `full_name` desde el proveedor OAuth en cada login, debe hacerse con un `update` explícito que **no** incluya ni sobrescriba el campo `role`.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Fix del bug de reescritura de rol en callback + promoción de Julian. | Claude Code |
