---
name: brianspec-spec
description: Redacta o clarifica una spec funcional para un proyecto que usa BrianSpec. Actívala cuando el usuario diga "vamos a hacer una spec", "necesito una spec de", "redacta una spec para", "spec para esta funcionalidad", "tengo una transcripción y quiero la spec", "brianspec spec", "hay que especificar [funcionalidad]", o cualquier variante de definir/escribir/clarificar una especificación funcional. También actívala si el usuario comparte una descripción de funcionalidad, una transcripción de reunión, o un brain dump de un requisito y quiere convertirlo en una spec estructurada. Esta skill encarna al SPEC-AGENT definido en .brianspec/agents.md.
---

# brianspec-spec

## Propósito

Convertir una descripción de funcionalidad en una spec funcional estructurada, clarificada y lista para implementar. Esta skill ejecuta el rol de **SPEC-AGENT** definido en `.brianspec/agents.md`.

La spec resultante:
- Sigue el template del tipo de proyecto declarado en `PROJECT-CONSTITUTION.md`.
- Tiene criterios de aceptación verificables (sí/no).
- Identifica ambigüedades y las resuelve mediante diálogo con el responsable.
- Incluye notas de seguridad si la funcionalidad lo requiere.
- Incluye plan de implementación con desglose de tareas.

---

## Contexto obligatorio

Antes de redactar nada, leer:

1. `BRIANSPEC-CONSTITUTION.md` — para conocer los principios fundacionales (especialmente P1, P2, P6).
2. `PROJECT-CONSTITUTION.md` — para saber el tipo de proyecto, el stack, los agentes de construcción declarados y las restricciones específicas.
3. `.brianspec/agents.md` — sección SPEC-AGENT, para conocer responsabilidades y restricciones del rol.
4. La plantilla de spec correspondiente al tipo de proyecto (`.brianspec/templates/spec-web-app.md`, `spec-automatizacion.md` o `spec-skill-ia.md`).
5. Specs previas en `/specs/` y `/specs/archive/` — para detectar relaciones, dependencias o redundancias con funcionalidades ya implementadas.
6. `.brianspec/security-checklists.md` — sección correspondiente al tipo de proyecto, para anticipar riesgos.

---

## Flujo de la skill

### Fase 1 — Entender la entrada

El usuario aporta la funcionalidad en alguno de estos formatos:

- Descripción en lenguaje natural ("quiero que el sistema permita...").
- Transcripción de reunión donde se discutió la funcionalidad.
- Brain dump desordenado con ideas.
- Referencia a una funcionalidad existente que hay que ampliar.

**Acción:** leer la entrada, identificar:
- Qué se quiere construir (qué)
- Por qué (qué problema resuelve)
- Quién la usa (actores)
- En qué tipo de proyecto se inserta (ya está en PROJECT-CONSTITUTION.md)

Si la entrada es demasiado breve o vaga ("quiero un dashboard"), pasar a Fase 2 inmediatamente.

### Fase 2 — Clarificación (obligatoria)

Identificar y formular las ambigüedades. Aplicar P2: ofrecer opciones argumentadas, no preguntar abiertamente.

**Áreas típicas a clarificar:**

- **Alcance:** ¿qué entra en esta funcionalidad y qué se queda fuera?
- **Actores:** ¿quién la usa? ¿con qué permisos?
- **Estados:** ¿qué estados puede tener una entidad y qué transiciones son válidas?
- **Edge cases:** ¿qué pasa si X no existe, si Y falla, si Z es nulo?
- **Seguridad:** si toca datos sensibles, ¿cómo se autentica y autoriza?
- **UI (si web-app):** ¿qué pasa en pantallas pequeñas? ¿hay estados de carga/error/vacío?
- **Persistencia (si aplica):** ¿qué se guarda, durante cuánto tiempo, con qué políticas?

**Regla:** no pasar a Fase 3 hasta que las ambigüedades críticas estén resueltas. Las ambigüedades menores pueden quedar marcadas como `{{PENDIENTE — resolver antes de aprobar}}` en la spec borrador.

### Fase 3 — Redacción de la spec

Rellenar la plantilla del tipo de proyecto correspondiente con la información recogida y clarificada.

**Reglas de redacción:**

- Los **criterios de aceptación** deben poder responderse con sí/no, sin interpretación.
- **No** mencionar nombres de funciones, componentes, archivos o tecnologías específicas (P3).
- **Sí** mencionar el stack a nivel de "frontend", "backend", "base de datos", "workflow" — el detalle de implementación lo deciden los agentes de construcción.
- Incluir sección de **Notas de Seguridad** si la funcionalidad toca:
  - Autenticación / autorización
  - Datos personales
  - Inputs externos no confiables
  - Operaciones reversibles vs. irreversibles
  - Secretos / credenciales
- Incluir **Plan de Implementación** con desglose de tareas suficientemente granulares (regla: cada tarea debe poder describirse con un criterio de éxito en una sola frase, sin "y" ni "además").

### Fase 4 — Numeración y archivo

- Buscar el siguiente número disponible en `/specs/` (NN: 01, 02, 03...).
- Generar el archivo `/specs/{{NN}}-{{nombre-en-kebab-case}}.md`.
- Estado inicial: `draft`.

### Fase 5 — Revisión con el responsable

Mostrar la spec al responsable y pedir revisión explícita.

**Preguntas obligatorias al cerrar:**

1. ¿Los criterios de aceptación cubren el alcance que quieres? ¿Falta algún caso?
2. ¿La sección de seguridad cubre lo que te preocupa, o hay otros riesgos?
3. ¿El plan de implementación tiene granularidad suficiente?
4. ¿Hay algo en la spec que asumiría yo y que tú quieres confirmar antes?

Solo cuando el responsable diga explícitamente "aprobado" o "ok, adelante", cambiar el estado del archivo a `aprobada`.

### Fase 6 — Handoff

Una vez aprobada:

- Confirmar al responsable que la spec está lista para `brianspec-build`.
- Si la spec tiene dependencias con otras specs (implementadas o pendientes), enlazarlas explícitamente.
- Si la spec ha generado preguntas que merecen vivir más allá (decisiones de producto, principios nuevos), proponer guardarlas en el `JOURNAL.md` del proyecto.

---

## Modo: clarificar una spec existente

Si el usuario pide ampliar/clarificar una spec ya existente (no crear una nueva):

1. Leer la spec actual en `/specs/{{NN}}-{{nombre}}.md`.
2. Identificar qué falta o qué está ambiguo.
3. Pasar a Fase 2 (clarificación) con foco en esas áreas.
4. Generar una versión actualizada de la spec, incrementando la versión (1.0 → 1.1).
5. Si la spec ya estaba `aprobada` o `implementada`, marcar la diferencia entre la versión aprobada original y la modificación.

---

## Reglas y restricciones

1. **No implementar código.** Esta skill solo redacta specs. La implementación es trabajo de `brianspec-build`.
2. **No inferir.** Ante ambigüedad, preguntar con opciones (P2).
3. **No mencionar nombres de funciones, componentes o tecnologías específicas en la spec.** Sí mencionar capas ("frontend", "backend", "BBDD").
4. **No saltarse la fase de clarificación**, ni siquiera si el usuario presiona ("ya lo sé, escríbelo ya"). Si presiona, ofrecer un borrador rápido marcado como `draft con clarificación pendiente` pero no `aprobada`.
5. **No aprobar la spec unilateralmente.** Solo el responsable humano la aprueba (P5).
6. **No incluir en la spec funcionalidades que el usuario no pidió.** Si crees que falta algo importante, señalarlo aparte como "Propuesta adicional para considerar", pero no meterlo en la spec sin aprobación.

---

## Salida típica al terminar

```
✅ Spec creada: SPEC-{{NN}}: {{nombre}}

Archivo: /specs/{{NN}}-{{nombre-kebab-case}}.md
Estado: draft (pendiente de tu aprobación)
Tipo: {{tipo}}

Resumen:
- {{N}} criterios de aceptación
- {{N}} flujos principales
- {{N}} edge cases identificados
- Notas de seguridad: {{Sí/No, con motivo}}
- Plan de implementación: {{N}} tareas

Próximo paso: revisa la spec y dime "aprobada" para cambiar el estado. Después, podemos invocar `brianspec-build` para implementarla.
```

---

*Skill brianspec-spec v1.0 — BrianSpec system*
