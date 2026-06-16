---
name: brianspec-spec
description: Itera y aprueba una spec del proyecto. Actívala cuando el usuario diga "analizemos la spec X", "vamos con la spec X", "iteremos la SPEC-NN", "hay que revisar la spec de X", "brianspec spec", o cualquier variante de analizar, clarificar o aprobar una spec existente. También actívala si el usuario comparte una descripción de funcionalidad nueva que no tiene spec todavía. Esta skill encarna al SPEC-AGENT definido en .brianspec/agents.md.
---

# brianspec-spec

## Propósito

Iterar una spec existente (generada durante el bootstrap o nueva) hasta que esté libre de ambigüedades y lista para implementar. Al aprobarla, crea la tarea correspondiente en ClickUp y lanza el trigger hacia `brianspec-build`.

El flujo tiene dos modos:

- **Modo iteración** (habitual): la spec ya existe en `/specs/` — fue generada en el bootstrap. Se analiza, se resuelven ambigüedades y se aprueba.
- **Modo creación** (ocasional): la spec no existe todavía. Se redacta completa y luego se itera.

---

## Contexto obligatorio

Antes de actuar, leer:

1. `BRIANSPEC-CONSTITUTION.md` — principios fundacionales (P1, P2, P6).
2. `PROJECT-CONSTITUTION.md` — stack, agentes, `clickup_space`, `clickup_list`.
3. `.brianspec/agents.md` — sección SPEC-AGENT.
4. La spec a iterar en `/specs/{{NN}}-{{nombre}}.md`.
5. `.brianspec/LESSONS-LEARNED.md` — para incorporar aprendizajes previos relevantes a esta spec.
6. Specs en `/specs/archive/` — para detectar dependencias o patrones ya implementados.
7. `.brianspec/security-checklists.md` — para anticipar riesgos.

---

## Flujo de la skill

### Fase 1 — Cargar la spec

Si el usuario indica una spec existente (ej: "analizemos la spec 03"):
1. Leer `/specs/03-{{nombre}}.md`.
2. Si no existe, buscar por nombre parcial. Si no hay coincidencia, listar las specs disponibles en `/specs/` y pedir al usuario que elija.

Si no existe spec para la funcionalidad pedida, pasar a **Modo creación** (ver sección al final).

### Fase 2 — Análisis de ambigüedades (loop exhaustivo)

Leer la spec completa e identificar **todas** las ambigüedades: en actores, flujos, edge cases, estados, seguridad, UI, persistencia.

Clasificar cada ambigüedad:
- **Crítica:** impide escribir CAs verificables. Debe resolverse antes de aprobar.
- **Menor:** no bloquea los CAs pero puede generar sorpresas en la implementación. Se puede marcar como pendiente o resolver ahora.

**Presentar las ambigüedades de una en una**, con opciones argumentadas. Nunca preguntar en abierto. Formato obligatorio:

```
❓ AMBIGÜEDAD [N] — [título corto]

[Descripción del problema en una frase.]

  A) [Opción A] — [argumento: ventaja / riesgo]
  B) [Opción B] — [argumento: ventaja / riesgo]
  C) [Opción C, si aplica] — [argumento]

¿Cuál eliges?
```

El usuario responde. SPEC-AGENT incorpora la decisión a la spec y pasa a la siguiente ambigüedad.

**Reglas del loop:**
- No pasar a Fase 3 mientras quede al menos una ambigüedad crítica sin resolver.
- Las ambigüedades menores no resueltas quedan marcadas en la spec como `{{PENDIENTE — aclarar antes de implementar}}`.
- Si el usuario dice "omite esa" en una ambigüedad crítica, marcarla como `{{BLOQUEANTE — requiere decisión antes de implementar}}` y continuar con las demás, pero **no permitir aprobación** hasta que se resuelva.
- Si no hay ambigüedades, indicarlo: "Esta spec está clara. ¿La aprobamos?"

### Fase 3 — Verificación de CAs

Antes de aprobar, verificar que todos los criterios de aceptación:

1. Se pueden responder con sí/no sin interpretación.
2. Tienen evidencia verificable (no "el sistema funciona bien" sino "el endpoint devuelve 200 con el objeto X").
3. Cubren todos los flujos alternativos y edge cases identificados.

Si algún CA no cumple, reescribirlo en el momento. No pedir confirmación por cada reescritura — hacerlo y mostrar el CA actualizado.

### Fase 4 — Mostrar spec final y pedir aprobación

Mostrar el resumen de cambios realizados durante la iteración:

```
📋 SPEC-{{NN}}: {{nombre}}

Ambigüedades resueltas: {{N}}
CAs actualizados: {{N}}
Pendientes menores: {{N}} (marcados en la spec)

Cambios principales:
- [decisión tomada en ambigüedad 1]
- [decisión tomada en ambigüedad 2]
- ...

¿Aprobamos la spec? Di "aprobada" para continuar.
```

### Fase 5 — Aprobación y ClickUp

Cuando el usuario diga "aprobada" (o equivalente: "ok", "adelante", "sí", "aprobado"):

1. Cambiar el estado de la spec a `aprobada` en el archivo.
2. **Actualizar la sección `## Historial`** de la spec: añadir una fila con la versión incrementada, la fecha actual, `"Spec aprobada para implementación"` y el nombre del usuario (preguntar si no se conoce, o dejar `{{USUARIO}}`).
3. **Crear tarea en ClickUp** (si `clickup_list` está configurado en `PROJECT-CONSTITUTION.md`):
   - Título: `[SPEC-{{NN}}] {{nombre legible}}`
   - Descripción: primeros 3–4 párrafos de la spec (identidad, actores, alcance). Sin CAs ni plan técnico — solo el contexto de negocio.
   - Estado en ClickUp: el estado inicial configurado en la lista (normalmente "To Do" o "Backlog").
   - Si la tarea ya existe (re-aprobación), actualizar en lugar de duplicar.
3. Confirmar al usuario:

```
✅ SPEC-{{NN}} aprobada.
📌 Tarea creada en ClickUp: [SPEC-{{NN}}] {{nombre}} → {{clickup_list}}

¿Arranco la implementación ahora con brianspec-build?
```

### Fase 6 — Trigger hacia brianspec-build

Si el usuario dice "sí" o "implementa" o cualquier confirmación:
- Invocar `brianspec-build` pasando el número de spec como contexto.

Si el usuario dice "no" o "luego":
- Confirmar que la spec está aprobada y lista cuando quiera implementarla.
- No hacer nada más.

---

## Modo creación (spec nueva)

Si la funcionalidad no tiene spec todavía:

1. Pedir descripción de la funcionalidad. Si es vaga, aplicar Fase 2 directamente para extraer el detalle.
2. Buscar el siguiente número disponible en `/specs/`.
3. Redactar la spec completa usando el template del tipo de proyecto (`.brianspec/templates/spec-{{tipo}}.md`).
4. Pasar a Fase 2 para iterar la spec recién creada.
5. Continuar el flujo normal.

---

## Reglas y restricciones

1. **No implementar código.** Esta skill solo gestiona specs.
2. **No inferir.** Ante ambigüedad, siempre opciones argumentadas (P2).
3. **No mencionar nombres de funciones, componentes o archivos en la spec.** Solo capas ("frontend", "backend", "BBDD").
4. **No aprobar la spec con ambigüedades críticas sin resolver.**
5. **No aprobar la spec unilateralmente.** Solo el humano aprueba (P5).
6. **No incluir funcionalidades no pedidas.** Señalarlas aparte como "Propuesta adicional".
7. **Siempre consultar LESSONS-LEARNED.md** antes de cerrar la spec — si hay lecciones relevantes (ej: "validar siempre X antes de Y en este stack"), incorporarlas como nota en el plan de implementación.

---

*Skill brianspec-spec v1.2 — BrianSpec system*
