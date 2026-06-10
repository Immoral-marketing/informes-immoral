# SPEC-32: Email de Magic Link Personalizable con Preview

**Versión:** 1.1
**Estado:** draft
**Tipo de proyecto:** web-app
**Última actualización:** 2026-06-10
**Owner:** Julian

---

## Descripción

El email que se envía al cliente al compartir un informe por magic link usa actualmente un template fijo con la palabra "informe" hardcodeada. Esta spec convierte ese email en un mensaje personalizable: el empleado puede editar el asunto y añadir una nota libre antes de enviar, y puede previsualizar exactamente cómo le llegará el email al cliente. El template base se vuelve neutro y funciona para cualquier tipo de documento (informe, análisis, estrategia, propuesta, etc.).

---

## Actores

- **Empleado / Admin:** personaliza el asunto y la nota antes de enviar el magic link, previsualiza el email y lo envía.
- **Destinatario (cliente externo):** recibe el email personalizado por el empleado.
- **Sistema:** renderiza el template con los datos del empleado + defaults si no se rellenan los campos.

---

## Flujos principales

### Flujo 1: Envío de magic link con personalización

1. El empleado hace clic en "Enviar al cliente" en la pantalla de gestión del informe.
2. Se abre el modal de envío (actualmente `SendMagicLinkModal`). Este modal se extiende con dos nuevas secciones:
   - **Asunto del email** (campo de texto opcional, max 120 caracteres). Placeholder: el asunto por defecto generado automáticamente (ej: "Tienes acceso a [nombre del informe]").
   - **Nota para el cliente** (textarea opcional, max 500 caracteres). Placeholder: "Añade un mensaje personal para el cliente…"
3. El empleado selecciona los destinatarios (comportamiento existente).
4. El empleado puede hacer clic en **"Previsualizar email"** para ver cómo quedará el email antes de enviarlo.
5. El empleado hace clic en "Enviar enlace".
6. El sistema envía el email con el asunto y la nota personalizados (o con los valores por defecto si se dejaron vacíos).

### Flujo 2: Previsualización del email

1. El empleado hace clic en "Previsualizar email" dentro del modal de envío.
2. Se muestra un preview renderizado del email: plantilla HTML real con los valores actuales del asunto y la nota, el nombre del primer destinatario seleccionado (o un nombre genérico si no hay selección), el nombre del cliente, el logo de Immoral, el logo del cliente (si existe) y un botón "Acceder al documento" (simulado, no funcional).
3. El preview se actualiza en tiempo real (o al hacer clic en "Previsualizar") cuando cambian el asunto o la nota.
4. El empleado cierra el preview y puede seguir editando o enviar directamente.

### Flujo 3: Template neutro (sin personalización)

1. El empleado envía sin rellenar asunto ni nota.
2. El email usa los valores por defecto:
   - **Asunto por defecto:** "[Nombre del informe] — [Nombre del cliente]"
   - **Cuerpo por defecto:** "[Nombre del empleado] de Immoral Group te ha compartido un documento: [Nombre del informe]."
   - Sin bloque de nota adicional.

---

### Flujo 4: Añadir destinatario directamente desde el modal de envío

**Caso A — Sin destinatarios registrados:**
1. El empleado abre el modal "Enviar al cliente". La sección de destinatarios muestra el mensaje "El cliente no tiene destinatarios registrados" y, justo debajo, el formulario inline expandido de "Añadir destinatario".
2. El empleado rellena email (obligatorio) y nombre completo (opcional) y hace clic en "Añadir".
3. El sistema llama a la server action `addRecipient` y crea el destinatario en `client_recipients`.
4. El nuevo destinatario aparece en la lista y queda pre-seleccionado automáticamente.
5. El empleado puede enviar el magic link sin salir del modal.

**Caso B — Con destinatarios ya existentes:**
1. El empleado abre el modal y ve la lista de destinatarios existente.
2. En la parte inferior de la lista hay un botón "+ Añadir destinatario".
3. Al hacer clic, se expande un formulario inline (email + nombre) debajo de la lista sin cerrar ni cambiar el modal.
4. Al guardar, el nuevo destinatario aparece en la lista y queda pre-seleccionado.
5. El formulario se colapsa automáticamente tras guardar con éxito.

---

## Flujos alternativos / Edge cases

- **Asunto vacío:** se usa el asunto por defecto generado automáticamente. No debe quedar un asunto en blanco.
- **Nota vacía:** el bloque de nota no aparece en el email (no se muestra el espacio en blanco).
- **Nota con saltos de línea:** se preservan como `<br>` en el HTML del email.
- **Nombre de destinatario desconocido en el preview:** si el destinatario no tiene `full_name` relleno, el preview muestra "Hola," sin nombre.
- **Preview sin destinatario seleccionado:** se usa el primer destinatario de la lista como ejemplo; si no hay ninguno, se muestra un placeholder genérico.
- **Email largo en nota (>500 chars):** el campo textarea muestra un contador y bloquea el envío si se supera el límite.
- **Autoenvío (auto_send_on_publish):** cuando el informe se crea con auto-envío activado, se usa el template neutro por defecto (sin nota, con el asunto por defecto). No hay pantalla de personalización en este flujo automático.
- **Email duplicado al añadir inline:** si el email introducido ya existe en `client_recipients` para ese cliente, el sistema muestra error inline "Este email ya está registrado" sin cerrar el formulario.
- **Email inválido:** el campo de email valida formato antes de llamar al backend. Si el backend rechaza (constraint única), el error se muestra inline.
- **Nombre completo vacío:** permitido — el destinatario se crea con `full_name = null`. El email del magic link usará "Hola," sin nombre.
- **Formulario inline abierto al enviar:** si el empleado tiene el formulario inline abierto pero no ha guardado y hace clic en "Enviar enlace", el envío procede con los destinatarios ya seleccionados (el formulario no enviado se ignora). El formulario permanece abierto para que el empleado pueda guardarlo si quiere.

---

## Criterios de aceptación

- [ ] CA-32.1: El modal de envío de magic link muestra un campo de asunto (opcional, max 120 chars) con el asunto por defecto como placeholder.
- [ ] CA-32.2: El modal de envío muestra un textarea de nota (opcional, max 500 chars) con un placeholder descriptivo.
- [ ] CA-32.3: El botón "Previsualizar email" muestra un preview renderizado del email con los valores actuales de asunto y nota.
- [ ] CA-32.4: El preview incluye el logo de Immoral, el logo del cliente (si existe), el asunto, el nombre del destinatario (o "Hola," si no tiene nombre), el cuerpo del email y un botón "Acceder al documento" simulado.
- [ ] CA-32.5: Si el asunto se deja vacío, el email se envía con el asunto por defecto "[Nombre del informe] — [Nombre del cliente]". Nunca se envía con asunto en blanco.
- [ ] CA-32.6: Si la nota se deja vacía, el bloque de nota no aparece en el email enviado.
- [ ] CA-32.7: La nota con saltos de línea se preserva en el HTML del email.
- [ ] CA-32.8: El template no usa la palabra "informe" de forma hardcodeada en el cuerpo genérico; usa "documento" o el título del informe.
- [ ] CA-32.9: El autoenvío al crear/versionar un informe usa el template neutro por defecto sin personalización (sin regresión en ese flujo).
- [ ] CA-32.10: El asunto y la nota se pasan al backend al enviar; no se persisten en base de datos (se usan solo para ese envío).
- [ ] CA-32.11: Un textarea con >500 caracteres muestra error de validación y bloquea el envío.
- [ ] CA-32.12: `pnpm build` pasa sin errores TypeScript.
- [ ] CA-32.13: Si el cliente no tiene destinatarios, el modal muestra el formulario inline de "Añadir destinatario" expandido directamente (sin paso extra).
- [ ] CA-32.14: Si el cliente tiene destinatarios, el modal muestra un botón "+ Añadir destinatario" que al hacer clic expande un formulario inline debajo de la lista.
- [ ] CA-32.15: El formulario inline solicita email (obligatorio) y nombre completo (opcional). No solicita cargo ni estado primario (esos campos se gestionan en la ficha del cliente).
- [ ] CA-32.16: Al guardar el formulario inline, el nuevo destinatario queda pre-seleccionado automáticamente en la lista y el formulario se colapsa.
- [ ] CA-32.17: El destinatario creado inline persiste en `client_recipients` y es visible en la ficha del cliente.
- [ ] CA-32.18: Si el email ya existe para ese cliente, el formulario inline muestra un error "Este email ya está registrado" sin cerrar el formulario ni el modal.
- [ ] CA-32.19: El botón "Enviar enlace" solo se habilita si hay al menos un destinatario seleccionado (comportamiento existente — no cambia).

---

## Modelo de datos

No hay cambios en el modelo de base de datos. El asunto y la nota son campos efímeros que se pasan como parámetros en el envío y no se persisten. El template HTML del email se actualiza en el helper de envío existente.

---

## UI / Páginas afectadas

### Páginas modificadas

| Ruta | Cambio |
|------|--------|
| `/informes/[id]` | El modal de envío (`SendMagicLinkModal`) se extiende con campos de asunto, nota, botón de preview y formulario inline de añadir destinatario. |

### Componentes nuevos o modificados

- **`SendMagicLinkModal`** — se extiende con: campos de asunto (Input) y nota (Textarea), botón "Previsualizar email", y formulario inline colapsable de "Añadir destinatario" (email + nombre). Si no hay destinatarios, el formulario inline aparece expandido directamente; si hay, aparece un botón "+ Añadir destinatario" que lo despliega.
- **`EmailPreview`** — componente de preview del email: renderiza el template HTML como lo vería el cliente, con datos reales. Se muestra como paso alternativo dentro del mismo modal.
- Helper de envío de email (backend) — actualizar el template HTML para que use el asunto y la nota si se pasan; eliminar "informe" hardcodeado del cuerpo genérico.

### Breakpoints obligatorios

375px · 768px · 1280px

---

## API / Endpoints

### Endpoints modificados

| Tipo | Nombre | Cambio |
|------|--------|--------|
| Server Action | `sendMagicLinks(reportId, recipientIds[], options?)` | Recibe `options: { subject?: string; note?: string }` opcionales. Los pasa al helper de envío. |
| Helper | `generateAndSendMagicLink(...)` | Acepta `subject` y `note` opcionales. Los incorpora al template HTML del email. Si no se pasan, usa los valores por defecto. |
| Server Action | `addRecipient(clientId, formData)` | Existente en `clientes/actions.ts`. Se reutiliza desde el modal de envío para crear destinatarios inline. No se duplica — se llama directamente. |

### Contratos

```typescript
// Parámetros adicionales en sendMagicLinks
options?: {
  subject?: string;  // max 120 chars; si vacío → default
  note?: string;     // max 500 chars; si vacío → no aparece en email
}

// Campos del formulario inline de añadir destinatario
// Llama a addRecipient(clientId, formData) con:
// formData.email: string (obligatorio)
// formData.full_name: string (opcional, puede quedar vacío)
// formData.is_primary: false (siempre; la lógica de primario se gestiona en la ficha del cliente)
```

---

## Notas de seguridad

### Datos sensibles involucrados

- El asunto y la nota son texto libre introducido por el empleado. No contienen tokens ni datos de sesión.
- El asunto y la nota se incluyen en el email pero **no se persisten en base de datos** (no hay superficie de exfiltración adicional).

### Validaciones server-side requeridas

- Longitud máxima de asunto: 120 caracteres (rechazar si se supera).
- Longitud máxima de nota: 500 caracteres (rechazar si se supera).
- Sanitización básica: no se evalúa HTML en la nota (se escapa antes de insertar en el template); los saltos de línea se convierten a `<br>`.
- La autorización para enviar magic links no cambia: solo el empleado creador o admin puede enviar.

### Autenticación y autorización

Sin cambio respecto a SPEC-07. La server action `sendMagicLinks` ya verifica autenticación y pertenencia del informe.

### Otros riesgos identificados

- **Injection en el template HTML del email:** la nota debe escaparse correctamente antes de insertarse en el HTML. No usar `innerHTML` con texto del usuario sin sanitizar.
- El preview del email se renderiza en el navegador del empleado; no hay riesgo de XSS para el cliente.

---

## Plan de implementación

### Arquitectura propuesta

- **FRONTEND-AGENT:** extender `SendMagicLinkModal` con: campos de asunto y nota; botón preview; formulario inline colapsable de añadir destinatario (reutilizando `addRecipient` ya existente). Crear el componente `EmailPreview` que renderiza el template con los datos actuales.
- **BACKEND-AGENT:** actualizar `sendMagicLinks` para aceptar `options`; actualizar el helper de email para incorporar asunto y nota al template HTML; eliminar "informe" hardcodeado del cuerpo genérico del template. `addRecipient` ya existe y no necesita cambios.

### Desglose de tareas

1. **Backend:** actualizar helper de email para aceptar `subject` y `note` opcionales; actualizar template HTML (texto neutro, incorporar nota si existe, usar asunto personalizable).
2. **Backend:** actualizar `sendMagicLinks` server action para aceptar y validar `options`.
3. **Frontend:** añadir campos de asunto y nota al modal de envío con validación client-side (contadores de caracteres, longitud máxima).
4. **Frontend:** crear componente `EmailPreview` que renderiza el template con los datos actuales del formulario.
5. **Frontend:** cablear el botón "Previsualizar email" para abrir `EmailPreview` con los valores del formulario.
6. **Frontend:** añadir formulario inline colapsable de "Añadir destinatario" en `SendMagicLinkModal`:
   - Si lista vacía: formulario expandido por defecto donde iría el mensaje de "sin destinatarios".
   - Si lista con datos: botón "+ Añadir destinatario" que expande el formulario debajo de la lista.
   - Al guardar: llamar `addRecipient(clientId, formData)`, refrescar la lista de destinatarios, pre-seleccionar el nuevo, colapsar el formulario.
   - Errores inline (email duplicado, formato inválido) sin cerrar el modal.
   - `clientId` debe estar disponible en `getReportRecipients` — verificar que se devuelve en `meta` o añadirlo.
7. **Verificación:** confirmar que el autoenvío (auto_send_on_publish) no se ve afectado (sigue usando defaults).

### Dependencias con otras specs

- **SPEC-07** — extiende el modal y el helper de envío de magic links definidos en esa spec.
- **SPEC-25** — el logo del cliente ya está disponible; el preview del email lo muestra si existe.

---

## Tests requeridos

### Tests de integración

- `sendMagicLinks` con `subject` y `note` rellenos: el email enviado contiene el asunto y la nota personalizados.
- `sendMagicLinks` sin `subject`: el email usa el asunto por defecto y nunca queda vacío.
- `sendMagicLinks` sin `note`: el bloque de nota no aparece en el HTML del email.
- `sendMagicLinks` con `note` que supera 500 chars: la server action rechaza la petición.
- Formulario inline con email duplicado: devuelve error "Este email ya está registrado" sin crear registro duplicado.
- Formulario inline con email vacío: el botón "Añadir" permanece deshabilitado (validación client-side).

---

## Out of scope (explícito)

- Persistir el asunto o la nota en base de datos (historial de envíos personalizados).
- Diferentes templates por tipo de documento (informe / análisis / estrategia). El template base es neutro y único; la personalización es por campos, no por tipo.
- Editor de template visual / drag-and-drop.
- Plantillas guardadas reutilizables.
- Envío de emails con adjuntos desde el modal.
- Editar o eliminar destinatarios desde el modal de envío (eso sigue siendo exclusivo de la ficha del cliente).
- Marcar el destinatario nuevo como primario desde el modal de envío.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-10 | Versión inicial | Claude Code |
| 1.1 | 2026-06-10 | Extensión: formulario inline de añadir destinatario (CA-32.13–19); flujo 4; edge cases de email duplicado; plan de implementación actualizado | Claude Code |
