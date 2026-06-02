# SPEC-{{NN}}: {{SKILL_NAME}}

**Versión:** 1.0
**Estado:** draft | aprobada | implementada
**Tipo de proyecto:** skill-ia
**Última actualización:** {{DATE}}
**Owner:** {{OWNER}}

---

## Descripción

{{DESCRIPTION}}

*(Qué hace esta skill y qué problema resuelve. 2–4 oraciones. La descripción aquí es funcional; la frase de activación va en su sección.)*

---

## Cuándo se activa

### Frase de activación (description del SKILL.md)

{{ACTIVATION_DESCRIPTION}}

*(Lo que el modelo evalúa para decidir si lanzar esta skill. Debe contener triggers explícitos: "actívala cuando el usuario diga X, Y, Z", "cuando comparta un archivo de tipo W", etc.)*

### Cuándo NO se activa

{{NEGATIVE_ACTIVATION}}

*(Casos cercanos donde podría confundirse con otra skill o donde NO debería activarse.)*

---

## Inputs

### Inputs confiables (del usuario que invoca la skill)

{{TRUSTED_INPUTS}}

### Inputs no confiables (archivos, web, transcripciones)

{{UNTRUSTED_INPUTS}}

*(Importante distinguir: las instrucciones del sistema solo se concatenan con inputs confiables. Los no confiables se procesan como datos, no como instrucciones — ver checklist de seguridad de skill-ia.)*

### Validaciones aplicadas a los inputs

{{INPUT_VALIDATIONS}}

---

## Flujo principal

```
[Activación]
   ↓
{{STEP_1}}
   ↓
{{STEP_2}}
   ↓
{{STEP_3}}
   ↓
[Output]
```

### Detalle paso a paso

#### Paso 1: {{STEP_1_NAME}}
{{STEP_1_DETAIL}}

#### Paso 2: {{STEP_2_NAME}}
{{STEP_2_DETAIL}}

---

## Outputs

### Qué genera la skill

{{OUTPUTS}}

### Formato del output

{{OUTPUT_FORMAT}}

*(Texto plano, JSON estructurado, archivo, mensaje en Slack, tarea en ClickUp, etc.)*

### Confirmación previa requerida

{{CONFIRMATION_REQUIRED}}

*(Acciones reversibles → ejecutar directamente. Acciones irreversibles → resumen + confirmación humana antes de ejecutar.)*

---

## Acciones que ejecuta

| Acción | Sistema afectado | Reversible | Requiere confirmación |
|---|---|---|---|
| {{ACTION}} | {{SYSTEM}} | {{REVERSIBLE}} | {{CONFIRMATION}} |

*(Enumerar todas las acciones que la skill ejecuta. Si más adelante se añade una nueva, requiere actualizar la spec — no se hace silenciosamente.)*

---

## Criterios de aceptación

- [ ] CA-01: {{CRITERION}}
- [ ] CA-02: {{CRITERION}}
- [ ] CA-03: {{CRITERION}}

*(Ejemplos de buenos CAs para skills de IA:)*
- *"Dada una transcripción de reunión, la skill identifica al menos los 3 acuerdos clave y los formatea como tareas con owner asignado."*
- *"Si el usuario invoca la skill sin contexto suficiente, la skill responde con 3 preguntas concretas en lugar de adivinar."*
- *"La skill ejecuta entre 1 y 4 llamadas al modelo principal por invocación típica."*

---

## Casos de prueba

Los tests automatizados tradicionales no aplican a las skills de IA. En su lugar, esta spec declara casos de prueba con input → output esperado:

### Caso 1: {{TEST_CASE_1_NAME}}

**Input:** {{INPUT}}
**Output esperado:** {{EXPECTED_OUTPUT}}
**Tolerancia:** {{TOLERANCE}}

*(Las skills de IA tienen variabilidad. Definir qué variaciones son aceptables y cuáles no.)*

### Caso 2: {{TEST_CASE_2_NAME}}

**Input:** {{INPUT}}
**Output esperado:** {{EXPECTED_OUTPUT}}

### Caso 3: Edge case — {{EDGE_CASE_NAME}}

**Input:** {{INPUT}}
**Output esperado:** {{EXPECTED_OUTPUT}}

---

## Notas de seguridad

### Prompt injection

{{PROMPT_INJECTION_MITIGATION}}

*(Cómo se separan instrucciones del sistema de contenido no confiable.)*

### Datos sensibles enviados al modelo

{{SENSITIVE_DATA_TO_MODEL}}

*(Qué se envía al modelo, si hay PII, si está permitido o requiere anonimización previa.)*

### Acciones bloqueadas

{{BLOCKED_ACTIONS}}

*(Acciones que la skill explícitamente NO ejecuta aunque parezca lógico que las hiciera. Ej: la skill puede leer emails pero nunca enviarlos. La skill puede sugerir cambios en BBDD pero nunca ejecutarlos sin confirmación.)*

*(SECURITY-AGENT aplicará el checklist de `.brianspec/security-checklists.md` sección "Tipo: skill-ia" durante la revisión.)*

---

## Integraciones requeridas

### MCPs

{{MCPS}}

### Skills externas que esta skill invoca

{{INVOKED_SKILLS}}

### APIs externas

{{EXTERNAL_APIS}}

---

## Modelo de IA

### Modelo principal

{{PRIMARY_MODEL}}

### Modelos alternativos compatibles

{{COMPATIBLE_MODELS}}

### Asunciones sobre el modelo

{{MODEL_ASSUMPTIONS}}

*(Capacidades que la skill da por sentadas: ventana de contexto, formato de output, herramientas disponibles.)*

---

## Coste de inferencia

### Llamadas al modelo por invocación típica

{{TYPICAL_CALLS}}

### Tokens estimados por invocación

{{ESTIMATED_TOKENS}}

### Límite máximo de pasos / loops

{{MAX_STEPS}}

---

## Robustez

### Qué hace si el modelo devuelve formato inesperado

{{FORMAT_HANDLING}}

### Qué hace si una integración externa falla

{{INTEGRATION_FAILURE}}

### Qué hace si los inputs son insuficientes

{{INSUFFICIENT_INPUT}}

---

## Plan de implementación

### Estructura de la skill

{{SKILL_STRUCTURE}}

*(Archivos que componen la skill: SKILL.md, archivos auxiliares, módulos cargados con read_me, etc.)*

### Dónde se despliega

{{DEPLOYMENT_LOCATION}}

*(Skill personal, skill de organización, en qué ClickUp/repo está documentada.)*

### Dependencias con otras skills

{{DEPENDENCIES}}

---

## Out of scope (explícito)

- {{OUT_OF_SCOPE_1}}
- {{OUT_OF_SCOPE_2}}

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 1.0 | {{DATE}} | Versión inicial | {{AUTHOR}} |
