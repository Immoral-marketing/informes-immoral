---
name: brianspec-archive
description: Hace commit, push y archiva una spec implementada. Actívala cuando el usuario diga "haz commit y push de la spec NN", "archiva la spec NN", "cierra esta spec", "ya revisé el código", "brianspec archive", o cualquier variante de cerrar, commitear o archivar una spec ya implementada. Esta skill genera el commit con el informe completo como mensaje, hace push, mueve la spec a /specs/archive/ y actualiza el CHANGELOG del proyecto.
---

# brianspec-archive

## Propósito

Cerrar el ciclo de una spec con trazabilidad completa:

1. **Commit** con el informe de revisión completo como mensaje — cualquier miembro del equipo puede ver en el historial de git qué se hizo, qué CAs cumplía y qué encontró el SECURITY-AGENT.
2. **Push** a la rama remota.
3. **Archivo** de la spec en `/specs/archive/`.
4. **CHANGELOG** actualizado.

Una spec archivada es **fuente de verdad histórica** — no se borra ni se modifica. Cumple P7.

---

## Contexto obligatorio

Antes de archivar, leer:

1. `BRIANSPEC-CONSTITUTION.md` — principios (P5, P7).
2. `PROJECT-CONSTITUTION.md` — convenciones del proyecto.
3. La spec en `/specs/{{NN}}-{{nombre}}.md`.
4. `.brianspec/last-build-report.md` — el informe generado por `brianspec-build`. **Este informe es el mensaje del commit.**
5. `CHANGELOG.md` del proyecto.

---

## Pre-condiciones de ejecución

Antes de proceder, verificar:

- [ ] La spec existe en `/specs/` con estado `aprobada` o `implementada`.
- [ ] `.brianspec/last-build-report.md` existe y corresponde a esta spec.
- [ ] El humano ha revisado el código (la skill no verifica esto automáticamente — confiar en que el usuario lo confirma al invocarla).
- [ ] Si el proyecto usa Git: el código está en la rama `brianspec/{{NN}}-{{nombre}}`.

Si `.brianspec/last-build-report.md` no existe o es de otra spec, preguntar al usuario antes de continuar.

---

## Flujo de la skill

### Fase 1 — Confirmación rápida

Mostrar resumen de lo que se va a hacer:

```
📋 SPEC-{{NN}}: {{nombre}}

Voy a:
1. Commit en rama brianspec/{{NN}}-{{nombre}} con el informe completo
2. Push al remoto
3. Mover spec a /specs/archive/
4. Actualizar CHANGELOG.md

¿Confirmado? (di "sí" o "confirma")
```

### Fase 2 — Actualización del archivo de spec

1. Cambiar el estado de la spec a `implementada`.
2. **Actualizar la sección `## Historial`** de la spec: añadir una fila con la versión final (última versión + 1 de patch), la fecha de cierre, `"Implementación completa"` como descripción y el nombre del usuario que archiva.
3. Añadir al final del archivo la sección de cierre:

```markdown
---

## Cierre

**Fecha de cierre:** {{FECHA}}
**Revisada por (humano):** {{NOMBRE si el usuario lo indica, o "pendiente de registrar"}}
**Rama:** brianspec/{{NN}}-{{nombre-kebab-case}}
**Última versión:** {{versión del archivo}}
**Resultado REVIEW-AGENT:** APROBADO ({{N}}/{{N}} CAs)
**Resultado SECURITY-AGENT:** NO BLOQUEANTE

### Aprendizajes registrados
{{Referencia a las entradas de LESSONS-LEARNED generadas en el build, si las hay. Ej: "Ver LL-004, LL-005 en .brianspec/LESSONS-LEARNED.md"}}
```

### Fase 3 — Commit con informe completo

Construir el mensaje del commit usando el contenido de `.brianspec/last-build-report.md`:

```
feat(spec-{{NN}}): {{nombre legible de la funcionalidad}}

{{contenido completo de last-build-report.md}}

Spec: /specs/archive/{{NN}}-{{nombre}}.md
```

Ejecutar:

```bash
git add -A
git commit -m "{{mensaje construido arriba}}"
```

El informe completo en el mensaje del commit garantiza que cualquier miembro del equipo que revise el historial de git tenga visibilidad total: qué se implementó, qué CAs cumplía, qué encontró el SECURITY-AGENT y qué lecciones se extrajeron.

### Fase 4 — Push

```bash
git push origin brianspec/{{NN}}-{{nombre-kebab-case}}
```

Si el push falla (sin remoto configurado, conflicto), informar al usuario con el comando exacto para reintentar. No abortar el archivo de la spec por un fallo de push.

### Fase 5 — Mover spec a archive

1. Si `/specs/archive/` no existe, crearlo.
2. Mover `/specs/{{NN}}-{{nombre}}.md` → `/specs/archive/{{NN}}-{{nombre}}.md`.

### Fase 6 — Actualizar CHANGELOG del proyecto y CHANGELOG-SPECS

**6a — CHANGELOG.md del proyecto**

Añadir entrada bajo la versión vigente:

```markdown
### Añadido / Modificado / Corregido

- **SPEC-{{NN}}** ({{nombre}}): {{descripción breve de la funcionalidad}}. ({{fecha}})
```

Si no hay versión vigente abierta, sugerir al usuario incrementar versión semántica (Major/Minor/Patch).

**6b — `.brianspec/CHANGELOG-SPECS.md`**

Añadir una entrada nueva al principio del archivo (las más recientes van arriba):

```markdown
## [{{FECHA}}] — SPEC-{{NN}}: {{nombre}}

- **SPEC-{{NN}}** ({{nombre}}): {{descripción breve del cambio}}. Autor: {{USUARIO}}
```

Si el archivo no existe, crearlo con la estructura base antes de añadir la entrada.

### Fase 7 — Limpiar archivo temporal

Eliminar `.brianspec/last-build-report.md` — ya está en el mensaje del commit, no hace falta conservarlo.

### Fase 8 — Resumen final y trigger hacia siguiente spec

```
✅ SPEC-{{NN}} cerrada con trazabilidad completa.

Commit: feat(spec-{{NN}}): {{nombre}} [con informe completo]
Push: brianspec/{{NN}}-{{nombre-kebab-case}} → origin
Spec archivada: /specs/archive/{{NN}}-{{nombre}}.md
Historial de spec actualizado: ✓
CHANGELOG.md actualizado: ✓
CHANGELOG-SPECS.md actualizado: ✓

¿Pasamos a la siguiente spec?
Specs pendientes de aprobar: {{lista de specs en /specs/ con estado draft o aprobada}}
```

Si el usuario dice "sí" o menciona una spec, invocar `brianspec-spec` con esa spec.

---

## Modo: archivar múltiples specs a la vez

Si el usuario pide archivar varias specs:
1. Verificar pre-condiciones para cada una por separado.
2. Si alguna falla, listar cuáles y preguntar si proceder solo con las que pasan.
3. Archivar en orden numérico, un commit por spec.
4. Resumen consolidado al final.

---

## Reglas y restricciones

1. **Nunca borrar.** Archivar es mover, no eliminar (P7).
2. **Nunca archivar specs en `draft`.**
3. **El informe del commit es obligatorio.** No hacer commit sin el contenido de `last-build-report.md`.
4. **No modificar el contenido funcional de la spec al archivar.** Solo añadir la sección de cierre.
5. **No re-numerar specs.** Los números no se reciclan.
6. **No omitir el CHANGELOG ni el CHANGELOG-SPECS.** Ambos deben actualizarse en cada cierre.
7. **Un commit por spec.** No agrupar varias specs en un mismo commit — la trazabilidad lo exige.

---

## Manejo de errores

- **`last-build-report.md` no existe:** preguntar al usuario si quiere ejecutar `brianspec-build` primero, o si el build se hizo en otra sesión y quiere redactar el informe manualmente.
- **La spec ya está en `/specs/archive/`:** informar y no hacer nada.
- **Push falla:** continuar con el archivo de spec y CHANGELOG, informar del fallo de push con el comando manual exacto.
- **No hay CHANGELOG:** crearlo con estructura mínima estándar antes de añadir la entrada.

---

*Skill brianspec-archive v1.2 — BrianSpec system*
