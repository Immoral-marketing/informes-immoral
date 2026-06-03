# SPEC-19: Modo Presentación Sincronizado

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** spec de funcionalidad (implementa la intención de la planificada `09-presentation-mode`; se numera 19 para no tocar el índice original)
**Prioridad:** 4 (después de [`18-report-manage-screen.md`](18-report-manage-screen.md))

---

## Descripción

Permite a un empleado **presentar un informe en directo** a uno o varios clientes, sincronizando en tiempo real el **scroll** (y, en informes HTML, la **selección de texto** resaltada). El presentador controla; los espectadores ven en su pantalla exactamente lo que el presentador desplaza/resalta. El acceso del espectador es por **token opaco** sin necesidad de PIN ni login. Replica el mecanismo de propuestas (Supabase Realtime: broadcast + presence) adaptado al modelo de datos de informes.

---

## Actores

- **Presentador (empleado creador / admin):** inicia la sesión, comparte el enlace, controla el scroll/selección.
- **Espectador (cliente):** abre el enlace de presentación y ve el informe sincronizado, sin interacción de control.

---

## Flujos Principales

### Flujo 1: Iniciar presentación
1. El empleado pulsa **Presentar** en la pantalla de gestión → navega a `/informes/[id]/presentar`.
2. Pulsa **Iniciar presentación**. El servidor crea una sesión de tipo `presentation` (token opaco, hash en BD) y devuelve el token en claro a la UI.
3. La UI muestra el **enlace para el espectador** (`/presentar/[token]`) y un contador de espectadores conectados.
4. El presentador se conecta al canal Realtime `presentation:{reportId}` como `presenter`.

### Flujo 2: Sincronización
1. El presentador hace scroll en el informe; el iframe del presentador emite (`postMessage`) la posición como **porcentaje** de scroll.
2. La vista del presentador retransmite ese evento por **broadcast** en el canal.
3. Cada espectador recibe el broadcast y reenvía (`postMessage`) a su iframe, que ajusta el scroll al mismo porcentaje.
4. (HTML) Al seleccionar texto, el presentador emite el ancla de selección (XPath inicio/fin + offsets); los espectadores recrean un resaltado `<mark>` equivalente.

### Flujo 3: Espectador entra
1. El espectador abre `/presentar/[token]`. El servidor valida el token (hash, `session_type='presentation'`, `ended_at IS NULL`, no expirada).
2. Se carga el informe (vía endpoint protegido por token) en un iframe con el *bridge receptor*.
3. El espectador se une al canal como `viewer` (presence) → el presentador ve el contador subir.

### Flujo 4: Terminar
1. El presentador pulsa **Terminar**. Se emite un broadcast `end` y el servidor marca `ended_at = now()`.
2. Los espectadores ven una pantalla de "La presentación ha finalizado".

---

## Flujos Alternativos / Edge Cases

- **Espectador entra antes de iniciar / tras terminar:** si no hay sesión `presentation` activa para ese token (o `ended_at` no es null o expiró), mostrar "Presentación no disponible".
- **PDF vs HTML:**
  - **HTML:** scroll por porcentaje + selección de texto (XPath). Bridge inyectado en el HTML servido.
  - **PDF:** sincroniza **página actual + offset de scroll** vía el visor PDF.js. La **selección de texto NO** se sincroniza en PDF (fuera de alcance v1).
- **Reconexión:** si el espectador pierde conexión y vuelve, al reconectar recibe el siguiente evento de scroll (no se persiste el último estado; el presentador, al moverse, re-sincroniza). Aceptable en v1.
- **Doble inicio:** si ya existe una sesión `presentation` activa para el informe, reutilizarla (no crear otra) o terminar la anterior antes de crear la nueva. Decisión: **terminar la anterior** (`ended_at`) y crear una nueva.
- **Expiración:** la sesión de presentación expira con `expires_at` (p. ej. 12h) además del control manual `ended_at`.

---

## Criterios de Aceptación

- [ ] **CA-19.1:** Existe `/informes/[id]/presentar` (empleado, autenticado) con botón Iniciar/Terminar y enlace de espectador + contador de espectadores.
- [ ] **CA-19.2:** Existe `/presentar/[token]` (público, sin login) que valida el token server-side y muestra el informe sincronizado o "Presentación no disponible" si el token no corresponde a una sesión `presentation` activa.
- [ ] **CA-19.3:** Al hacer scroll el presentador en un informe **HTML**, todos los espectadores desplazan a la misma posición relativa (porcentaje) en <1s.
- [ ] **CA-19.4:** En informe **HTML**, al seleccionar texto el presentador, los espectadores ven el mismo fragmento resaltado.
- [ ] **CA-19.5:** En informe **PDF**, el cambio de página y scroll del presentador se refleja en los espectadores.
- [ ] **CA-19.6:** Al pulsar Terminar, los espectadores ven "La presentación ha finalizado" y la sesión queda con `ended_at` no nulo.
- [ ] **CA-19.7:** El contador de espectadores refleja en tiempo real cuántos están conectados (presence).
- [ ] **CA-19.8:** El contenido del informe en `/presentar/[token]` se sirve **solo** tras validar el token server-side; nunca aparece en el HTML inicial ni para tokens inválidos/finalizados.
- [ ] **CA-19.9:** Mientras carga el iframe, se muestra el `BrandLoader variant="dark"` (spec 16).
- [ ] **CA-19.10:** `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

**No requiere migración**: `report_sessions` ya tiene las columnas necesarias (confirmado contra el esquema vivo):
- `session_type text DEFAULT 'pin'` → se usa el valor `'presentation'`.
- `ended_at timestamptz NULL` → control de fin.
- `token_hash`, `expires_at`, `report_id`, `recipient_id (null)`.

> **GOTCHA constraint:** verificar si existe un CHECK sobre `session_type`. Si lo hay y no incluye `'presentation'`, añadir migración:
> ```sql
> ALTER TABLE report_sessions DROP CONSTRAINT IF EXISTS report_sessions_session_type_check;
> ALTER TABLE report_sessions ADD CONSTRAINT report_sessions_session_type_check CHECK (session_type IN ('pin','viewer_only','presentation'));
> ```
> RLS de `report_sessions` se mantiene **solo server-side** (anon/authenticated rechazados); toda lectura/escritura por admin client.

---

## UI / Páginas Afectadas

### Páginas nuevas

- **`src/app/(panel)/informes/[id]/presentar/page.tsx`** + **`PresenterClient.tsx`** — vista del presentador (autenticada). Iframe del informe con bridge emisor + panel lateral (enlace espectador, contador, botón Terminar). Reusa la signed URL / endpoint con bridge.
- **`src/app/presentar/[token]/page.tsx`** + **`PresenterViewerClient.tsx`** — vista del espectador (pública). Iframe que carga `/api/presentation/[token]/content` y aplica el bridge receptor.

### Componentes reutilizables

- **`BrandLoader variant="dark"`** (spec 16) como loader del iframe.
- Bridge scripts: ver API.

### Breakpoints obligatorios

375px · 768px · 1280px (la vista del espectador es full-screen responsive; el panel del presentador se adapta).

---

## API / Endpoints

### Endpoints nuevos

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/presentation/[token]/content` | Sirve el informe (HTML con bridge receptor inyectado / PDF crudo) si el token corresponde a una sesión `presentation` activa. | token opaco (sin login) |

### Server actions nuevas (`src/app/(panel)/informes/[id]/presentation-actions.ts`)

| Acción | Descripción | Auth |
|--------|-------------|------|
| `startPresentation(reportId)` | Termina sesiones `presentation` previas del informe; crea una nueva (token raw → hash en BD, `session_type='presentation'`, `expires_at` +12h). Devuelve `{ token }`. | creador ∨ admin |
| `endPresentation(reportId)` | Marca `ended_at = now()` de la sesión `presentation` activa. | creador ∨ admin |

### Mecanismo Realtime

- Canal: `supabase.channel('presentation:'+reportId, { config: { presence: { key: 'presenter' | 'viewer' } } })`.
- Eventos broadcast: `{ event: 'presentation-event', payload: { type: 'scroll'|'selection'|'selection-clear'|'page'|'end', ... } }`.
- Presence: `track({ isPresenter })` / `track({ isViewer })` → contador.

### Bridge emisor (presentador, inyectado en el HTML del informe)
- Escucha `scroll` → `parent.postMessage({ type:'scroll', ratio: scrollY/(scrollHeight-innerHeight) }, '*')`.
- Escucha `selectionchange` → calcula XPath inicio/fin + offsets → `postMessage({ type:'selection', startXPath, startOffset, endXPath, endOffset })`.

### Bridge receptor (espectador, inyectado en el HTML del informe)
- Escucha `message` del parent → si `scroll`, hace `scrollTo(0, ratio*(scrollHeight-innerHeight))`; si `selection`, recrea Range y envuelve en `<mark>`; si `selection-clear`, limpia marcas.

> **GOTCHA contenido:** informes sirve el contenido como **bytes crudos** en `/api/reports/content` (PDF/HTML). Para presentación HTML hay que **inyectar el bridge** en el HTML antes de servirlo. Crear `/api/presentation/[token]/content` que: valida el token, descarga el HTML del Storage (`report-documents`), e **inyecta** `<script>` (emisor o receptor según query `?role=presenter|viewer`) antes de `</body>`. Para PDF, servir crudo y sincronizar desde el visor PDF.js del lado React (no por script inyectado).

---

## Notas de Seguridad

- **Token opaco:** se genera con el mismo patrón que las sesiones (`generateSessionToken` + `hashToken`); en BD solo el hash. El token raw solo viaja en la URL del espectador.
- **Validación server-side:** `/api/presentation/[token]/content` valida hash + `session_type='presentation'` + `ended_at IS NULL` + no expirada **antes** de servir contenido. Nunca sirve para tokens inválidos.
- **Aislamiento:** el contenido nunca aparece en el HTML inicial de la página ni para tokens de otra sesión/informe (scope por `report_id` derivado de la sesión).
- **Sin escalada:** el espectador no puede controlar la presentación (solo recibe). El presentador se valida como creador/admin server-side en las server actions.
- **SECURITY-AGENT** aplica el checklist de SPEC-11 (aislamiento de contenido, cookies/tokens hasheados, scope por informe).

---

## Plan de Implementación

### Arquitectura propuesta

- **BACKEND-AGENT:** `startPresentation`/`endPresentation`, endpoint `/api/presentation/[token]/content` con inyección de bridge, (constraint de `session_type` si aplica).
- **FRONTEND-AGENT:** `PresenterClient`, `PresenterViewerClient`, integración Realtime, bridges, loader.

### Desglose de tareas

1. (Si aplica) migración del CHECK de `session_type`.
2. `startPresentation` / `endPresentation` (admin client; terminar previas; token hash).
3. Endpoint `/api/presentation/[token]/content` (validación + inyección de bridge HTML / PDF crudo).
4. Bridges emisor/receptor (scroll % + selección XPath).
5. `PresenterClient` (canal, presence, broadcast, panel, Terminar).
6. `PresenterViewerClient` (canal, recibe broadcast → iframe).
7. Sincronización PDF (página + scroll) vía PDF.js.
8. Loader `BrandLoader variant="dark"`.
9. `pnpm build` verde + prueba con dos navegadores.

### Dependencias con otras specs

- **Entrante:** [`16`](16-loading-and-motion.md) (loader), [`18`](18-report-manage-screen.md) (botón Presentar y signed URLs), SPEC-11 (seguridad).

---

## Tests Requeridos

### Tests de integración obligatorios

- `startPresentation` termina sesiones previas y crea una con `session_type='presentation'`.
- `/api/presentation/[token]/content` devuelve 401/404 para token inválido, finalizado o expirado, y nunca filtra contenido.
- Una sesión de informe A no es válida para informe B (scope).

### Tests opcionales

- E2E con dos contextos de navegador (presentador + espectador) validando sincronización de scroll.

---

## Out of Scope (Explícito)

- Sincronización de **selección de texto en PDF** (solo HTML).
- Cursor/puntero del presentador, zoom sincronizado, audio/vídeo o chat.
- Persistencia del último estado de scroll para reconexión (el presentador re-sincroniza al moverse).
- Grabación de la sesión.
- Notas de orador (eso es la spec 20, aunque el panel del presentador puede mostrarlas si 20 está implementada).

---

## Notas de Implementación

- **Realtime ya disponible:** `@supabase/supabase-js` (instalado) incluye Realtime; no hace falta dependencia nueva. Verificar que Realtime está habilitado en el proyecto Supabase (`yyjfsoobgvotquhjkcmc`).
- **Cliente browser de Supabase:** usar el cliente de navegador (`src/lib/supabase/client.ts` o equivalente con `createBrowserClient`) para los canales Realtime en los componentes cliente.
- **postMessage origin:** en producción, restringir el `targetOrigin` del `postMessage` al origin propio en lugar de `'*'` (nota de seguridad menor).
- **Patrón propuestas confirmado:** broadcast de `scroll`/`selection` + presence para contar espectadores; `ended_at` para fin; token hasheado en la tabla de sesiones.
- **PDF reutiliza el wrapper existente:** para informes PDF, presentador y espectador renderizan con el wrapper de PDF.js de `src/lib/pdf/` (el mismo que usa el viewer público `PdfViewer.tsx`), NO con un iframe + script inyectado. El broadcast lleva `{ type:'page', page, scrollRatio }` y el espectador navega a esa página/offset. Reusar `PdfViewer` evita reimplementar el render.
- **El presentador también carga el endpoint con bridge:** el iframe del presentador (informes HTML) usa `/api/presentation/[token]/content?role=presenter` (inyecta el bridge emisor); el del espectador usa `?role=viewer` (bridge receptor). Ambos validan el mismo token.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Presentación sincronizada (scroll HTML/PDF + selección HTML) vía Supabase Realtime. | Claude Code |
