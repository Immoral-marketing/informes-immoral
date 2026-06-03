# SPEC-21: PIN Maestro de Empleado

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** spec de funcionalidad (nueva; extiende [`01-auth.md`](01-auth.md) y [`11-security.md`](11-security.md) sin modificarlas)
**Prioridad:** 4 (independiente; el ítem de menú lo consume [`17-screen-replication.md`](17-screen-replication.md))

---

## Descripción

Cada empleado tiene un **PIN personal de 4 dígitos** que le permite acceder a **cualquier informe** del sistema usando la misma interfaz pública de PIN que el cliente, sin tener que buscar el PIN específico de cada informe. Se crea **obligatoriamente en el primer login** (si no existe) y puede cambiarse desde el menú de usuario ("Cambiar PIN"). Replica la feature de propuestas (`10-pin-management`).

---

## Actores

- **Empleado / Admin:** configura su PIN personal en el primer login; lo usa para acceder a informes; lo cambia desde su menú.

---

## Flujos Principales

### Flujo 1: Configuración en el primer login
1. El empleado inicia sesión. El layout del panel comprueba si su perfil tiene `personal_pin_hash`.
2. Si **no** lo tiene, se muestra un modal **bloqueante** `PersonalPinSetup` que le obliga a definir un PIN de 4 dígitos (con confirmación).
3. Al guardar, se hashea (bcrypt 12) en `profiles.personal_pin_hash` y el modal desaparece.

### Flujo 2: Acceso a un informe con el PIN maestro
1. El empleado abre la URL pública de un informe y se le pide el PIN.
2. Introduce su **PIN personal**. El servidor valida primero contra el PIN del informe; si no coincide, comprueba si coincide con el `personal_pin_hash` de **algún empleado**.
3. Si coincide con un PIN personal de empleado, se crea una sesión válida para ese informe (igual que un acceso por PIN normal).

### Flujo 3: Cambiar PIN
1. El empleado abre el menú de usuario → **Cambiar PIN** → modal `ChangePinModal`.
2. Introduce PIN actual + nuevo + confirmación. El servidor valida el actual (bcrypt) y guarda el nuevo hash.

---

## Flujos Alternativos / Edge Cases

- **PIN actual incorrecto al cambiar:** error "El PIN actual no es correcto", sin revelar nada más.
- **Formato inválido:** solo se aceptan exactamente 4 dígitos (`/^\d{4}$/`); validación cliente y server.
- **Rate limiting compartido:** los intentos con PIN maestro fallidos cuentan para el **mismo** rate limiting del informe (5 intentos → 30 min, tabla `pin_attempts`), igual que un cliente.
- **Empleado sin PIN intenta acceder:** si nunca configuró su PIN (caso raro: bypass del modal), su PIN no valida; debe configurarlo desde "Cambiar PIN".
- **Colisión de PIN:** varios empleados pueden tener el mismo PIN de 4 dígitos; la validación recorre los hashes de empleados y acepta el primero que haga match (el acceso es equivalente, no identifica al empleado en la sesión del viewer).

---

## Criterios de Aceptación

- [ ] **CA-21.1:** En el primer login, si el empleado no tiene `personal_pin_hash`, aparece un modal bloqueante que le obliga a crear un PIN de 4 dígitos.
- [ ] **CA-21.2:** El PIN se guarda como **bcrypt (cost 12)** en `profiles.personal_pin_hash`; nunca en texto plano ni en logs.
- [ ] **CA-21.3:** En la interfaz pública de PIN de un informe, introducir el PIN personal de un empleado crea una sesión válida para ese informe.
- [ ] **CA-21.4:** El menú de usuario tiene "Cambiar PIN" que abre `ChangePinModal`; cambiar el PIN requiere el PIN actual correcto.
- [ ] **CA-21.5:** Los intentos fallidos con PIN maestro cuentan para el rate limiting del informe (`pin_attempts`), igual que un cliente.
- [ ] **CA-21.6:** Migración aplicada: `profiles.personal_pin_hash text null`; tipos Supabase regenerados.
- [ ] **CA-21.7:** La validación del PIN (informe y maestro) y el hashing ocurren **solo server-side**; ningún hash se expone en respuestas de API.
- [ ] **CA-21.8:** `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

### Migración nueva: `YYYYMMDDHHMMSS_add_personal_pin_to_profiles.sql`

```sql
ALTER TABLE profiles ADD COLUMN personal_pin_hash text DEFAULT NULL;
COMMENT ON COLUMN profiles.personal_pin_hash IS 'Hash bcrypt del PIN personal de 4 dígitos del empleado (PIN maestro). NULL = sin configurar.';
```

- RLS de `profiles` no cambia (ya: propio ∨ admin para SELECT/UPDATE). El `personal_pin_hash` se lee/escribe vía server actions con admin client; **nunca** se envía al cliente.
- Tras la migración: `npx supabase gen types typescript --project-id yyjfsoobgvotquhjkcmc > src/types/supabase.ts`.

---

## UI / Páginas Afectadas

### Componentes nuevos

- **`src/components/shared/PersonalPinSetup.tsx`** — modal bloqueante de primer login (no cerrable hasta configurar). Dos inputs de 4 dígitos (PIN + confirmar). Llama a `setupPersonalPin`.
- **`src/components/shared/ChangePinModal.tsx`** — modal con PIN actual + nuevo + confirmar. Llama a `changePersonalPin`.

### Páginas modificadas

- **`src/app/(panel)/layout.tsx`** — tras cargar el perfil (ya lo hace con admin client), pasar también `personal_pin_hash` (presencia booleana, no el valor) y renderizar `<PersonalPinSetup />` si falta. **No** enviar el hash al cliente: calcular `hasPin = !!personal_pin_hash` server-side y pasar el booleano.
- **`src/components/shared/Navbar.tsx`** — el ítem "Cambiar PIN" del dropdown (spec 17) abre `ChangePinModal`.
- **`src/app/api/reports/verify/route.ts`** — tras fallar la comprobación contra `reports.pin_hash`, comprobar contra los `personal_pin_hash` de empleados antes de contar el intento como fallido (ver API).

### Breakpoints obligatorios

375px · 768px · 1280px (modales centrados, inputs grandes táctiles en móvil).

---

## API / Endpoints

### Server actions nuevas (`src/app/(panel)/actions/pin.ts` o `src/lib/auth/personal-pin.ts`)

| Acción | Descripción | Auth |
|--------|-------------|------|
| `setupPersonalPin(pin)` | Hashea (bcrypt 12) y guarda `personal_pin_hash`. Solo si el usuario aún no tiene PIN. | empleado autenticado (propio) |
| `changePersonalPin(currentPin, newPin)` | Verifica `currentPin` (bcrypt.compare) y guarda el nuevo hash. | empleado autenticado (propio) |

### Modificación de `/api/reports/verify` (override por PIN maestro)

Lógica añadida tras el `bcrypt.compare(pin, r.pin_hash)` actual:

```ts
let valid = await bcrypt.compare(pin, r.pin_hash);

// Override: PIN maestro de empleado
if (!valid) {
  const { data: employees } = await supabaseAdmin
    .from("profiles")
    .select("personal_pin_hash")
    .not("personal_pin_hash", "is", null);
  for (const emp of (employees as { personal_pin_hash: string }[] ?? [])) {
    if (await bcrypt.compare(pin, emp.personal_pin_hash)) { valid = true; break; }
  }
}
// ...resto igual: si !valid → contar intento; si valid → crear sesión
```

> **GOTCHA rendimiento/seguridad:** recorrer todos los `personal_pin_hash` con bcrypt es O(n·coste). Con pocos empleados es asumible. El rate limiting de `pin_attempts` ya protege contra fuerza bruta. No cortocircuitar el rate limiting por ser empleado.

### Contratos

- `setupPersonalPin(pin)` → `{ success: true } | { error }`. Rechaza si ya hay PIN (usar `changePersonalPin`).
- `changePersonalPin(current, new)` → `{ success: true } | { error }`.

---

## Notas de Seguridad

- **Hashing:** bcrypt cost 12, igual que los PIN de informe (SPEC-11). Nunca texto plano en BD ni logs.
- **`personal_pin_hash` nunca al cliente:** el layout pasa solo el booleano `hasPin`. Las server actions usan admin client.
- **Override controlado:** el PIN maestro concede acceso a **cualquier** informe — es una decisión de colaboración interna explícita (parity con propuestas). El acceso resultante es una sesión de informe normal (cookie scoped al `report_id`), no eleva privilegios del panel.
- **Rate limiting:** los intentos con PIN maestro fallidos cuentan en `pin_attempts` (5 → 30 min), sin excepción para empleados.
- **Validación server-side:** formato (`/^\d{4}$/`) y comparación bcrypt solo en servidor.
- **SECURITY-AGENT** aplica el checklist de SPEC-11 (hashing, no exposición de hashes, rate limiting persistido).

---

## Plan de Implementación

### Arquitectura propuesta

- **DB-AGENT:** migración `personal_pin_hash` + tipos.
- **BACKEND-AGENT:** `setupPersonalPin`, `changePersonalPin`, override en `/api/reports/verify`.
- **FRONTEND-AGENT:** `PersonalPinSetup`, `ChangePinModal`, integración en layout y navbar.

### Desglose de tareas

1. Migración + regenerar tipos.
2. Server actions `setupPersonalPin` / `changePersonalPin` (bcrypt 12).
3. Override de PIN maestro en `/api/reports/verify`.
4. `PersonalPinSetup` (modal bloqueante) + render condicional en layout (pasar booleano `hasPin`).
5. `ChangePinModal` + enganche en el menú de usuario (spec 17).
6. `pnpm build` verde + responsive.

### Dependencias con otras specs

- **Cruzada:** [`17`](17-screen-replication.md) (ítem "Cambiar PIN" en el menú). 
- **Referencia:** SPEC-11 (seguridad), SPEC-07 (rate limiting de PIN), `/api/reports/verify` existente.

---

## Tests Requeridos

### Tests de integración obligatorios

- `setupPersonalPin` guarda un hash válido y rechaza si ya existe PIN.
- `changePersonalPin` rechaza con PIN actual incorrecto y acepta con el correcto.
- `/api/reports/verify` concede acceso con un PIN maestro de empleado válido y lo deniega con uno inexistente, contando el intento en `pin_attempts`.

### Tests opcionales

- E2E: empleado accede a un informe ajeno usando su PIN maestro.

---

## Out of Scope (Explícito)

- PIN maestro para clientes (solo empleados).
- Recuperación de PIN olvidado por email (el empleado lo cambia desde el menú estando logueado).
- Auditoría de qué empleado usó el PIN maestro en qué informe (no se identifica al empleado en la sesión del viewer; futura mejora si se requiere trazabilidad).
- Longitudes de PIN distintas de 4 dígitos.

---

## Notas de Implementación

- **Patrón propuestas confirmado:** `personal_pin_hash` en `profiles`, setup forzado en primer login desde el layout, modal "Cambiar PIN" en el menú, override en la validación del PIN del viewer, bcrypt 12, rate limiting compartido.
- **`bcryptjs` ya está instalado** (`^3.0.3`) — no requiere dependencia nueva.
- **No** confundir con el PIN del informe (`reports.pin_hash`), que sigue siendo la vía principal de acceso del cliente.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. PIN personal de 4 dígitos por empleado, setup en primer login, cambio desde menú, override en verify. | Claude Code |
