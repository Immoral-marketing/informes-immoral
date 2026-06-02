---
name: brianspec-archive
description: Cierra y archiva una spec implementada y aprobada en producción. Actívala cuando el usuario diga "archiva la spec NN", "cierra esta spec", "ya mergeé el PR, ciérrala", "brianspec archive", "esta funcionalidad ya está en producción", o cualquier variante de cerrar/archivar/finalizar una spec ya implementada. Esta skill mueve la spec a /specs/archive/, actualiza el CHANGELOG del proyecto y deja constancia trazable de la implementación cerrada.
---

# brianspec-archive

## Propósito

Cerrar el ciclo de una spec: mover el archivo a `/specs/archive/`, actualizar el `CHANGELOG.md` del proyecto, y dejar el sistema listo para la siguiente spec. Una spec archivada es **fuente de verdad histórica** — no se borra ni se modifica.

Esta skill cumple P7 (trazabilidad completa): cada spec implementada queda registrada con su fecha de cierre, su versión final y la referencia al PR/merge que la cerró.

---

## Contexto obligatorio

Antes de archivar, leer:

1. `BRIANSPEC-CONSTITUTION.md` — principios (especialmente P7).
2. `PROJECT-CONSTITUTION.md` — para confirmar convenciones del proyecto.
3. La spec a archivar en `/specs/{{NN}}-{{nombre}}.md`.
4. El `CHANGELOG.md` del proyecto, para añadir entrada nueva.

---

## Pre-condiciones de ejecución

Antes de archivar, verificar:

- [ ] La spec existe en `/specs/`.
- [ ] El estado de la spec es **`aprobada`** o **`implementada`** (no `draft`).
- [ ] La implementación ha sido revisada por REVIEW-AGENT y SECURITY-AGENT sin hallazgos bloqueantes (ver últimos resultados de `brianspec-build`).
- [ ] Un humano ha aprobado la implementación. Si no, preguntar al usuario: *¿Quién aprobó esta implementación y cuándo?* Sin aprobación humana, no archivar (P5).
- [ ] Si el proyecto usa Git: el código está mergeado a la rama principal. Si no lo está, preguntar y esperar antes de archivar.

Si alguna pre-condición falla, **no archivar**. Informar al usuario qué falta.

---

## Flujo de la skill

### Fase 1 — Verificación final

1. Mostrar al usuario el resumen de la spec:
   - Nombre y número
   - Estado actual
   - CAs declarados y su estado en la última revisión
   - Hallazgos de seguridad resueltos
2. Preguntar: *"¿Confirmas que esta spec está implementada, revisada por humano y mergeada (si aplica)?"*
3. Si el usuario confirma, proceder. Si no, parar.

### Fase 2 — Actualización del archivo de spec

1. Cambiar el estado de la spec a `implementada`.
2. Añadir al final del archivo una sección de cierre:

```markdown
---

## Cierre

**Fecha de cierre:** {{FECHA}}
**Aprobada por (humano):** {{NOMBRE}}
**Merge / Despliegue:** {{REFERENCIA al PR, commit o ejecución}}
**Última versión:** {{VERSIÓN_FINAL}}
**Resultado REVIEW-AGENT:** APROBADO ({{N}} de {{N}} CAs)
**Resultado SECURITY-AGENT:** NO BLOQUEANTE ({{N hallazgos resueltos / N totales}})

### Aprendizajes (opcional)

{{Aprendizajes destacables que valga la pena recordar para futuras specs.}}
```

3. Guardar el archivo actualizado.

### Fase 3 — Movimiento a archive

1. Si `/specs/archive/` no existe, crearlo.
2. Mover el archivo de `/specs/{{NN}}-{{nombre}}.md` a `/specs/archive/{{NN}}-{{nombre}}.md`.
3. Si el proyecto usa Git, hacer commit del movimiento con mensaje: `chore(spec): archive SPEC-{{NN}} {{nombre}}`.

### Fase 4 — Actualización del CHANGELOG del proyecto

Añadir una entrada en `CHANGELOG.md` del proyecto bajo la versión vigente:

```markdown
### Añadido / Modificado / Corregido

- SPEC-{{NN}} ({{nombre}}): {{descripción breve de la funcionalidad implementada}}. ({{fecha}})
```

Si no hay una versión vigente abierta, sugerir al usuario incrementar versión semántica (Major/Minor/Patch) según el tipo de cambio.

### Fase 5 — Resumen final

Mostrar al usuario:

```
✅ SPEC-{{NN}} archivada

Movimiento: /specs/{{NN}}-{{nombre}}.md → /specs/archive/{{NN}}-{{nombre}}.md
Estado: implementada
CHANGELOG actualizado: ✓

Próximos pasos sugeridos:
- Si quieres empezar la siguiente funcionalidad: invoca `brianspec-spec`.
- Si esta spec generó aprendizajes que valgan para otros proyectos del ecosistema, considera documentarlos en {{lugar centralizado de aprendizajes del equipo}}.
```

---

## Modo: archivar múltiples specs a la vez

Si el usuario pide archivar varias specs en una sola operación:

1. Verificar las pre-condiciones para **cada** spec por separado.
2. Si alguna falla, listar cuáles y preguntar si proceder solo con las que sí pasan.
3. Archivarlas en orden numérico.
4. Mostrar resumen consolidado al final.

---

## Reglas y restricciones

1. **Nunca borrar.** Archivar es mover, no eliminar. Una spec archivada se conserva indefinidamente (P7).
2. **Nunca archivar specs en `draft`.** Solo specs aprobadas o implementadas.
3. **Nunca archivar sin aprobación humana confirmada.** P5.
4. **No modificar el contenido funcional de la spec al archivar.** Solo se añade la sección de "Cierre" al final. El resto del archivo se preserva tal como estaba en el momento de implementación.
5. **No re-numerar specs.** Si SPEC-03 se archiva, el siguiente número sigue siendo SPEC-04 (no se reciclan números). La trazabilidad lo exige.
6. **No omitir el CHANGELOG.** Aunque parezca redundante, el CHANGELOG es la entrada legible para humanos que no leen specs.

---

## Manejo de errores

- **La spec ya está en `/specs/archive/`:** informar al usuario y no hacer nada.
- **El archivo de la spec ha sido modificado tras la implementación:** preguntar al usuario si guarda los cambios como nueva versión antes de archivar, o si revierte.
- **No hay CHANGELOG en el proyecto:** crearlo con estructura mínima estándar antes de añadir la entrada.
- **El número de spec no es secuencial (hay huecos):** no intentar "rellenar". Los huecos son aceptables — pueden ser specs descartadas que se anotaron pero nunca se implementaron.

---

*Skill brianspec-archive v1.0 — BrianSpec system*
