# SPEC-22: Fixes Post-Implementación y Endurecimiento (specs 16–21)

**Versión:** 1.0
**Estado:** implementada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** fix-spec / registro de trazabilidad (documenta cambios sobre lo descrito en [`18`](18-report-manage-screen.md), [`19`](19-presentation-mode.md), [`20`](20-presenter-notes.md); **NO** se modifican esas specs)

---

## Descripción

Registro consolidado de los arreglos aplicados **tras** implementar y revisar las specs 16–21. Incluye: hallazgos de seguridad detectados en la revisión, un bug de runtime que impedía crear informes, y ajustes de UX del preview de gestión. Esta spec existe para **trazabilidad** (qué cambió respecto a lo que decían las specs originales y por qué) y para **prevenir regresiones** en sesiones futuras. Las decisiones técnicas no obvias se reflejan también en `CLAUDE.md` (Patrones Técnicos).

---

## Actores

- **Empleado / Admin:** crea y gestiona informes; ve el preview renderizado y el PIN.
- **Desarrollador / agente (Gemini, Claude):** debe respetar los patrones documentados aquí.

---

## Cambios Aplicados

### 22.1 — Seguridad: no enviar `pin_encrypted` al cliente (amend de SPEC-18)
- **Problema:** `informes/[id]/page.tsx` hacía `report={{ ...report }}`, incluyendo el ciphertext `pin_encrypted` en el payload RSC enviado al cliente.
- **Fix:** se desestructura y se elimina `pin_encrypted` antes de pasar el objeto al client component; solo viaja el booleano `has_pin_encrypted`.
- **Regla:** el PIN cifrado **nunca** sale del servidor; el descifrado ocurre solo en `getDecryptedReportPin` (creador/admin). (CA-18.8.)

### 22.2 — Seguridad: migración peligrosa eliminada (amend de SPEC-19)
- **Problema:** Gemini generó `…_add_presentation_session_type.sql` que hacía `DROP CONSTRAINT` + recrear el CHECK de `report_sessions.session_type` con `('pin','viewer_only','presentation')`, **eliminando `'magic_link'`** (valor en uso por la consumición de magic links → habría roto el acceso por magic link).
- **Hallazgo clave:** el constraint vivo ya era `('pin','magic_link','presentation')` — es decir, `'presentation'` **ya estaba permitido** y **no hacía falta migración**.
- **Fix:** eliminado el archivo de migración. No se aplicó a la BD.
- **Regla:** antes de alterar un CHECK existente, **consultar el constraint vivo** (`pg_get_constraintdef`) y no asumir sus valores.

### 22.3 — Seguridad: autorización en server actions de notas (amend de SPEC-20)
- **Problema:** `createNote`, `copyNotesFromPreviousVersion` y `markOrphan` usaban admin client (bypass RLS) verificando solo autenticación, no que el usuario fuera creador/admin del informe dueño de la versión → un empleado podía escribir notas en informes ajenos.
- **Fix:** helper `managesVersion(admin, userId, reportVersionId)` que exige creador del informe o admin; se invoca antes de escribir. `updateNote`/`deleteNote` ya validaban autoría.
- **Regla:** toda server action que use admin client debe re-verificar autorización en código (RLS no protege al service_role).

### 22.4 — Runtime: crear informe no debe fallar si el cifrado del PIN falla (amend de SPEC-18)
- **Problema:** crear un informe devolvía error y no guardaba nada. Causa: `encryptPin()` lanzaba excepción (la `PIN_ENCRYPTION_KEY` configurada no medía 32 bytes) y reventaba `createReport` antes del insert.
- **Fix:** nuevo `safeEncryptPin()` en `src/lib/crypto/pin-cipher.ts` que devuelve `null` si la clave falta o es inválida (en vez de lanzar). `createReport` y `regeneratePin` lo usan: el informe se crea igualmente y el PIN funciona vía `pin_hash`; solo el "revelar PIN" queda no disponible hasta regenerar con clave válida.
- **Requisito de entorno:** `PIN_ENCRYPTION_KEY` debe ser **base64 de exactamente 32 bytes** (`openssl rand -base64 32`), presente en `.env.local` y en Vercel, **consistente por entorno**.

### 22.5 — UX: el preview HTML se mostraba como código (amend de SPEC-18)
- **Problema:** el preview de gestión usaba una **signed URL directa a Storage** para el HTML; el navegador no lo servía como `text/html` y mostraba el código fuente.
- **Fix:** el HTML se sirve por el endpoint autenticado **`/api/reports/[id]/preview?version=N`** con `Content-Type: text/html` (renderizado). El endpoint se generalizó: modo normal (sin script), `mode=annotate` (con script de anotación), y PDF (bytes crudos `application/pdf`). El preview de PDF sigue usando signed URL en el cliente (se renderiza nativamente).
- **Regla:** el contenido HTML de un informe **se sirve siempre por endpoint con `text/html`**, nunca por signed URL cruda de Storage.

### 22.6 — UX: PIN difuminado, vigencia y ancho (amend de SPEC-18)
- **PIN activo:** se carga al montar (creador/admin) y se muestra **difuminado** (`blur(6px)`), revelándose con el ojo — paridad con propuestas. Copiar usa el valor real.
- **Fecha de vigencia:** input a ancho completo y botón "Guardar" en su propia fila (antes se salía del contenedor en el sidebar estrecho).
- **Ancho:** la pantalla de gestión ya no se limita a `max-w-4xl`; usa el ancho del panel (hasta `max-w-7xl`) para que el preview se vea más amplio.

### 22.7 — UX/limpieza menor (amend de SPEC-17 / SPEC-20)
- `SpacesSection` (crear espacio dentro de un cliente): modal migrado a shadcn `Dialog` + borrado con `AlertDialog` (era el último modal con `fixed inset-0 bg-black/50`).
- Navbar: añadido enlace "Dashboard" en el menú de usuario.
- `addVersion`: eliminada una línea muerta.
- Notas huérfanas (CA-20.4): detección real *lazy* — el script de anotación responde `note-orphan`/`orphan-selectors` y `NotesPanel` marca la nota como huérfana (al hacer clic en un ancla rota y mediante comprobación masiva al cargar).

---

## Criterios de Aceptación

- [ ] **CA-22.1:** El payload del cliente en `/informes/[id]` no contiene `pin_encrypted` (solo `has_pin_encrypted`).
- [ ] **CA-22.2:** El CHECK de `report_sessions.session_type` incluye `'magic_link'` y `'presentation'`; no existe migración que lo elimine.
- [ ] **CA-22.3:** Un empleado que no es creador ni admin no puede crear/copiar/marcar notas en un informe ajeno (las server actions lo rechazan).
- [ ] **CA-22.4:** Crear un informe con `PIN_ENCRYPTION_KEY` ausente o inválida **no** falla: el informe se crea y el bloque "PIN activo" muestra "PIN no disponible — regenéralo…". Con clave válida, el PIN se revela y copia correctamente.
- [ ] **CA-22.5:** Un informe HTML se **renderiza** en el preview de gestión (no se muestra su código fuente).
- [ ] **CA-22.6:** El PIN activo se ve difuminado por defecto y se revela con el ojo; la fecha de vigencia y su botón están bien colocados; la pantalla de gestión aprovecha el ancho del panel.
- [ ] **CA-22.7:** Ningún modal del panel usa `fixed inset-0 bg-black/50`; el menú de usuario tiene "Dashboard"; las notas con ancla rota se marcan huérfanas.
- [ ] **CA-22.8:** `pnpm build` pasa sin errores TypeScript.

---

## Modelo de Datos

No introduce tablas ni columnas nuevas. Confirma el estado correcto de migraciones de specs 18/20/21 (aplicadas a la BD remota) y la **no existencia** de la migración peligrosa de 22.2.

---

## API / Endpoints

- **`/api/reports/[id]/preview`** (empleado creador/admin): generalizado.
  - `?version=N` → HTML renderizado (`text/html`) o PDF (`application/pdf`).
  - `?version=N&mode=annotate` → HTML con script de anotación inyectado (solo HTML).
  - El script de anotación **solo** se inyecta aquí; nunca en `/api/reports/content` (cliente) ni en `/api/presentation/[token]/content` (espectador).

---

## Notas de Seguridad

- `pin_encrypted` (ciphertext) y `pin_hash` nunca viajan al cliente.
- El descifrado del PIN es server-side y restringido a creador/admin.
- Las server actions con admin client re-verifican autorización en código.
- El script de anotación está aislado del contenido servido a clientes/espectadores.
- `PIN_ENCRYPTION_KEY` vive solo en entorno (nunca en el repo).

---

## Out of Scope (Explícito)

- Enforcement de la caducidad (`expiry_date`) en el viewer (sigue pendiente, como en SPEC-18).
- Comentarios bidireccionales cliente↔empleado (sigue siendo futuro; ver SPEC-20 Out of Scope).
- Reanclaje inteligente de notas huérfanas tras nueva versión (solo se marcan, no se reanclan).
- Sincronización de selección de texto en PDF (solo HTML, como SPEC-19).

---

## Notas de Implementación

- **Endpoint vs signed URL para HTML:** las signed URLs de Storage no garantizan `Content-Type: text/html`, por lo que el navegador puede mostrar el código. Servir siempre el HTML por endpoint con `text/html`.
- **`safeEncryptPin`:** patrón de "feature opcional que no rompe el flujo principal" — si el cifrado reversible falla, el core (crear informe + PIN por hash) sigue funcionando.
- **Migraciones + tipos:** los archivos de migración deben **aplicarse a la BD remota** y regenerar `src/types/supabase.ts`; crear el archivo no basta (gap recurrente de los agentes ejecutores).
- **CHECK constraints:** consultar el valor vivo antes de alterarlos.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Registro inicial de fixes post-implementación de specs 16–21. | Claude Code |
