---
name: brianspec-upgrade
description: Actualiza BrianSpec a la última versión y migra los archivos de sistema del proyecto actual. Actívala cuando el usuario diga "actualiza brianspec", "update brianspec", "hay actualizaciones de brianspec", "pon brianspec a la última versión", o cualquier variante de actualizar/subir de versión el sistema BrianSpec.
---

# brianspec-upgrade

## Propósito

Mantener BrianSpec al día sin fricción. El usuario dice "actualiza brianspec" y el sistema:

1. Actualiza las skills del sistema a la última versión publicada.
2. Detecta la versión con la que se inicializó el proyecto.
3. Si el proyecto es antiguo (pre-v1.3), ejecuta migración completa desde cero.
4. Si el proyecto ya es v1.3+, compara y migra solo los archivos que cambiaron.
5. Respeta customizaciones del equipo — nunca las pisa sin aviso.
6. Informa exactamente qué cambió y qué requiere atención manual.

---

## Contexto obligatorio

Antes de actuar, leer:

- `PROJECT-CONSTITUTION.md` — versión de BrianSpec con la que se inicializó el proyecto.
- `BRIANSPEC-CONSTITUTION.md` — versión actual en el proyecto.
- `.brianspec/agents.md` — para detectar customizaciones locales.

---

## Fase 1 — Actualizar las skills del sistema

Ejecutar:

```bash
npx skills add Immoral-marketing/brianspec --update
```

Este comando actualiza las 5 skills del sistema (`brianspec-init`, `brianspec-spec`, `brianspec-build`, `brianspec-archive`, `brianspec-upgrade`) a la última versión del repositorio.

Capturar el output. Si el comando indica "already up to date" o similar, informar al usuario y terminar:

```
✅ BrianSpec ya está en la última versión. No hay nada que actualizar.
```

Si hay actualización, continuar con las fases siguientes.

---

## Fase 2 — Detectar la versión del proyecto

Buscar la versión de BrianSpec con la que se inicializó o actualizó por última vez el proyecto, en este orden:

1. `PROJECT-CONSTITUTION.md` — campo "Versión de BrianSpec" o similar.
2. `BRIANSPEC-CONSTITUTION.md` — campo "Versión" en el encabezado.
3. `.brianspec/agents.md` — campo "Versión" en el encabezado.

**Clasificar el proyecto:**

- **Versión no encontrada o < v1.3** → proyecto legacy. Ir a [Fase 3A — Migración legacy].
- **Versión >= v1.3** → proyecto moderno. Ir a [Fase 3B — Actualización incremental].

---

## Fase 3A — Migración legacy (proyectos pre-v1.3)

Estos proyectos se inicializaron antes de que existiera `brianspec-upgrade`. Pueden carecer de archivos enteros introducidos en versiones posteriores (ej. `LESSONS-LEARNED.md` no existía en v1.0).

### Paso 1 — Informar al usuario

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  Proyecto legacy detectado (BrianSpec {{VERSION_PROYECTO}})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Este proyecto se inicializó con una versión anterior a v1.3.
Voy a hacer una migración completa para traerlo a la última versión.

Esto NO modifica:
  ✗ PROJECT-CONSTITUTION.md
  ✗ /agents/ (tus agentes de construcción)
  ✗ CLAUDE.md
  ✗ /specs/
  ✗ Nada que el equipo haya escrito

¿Continuamos? (sí / no)
```

Esperar confirmación del usuario antes de continuar.

### Paso 2 — Inventario de archivos de sistema

Verificar existencia de cada archivo de sistema gestionado por BrianSpec:

| Archivo en el proyecto | Introducido en | ¿Existe? |
|---|---|---|
| `BRIANSPEC-CONSTITUTION.md` | v1.0 | verificar |
| `.brianspec/agents.md` | v1.0 | verificar |
| `.brianspec/security-checklists.md` | v1.0 | verificar |
| `.brianspec/LESSONS-LEARNED.md` | v1.2 | verificar |
| `docs/BRIANSPEC-CHEATSHEET.md` | v1.1 | verificar |

### Paso 3 — Migrar cada archivo

Para cada archivo, aplicar la lógica según su estado:

**Archivo NO existe en el proyecto:**
- Copiar directamente desde la nueva versión de BrianSpec.
- Marcar como `[NUEVO]` en el informe.

**Archivo existe y es idéntico a alguna versión histórica de BrianSpec:**
- Hacer backup en `.brianspec/upgrade-backup/`.
- Reemplazar con la versión nueva.
- Marcar como `[ACTUALIZADO]` en el informe.

**Archivo existe y ha sido modificado por el equipo (no coincide con ninguna versión histórica):**
- Guardar la versión nueva en `.brianspec/upgrade-pending/{{archivo}}.new`.
- NO sobreescribir el archivo actual.
- Marcar como `[PENDIENTE REVISIÓN MANUAL]` en el informe.

### Paso 4 — Registrar la versión

Añadir o actualizar en `PROJECT-CONSTITUTION.md`:

```
Versión de BrianSpec: v{{NUEVA_VERSION}} (migrado desde {{VERSION_PROYECTO}} el {{FECHA}})
```

### Paso 5 — Informe de migración legacy

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Migración completada: {{VERSION_PROYECTO}} → v{{NUEVA_VERSION}}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Skills actualizadas:
   brianspec-init, brianspec-spec, brianspec-build, brianspec-archive, brianspec-upgrade

Archivos de sistema:
   [NUEVO]      .brianspec/LESSONS-LEARNED.md — memoria de aprendizajes entre specs
   [NUEVO]      docs/BRIANSPEC-CHEATSHEET.md
   [ACTUALIZADO] BRIANSPEC-CONSTITUTION.md (backup en .brianspec/upgrade-backup/)
   [ACTUALIZADO] .brianspec/security-checklists.md
   [PENDIENTE]  .brianspec/agents.md — tiene customizaciones locales
                → Versión nueva en .brianspec/upgrade-pending/agents.md.new
                → Compara y aplica los cambios relevantes

Próximos pasos:
   1. Revisa .brianspec/upgrade-pending/agents.md.new y aplica lo que corresponda.
   2. Haz commit: "chore: migrar brianspec {{VERSION_PROYECTO}} → v{{NUEVA_VERSION}}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
¿Quieres que compare el agents.md pendiente y te diga exactamente qué añadió la nueva versión?
```

---

## Fase 3B — Actualización incremental (proyectos v1.3+)

Estos proyectos ya fueron migrados al menos una vez con `brianspec-upgrade`. Solo hay que actualizar lo que cambió.

### Archivos de sistema gestionados

| Archivo en el proyecto | Fuente en BrianSpec |
|---|---|
| `BRIANSPEC-CONSTITUTION.md` | `brianspec-init/template/BRIANSPEC-CONSTITUTION.md` |
| `.brianspec/agents.md` | `brianspec-init/template/brianspec/agents.md` |
| `.brianspec/security-checklists.md` | `brianspec-init/template/brianspec/security-checklists.md` |
| `.brianspec/LESSONS-LEARNED.md` | solo si el archivo está vacío o es el template sin entradas reales |
| `docs/BRIANSPEC-CHEATSHEET.md` | `brianspec-init/template/docs/BRIANSPEC-CHEATSHEET.md` |

**Nunca gestionar:**
- `PROJECT-CONSTITUTION.md`
- `.brianspec/LESSONS-LEARNED.md` si ya tiene entradas reales (LL-001, etc.)
- `/agents/`
- `CLAUDE.md`
- `/specs/`

Para cada archivo, comparar con la versión nueva y clasificar:

- **Sin cambios** — no hacer nada.
- **Actualización disponible, sin customización** — backup + reemplazar.
- **Actualización disponible, con customización** — guardar como `.new`, pedir revisión.

Actualizar versión en `PROJECT-CONSTITUTION.md` y generar informe (mismo formato que Fase 3A Paso 5).

---

## Reglas generales

- **Nunca pisar customizaciones del equipo sin aviso.** Si un archivo fue modificado localmente, siempre guardar la nueva versión como `.new` y pedir revisión.
- **Backups siempre antes de sobreescribir.**
- **No bloquear si un archivo no existe** — crearlo con la versión nueva.
- **`LESSONS-LEARNED.md` con entradas reales es sagrado** — nunca sobreescribir si tiene entradas LL-NNN. Solo actualizar si es el template vacío.
- **Un commit al final.** Proponer: `chore: upgrade brianspec {{VERSION_PROYECTO}} → v{{NUEVA_VERSION}}`.
- **Si algo es ambiguo, preguntar** — no asumir.
