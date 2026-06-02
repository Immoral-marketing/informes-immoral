---
name: brianspec-init
description: Inicializa un proyecto nuevo con el sistema BrianSpec mediante una entrevista conversacional. Actívala cuando el usuario clona el repo BrianSpec y dice "inicializar proyecto", "bootstrap del proyecto", "arrancar proyecto nuevo", "vamos a empezar el proyecto", "brianspec init", o cualquier variante de iniciar/configurar/arrancar un proyecto que use BrianSpec. También actívala si el usuario abre el repo BrianSpec por primera vez sin haber ejecutado nunca la inicialización. La skill genera PROJECT-CONSTITUTION.md, la carpeta /agents/ con los agentes específicos del proyecto, y los archivos de contexto para la herramienta de IA elegida (CLAUDE.md, AGENTS.md, GEMINI.md, .cursorrules o equivalentes).
---

# brianspec-init

## Propósito

Convertir el repo template de BrianSpec en un proyecto operativo a través de una conversación estructurada con el developer. Al terminar, el proyecto tiene:

- Stack declarado y justificado
- Integraciones externas documentadas (skills, MCPs, APIs)
- Agentes de construcción específicos generados
- Archivos de contexto adaptados a la herramienta de IA elegida
- `PROJECT-CONSTITUTION.md` completo

Esta skill **es la primera ejecución** dentro de un proyecto BrianSpec. Sin ella, los demás comandos no tienen contexto suficiente para operar.

---

## Contexto obligatorio

Antes de empezar la entrevista, leer:

1. `BRIANSPEC-CONSTITUTION.md` — para conocer los principios que el bootstrap debe respetar.
2. `.brianspec/agents.md` — para conocer los 3 agentes universales (no se generan, solo se referencian).
3. `.brianspec/templates/PROJECT-CONSTITUTION.md` — la plantilla a rellenar.
4. `.brianspec/templates/agent-template.md` — la plantilla para generar agentes de construcción.
5. Los 3 templates de spec — para poder mostrar al developer cuál se aplicará según el tipo elegido.

---

## Flujo de la entrevista

La entrevista tiene **6 bloques**. No saltarse ninguno. Aplicar P2: ante cualquier ambigüedad, ofrecer opciones argumentadas, no preguntar abiertamente.

### Bloque 1 — Identidad del proyecto

Preguntar:

1. **Nombre del proyecto.** En formato kebab-case si va a ser un repo (`meetflow`, `propuestas-immoral`).
2. **Qué problema resuelve.** En 2–3 frases. Si el developer da una descripción técnica ("una app con login"), repreguntar por el problema de negocio ("¿quién la usa y qué le permite hacer que ahora no puede?").
3. **Actores principales.** Quién interactúa con el sistema.
4. **Alcance del MVP.** Qué entra en la primera versión funcional.
5. **Fuera de alcance explícito.** Qué NO entra, para evitar scope creep.

### Bloque 2 — Tipo de proyecto

Preguntar con opciones:

> **¿Qué tipo de proyecto vamos a construir?**
>
> - **A — Web-app.** Aplicación web con frontend, backend y/o base de datos. Stack típico: Next.js, React, Astro, Vue, etc. + backend y persistencia.
> - **B — Automatización.** Workflow de n8n, Make, Zapier, scripts agendados o integraciones entre servicios. Sin UI propia compleja.
> - **C — Skill de IA.** Una skill de Claude/GPT, agente conversacional, prompt complejo integrado en un producto.
> - **D — Otro / Mixto.** Si tu proyecto combina varios tipos o no encaja en los anteriores, descríbelo y proponemos cómo estructurarlo.

Si el developer elige D, indagar para clasificar en una combinación de A/B/C o aceptar que es un tipo nuevo y proceder con plantillas adaptadas.

### Bloque 3 — Stack tecnológico

La conversación cambia según el tipo elegido.

**Si tipo A (web-app):**
- Lenguaje principal del frontend.
- Framework de frontend.
- Lenguaje principal del backend (puede ser el mismo).
- Framework de backend o decisión "todo en el framework de frontend" (Next.js fullstack, etc.).
- Base de datos.
- Plataforma de despliegue.

**Si tipo B (automatización):**
- Plataforma del workflow (n8n, Make, Zapier, código propio).
- Lenguaje si es código propio.
- Sistemas origen y destino que va a tocar.

**Si tipo C (skill-ia):**
- Plataforma de la skill (Claude personal, Claude organizational, Custom GPT, agente de Cursor, otro).
- Modelo principal previsto.
- Si genera código o ejecuta acciones, en qué sistemas.

**En todos los casos:**
- Pedir justificación del stack. Si la justificación es débil ("porque sí" o "lo conozco"), señalar que la decisión es válida pero anotarla como tal en la Constitution para futura revisión.

### Bloque 4 — Integraciones externas

Preguntar:

1. **Skills externas.** ¿Va a invocar skills del ecosistema Immoralia (frontend-design, file-reading, etc.) o de terceros? Listarlas.
2. **MCPs.** ¿Qué servidores MCP va a tener configurados la herramienta de IA del developer? (Supabase, GitHub, ClickUp, Linear, etc.).
3. **APIs de terceros.** ¿A qué servicios externos se conecta el proyecto? Para cada uno: scope mínimo necesario.

Si el developer no sabe responder, ofrecer una lista por defecto según el tipo de proyecto y dejar que confirme/edite.

### Bloque 5 — Herramienta de IA principal (P11)

Preguntar con opciones:

> **¿Qué herramienta de IA vas a usar como copiloto principal en este proyecto?**
>
> - **A — Claude Code.** Genero `CLAUDE.md` en raíz con el contexto necesario.
> - **B — Codex CLI.** Genero `AGENTS.md` en raíz (formato Codex).
> - **C — Gemini CLI.** Genero `GEMINI.md` en raíz.
> - **D — Cursor.** Genero `.cursorrules` en raíz.
> - **E — Otra / Varias.** Dímela y adapto. Si son varias, genero los archivos correspondientes para todas.

Importante: el archivo generado para cada herramienta NO es un duplicado de `BRIANSPEC-CONSTITUTION.md` ni de `PROJECT-CONSTITUTION.md`. Es un **archivo de entrada rápida** que le dice a la herramienta:

- Lee `BRIANSPEC-CONSTITUTION.md` para los principios
- Lee `PROJECT-CONSTITUTION.md` para el contexto del proyecto
- Lee la spec activa en `/specs/` cuando trabajes
- Los comandos disponibles son `brianspec-spec`, `brianspec-build`, `brianspec-archive`
- Las convenciones se respetan estrictamente

### Bloque 6 — Agentes de construcción

Basándose en el stack declarado, **proponer** un conjunto de agentes:

**Ejemplos de propuestas:**

- Stack Next.js + Supabase + PostgreSQL → propuesta: FRONTEND-AGENT, BACKEND-AGENT, DB-AGENT.
- Stack Astro + Sanity → propuesta: FRONTEND-AGENT, CMS-AGENT.
- Stack n8n + APIs externas → propuesta: WORKFLOW-AGENT.
- Stack Claude Skill + MCPs → propuesta: SKILL-AGENT.
- Mixto → combinar agentes.

Para cada agente propuesto, mostrar:
- Nombre
- Rol en una frase
- Por qué se propone para este stack

El developer puede:
- Aceptar la propuesta tal cual.
- Modificar nombres o roles.
- Añadir agentes que falten.
- Eliminar los que no necesite.

Una vez confirmados los agentes, generar un archivo por agente en `/agents/{{AGENT_NAME}}.md` usando `agent-template.md` como base, rellenado con la información del stack y las convenciones del proyecto.

---

## Generación de archivos al cerrar la entrevista

Al terminar los 6 bloques, generar:

1. **`PROJECT-CONSTITUTION.md`** en la raíz del proyecto, usando la plantilla y rellenando con las respuestas.
2. **`/agents/{{NN}}-{{AGENT_NAME}}.md`** un archivo por cada agente de construcción declarado.
3. **Archivo(s) de contexto para la herramienta de IA elegida** en raíz (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules`).
4. **Estructura de carpetas inicial** según el tipo de proyecto:
   - web-app: `/src/`, `/specs/`, `/specs/archive/`, `/public/`
   - automatización: `/workflows/`, `/specs/`, `/specs/archive/`, `/credentials-template/`
   - skill-ia: `/skill/`, `/specs/`, `/specs/archive/`, `/test-cases/`
5. **`CHANGELOG.md`** del proyecto con entrada inicial `[0.1.0] - Bootstrap con BrianSpec`.
6. **`README.md`** del proyecto con descripción inicial, badge de BrianSpec, y enlace al sistema.

---

## Después del bootstrap

Al terminar, mostrar al developer:

```
✅ Proyecto inicializado con BrianSpec v1.0

Archivos generados:
- PROJECT-CONSTITUTION.md
- /agents/{lista}
- {archivos de contexto IA}
- Estructura inicial

Próximo paso recomendado:
   Invocar la skill `brianspec-spec` para redactar la primera spec del MVP.

Documentación clave:
- BRIANSPEC-CONSTITUTION.md   ← principios globales
- PROJECT-CONSTITUTION.md     ← contexto de este proyecto
- .brianspec/agents.md         ← agentes universales
- /agents/                     ← agentes de construcción declarados
```

---

## Reglas durante el bootstrap

1. **No inferir.** Si una respuesta no está clara, repreguntar con opciones (P2).
2. **No saltar bloques.** Los 6 bloques son obligatorios. Si el developer dice "salta esto, lo decido luego", aceptar pero marcar el campo en `PROJECT-CONSTITUTION.md` como `{{PENDIENTE — definir antes de la primera spec}}`.
3. **No generar archivos hasta haber pasado los 6 bloques.** La generación es el cierre, no el principio.
4. **Mantener agnosticidad.** El sistema no impone tecnologías. Si el developer pregunta "qué stack uso", proponer opciones argumentadas según el tipo, pero dejar que decida.
5. **Una pregunta a la vez.** No bombardear con todas las preguntas del bloque a la vez. Avanzar conversacional.
6. **Al final, validar todo con el developer en un resumen antes de generar archivos.**

---

## Restricciones

- NO ejecuta ningún comando de Git. La inicialización del repo (`git init`, primer commit) la hace el developer manualmente al terminar el bootstrap.
- NO instala dependencias. Sugiere los comandos a ejecutar pero no los ejecuta.
- NO escribe código de aplicación. Solo archivos de configuración y documentación del sistema BrianSpec.
- NO genera la primera spec del proyecto. Esa la genera `brianspec-spec` cuando el developer la invoque.

---

*Skill brianspec-init v1.0 — BrianSpec system*
