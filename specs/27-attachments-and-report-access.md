# SPEC-27: Adjuntos y acceso del informe (pegar PIN, validación, versión forzada, modal Drive)

**Versión:** 1.0
**Estado:** implementada
**Última actualización:** 2026-06-05
**Owner:** Julián (julian@immoral.es)

---

## Descripción

Conjunto de mejoras sobre el flujo de acceso y los adjuntos del informe, tanto en el panel del empleado como en el viewer del cliente. Incluye: permitir pegar el PIN de 4 dígitos correctamente, validar y comunicar las extensiones y tamaño máximo de los adjuntos con refresco instantáneo al subir, blindar el viewer del cliente para que solo sirva la versión vigente del informe, y presentar los adjuntos al cliente en una modal co-branded estilo "Drive".

## Actores

- **Empleado / Admin:** sube y elimina adjuntos en el panel de gestión del informe.
- **Cliente / Destinatario:** introduce el PIN para acceder al informe y descarga los adjuntos desde el viewer.

## Flujos Principales

### Flujo 1: Pegar el PIN (cliente)
1. El cliente abre el viewer protegido y ve cuatro casillas de un dígito para el PIN.
2. El cliente copia un PIN de 4 dígitos (p. ej. desde el email/WhatsApp) y lo pega en la primera casilla.
3. El sistema distribuye automáticamente los 4 dígitos en las cuatro casillas y, si el PIN pegado tiene exactamente 4 dígitos, queda listo para verificar (o se verifica automáticamente).

### Flujo 2: Subir adjunto con validación y refresco instantáneo (empleado)
1. El empleado pulsa "+ Añadir" en la sección Adjuntos del informe.
2. El selector de archivos muestra/filtra solo las extensiones permitidas; debajo del botón hay un aviso visible con las extensiones aceptadas y el tamaño máximo.
3. El empleado elige un archivo válido; durante la subida ve un indicador de progreso ("subiendo…").
4. Al completarse, el adjunto aparece **inmediatamente** en la lista sin recargar la página, con su nombre, tamaño y enlace de descarga.
5. Si el archivo no cumple tipo o tamaño, se muestra un mensaje de error claro y no se sube nada.

### Flujo 3: El cliente solo ve la versión vigente
1. El cliente autenticado abre el informe.
2. El sistema sirve **siempre** la versión actual del informe, independientemente de cualquier parámetro de versión que pudiera incluirse en la petición.

### Flujo 4: Modal de adjuntos estilo Drive (cliente)
1. En el viewer, si el informe tiene adjuntos, el cliente ve un botón de adjuntos con el contador.
2. Al pulsarlo se abre una modal co-branded (Immoral × logo del cliente) con una rejilla de tarjetas, una por archivo.
3. Cada tarjeta muestra un icono según el tipo de archivo, el nombre y el tamaño; al pulsarla se descarga el archivo.
4. En móvil la modal entra desde abajo (bottom-sheet); en tablet/escritorio aparece centrada.
5. El cliente cierra la modal con el botón ×, pulsando fuera o con la tecla Escape.

## Flujos Alternativos / Edge Cases

- **PIN pegado con caracteres no numéricos o más de 4 dígitos:** se descartan los no-dígitos y se toman los primeros 4; si hay menos de 4, se rellenan las casillas disponibles y el foco queda en la siguiente vacía.
- **Adjunto con MIME genérico (`application/octet-stream`):** la validación cae a la extensión del nombre de archivo para decidir si se acepta.
- **Adjunto que supera el tamaño máximo:** error claro indicando el límite; no se sube.
- **Informe sin adjuntos:** no se muestra el botón de adjuntos en el viewer (comportamiento actual).
- **Petición de contenido con `?version=N` distinto de la versión vigente:** se ignora el parámetro y se sirve la versión vigente (no es un error; simplemente no se honra).
- **Imagen como adjunto:** se muestra con un icono de imagen genérico (las miniaturas reales quedan fuera de alcance, ver Out of Scope).

## Criterios de Aceptación

- [ ] CA-01: Pegar un PIN de 4 dígitos en la primera casilla rellena las cuatro casillas correctamente.
- [ ] CA-02: Tras pegar un PIN válido de 4 dígitos, el formulario queda listo para verificar (botón habilitado) o se verifica automáticamente.
- [ ] CA-03: El selector de archivos de adjuntos restringe (atributo `accept`) a las extensiones permitidas: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), PowerPoint (.ppt/.pptx), imágenes (.png/.jpg/.jpeg) y ZIP.
- [ ] CA-04: Debajo del botón "+ Añadir" hay un aviso visible con las extensiones permitidas y el tamaño máximo (25 MB).
- [ ] CA-05: El servidor rechaza adjuntos cuyo tipo no esté permitido, con mensaje de error claro, y los acepta cuando el tipo es válido (validando por MIME con fallback a extensión).
- [ ] CA-06: El servidor rechaza adjuntos que superen 25 MB con mensaje de error claro.
- [ ] CA-07: Tras subir un adjunto correctamente, aparece en la lista del panel sin necesidad de recargar la página (actualización en estado, sin recarga completa).
- [ ] CA-08: Durante la subida de un adjunto se muestra un indicador de progreso/estado ("subiendo…").
- [ ] CA-09: El endpoint que sirve el contenido del informe al cliente sirve siempre la versión vigente, ignorando cualquier parámetro de versión recibido.
- [ ] CA-10: En el viewer, al pulsar el botón de adjuntos se abre una modal con header co-branded (logo Immoral × logo del cliente) y una rejilla de tarjetas, una por adjunto.
- [ ] CA-11: Cada tarjeta de la modal muestra un icono según el tipo de archivo, el nombre y el tamaño; al pulsarla descarga el archivo a través del endpoint protegido.
- [ ] CA-12: En 375 px la modal se presenta como bottom-sheet (entra desde abajo, una columna) y en 768/1280 px aparece centrada (rejilla de 2–3 columnas).
- [ ] CA-13: La modal se cierra con el botón ×, al pulsar fuera y con la tecla Escape.
- [ ] CA-14: La descarga de adjuntos sigue pasando por el endpoint autenticado existente (validación de sesión y de pertenencia al informe); no se exponen URLs públicas de Storage.

## Modelo de Datos

No se requieren cambios de esquema ni migraciones. Se usan las tablas existentes `reports` (campo de versión vigente), `report_versions` y `report_attachments` (`filename`, `mime_type`, `storage_path`, `size_bytes`).

## UI / Páginas Afectadas

### Páginas nuevas
- Ninguna.

### Páginas modificadas
- **Modal de PIN del cliente** (`src/app/[space]/[slug]/AccessModal.tsx`): añadir manejo de pegado en las cuatro casillas del PIN.
- **Gestión de informe / sección Adjuntos** (`src/app/(panel)/informes/[id]/ReportManageClient.tsx`): añadir `accept` al input (línea ~383), aviso de extensiones/tamaño bajo "+ Añadir" (~373-382), refresco instantáneo en `handleAddAttachment` (~146-159) usando el registro devuelto por la acción en lugar de `router.refresh()`, e indicador de progreso.
- **Viewer del cliente** (`src/app/[space]/[slug]/ViewerShell.tsx`): reemplazar el dropdown actual de adjuntos (líneas ~113-147) por la apertura de la nueva modal.

### Componentes reutilizables
- **Nuevo:** `src/app/[space]/[slug]/AttachmentsModal.tsx` — modal co-branded de adjuntos (bottom-sheet en móvil, centrada en desktop, rejilla de tarjetas con icono por tipo).
- **Reutilizar:** `src/components/shared/CoBrandLockup.tsx` para el header co-branded de la modal (variantes `modal`/`header`).
- **Reutilizar:** lenguaje visual del viewer — fondo `#111111`, tarjetas `#1c1c1c` con borde `#2e2e2e`, acento `var(--brand)`.

### Breakpoints obligatorios
375px (mobile) · 768px (tablet) · 1280px (desktop)

## API / Endpoints

### Endpoints modificados
| Método | Ruta | Cambio | Auth requerida |
|--------|------|--------|----------------|
| GET | `/api/reports/content` | Servir siempre la versión vigente; ignorar el parámetro `version` | cookie de sesión del informe |

### Server actions modificadas
- `addAttachment(reportId, formData)` en `src/app/(panel)/informes/actions.ts`: validar tipo (MIME con fallback a extensión) y tamaño contra constantes específicas de adjuntos; **devolver el adjunto creado** (id, filename, mime_type, size_bytes, storage_path) **junto con su signed URL** para permitir el refresco instantáneo en cliente. Añadir constantes `ATT_ALLOWED_MIME` y `ATT_MAX_SIZE = 25 MB` sin alterar las constantes de documentos (`ALLOWED_MIME` PDF/HTML y `MAX_SIZE` usadas por `uploadDocument`).

### Contratos de request/response
- **`addAttachment` (éxito):** `{ success: true, attachment: { id, filename, mime_type, size_bytes, storage_path, signed_url } }`.
- **`addAttachment` (error):** `{ error: string }` (tipo no permitido / supera tamaño / fallo de subida).
- **`GET /api/reports/content`:** request `report_id` (obligatorio); el parámetro `version` se ignora. Respuesta: cuerpo del documento con `Content-Type` correcto (`text/html; charset=utf-8` o `application/pdf`), igual que hoy.

## Notas de Seguridad

- **Versión forzada (CA-09):** elimina la posibilidad teórica de que un cliente solicite una versión anterior manipulando la URL. La versión a servir se deriva de `reports.current_version` en servidor, nunca del parámetro del cliente.
- **Descarga de adjuntos (CA-14):** se mantiene el endpoint autenticado `GET /api/reports/attachments/[id]` que valida la cookie de sesión y que el adjunto pertenece al informe de la sesión. No se sirven adjuntos por signed URL pública en el lado cliente.
- **Validación de adjuntos (CA-05/06):** la validación de tipo y tamaño es server-side; el `accept` del input es solo conveniencia de UX y no sustituye la validación del servidor.
- Las signed URLs de adjuntos del panel (para el empleado) siguen generándose server-side con `getSignedAttachmentUrl` (1 h de validez) y no se exponen al cliente del viewer.
- SECURITY-AGENT debe revisar especialmente: que el contenido del informe sigue sin viajar antes de validar la sesión, que la cookie sigue scoped por `report_id`, y que la validación de adjuntos no introduce una vía para servir tipos peligrosos sin autenticación.

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT:** pegado de PIN (`AccessModal.tsx`); `accept` + aviso + refresco instantáneo + progreso en la sección Adjuntos (`ReportManageClient.tsx`); nueva modal `AttachmentsModal.tsx` y su integración en `ViewerShell.tsx`.
- **BACKEND-AGENT:** validación de tipo/tamaño y nuevo valor de retorno en `addAttachment`; forzar versión vigente en `/api/reports/content`.
- **DB-AGENT:** sin tareas (no hay migraciones).

### Desglose de tareas
1. `AccessModal.tsx`: añadir `handlePaste(idx, e)` que limpia no-dígitos, distribuye desde `idx`, actualiza estado y enfoca; cablear `onPaste` en cada casilla; opcional auto-submit si quedan 4 dígitos.
2. `actions.ts`: definir `ATT_ALLOWED_MIME` (PDF, Word, Excel, PowerPoint, PNG, JPG/JPEG, ZIP) y `ATT_MAX_SIZE = 25*1024*1024`; en `addAttachment` validar tipo (con fallback a extensión del filename) y tamaño; devolver el adjunto creado + su signed URL.
3. `ReportManageClient.tsx`: añadir `accept` al input de adjuntos; añadir aviso de extensiones/tamaño bajo "+ Añadir"; en `handleAddAttachment` insertar el adjunto devuelto en `setAtts` (optimista) y mostrar estado "subiendo…" mientras dura; quitar el `router.refresh()` de ese flujo.
4. `/api/reports/content/route.ts`: cambiar la línea de selección de versión para usar siempre `r.current_version` (ignorar `versionParam`).
5. Crear `AttachmentsModal.tsx` (co-branded, bottom-sheet móvil / centrada desktop, rejilla con icono por tipo + nombre + tamaño, cierre por ×/overlay/Escape, scroll-lock del body).
6. `ViewerShell.tsx`: reemplazar el dropdown por el botón que abre `AttachmentsModal`; pasar `attachments` y `client_logo_signed_url` y `client_name`.
7. Verificar responsive en los tres breakpoints y la descarga end-to-end.

### Dependencias con otras specs
- Ninguna bloqueante. Reutiliza el co-branding introducido en SPEC-25.

## Tests Requeridos

### Tests de integración obligatorios
- **Acceso del cliente con versión forzada:** una petición a `/api/reports/content` con `?version=` antiguo, con sesión válida, devuelve la versión vigente.
- **Validación de adjuntos:** subida rechazada por tipo no permitido y por exceso de tamaño; subida aceptada para un tipo válido dentro del límite.

### Tests opcionales
- E2E del pegado de PIN (pegar "1234" rellena las 4 casillas).
- Revisión visual de la modal de adjuntos en 375 / 768 / 1280 px.

## Out of Scope (Explícito)

- **Miniaturas reales de imágenes** en la modal de adjuntos (se usan iconos por tipo). Planificable para una spec futura.
- **Permitir al cliente ver versiones anteriores** del informe (se decide explícitamente bloquearlo a la versión vigente).
- **Reordenar adjuntos** (`display_order`) desde la UI — fuera de alcance.
- **Previsualización en línea** de adjuntos (solo descarga).

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-05 | Versión inicial | Julián |
