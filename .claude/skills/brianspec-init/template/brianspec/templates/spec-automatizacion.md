# SPEC-{{NN}}: {{WORKFLOW_NAME}}

**Versión:** 1.0
**Estado:** draft | aprobada | implementada
**Tipo de proyecto:** automatización
**Última actualización:** {{DATE}}
**Owner:** {{OWNER}}

---

## Descripción

{{DESCRIPTION}}

*(Qué automatiza este workflow y qué problema operativo resuelve. 2–4 oraciones máximo.)*

---

## Trigger

**Qué dispara el workflow:** {{TRIGGER}}

*(Webhook entrante, evento programado, cambio en una base de datos, mensaje en Slack, etc.)*

**Frecuencia esperada de ejecución:** {{FREQUENCY}}

**Latencia aceptable:** {{LATENCY}}

---

## Actores y sistemas involucrados

### Sistemas origen (de dónde vienen los datos)

- {{SOURCE_SYSTEM_1}}
- {{SOURCE_SYSTEM_2}}

### Sistemas destino (qué se actualiza/notifica)

- {{TARGET_SYSTEM_1}}
- {{TARGET_SYSTEM_2}}

### Humanos en el flujo (si aplica)

{{HUMAN_INVOLVEMENT}}

*(Hay aprobaciones manuales, notificaciones que esperan respuesta, etc.)*

---

## Flujo principal

```
[Trigger]
   ↓
{{STEP_1_DESCRIPTION}}
   ↓
{{STEP_2_DESCRIPTION}}
   ↓
{{STEP_3_DESCRIPTION}}
   ↓
[Resultado / Outcome]
```

### Detalle de cada paso

#### Paso 1: {{STEP_1_NAME}}
{{STEP_1_DETAIL}}

#### Paso 2: {{STEP_2_NAME}}
{{STEP_2_DETAIL}}

---

## Flujos alternativos / Manejo de errores

### Si {{ERROR_CONDITION_1}}

**Acción:** {{ERROR_HANDLING_1}}

### Si {{ERROR_CONDITION_2}}

**Acción:** {{ERROR_HANDLING_2}}

### Política de reintentos

{{RETRY_POLICY}}

*(Cuántos reintentos, con qué backoff, después de qué tipos de error. Nunca infinitos.)*

### Política de notificación de fallos

{{FAILURE_NOTIFICATION}}

*(A dónde se notifica un fallo no recuperable: Slack, email, dashboard. Quién lo recibe.)*

---

## Criterios de aceptación

- [ ] CA-01: {{CRITERION}}
- [ ] CA-02: {{CRITERION}}
- [ ] CA-03: {{CRITERION}}

*(Ejemplos de buenos CAs para automatizaciones:)*
- *"Dado un webhook entrante con payload válido, el workflow crea una tarea en ClickUp con los campos X, Y, Z rellenos en menos de 30 segundos."*
- *"Si la API destino devuelve 500, el workflow reintenta 3 veces con backoff exponencial y, tras el tercer fallo, envía una alerta a #alertas-immoral en Slack."*

---

## Inputs esperados

### Estructura del payload entrante

```json
{{INPUT_PAYLOAD_SCHEMA}}
```

### Validaciones aplicadas

{{INPUT_VALIDATIONS}}

### Qué se rechaza explícitamente

{{REJECTED_INPUTS}}

---

## Outputs / Efectos

### Qué se crea, modifica o envía

{{OUTPUTS}}

### Idempotencia

{{IDEMPOTENCY}}

*(Si el workflow se ejecuta dos veces con el mismo input, ¿qué pasa? Por defecto: no crear duplicados.)*

---

## Credenciales e integraciones requeridas

| Sistema | Credencial usada | Scope mínimo | Dónde se gestiona |
|---|---|---|---|
| {{SYSTEM}} | {{CREDENTIAL}} | {{SCOPE}} | {{LOCATION}} |

---

## Notas de seguridad

### Datos sensibles que procesa el workflow

{{SENSITIVE_DATA}}

### Verificación de autenticidad del trigger

{{TRIGGER_AUTH}}

*(Si es webhook: firma, token, IP allowlist.)*

### Logs y trazabilidad

{{LOGGING_POLICY}}

*(SECURITY-AGENT aplicará el checklist de `.brianspec/security-checklists.md` sección "Tipo: automatización" durante la revisión.)*

---

## Plan de implementación

### Estructura del workflow

{{WORKFLOW_STRUCTURE}}

### Nodos / Steps a configurar

1. {{NODE_1}}
2. {{NODE_2}}
3. {{NODE_3}}

### Dependencias con otros workflows

{{DEPENDENCIES}}

---

## Verificación

### Cómo se prueba el workflow antes de activarlo en producción

{{TESTING_APPROACH}}

*(Para automatizaciones, los tests no suelen ser automatizados — son ejecuciones manuales contra datos de prueba. Documentar el procedimiento.)*

### Casos de prueba mínimos

- {{TEST_CASE_1}}: input → output esperado
- {{TEST_CASE_2}}: input erróneo → comportamiento esperado
- {{TEST_CASE_3}}: caso límite → comportamiento esperado

---

## Coste y consumo

### Llamadas a APIs de pago

{{PAID_API_CALLS}}

*(Estimación de llamadas por ejecución y por mes. Si supera umbrales razonables, levantar alerta.)*

### Límites de ejecución

{{EXECUTION_LIMITS}}

---

## Out of scope (explícito)

- {{OUT_OF_SCOPE_1}}
- {{OUT_OF_SCOPE_2}}

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 1.0 | {{DATE}} | Versión inicial | {{AUTHOR}} |

> Cada modificación posterior a la aprobación debe añadir una fila: versión incrementada, fecha, descripción breve del cambio y nombre del usuario que lo realiza.
