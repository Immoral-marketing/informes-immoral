---
name: brianspec-build
description: Implementa una spec aprobada del proyecto, ejecutando los agentes de construcción correspondientes y validando contra criterios de aceptación y checklist de seguridad antes de cerrar. Actívala cuando el usuario diga "implementa la spec NN", "vamos a construir SPEC-NN", "build de la spec", "ejecuta esta spec", "brianspec build", "implementa la funcionalidad de X", o cualquier variante de pasar de spec aprobada a código funcionando. También actívala si el usuario menciona una spec por su número o nombre y dice "vamos a por ella" o "empezamos con esta". Esta skill orquesta a los agentes de construcción del proyecto y a los agentes universales REVIEW-AGENT y SECURITY-AGENT.
---

# brianspec-build

## Propósito

Convertir una spec **aprobada** en código funcionando, validado contra los criterios de aceptación y los checklists de seguridad. Esta skill orquesta:

1. Los **agentes de construcción** específicos del proyecto (FRONTEND-AGENT, BACKEND-AGENT, DB-AGENT, WORKFLOW-AGENT, etc.).
2. El **REVIEW-AGENT** universal (validación CA por CA).
3. El **SECURITY-AGENT** universal (checklist de seguridad).
4. La **memoria del sistema** (lectura de lecciones antes de implementar, escritura al terminar).

Al terminar, la implementación está revisada automáticamente, la memoria actualizada, y el proyecto listo para que el humano revise, haga commit y archive.

---

## Contexto obligatorio

Antes de empezar, leer:

1. `BRIANSPEC-CONSTITUTION.md` — principios (P1, P5, P6, P7, P9).
2. `PROJECT-CONSTITUTION.md` — stack, convenciones, agentes declarados, integraciones.
3. `.brianspec/agents.md` — rol de REVIEW-AGENT y SECURITY-AGENT.
4. `.brianspec/security-checklists.md` — sección del tipo de proyecto.
5. `.brianspec/LESSONS-LEARNED.md` — **leer siempre antes de implementar**.
6. Los archivos de `/agents/` del proyecto.
7. La spec a implementar en `/specs/{{NN}}-{{nombre}}.md`.

---

## Pre-condiciones de ejecución

Antes de empezar, verificar:

- [ ] La spec existe en `/specs/`.
- [ ] El estado de la spec es **`aprobada`**. Si está en `draft`, parar: requiere aprobación humana (P5).
- [ ] La spec tiene CAs verificables. Si no, volver a `brianspec-spec`.
- [ ] La spec tiene plan de implementación. Si no, volver a `brianspec-spec`.

Si alguna pre-condición falla, **no proceder**.

---

## Flujo de la skill

### Fase 1 — Preparación y carga de memoria

1. Crear rama de trabajo si el proyecto usa Git: `brianspec/{{NN}}-{{nombre-kebab-case}}`.
2. **Leer `.brianspec/LESSONS-LEARNED.md`** y extraer las lecciones relevantes para esta spec:
   - Filtrar por stack (mismo framework, misma BBDD).
   - Filtrar por tipo de funcionalidad (autenticación, formularios, queries, etc.).
   - Si hay lecciones relevantes, cargarlas como **contexto de restricciones** para los agentes de construcción. Ejemplo: *"Lección activa: en este stack, siempre validar el token antes de consultar la BBDD. Ver LL-003."*
3. Identificar qué agentes de construcción participan según el contenido de la spec.
4. Listar al usuario los agentes que van a actuar y las lecciones activas cargadas. Pedir confirmación de "empezar" (o arrancar directamente si viene del trigger de `brianspec-spec`).

### Fase 2 — Implementación por agentes de construcción

Para cada agente de construcción identificado:

1. Cargar su archivo de `/agents/{{AGENT_NAME}}.md` como contexto de rol.
2. Pasarle la spec, los inputs específicos de su rol y las **lecciones activas** cargadas en Fase 1.
3. Pedirle que implemente **exactamente lo que dice la spec, ni más ni menos**.
4. Si el agente detecta ambigüedad en la spec durante la implementación, **pausar inmediatamente** y volver a `brianspec-spec` para clarificar. No improvisar (P1, P2).

**Reglas durante la implementación:**

- El agente respeta las convenciones de `PROJECT-CONSTITUTION.md`.
- El agente no añade dependencias no declaradas sin justificarlo.
- El agente no implementa funcionalidades fuera del alcance de la spec.
- El agente entrega un reporte estructurado: archivos creados/modificados, estado de cada CA, dudas.

**Uso de skills de apoyo (obligatorio cuando aplican):**

- **Agentes de UI / frontend:** invocar `frontend-design`, `impeccable` y `emil-design-eng` antes de escribir UI. El estándar de calidad visual lo marcan esas skills.
- **Agentes de stack:** invocar la skill de stack correspondiente — `nextjs-app-router-patterns`, `tailwind-v4-shadcn`, `supabase`, `supabase-postgres-best-practices`, `angular-best-practices-primeng`, `remotion-best-practices`.
- Si una skill declarada no está instalada, señalarlo y proponer `npx skills add`, pero no bloquear salvo dependencia crítica.

### Fase 3 — Revisión automática en paralelo

Una vez todos los agentes de construcción han terminado, lanzar **en paralelo**:

#### REVIEW-AGENT (CA por CA)

1. Cargar el rol REVIEW-AGENT desde `.brianspec/agents.md`.
2. Evaluar **cada criterio de aceptación** uno por uno:
   - ✅ Cumple — con evidencia concreta (archivo, función, test).
   - ❌ No cumple — con descripción exacta de qué falta.
   - ⚠️ Cumple parcialmente — con qué cumple y qué falta.
3. Verificar que el código no implementa funcionalidades fuera de la spec.
4. Verificar que las convenciones de `PROJECT-CONSTITUTION.md` se respetan.
5. Veredicto: **APROBADO** (todos ✅) o **RECHAZADO** (al menos un ❌ o ⚠️).

> **Refuerzo:** REVIEW-AGENT puede apoyarse en el plugin `code-review` (instalado como plugin universal de BrianSpec) como segunda pasada mecánica. No sustituye la evaluación CA por CA — la complementa.

#### SECURITY-AGENT (checklist)

1. Cargar el rol SECURITY-AGENT desde `.brianspec/agents.md`.
2. Cargar el checklist del tipo de proyecto desde `.brianspec/security-checklists.md`.
3. Evaluar cada ítem contra el código generado.
4. Clasificar hallazgos:
   - 🔴 CRÍTICO
   - 🟠 ALTO
   - 🟡 MEDIO
   - 🟢 BAJO
5. Veredicto: **BLOQUEANTE** (al menos un CRÍTICO o ALTO) o **NO BLOQUEANTE**.

### Fase 4 — Iteración si es necesario

Si el veredicto es **RECHAZADO** o **BLOQUEANTE**:

1. Identificar qué agente debe corregir qué.
2. Volver a Fase 2 solo con los agentes afectados y solo con los CAs/hallazgos pendientes.
3. Re-ejecutar REVIEW-AGENT y SECURITY-AGENT solo sobre los cambios.
4. Repetir hasta veredicto **LISTO PARA MERGE**.

Si tras 3 iteraciones no se converge, **parar y escalar al humano**. La spec probablemente necesita revisión.

### Fase 5 — Generación del informe consolidado

Al llegar a **LISTO PARA MERGE**, generar el informe completo. Este informe se usará como mensaje del commit.

```
═══════════════════════════════════════════════
📋 SPEC-{{NN}}: {{nombre}}
Fecha: {{FECHA}}
Rama: brianspec/{{NN}}-{{nombre-kebab-case}}
═══════════════════════════════════════════════

ARCHIVOS CREADOS/MODIFICADOS:
- {{ruta}} — {{descripción del cambio}}
- ...

REVIEW-AGENT — Criterios de Aceptación:
- CA-01: ✅ {{evidencia concreta}}
- CA-02: ✅ {{evidencia concreta}}
- CA-03: ✅ {{evidencia concreta}}
Veredicto: APROBADO ({{N}}/{{N}} CAs)

SECURITY-AGENT — Checklist {{tipo de proyecto}}:
- ✅ Inputs validados antes de procesarse
- ✅ Secretos fuera del código
- 🟢 BAJO: {{hallazgo menor}} — {{ubicación}}
Veredicto: NO BLOQUEANTE

ITERACIONES: {{N}} (si > 1, listar qué falló en cada una)

LECCIONES APRENDIDAS EN ESTA IMPLEMENTACIÓN:
- {{patrón o error detectado, si los hay}}

═══════════════════════════════════════════════
ESTADO: LISTO PARA MERGE
═══════════════════════════════════════════════
```

Guardar el informe en `.brianspec/last-build-report.md` (se sobreescribe en cada build — es temporal hasta el commit).

### Fase 6 — Actualización de memoria

Inmediatamente después de generar el informe, **independientemente de si hubo iteraciones o no**:

1. Leer `.brianspec/LESSONS-LEARNED.md`.
2. Analizar la implementación y extraer lecciones accionables:
   - ¿Algún agente asumió algo que resultó incorrecto?
   - ¿Hubo un patrón de error recurrente en las iteraciones?
   - ¿Hay un edge case del stack que no estaba documentado?
   - ¿Se descubrió una restricción del entorno que debe recordarse?
3. Para cada lección nueva, añadir una entrada estructurada:

```markdown
## LL-{{NNN}} — {{título corto}}
**Fecha:** {{FECHA}}
**Spec origen:** SPEC-{{NN}}
**Stack afectado:** {{tecnología o capa}}
**Lección:** {{descripción clara del patrón o error}}
**Cómo aplicar:** {{instrucción concreta para el agente}}
**Severidad:** {{Alta / Media / Baja}}
```

4. Si no hay lecciones nuevas, no añadir nada. No inventar.
5. Si una lección ya existente quedó reforzada por esta implementación, añadir una línea `**Confirmada en:** SPEC-{{NN}}` a esa entrada.

### Fase 7 — Actualización de CLAUDE.md (si aplica)

Si se descubrieron patrones arquitectónicos, convenciones nuevas o restricciones del proyecto que no están en `CLAUDE.md`:

1. Usar el plugin `claude-md-management` para capturar los aprendizajes de sesión.
2. Solo actualizar si la información es **no obvia** y **duradera** — no añadir lo que ya está en la spec o en los agentes.

### Fase 8 — Handoff al humano

Al terminar:

```
✅ SPEC-{{NN}} lista para revisión humana.

Informe guardado en: .brianspec/last-build-report.md
Rama: brianspec/{{NN}}-{{nombre-kebab-case}}
Lecciones añadidas a LESSONS-LEARNED: {{N}} (o "ninguna nueva")

Revisa el código. Cuando hagas merge, di:
"haz commit y push de la spec {{NN}}"
```

---

## Reglas y restricciones

1. **No implementar sin spec aprobada.** Si llega una petición sin spec, redirigir a `brianspec-spec`.
2. **No saltar la revisión automática.** REVIEW-AGENT y SECURITY-AGENT son obligatorios siempre.
3. **No aprobar con CA en ❌.** Sin excepciones (P6).
4. **No aprobar con hallazgos CRÍTICOS o ALTOS sin mitigar.**
5. **No modificar la spec durante la implementación.** Si hay contradicción, parar y volver a `brianspec-spec`.
6. **No añadir funcionalidades fuera de la spec.** Si el agente cree que algo "tiene sentido añadir", proponerlo aparte.
7. **No mergear automáticamente.** La aprobación final y el merge son trabajo humano (P5).
8. **Siempre actualizar LESSONS-LEARNED.** Aunque no haya lecciones nuevas, verificar si hay lecciones existentes para confirmar.

---

## Manejo de errores específicos

- **Spec menciona integración no declarada en PROJECT-CONSTITUTION.md:** parar y preguntar si añadir a la Constitution o reescribir la spec.
- **Agente de construcción no existe en `/agents/`:** parar y preguntar si crear el agente nuevo o reasignar.
- **Conflicto entre spec y PROJECT-CONSTITUTION.md:** la Constitution gana. La spec se actualiza o se rechaza.
- **Interrupción a mitad del flujo:** dejar trabajo parcial en la rama, anotar dónde se quedó, no marcar spec como implementada.

---

*Skill brianspec-build v1.2 — BrianSpec system*
