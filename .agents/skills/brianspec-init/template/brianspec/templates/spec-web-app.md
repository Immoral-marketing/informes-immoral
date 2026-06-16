# SPEC-{{NN}}: {{FEATURE_NAME}}

**Versión:** 1.0
**Estado:** draft | aprobada | implementada
**Tipo de proyecto:** web-app
**Última actualización:** {{DATE}}
**Owner:** {{OWNER}}

---

## Descripción

{{DESCRIPTION}}

*(Qué hace esta funcionalidad y por qué existe. 2–4 oraciones máximo. Sin tecnicismos.)*

---

## Actores

- **{{ACTOR_1}}:** {{ACTOR_1_ROLE}}
- **{{ACTOR_2}}:** {{ACTOR_2_ROLE}}

*(Quién interactúa con esta funcionalidad y con qué objetivo.)*

---

## Flujos principales

### Flujo 1: {{FLOW_1_NAME}}

1. {{STEP_1}}
2. {{STEP_2}}
3. {{STEP_3}}

### Flujo 2: {{FLOW_2_NAME}}

1. {{STEP_1}}
2. {{STEP_2}}

---

## Flujos alternativos / Edge cases

- **{{EDGE_CASE_1_NAME}}:** {{EXPECTED_BEHAVIOR}}
- **{{EDGE_CASE_2_NAME}}:** {{EXPECTED_BEHAVIOR}}

*(Casos no felices: errores del usuario, datos inválidos, fallos de servicios externos, condiciones límite.)*

---

## Criterios de aceptación

Cada criterio debe poder verificarse con un sí/no, sin interpretación.

- [ ] CA-01: {{CRITERION}}
- [ ] CA-02: {{CRITERION}}
- [ ] CA-03: {{CRITERION}}

---

## Modelo de datos

### Entidades nuevas o modificadas

{{NEW_OR_MODIFIED_ENTITIES}}

### Relaciones

{{RELATIONSHIPS}}

### Migraciones necesarias

{{MIGRATIONS}}

*(Si la funcionalidad no toca modelo de datos, marcar como "No aplica".)*

---

## UI / Páginas afectadas

### Páginas nuevas

{{NEW_PAGES}}

### Páginas modificadas

{{MODIFIED_PAGES}}

### Componentes reutilizables

{{COMPONENTS}}

### Breakpoints obligatorios

{{BREAKPOINTS}}

*(Por defecto en una web-app: 375px, 768px, 1280px. Confirmar o ajustar.)*

### Estándar de calidad visual

{{DESIGN_QUALITY_BAR}}

*(El estándar visual lo marcan las skills de diseño instaladas en el proyecto — `frontend-design`, `impeccable`, `emil-design-eng` —, no la intuición del implementador. Si esta funcionalidad tiene requisitos de diseño específicos (estados de carga/vacío/error, animaciones, tono visual), declararlos aquí. Si no, basta con "Aplicar el criterio de las skills de diseño del proyecto".)*

---

## API / Endpoints

### Endpoints nuevos

| Método | Ruta | Descripción | Autenticación |
|---|---|---|---|
| {{METHOD}} | {{PATH}} | {{DESCRIPTION}} | {{AUTH}} |

### Endpoints modificados

{{MODIFIED_ENDPOINTS}}

### Contratos de request/response

{{CONTRACTS}}

---

## Notas de seguridad

*(Obligatorio si la funcionalidad toca autenticación, autorización, datos personales, inputs externos, o cualquier superficie sensible.)*

### Datos sensibles involucrados

{{SENSITIVE_DATA}}

### Validaciones server-side requeridas

{{SERVER_VALIDATIONS}}

### Autenticación y autorización

{{AUTH_REQUIREMENTS}}

### Otros riesgos identificados

{{OTHER_RISKS}}

*(SECURITY-AGENT aplicará el checklist de `.brianspec/security-checklists.md` sección "Tipo: web-app" durante la revisión.)*

---

## Plan de implementación

### Arquitectura propuesta

{{ARCHITECTURE}}

*(Cómo se distribuyen las responsabilidades entre los agentes de construcción del proyecto. Por ejemplo: qué hace FRONTEND-AGENT, qué hace BACKEND-AGENT, qué hace DB-AGENT.)*

### Desglose de tareas

1. {{TASK_1}}
2. {{TASK_2}}
3. {{TASK_3}}

*(Tareas suficientemente granulares para que cada una pueda escribirse con un criterio de éxito en una sola frase. Si necesitas "y" o "además" para describirla, divídela.)*

### Dependencias con otras specs

{{DEPENDENCIES}}

---

## Tests requeridos

### Tests unitarios

{{UNIT_TESTS}}

### Tests de integración

{{INTEGRATION_TESTS}}

### Tests E2E

{{E2E_TESTS}}

*(P9 — Tests donde aportan valor. Especificar mínimos necesarios para esta funcionalidad, no más.)*

---

## Out of scope (explícito)

Lo que esta spec NO incluye, para evitar overengineering:

- {{OUT_OF_SCOPE_1}}
- {{OUT_OF_SCOPE_2}}

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---|---|---|---|
| 1.0 | {{DATE}} | Versión inicial | {{AUTHOR}} |

> Cada modificación posterior a la aprobación debe añadir una fila: versión incrementada, fecha, descripción breve del cambio y nombre del usuario que lo realiza.
