# SPEC-18: Pantalla de Gestión del Informe (preview, config, versiones)

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** fix-spec (rediseña la pantalla de gestión existente; extiende [`05-reports.md`](05-reports.md) sin modificarla)
**Prioridad:** 3 (después de [`17-screen-replication.md`](17-screen-replication.md); es el host de las specs 19 y 20)

---

## Descripción

Rediseña la pantalla de gestión de un informe (`/informes/[id]`) para alcanzar parity con la de propuestas: **cabecera con acciones** (Nueva versión, Regenerar PIN, Enviar al cliente, Presentar, Anotar), **preview central con toggles de dispositivo** (Móvil/Tablet/Escritorio), **sidebar de configuración** (Fecha de vigencia + PIN activo) e **historial de versiones**. Añade dos columnas de BD: `reports.expiry_date` (fecha de vigencia) y `reports.pin_encrypted` (PIN cifrado reversible para poder mostrarlo al empleado).

---

## Actores

- **Empleado creador / Admin:** gestiona el informe (versiones, PIN, envío, vigencia, presentación, notas).
- **Empleado no creador:** acceso de solo lectura a la pantalla (sin acciones de edición), igual que hoy (`canEdit`).

---

## Flujos Principales

### Flujo 1: Preview con dispositivos
1. El empleado abre `/informes/[id]`. El preview central muestra la versión activa en un iframe.
2. Pulsa **Móvil / Tablet / Escritorio**; el contenedor del iframe cambia de ancho (375px / 768px / 100%) con transición suave.

### Flujo 2: Fecha de vigencia
1. En el sidebar "Configuración", el empleado elige una fecha/hora de vigencia y pulsa **Guardar**.
2. El sistema persiste `reports.expiry_date`. Toast de confirmación.
3. (La vigencia se usa por el viewer/magic-link como caducidad lógica del informe — ver Out of Scope para el alcance del enforcement.)

### Flujo 3: PIN activo
1. El sidebar muestra el PIN como `••••` con botón de **ojo** (revelar) y **copiar**.
2. Al revelar, se descifra server-side `pin_encrypted` y se muestra; al copiar, se copia al portapapeles.

### Flujo 4: Historial de versiones
1. El sidebar lista las versiones (vN, fecha, autor), marcando la **activa**.
2. Al hacer clic en otra versión, el preview cambia a esa versión (cambia el `?version=` del iframe).

### Flujo 5: Acciones de cabecera
- **Nueva versión:** abre `Dialog` con drag & drop (PDF/HTML) → `addVersion`.
- **Regenerar PIN:** `AlertDialog` de confirmación → `regeneratePin` → muestra el nuevo PIN una vez.
- **Enviar al cliente:** abre `SendMagicLinkModal` (ya existe).
- **Presentar:** enlaza a `/informes/[id]/presentar` (spec 19).
- **Anotar:** activa el modo anotación en el preview (spec 20).

---

## Flujos Alternativos / Edge Cases

- **Sin fecha de vigencia:** `expiry_date` es `null`; el sidebar muestra "Sin caducidad" y permite establecerla.
- **`pin_encrypted` ausente (informes antiguos):** si un informe no tiene `pin_encrypted` (creado antes de esta spec), el bloque "PIN activo" muestra "PIN no disponible — regenéralo para poder visualizarlo". Regenerar PIN rellena `pin_encrypted`.
- **Empleado no creador:** no ve las acciones de edición ni el PIN; solo preview e historial (lectura).
- **Versión PDF vs HTML en preview:** el preview usa una **signed URL** del documento (no el endpoint de sesión de cliente). PDF se muestra en iframe nativo; HTML en iframe con `sandbox="allow-same-origin"`.

---

## Criterios de Aceptación

- [ ] **CA-18.1:** La cabecera muestra el nombre del informe, su URL pública con botón copiar, y los botones: Nueva versión, Regenerar PIN, Enviar al cliente, Presentar, Anotar (los de edición solo si `canEdit`).
- [ ] **CA-18.2:** El preview central tiene toggles **Móvil (375px) / Tablet (768px) / Escritorio (100%)** que cambian el ancho del contenedor del iframe con transición; el botón activo se resalta.
- [ ] **CA-18.3:** El sidebar "Configuración" permite establecer y guardar `expiry_date`; tras guardar, un toast confirma y el valor persiste al recargar.
- [ ] **CA-18.4:** El sidebar muestra el PIN como `••••` con revelar (ojo) y copiar; al revelar, muestra el PIN real obtenido server-side desde `pin_encrypted`.
- [ ] **CA-18.5:** El historial de versiones lista todas las versiones marcando la activa; clic en otra versión cambia el preview a esa versión.
- [ ] **CA-18.6:** Migración aplicada: `reports.expiry_date timestamptz null` y `reports.pin_encrypted text null`; tipos Supabase regenerados.
- [ ] **CA-18.7:** Al regenerar el PIN se actualizan **a la vez** `pin_hash` (bcrypt) y `pin_encrypted` (cifrado reversible); el endpoint que revela el PIN nunca expone `pin_hash`.
- [ ] **CA-18.8:** El descifrado del PIN ocurre **solo server-side** (server action / API protegida) y requiere que el solicitante sea creador del informe o admin.
- [ ] **CA-18.9:** Responsive 375 / 768 / 1280 (en móvil el sidebar se apila sobre el preview); modales con animación de la spec 16.
- [ ] **CA-18.10:** `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

### Migración nueva: `YYYYMMDDHHMMSS_add_report_expiry_and_encrypted_pin.sql`

```sql
ALTER TABLE reports ADD COLUMN expiry_date timestamptz DEFAULT NULL;
ALTER TABLE reports ADD COLUMN pin_encrypted text DEFAULT NULL;

COMMENT ON COLUMN reports.expiry_date IS 'Fecha de vigencia del informe (caducidad lógica). NULL = sin caducidad.';
COMMENT ON COLUMN reports.pin_encrypted IS 'PIN cifrado reversible (AES-256-GCM) para que el empleado pueda visualizarlo. El hash bcrypt en pin_hash sigue siendo la fuente de verdad para validar.';
```

- No cambian las políticas RLS de `reports` (lectura/escritura ya restringidas a creador/admin; ambas columnas viven en `reports`).
- Tras la migración: `npx supabase gen types typescript --project-id yyjfsoobgvotquhjkcmc > src/types/supabase.ts`.

---

## UI / Páginas Afectadas

### Páginas modificadas

- **`src/app/(panel)/informes/[id]/page.tsx`** — cargar también `expiry_date`, `pin_encrypted` (presencia, no el valor descifrado), y las signed URLs por versión necesarias para el preview. Pasar `canEdit`, `isAdmin` como ya hace.
- **`src/app/(panel)/informes/[id]/ReportManageClient.tsx`** — reescritura del layout a: cabecera de acciones + grid `lg:grid-cols-[300px_1fr]` (sidebar config + historial a la izquierda, preview a la derecha; en móvil apilado). Migrar `PinModal` interno y modales a `Dialog`/`AlertDialog` (spec 16/17).

### Componentes reutilizables

- **`DeviceToggle`** (opcional, inline): tres `Button` con estado `previewWidth`.
- Reutilizar `SendMagicLinkModal` (ya existe).

### Breakpoints obligatorios

375px · 768px · 1280px.

---

## API / Endpoints

### Server actions nuevas (en `src/app/(panel)/informes/actions.ts` o `manage-actions.ts`)

| Acción | Descripción | Auth |
|--------|-------------|------|
| `setReportExpiry(reportId, isoDateOrNull)` | Actualiza `reports.expiry_date`. | creador ∨ admin (server-side) |
| `getDecryptedReportPin(reportId)` | Descifra y devuelve el PIN en claro. | creador ∨ admin (server-side) |

- `regeneratePin` (ya existe) se **modifica** para que, además de actualizar `pin_hash`, guarde `pin_encrypted` con el nuevo PIN cifrado.
- El cifrado usa AES-256-GCM con clave en env var **`PIN_ENCRYPTION_KEY`** (32 bytes, base64). Helper en `src/lib/crypto/pin-cipher.ts` (`encryptPin`, `decryptPin`).

### Contratos

- `getDecryptedReportPin(reportId)` → `{ pin: string } | { error: string }`. Verifica sesión de empleado y que sea creador/admin del informe **antes** de descifrar. Nunca devuelve `pin_hash` ni `pin_encrypted` crudos.

---

## Notas de Seguridad

- **Cifrado reversible del PIN (decisión nueva):** se añade `pin_encrypted` para poder mostrar el PIN al empleado (parity con propuestas). Esto introduce un secreto reversible: **debe** cifrarse con AES-256-GCM y clave en `PIN_ENCRYPTION_KEY` (env, nunca en el repo). El `pin_hash` bcrypt **sigue siendo** la fuente de verdad para validar el acceso del cliente; `pin_encrypted` es solo para visualización por el empleado autorizado.
- **Autorización del descifrado:** `getDecryptedReportPin` valida server-side que el usuario es creador del informe o admin. Nunca exponer el PIN a un empleado sin permiso ni en logs.
- **SECURITY-AGENT debe revisar:** que `PIN_ENCRYPTION_KEY` no esté hardcodeada, que el descifrado sea server-side, que no se filtre `pin_hash`/`pin_encrypted` en respuestas, y que regenerar PIN mantenga la invalidación de sesiones/magic links ya existente (SPEC-11).
- **Vigencia:** `expiry_date` se persiste aquí; el **enforcement** real (bloquear el viewer cuando el informe caduca) se documenta como evolución (ver Out of Scope) salvo que SPEC-11/06 ya lo contemplen.

---

## Plan de Implementación

### Arquitectura propuesta

- **DB-AGENT:** migración (`expiry_date`, `pin_encrypted`) + regenerar tipos.
- **BACKEND-AGENT:** helper de cifrado, `setReportExpiry`, `getDecryptedReportPin`, modificar `regeneratePin` para escribir `pin_encrypted`.
- **FRONTEND-AGENT:** reescritura de `ReportManageClient` (cabecera, preview con toggles, sidebar, historial), migración de modales.

### Snippets clave

**Toggles de dispositivo (preview):**
```tsx
const [previewWidth, setPreviewWidth] = useState<"375px" | "768px" | "100%">("100%");
// ...
<div className="flex items-center gap-2">
  <Button size="sm" variant={previewWidth === "375px" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("375px")}>Móvil</Button>
  <Button size="sm" variant={previewWidth === "768px" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("768px")}>Tablet</Button>
  <Button size="sm" variant={previewWidth === "100%" ? "secondary" : "ghost"} onClick={() => setPreviewWidth("100%")}>Escritorio</Button>
</div>
<div className="mx-auto bg-white border-x transition-all duration-300 ease-out" style={{ width: previewWidth, maxWidth: "100%" }}>
  <iframe src={previewUrl ?? activeVersionUrl} className="w-full h-[70vh]" sandbox={activeVersion?.format === "html" ? "allow-same-origin" : undefined} title="Vista previa" />
</div>
```
> **GOTCHA preview:** el preview usa **signed URLs** (server-generadas, como el `activeVersionUrl` actual), NO el endpoint `/api/reports/content` (que valida la cookie de sesión del cliente, ausente para el empleado). Para cambiar de versión, generar la signed URL de cada versión server-side y pasarlas como mapa `{ [versionNumber]: signedUrl }`, o usar una server action `getVersionSignedUrl(reportId, versionNumber)`.

**Helper de cifrado `src/lib/crypto/pin-cipher.ts`:**
```ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY = Buffer.from(process.env["PIN_ENCRYPTION_KEY"] ?? "", "base64"); // 32 bytes

export function encryptPin(pin: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const enc = Buffer.concat([cipher.update(pin, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptPin(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split(".");
  const decipher = createDecipheriv("aes-256-gcm", KEY, Buffer.from(ivB64!, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64!, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(encB64!, "base64")), decipher.final()]).toString("utf8");
}
```
> **GOTCHA env:** añadir `PIN_ENCRYPTION_KEY` a `.env.local` y a Vercel. Generar con `openssl rand -base64 32`. Si falta, `getDecryptedReportPin` debe devolver `{ error: "PIN no disponible" }`, no romper el build.

### Desglose de tareas

1. Migración + regenerar tipos.
2. Helper `pin-cipher.ts`.
3. Modificar `regeneratePin` y la creación de informe (`createReport`) para guardar `pin_encrypted` junto al `pin_hash`.
4. `setReportExpiry`, `getDecryptedReportPin`.
5. Reescribir `ReportManageClient`: cabecera, preview+toggles, sidebar (vigencia + PIN), historial.
6. Migrar modales a `Dialog`/`AlertDialog`.
7. `pnpm build` verde + responsive.

### Dependencias con otras specs

- **Entrante:** [`16`](16-loading-and-motion.md) (animación de modales), [`17`](17-screen-replication.md) (patrones de UI).
- **Saliente:** [`19`](19-presentation-mode.md) (botón Presentar), [`20`](20-presenter-notes.md) (botón Anotar). Si 19/20 no están aún, los botones quedan visibles pero deshabilitados con tooltip "Próximamente".

---

## Tests Requeridos

### Tests de integración obligatorios

- `regeneratePin` escribe `pin_hash` y `pin_encrypted` coherentes (validar PIN con bcrypt y descifrar con AES devuelve el mismo valor).
- `getDecryptedReportPin` rechaza a un empleado que no es creador ni admin.

### Tests opcionales

- E2E de cambio de versión en el preview.

---

## Out of Scope (Explícito)

- **Enforcement de la caducidad** (`expiry_date`) en el viewer/magic-link: esta spec persiste y muestra la fecha; bloquear el acceso al caducar es evolución (coordinar con SPEC-06/07/11). Documentar como tarea futura.
- Generación de QR para el enlace mágico (informes envía por email; QR fuera de alcance).
- El modo presentación (spec 19) y las anotaciones (spec 20) — aquí solo se colocan los botones.
- Edición del nombre del informe o del slug (slug inmutable por SPEC-05).

---

## Notas de Implementación

- **`report_sessions` ya tiene** `session_type` (default `'pin'`) y `ended_at` — no requieren migración (los usará la spec 19).
- **No** romper la generación de PIN existente: `createReport` ya genera el PIN y `pin_hash`; añadir el guardado de `pin_encrypted` en el mismo punto.
- **Preview con signed URLs:** confirmar el bucket correcto (`report-documents`) y `createSignedUrl` con admin client (patrón CLAUDE.md).
- **Iconos:** usar lucide (`Monitor`, `Smartphone`, `Tablet`, `Eye`, `EyeOff`, `Copy`, `RefreshCw`, `Send`, `Upload`, `Calendar`).

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Preview con dispositivos, sidebar config (vigencia + PIN visible), historial de versiones; migración expiry_date + pin_encrypted. | Claude Code |
