---
name: brianspec-init
description: Inicializa un proyecto nuevo con el sistema BrianSpec mediante una entrevista conversacional exhaustiva que genera todas las specs del MVP. Actívala cuando el usuario diga "inicializar proyecto", "bootstrap del proyecto", "arrancar proyecto nuevo", "vamos a empezar el proyecto", "brianspec init", "monta brianspec aquí", o cualquier variante de iniciar/configurar/arrancar un proyecto que use BrianSpec. También actívala si el usuario abre una carpeta vacía con la intención de empezar un proyecto BrianSpec. La skill copia los archivos de sistema de BrianSpec en el proyecto, conduce una entrevista de 7 bloques, instala plugins y skills de apoyo, genera PROJECT-CONSTITUTION.md, la carpeta /agents/ con los agentes específicos, los archivos de contexto para la herramienta de IA elegida, y todas las specs del MVP completas y listas para iterar.
---

# brianspec-init

## Propósito

Convertir una carpeta vacía en un proyecto operativo de BrianSpec a través de una conversación estructurada con el developer. Al terminar, el proyecto tiene:

- Los archivos de sistema de BrianSpec copiados localmente (`.brianspec/`, `BRIANSPEC-CONSTITUTION.md`)
- Stack declarado y justificado
- Integraciones externas documentadas (skills, MCPs, APIs)
- Espacio de ClickUp vinculado para trazabilidad de specs
- Plugins y skills de apoyo instalados
- Agentes de construcción específicos generados
- Archivos de contexto adaptados a la herramienta de IA elegida
- `PROJECT-CONSTITUTION.md` completo
- **Todas las specs del MVP generadas, completas y listas para iterar** — con CAs, plan de implementación y notas de seguridad

Esta skill **es la primera ejecución** dentro de un proyecto BrianSpec. Sin ella, los demás comandos (`brianspec-spec`, `brianspec-build`, `brianspec-archive`) no tienen contexto ni archivos de sistema sobre los que operar.

---

## Cómo está distribuida BrianSpec (leer antes de empezar)

BrianSpec se instala como **paquete de skills** con la CLI `skills`, no clonando un repo:

```bash
npx skills add Immoral-marketing/brianspec
```

Esto instala las cuatro skills (`brianspec-init`, `brianspec-spec`, `brianspec-build`, `brianspec-archive`) en el directorio de skills de la herramienta de IA, donde se descubren automáticamente.

Los archivos de sistema que cada proyecto necesita (constitution, agentes universales, checklists de seguridad, templates y LESSONS-LEARNED) **viajan empaquetados dentro de esta skill**, en la carpeta `template/` que está junto a este `SKILL.md`. La primera tarea de `brianspec-init` es **copiar ese `template/` al proyecto**.

---

## Paso 0 — Preparación del entorno (antes de la entrevista)

Este paso se ejecuta **completo antes de hacer ninguna pregunta**. El usuario no tiene que saber qué plugins o MCPs necesita — BrianSpec lo instala todo.

### 0a — Instalar plugins de Claude Code

Ejecutar en secuencia:

```bash
claude plugin install context7@claude-plugins-official
claude plugin install code-review@claude-plugins-official
claude plugin install github@claude-plugins-official
claude plugin install security-guidance@claude-plugins-official
claude plugin install claude-md-management@claude-plugins-official
```

Si algún plugin ya está instalado, el comando lo indica y continúa sin error. Si falla, registrar el fallo y continuar — no bloquear el bootstrap.

### 0b — Instalar MCP de ClickUp

```bash
claude mcp add --transport http --scope user clickup https://mcp.clickup.com/mcp
```

Tras instalarlo, indicar al usuario:

> **ClickUp MCP instalado.** Para que funcione necesitas autenticarlo una vez:
> 1. Escribe `/mcp` en Claude Code
> 2. Selecciona `clickup` y completa el login con tu cuenta de ClickUp
>
> Puedes hacerlo ahora o después. El bootstrap continúa de todas formas.

Si el MCP ya existe en la configuración, omitir la instalación.

### 0c — Sembrar los archivos de sistema en el proyecto

Copiar el bundle de la skill al proyecto:

| Origen (dentro de la skill) | Destino (raíz del proyecto) |
|---|---|
| `template/BRIANSPEC-CONSTITUTION.md` | `BRIANSPEC-CONSTITUTION.md` |
| `template/brianspec/` (carpeta completa) | `.brianspec/` |
| `template/gitignore` | `.gitignore` (si no existe; si existe, fusionar entradas) |
| `template/docs/BRIANSPEC-CHEATSHEET.md` | `docs/BRIANSPEC-CHEATSHEET.md` |

Notas:
- La carpeta vive como `template/brianspec/` (sin punto) por robustez. Al copiarla al proyecto queda como `.brianspec/` (con punto).
- Leer cada archivo del bundle y escribirlo en su destino. No inventar contenido.
- Si el proyecto ya tiene un `.brianspec/` (re-inicialización), no sobrescribir sin avisar.

### 0d — Confirmar entorno listo

Mostrar al usuario:

```
✅ Entorno BrianSpec preparado

Plugins instalados:
- context7, code-review, github, security-guidance, claude-md-management

MCP instalado:
- clickup → autentica con /mcp cuando quieras (puedes hacerlo después)

Archivos de sistema sembrados:
- BRIANSPEC-CONSTITUTION.md, .brianspec/, docs/BRIANSPEC-CHEATSHEET.md

Empezamos la entrevista. Son 7 bloques, unos 10 minutos.
Al terminar tendrás el proyecto configurado y todas las specs del MVP listas.
```

Iniciar la entrevista inmediatamente.

---

## Contexto obligatorio

Tras sembrar los archivos, leer:

1. `BRIANSPEC-CONSTITUTION.md` — principios fundacionales.
2. `.brianspec/agents.md` — los 3 agentes universales.
3. `.brianspec/templates/PROJECT-CONSTITUTION.md` — plantilla a rellenar.
4. `.brianspec/templates/agent-template.md` — plantilla de agentes de construcción.
5. Los 3 templates de spec — para saber cuál aplicar según el tipo.

---

## Flujo de la entrevista

La entrevista tiene **7 bloques**. No saltarse ninguno. Aplicar P2: ante cualquier ambigüedad, ofrecer opciones argumentadas, no preguntar abiertamente. **Una pregunta a la vez.**

### Bloque 1 — Identidad del proyecto

1. **Nombre del proyecto.** En kebab-case si va a ser un repo.
2. **Qué problema resuelve.** En 2–3 frases. Si la descripción es técnica, repreguntar por el problema de negocio.
3. **Actores principales.** Quién interactúa con el sistema.
4. **Alcance del MVP.** Qué entra en la primera versión funcional.
5. **Fuera de alcance explícito.** Qué NO entra.

### Bloque 2 — Tipo de proyecto

> **¿Qué tipo de proyecto vamos a construir?**
>
> - **A — Web-app.** Frontend + backend + base de datos. Stack típico: Next.js, React, Angular, etc.
> - **B — Automatización.** Workflow de n8n, Make, Zapier o scripts agendados.
> - **C — Skill de IA.** Skill de Claude/GPT, agente conversacional, prompt complejo integrado en un producto.
> - **D — Otro / Mixto.** Combina varios tipos o no encaja.

### Bloque 3 — Stack tecnológico

**Si tipo A (web-app):**
- Framework de frontend.
- Framework de backend (o "todo en el framework de frontend").
- Base de datos.
- Plataforma de despliegue.

**Si tipo B (automatización):**
- Plataforma del workflow.
- Sistemas origen y destino.

**Si tipo C (skill-ia):**
- Plataforma de la skill.
- Modelo principal previsto.

**En todos los casos:** pedir justificación del stack.

### Bloque 4 — Integraciones externas, MCPs y ClickUp

1. **Skills externas.** ¿Invoca skills del ecosistema Immoralia o de terceros?
2. **MCPs.** ¿Qué servidores MCP tiene configurados? (Supabase, GitHub, ClickUp, Linear, etc.)
3. **APIs de terceros.** ¿A qué servicios externos se conecta?
4. **ClickUp — espacio del proyecto.** Preguntar:

   > Para crear las tareas de cada spec automáticamente en ClickUp, necesito saber dónde vive este proyecto:
   >
   > - ¿En qué **espacio** de ClickUp está el proyecto? (nombre o ID)
   > - ¿En qué **lista** dentro de ese espacio deben crearse las tareas de specs?
   >
   > Si aún no existe la lista, dime el espacio y la creo durante el bootstrap.

   Guardar en `PROJECT-CONSTITUTION.md`:
   ```
   clickup_space: {{nombre o ID}}
   clickup_list: {{nombre o ID}}
   ```

   Si el developer no tiene ClickUp configurado o prefiere omitirlo, marcar como `{{PENDIENTE}}` y continuar. ClickUp es opcional — no bloquea el bootstrap.

### Bloque 5 — Herramienta de IA principal (P11)

> **¿Qué herramienta de IA vas a usar como copiloto principal?**
>
> - **A — Claude Code.** Genero `CLAUDE.md`.
> - **B — Codex CLI.** Genero `AGENTS.md`.
> - **C — Gemini CLI.** Genero `GEMINI.md`.
> - **D — Cursor.** Genero `.cursorrules`.
> - **E — Otra / Varias.**

El archivo generado NO duplica las constitutions — es un **archivo de entrada rápida** que le dice a la herramienta qué leer, qué skills invocar y cómo usar BrianSpec.

### Bloque 6 — Agentes de construcción

Basándose en el stack, proponer agentes de construcción. Para cada uno mostrar: nombre, rol, por qué se propone y qué skills de apoyo usará. El developer acepta, modifica o ajusta. Generar `/agents/{{NN}}-{{AGENT_NAME}}.md` por cada agente.

### Bloque 7 — Funcionalidades del MVP y generación de specs

Este es el bloque más importante. El objetivo es extraer **todas las funcionalidades del MVP** y convertirlas en specs completas.

#### Fase A — Inventario de funcionalidades

Preguntar al developer que liste todas las funcionalidades del MVP. Si la lista es vaga, ayudar a descomponerla con preguntas:

> Basándome en lo que describes, propongo estas funcionalidades para el MVP:
>
> 1. Autenticación de usuario (registro, login, recuperación de contraseña)
> 2. Dashboard principal con resumen de actividad
> 3. Gestión de X (crear, editar, archivar)
> 4. Notificaciones por email
>
> ¿Falta algo? ¿Hay funcionalidades que quitarías del MVP y pasarías a v2?

Una vez acordada la lista, **numerarla** (SPEC-01, SPEC-02...) y confirmarla con el developer antes de pasar a la generación.

#### Fase B — Generación de specs completas

Para **cada funcionalidad** de la lista, generar una spec completa siguiendo el template correspondiente al tipo de proyecto. Cada spec incluye:

- Descripción y actores
- Flujos principales y alternativos
- Edge cases identificados
- Criterios de aceptación verificables (CA-01, CA-02...)
- Notas de seguridad (si aplica)
- Plan de implementación con desglose de tareas
- Estado: `draft`

**Reglas de generación:**
- Generar todas las specs en secuencia, sin parar entre una y otra.
- Si durante la generación aparece una ambigüedad crítica que impide escribir los CAs de una spec, pausar solo para esa spec, preguntar con opciones A/B/C y continuar.
- Las ambigüedades menores quedan marcadas como `{{PENDIENTE — resolver en brianspec-spec}}`.
- Al terminar cada spec, confirmar brevemente: "SPEC-03 generada: Gestión de X — 5 CAs, 3 tareas."
- Generar los archivos en `/specs/{{NN}}-{{nombre-kebab-case}}.md`.

Al terminar todas las specs, mostrar el inventario completo:

```
📋 Specs del MVP generadas:
- SPEC-01: autenticacion-usuario — 6 CAs, estado: draft
- SPEC-02: dashboard-principal — 4 CAs, estado: draft
- SPEC-03: gestion-de-x — 5 CAs, estado: draft
- SPEC-04: notificaciones-email — 3 CAs, estado: draft

Total: 4 specs · 18 CAs · listas para iterar con brianspec-spec
```

---

## Skills de apoyo recomendadas por stack

### Skills de diseño web (se instalan automáticamente en web-app)

| Skill | Origen para `npx skills add` | Para qué sirve |
|---|---|---|
| `frontend-design` | `anthropics/skills --skill frontend-design` | Criterio de diseño de interfaces de alto nivel. |
| `impeccable` | `pbakaus/impeccable --skill impeccable` | Pulido visual e impecabilidad de detalle en UI. |
| `emil-design-eng` | `emilkowalski/skill --skill emil-design-eng` | Micro-interacciones, animación, calidad de front. |

### Skills de stack (instalación automática según el stack declarado)

| Si el stack incluye… | Skill | Origen |
|---|---|---|
| Next.js (App Router) | `nextjs-app-router-patterns` | `Immoral-marketing/skills` |
| Tailwind v4 + shadcn/ui | `tailwind-v4-shadcn` | `Immoral-marketing/skills` |
| Supabase | `supabase` | `Immoral-marketing/skills` |
| PostgreSQL / optimización | `supabase-postgres-best-practices` | `Immoral-marketing/skills` |
| Angular + PrimeNG | `angular-best-practices-primeng` | `Immoral-marketing/skills` |
| Remotion (vídeo) | `remotion-best-practices` | `Immoral-marketing/skills` |
| Web-app (cualquier stack) | `playwright` | Plugin Microsoft — browser automation y testing E2E |
| Todos los proyectos | `context7` | Plugin oficial — docs actualizadas de librerías en contexto |

### Plugins universales (se instalan en todos los proyectos)

| Plugin | Identificador | Para qué sirve |
|---|---|---|
| `context7` | `context7@claude-plugins-official` | Documentación actualizada de cualquier librería/framework. Elimina alucinaciones de APIs deprecadas. |
| `code-review` | `code-review@claude-plugins-official` | Revisión de código integrada. Refuerzo del REVIEW-AGENT. |
| `github` | `github@claude-plugins-official` | Acceso a repos, PRs, issues y acciones de GitHub. |
| `security-guidance` | `security-guidance@claude-plugins-official` | Guía de seguridad en tiempo real durante la implementación. |
| `claude-md-management` | `claude-md-management@claude-plugins-official` | Mantiene CLAUDE.md actualizado con aprendizajes de sesión. |

### Skills generales del ecosistema (siempre disponibles, solo referenciar)

`verify`, `run`, `simplify` — referenciarlas en el archivo de contexto de la herramienta como apoyo durante `brianspec-build`.

> **Nota sobre `code-review`:** BrianSpec usa el plugin `code-review@claude-plugins-official` (nivel usuario) en lugar de la skill homónima del ecosistema. No instalar ambos.

---

## Instalación de plugins y skills de apoyo

Al cerrar la entrevista, **antes de generar los archivos finales**, ejecutar en este orden:

### Bloque 1 — Plugins universales (todos los proyectos, siempre)

```bash
claude plugin install context7@claude-plugins-official
claude plugin install code-review@claude-plugins-official
claude plugin install github@claude-plugins-official
claude plugin install security-guidance@claude-plugins-official
claude plugin install claude-md-management@claude-plugins-official
```

### Bloque 2 — Plugins condicionales (solo web-app)

```bash
claude plugin install playwright@microsoft
```

### Bloque 3 — Skills de diseño (solo web-app)

```bash
npx skills add anthropics/skills --skill frontend-design -y --copy
npx skills add pbakaus/impeccable --skill impeccable -y --copy
npx skills add emilkowalski/skill --skill emil-design-eng -y --copy
```

### Bloque 4 — Skills de stack (según lo declarado en el Bloque 3)

| Si el stack incluye… | Comando de instalación |
|---|---|
| Next.js (App Router) | `npx skills add Immoral-marketing/skills --skill nextjs-app-router-patterns -y --copy` |
| Tailwind v4 + shadcn/ui | `npx skills add Immoral-marketing/skills --skill tailwind-v4-shadcn -y --copy` |
| Supabase | `npx skills add Immoral-marketing/skills --skill supabase -y --copy` |
| PostgreSQL / optimización | `npx skills add Immoral-marketing/skills --skill supabase-postgres-best-practices -y --copy` |
| Angular + PrimeNG | `npx skills add Immoral-marketing/skills --skill angular-best-practices-primeng -y --copy` |
| Remotion (vídeo) | `npx skills add Immoral-marketing/skills --skill remotion-best-practices -y --copy` |

Reglas de instalación:
1. Los **plugins** (`claude plugin install`) se instalan a nivel de usuario — funcionan en todos los proyectos del developer.
2. Las **skills** (`npx skills add --copy`) se instalan a nivel de proyecto — quedan versionadas en `skills-lock.json`. Commitéalo.
3. Si un comando falla, no abortar el bootstrap: registrar el fallo, indicar el comando manual y continuar.
4. Tras instalar, confirmar qué quedó instalado y recordar el commit de `skills-lock.json`.

---

## Generación de archivos al cerrar la entrevista

Al terminar los 7 bloques y la instalación, generar:

1. **`PROJECT-CONSTITUTION.md`** rellenado con las respuestas, incluyendo `clickup_space` y `clickup_list`.
2. **`/agents/{{NN}}-{{AGENT_NAME}}.md`** por cada agente de construcción declarado.
3. **Archivo(s) de contexto para la herramienta de IA** (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules`).
4. **Estructura de carpetas inicial:**
   - web-app: `/src/`, `/specs/`, `/specs/archive/`, `/public/`
   - automatización: `/workflows/`, `/specs/`, `/specs/archive/`, `/credentials-template/`
   - skill-ia: `/skill/`, `/specs/`, `/specs/archive/`, `/test-cases/`
5. **`.brianspec/LESSONS-LEARNED.md`** vacío con estructura inicial (ver template).
6. **`CHANGELOG.md`** con entrada inicial `[0.1.0] - Bootstrap con BrianSpec`.
7. **`README.md`** del proyecto con descripción inicial y badge de BrianSpec.
8. **Todas las specs del MVP** en `/specs/` (generadas en el Bloque 7).

---

## Mensaje de cierre del bootstrap

```
✅ Proyecto inicializado con BrianSpec

Archivos de sistema:
- BRIANSPEC-CONSTITUTION.md
- .brianspec/ (agents.md, security-checklists.md, LESSONS-LEARNED.md, templates/)
- docs/BRIANSPEC-CHEATSHEET.md

Archivos generados:
- PROJECT-CONSTITUTION.md (ClickUp: {{espacio}}/{{lista}})
- /agents/{lista de agentes}
- {archivos de contexto IA}
- Estructura de carpetas

Plugins instalados (nivel usuario):
- context7, code-review, github, security-guidance, claude-md-management
{- playwright (web-app)}

Skills instaladas (nivel proyecto):
- {lista según stack}
- skills-lock.json generado → commitéalo

Specs del MVP generadas:
- {lista de specs con número y título}

Próximo paso:
  Di "analizemos la SPEC-01" para iterar la primera spec,
  resolver ambigüedades y aprobarla antes de implementar.

Documentación clave:
- BRIANSPEC-CONSTITUTION.md     ← principios globales
- PROJECT-CONSTITUTION.md       ← contexto de este proyecto
- docs/BRIANSPEC-CHEATSHEET.md  ← ciclo de vida y comandos
- .brianspec/LESSONS-LEARNED.md ← memoria de errores y aprendizajes
```

---

## Reglas durante el bootstrap

1. **Sembrar antes de entrevistar.** El Paso 0 va primero.
2. **No inferir.** Repreguntar con opciones (P2).
3. **No saltar bloques.** Si el developer quiere omitir algo, marcarlo como `{{PENDIENTE}}`.
4. **No generar archivos finales hasta haber pasado los 7 bloques.**
5. **Una pregunta a la vez.** No bombardear.
6. **Validar el inventario de specs con el developer antes de generarlas.**
7. **Al final, mostrar resumen completo antes de generar archivos.**

---

## Restricciones

- NO ejecuta comandos de Git (`git init`, primer commit).
- NO instala dependencias de la aplicación (npm install del framework, etc.).
- NO escribe código de aplicación.

---

*Skill brianspec-init v1.2 — BrianSpec system*
