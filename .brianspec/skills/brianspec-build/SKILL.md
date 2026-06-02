---
name: brianspec-build
description: Implementa una spec aprobada del proyecto, ejecutando los agentes de construcción correspondientes y validando contra criterios de aceptación y checklist de seguridad antes de cerrar. Actívala cuando el usuario diga "implementa la spec NN", "vamos a construir SPEC-NN", "build de la spec", "ejecuta esta spec", "brianspec build", "implementa la funcionalidad de X", o cualquier variante de pasar de spec aprobada a código funcionando. También actívala si el usuario menciona una spec por su número o nombre y dice "vamos a por ella" o "empezamos con esta". Esta skill orquesta a los agentes de construcción del proyecto y a los agentes universales REVIEW-AGENT y SECURITY-AGENT.
---

# brianspec-build

## Propósito

Convertir una spec **aprobada** en código funcionando, validado contra los criterios de aceptación y los checklists de seguridad. Esta skill orquesta:

1. Los **agentes de construcción** específicos del proyecto (FRONTEND-AGENT, BACKEND-AGENT, DB-AGENT, WORKFLOW-AGENT, etc. — los que el proyecto declaró durante `brianspec-init`).
2. El **REVIEW-AGENT** universal (validación CA por CA).
3. El **SECURITY-AGENT** universal (checklist de seguridad).

Al terminar, la implementación está revisada automáticamente y lista para que un humano la apruebe y mergee.

---

## Contexto obligatorio

Antes de empezar, leer:

1. `BRIANSPEC-CONSTITUTION.md` — principios fundacionales (especialmente P5, P6, P9).
2. `PROJECT-CONSTITUTION.md` — stack, convenciones, agentes de construcción declarados, integraciones.
3. `.brianspec/agents.md` — para conocer el rol de REVIEW-AGENT y SECURITY-AGENT.
4. `.brianspec/security-checklists.md` — sección correspondiente al tipo de proyecto.
5. Los archivos de `/agents/` del proyecto — definición de los agentes de construcción.
6. La spec a implementar en `/specs/{{NN}}-{{nombre}}.md`.

---

## Pre-condiciones de ejecución

Antes de empezar a construir, verificar:

- [ ] La spec existe en `/specs/`.
- [ ] El estado de la spec es **`aprobada`**. Si está en `draft`, parar y avisar: la implementación requiere aprobación humana explícita (P5).
- [ ] La spec tiene criterios de aceptación verificables. Si no los tiene, parar y volver a `brianspec-spec`.
- [ ] La spec tiene plan de implementación con desglose de tareas. Si no, parar y volver a `brianspec-spec`.

Si alguna pre-condición falla, **no proceder**. Informar al usuario qué falta.

---

## Flujo de la skill

### Fase 1 — Preparación

1. Crear una rama de trabajo si el proyecto usa Git: `brianspec/{{NN}}-{{nombre-kebab-case}}`.
2. Identificar qué agentes de construcción del proyecto van a participar según el contenido de la spec. Ejemplo:
   - Spec con "UI nueva" + "endpoint nuevo" + "tabla nueva" → FRONTEND-AGENT + BACKEND-AGENT + DB-AGENT.
   - Spec de un workflow → WORKFLOW-AGENT.
   - Spec de una skill → SKILL-AGENT.
3. Listar al usuario los agentes que van a actuar y pedir confirmación de "empezar".

### Fase 2 — Implementación por agentes de construcción

Para cada agente de construcción identificado:

1. Cargar su archivo de `/agents/{{AGENT_NAME}}.md` como contexto de rol.
2. Pasarle la spec y los inputs específicos que su rol requiere (brand guide, esquema de BBDD actual, etc.).
3. Pedirle que implemente **exactamente lo que dice la spec, ni más ni menos**.
4. Si el agente detecta ambigüedad en la spec durante la implementación, **pausar inmediatamente** y volver a `brianspec-spec` para clarificar. No improvisar (P1, P2).

**Reglas durante la implementación:**

- El agente respeta las convenciones declaradas en `PROJECT-CONSTITUTION.md`.
- El agente no añade dependencias no declaradas sin justificarlo.
- El agente no implementa funcionalidades fuera del alcance de la spec.
- El agente entrega un reporte estructurado al terminar (archivos creados/modificados, estado de cada CA, dudas).

### Fase 3 — Revisión automática (REVIEW-AGENT)

Una vez todos los agentes de construcción han terminado:

1. Cargar el rol REVIEW-AGENT desde `.brianspec/agents.md`.
2. Evaluar **cada criterio de aceptación** uno por uno:
   - ✅ Cumple — con evidencia concreta (archivo, función, test).
   - ❌ No cumple — con descripción exacta de qué falta.
   - ⚠️ Cumple parcialmente — con qué cumple y qué falta.
3. Verificar que el código no implementa funcionalidades fuera de la spec (overengineering).
4. Verificar que las convenciones de `PROJECT-CONSTITUTION.md` se respetan.
5. Generar veredicto: **APROBADO** (todos ✅) o **RECHAZADO** (al menos un ❌ o ⚠️).

### Fase 4 — Revisión de seguridad (SECURITY-AGENT)

En paralelo o tras REVIEW-AGENT:

1. Cargar el rol SECURITY-AGENT desde `.brianspec/agents.md`.
2. Cargar el checklist correspondiente al tipo de proyecto desde `.brianspec/security-checklists.md`.
3. Evaluar cada ítem del checklist contra el código generado.
4. Generar hallazgos clasificados:
   - 🔴 CRÍTICO
   - 🟠 ALTO
   - 🟡 MEDIO
   - 🟢 BAJO
5. Veredicto: **BLOQUEANTE** (al menos un CRÍTICO o ALTO sin mitigar) o **NO BLOQUEANTE**.

### Fase 5 — Resultado consolidado

Presentar al usuario un informe único:

```
═══════════════════════════════════════════
📋 SPEC-{{NN}}: {{nombre}}
═══════════════════════════════════════════

ARCHIVOS CREADOS/MODIFICADOS:
- {{ruta}} — {{descripción}}
- ...

REVIEW-AGENT (Criterios de Aceptación):
- CA-01: ✅ {{evidencia}}
- CA-02: ❌ {{qué falta}}
- ...
Veredicto: {{APROBADO / RECHAZADO}}

SECURITY-AGENT (Checklist {{tipo}}):
- 🔴 CRÍTICO: {{hallazgo}} — {{ubicación}}
- 🟠 ALTO: ...
- 🟡 MEDIO: ...
- 🟢 BAJO: ...
Veredicto: {{BLOQUEANTE / NO BLOQUEANTE}}

═══════════════════════════════════════════
ESTADO GLOBAL: {{LISTO PARA MERGE / REQUIERE CORRECCIÓN}}
═══════════════════════════════════════════
```

### Fase 6 — Iteración si es necesario

Si el veredicto es **REQUIERE CORRECCIÓN**:

1. Identificar qué agente de construcción debe corregir qué.
2. Volver a Fase 2 solo con los agentes afectados y solo con los CAs/hallazgos pendientes.
3. Re-ejecutar REVIEW-AGENT y SECURITY-AGENT solo sobre los cambios.
4. Repetir hasta veredicto **LISTO PARA MERGE**.

Si tras 3 iteraciones no se converge, **parar y escalar al humano**. Probablemente la spec necesita revisión (`brianspec-spec`), no más intentos de implementación.

### Fase 7 — Handoff al humano

Al llegar a **LISTO PARA MERGE**:

1. Informar al usuario que la implementación está completa y validada automáticamente.
2. Recordar que la **revisión humana final es obligatoria** (P5). REVIEW-AGENT y SECURITY-AGENT son la primera línea, no la última.
3. Sugerir el flujo siguiente:
   - Si hay Git: abrir PR con descripción estructurada que referencia la spec.
   - Cuando un humano apruebe el PR y mergee, invocar `brianspec-archive` para cerrar la spec.

---

## Reglas y restricciones

1. **No implementar sin spec aprobada.** P1, P5. Si llega una petición de "construye esto rápido" sin spec, redirigir a `brianspec-spec` primero.
2. **No saltar la revisión automática.** REVIEW-AGENT y SECURITY-AGENT son obligatorios, aunque la implementación parezca trivial.
3. **No aprobar implementaciones con CA en ❌.** P6. Sin excepciones.
4. **No aprobar implementaciones con hallazgos de seguridad CRÍTICOS o ALTOS sin mitigar.**
5. **No modificar la spec.** Si la implementación obliga a cambiar la spec, parar y volver a `brianspec-spec`.
6. **No añadir funcionalidades fuera de la spec.** Si el agente cree que algo "tiene sentido añadir", proponerlo aparte como nota — no implementarlo.
7. **No mergear automáticamente.** La aprobación final y el merge son trabajo humano (P5).

---

## Manejo de errores específicos

- **La spec menciona una integración (MCP, API, skill) que no está en `PROJECT-CONSTITUTION.md`:** parar y preguntar si añadir la integración a la Constitution o reescribir la spec.
- **Un agente de construcción no existe en `/agents/`:** parar y preguntar si crear el agente nuevo (volver a aplicar lógica de `brianspec-init` para ese agente) o reasignar la tarea.
- **Conflictos entre lo que dice la spec y lo que dice `PROJECT-CONSTITUTION.md`:** la Constitution gana. La spec se actualiza o se rechaza.
- **El usuario interrumpe a mitad del flujo:** dejar el trabajo parcial en la rama, anotar dónde se quedó en un comentario, no marcar la spec como implementada.

---

*Skill brianspec-build v1.0 — BrianSpec system*
