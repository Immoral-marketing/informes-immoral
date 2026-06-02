# BRIANSPEC-CONSTITUTION.md

**Versión:** 1.0
**Estado:** Vigente
**Fecha:** 2026-05-31
**Alcance:** Global e inmutable para todos los proyectos que adopten BrianSpec

---

## 1. Preámbulo

Este documento contiene los principios fundacionales del sistema BrianSpec. Es la capa global que heredan **todos** los proyectos que adopten el sistema, sin excepción y sin modificaciones locales.

BrianSpec es el sistema de Spec-Driven Development de Immoral Group para proyectos de desarrollo de software — webs, aplicaciones, automatizaciones y skills de IA. Su propósito es que cada proyecto avance con velocidad y calidad simultáneamente: velocidad porque los agentes de IA hacen el trabajo pesado, calidad porque cada agente ejecuta contra un contrato escrito y verificable.

Esta Constitution se distingue del archivo `PROJECT-CONSTITUTION.md` que cada proyecto crea individualmente:

- **`BRIANSPEC-CONSTITUTION.md`** (este archivo) → principios globales del sistema. No se edita por proyecto. Define qué significa "usar BrianSpec".
- **`PROJECT-CONSTITUTION.md`** (uno por proyecto) → principios específicos del proyecto concreto. Stack permitido, convenciones del equipo, restricciones técnicas. Hereda de este archivo y lo complementa, nunca lo contradice.

Si un proyecto necesita romper un principio de esta Constitution, no está usando BrianSpec — está usando otra cosa. Es preferible reconocerlo abiertamente que diluir el sistema.

---

## 2. Principios Fundacionales

Los siguientes once principios rigen cualquier proyecto que use BrianSpec. Son aplicables independientemente del tipo de proyecto (web-app, automatización, skill de IA) y del stack tecnológico elegido.

### P1 — La spec es la fuente de verdad

Nada se construye sin una spec aprobada. Nada en una spec se incumple sin actualizarla antes. La spec es el contrato entre quien define el qué y quien ejecuta el cómo: cuando el contrato y la realidad divergen, lo correcto es actualizar el contrato — nunca asumir que la divergencia es aceptable.

### P2 — No inferir, preguntar

Ante cualquier ambigüedad, el agente se detiene y pregunta con opciones argumentadas. Una pregunta a tiempo cuesta segundos; una suposición errónea cuesta horas de refactor o un bug en producción. Las preguntas se formulan con alternativas justificadas, no en abierto — el responsable de vertical responde con "la A" o "la B", no con un párrafo de contexto adicional.

### P3 — Agnosticidad al stack

El sistema no depende de ningún lenguaje, framework, base de datos, plataforma de despliegue ni proveedor cloud específico. Cada proyecto declara su stack en `PROJECT-CONSTITUTION.md` y lo justifica allí. La Constitution global y los archivos del sistema (`BRIAN.md`, `AGENTS.md`, `EXECUTION-GUIDE.md`) nunca referencian tecnologías concretas. Esto garantiza que el mismo sistema funcione igual de bien en una web Next.js, una automatización n8n o una skill de Claude.

### P4 — Un agente, una responsabilidad

No se mezclan roles de diseño, implementación y revisión en un mismo agente. SPEC-AGENT redacta specs y no implementa. Los agentes de construcción ejecutan specs y no las modifican. REVIEW-AGENT verifica y no corrige código. SECURITY-AGENT señala riesgos y no decide compensaciones de negocio. Esta separación es lo que permite que un fallo en una capa no contamine las demás.

### P5 — Revisión humana obligatoria

Toda spec aprobada y toda implementación pasan por revisión humana antes de avanzar de fase. Ningún agente cierra el ciclo sin que un humano haya validado explícitamente que el resultado es aceptable. La revisión humana no es una formalidad: es el punto donde el conocimiento de negocio, el criterio editorial y la intuición acumulada del equipo entran en el sistema. Los agentes aceleran el trabajo, pero la decisión final sigue siendo humana.

### P6 — Verificación contra criterios de aceptación

La revisión evalúa criterio por criterio (CA-01, CA-02, CA-03...), no el código en general. Cada CA tiene un estado verificable: ✅ cumple, ❌ no cumple, ⚠️ cumple parcialmente. Un CA en ❌ bloquea el merge sin excepciones. Esta práctica obliga a que las specs tengan criterios verdaderamente verificables — si un CA no se puede evaluar con un sí/no, está mal escrito y la spec vuelve a redacción.

### P7 — Trazabilidad completa

Cada commit referencia su spec. Cada spec implementada se archiva, no se borra. La trazabilidad permite responder en cualquier momento futuro tres preguntas críticas: por qué se construyó algo, qué criterios cumplía cuando se aprobó, y qué decisiones se tomaron en el camino. Una spec archivada es contexto para futuras specs — el sistema aprende de sí mismo.

### P8 — Acelera, no frena

BrianSpec existe para que los developers construyan más rápido y mejor — no para añadir burocracia. Si una práctica añade fricción sin valor proporcional al riesgo que mitiga, se cuestiona. Las plantillas son ligeras, los pasos son los mínimos necesarios, los archivos viven donde la herramienta los espera. Cuando una decisión se debate, el desempate es siempre el mismo: ¿esto ayuda al developer a entregar antes y mejor, o solo añade ceremonia?

### P9 — Tests donde aportan valor, no por ritual

Los tests automatizados son obligatorios cuando aportan valor real (regresiones, lógica crítica, flujos de usuario completos) y opcionales cuando no (workflows de automatización con UI propia, prototipos exploratorios, scripts puntuales). Cada tipo de proyecto define en sus templates qué tests tienen sentido. La regla no es "todo testeado" ni "nada testeado" — es "testeado lo que protege la entrega futura".

### P10 — Specs en español, comandos en inglés

Las specs, los criterios de aceptación, las preguntas de clarificación y las descripciones de tareas se redactan en español. Los comandos del sistema (`/brianspec.define`, `/brianspec.plan`, `/brianspec.build`, `/brianspec.review`, `/brianspec.close`, `/brianspec.amend`) se mantienen en inglés. Esta decisión refleja la realidad operativa de Immoral: el equipo trabaja en español, las reuniones se transcriben en español, los responsables de vertical leen specs en español. Los comandos en inglés mantienen coherencia con el ecosistema de skills de Brian y con cualquier IDE o copiloto del mercado.

### P11 — Adaptable al entorno del developer

El sistema se adapta a la herramienta de IA que use cada developer — Claude Code, Codex, Gemini CLI, Cursor u otras — en el momento de inicializar un proyecto. Cada herramienta espera sus archivos de contexto en convenciones distintas (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.cursorrules` y variantes futuras): al clonar el template, el sistema pregunta qué herramienta se usará y genera la estructura adecuada para ese entorno, manteniendo intacto el núcleo de BrianSpec subyacente. La mecánica concreta de cómo se ejecuta este bootstrap se especifica en `BRIAN.md` y `EXECUTION-GUIDE.md`. Este principio refuerza P3 (agnosticidad al stack): BrianSpec no es solo agnóstico al stack del proyecto, también al entorno del developer que lo construye.

---

## 3. Lo que BrianSpec NO es

Esta sección existe para cortar malentendidos típicos antes de que generen fricción.

- **BrianSpec no es una metodología de gestión de proyecto.** No reemplaza a ClickUp, Jira, Asana ni cualquier otra herramienta de tracking. La gestión de tareas, tiempos, asignaciones y estados vive donde el equipo ya la tiene. BrianSpec se ocupa exclusivamente del *qué se construye y cómo se construye*, no del *quién lo hace y cuándo*.

- **BrianSpec no es un IDE ni una herramienta de IA.** Es un sistema de trabajo que funciona dentro del IDE o herramienta de IA que cada developer prefiera. No impone editor, copiloto ni modelo.

- **BrianSpec no impone tecnologías.** Cada proyecto declara su stack libremente en `PROJECT-CONSTITUTION.md`. El sistema no opina sobre lenguajes, frameworks, bases de datos ni servicios cloud.

- **BrianSpec no aplica solo a desarrollo web.** Aplica a cualquier tipo de proyecto que produzca software ejecutable: webs, apps, automatizaciones de workflow, skills de IA, scripts internos. Lo que cambia entre tipos es el conjunto de agentes activos y la plantilla de spec, no los principios.

- **BrianSpec no es un sustituto del criterio humano.** Los agentes aceleran el trabajo y validan automáticamente lo que es validable. Las decisiones de negocio, las concesiones de scope y la aprobación final siguen siendo humanas.

---

## 4. Reglas de Enmienda de la Constitution

Esta Constitution es inmutable en el día a día — ningún proyecto puede modificarla unilateralmente. Pero el sistema reconoce que con el tiempo aparecerán aprendizajes que justifiquen actualizarla. Para que esa actualización no rompa la coherencia entre proyectos existentes, se rige por las siguientes reglas:

### 4.1 Quién puede proponer enmiendas

Solo Marco Sapiña (CEO de Immoral Group) o el responsable de immoralia pueden iniciar formalmente una propuesta de enmienda. Cualquier miembro del equipo puede sugerir cambios a través de ellos.

### 4.2 Cómo se propone una enmienda

Una propuesta de enmienda debe incluir:

- **Principio o sección afectada** (por ejemplo: "P9 — Tests donde aportan valor").
- **Cambio propuesto** (texto antes / texto después, o adición / eliminación).
- **Motivo del cambio** (qué problema real ha aparecido que justifica modificar la Constitution).
- **Impacto en proyectos vigentes** (qué proyectos en curso quedan afectados y cómo migran).

### 4.3 Cómo se aprueba

Las enmiendas se aprueban por consenso explícito entre Marco e immoralia. No hay votación formal — es una decisión cualitativa basada en si el cambio refuerza o debilita los principios del sistema.

### 4.4 Versionado y compatibilidad

Cada enmienda incrementa la versión de la Constitution siguiendo semántica simple:

- **Cambio mayor** (eliminación o modificación sustancial de un principio): incrementa el número entero (`1.0 → 2.0`).
- **Cambio menor** (adición de un principio nuevo, aclaración de texto, refinamiento de redacción): incrementa el decimal (`1.0 → 1.1`).

Los proyectos existentes siguen operando bajo la versión de Constitution con la que se crearon hasta que decidan explícitamente migrar. Cada `PROJECT-CONSTITUTION.md` declara en su cabecera qué versión de la Constitution global hereda — por ejemplo, *"Hereda de BRIANSPEC-CONSTITUTION.md v1.0"*. Esto garantiza que un cambio en la Constitution global no rompe proyectos en curso sin aviso.

### 4.5 Archivo histórico

Las versiones anteriores de esta Constitution se conservan en `/constitution/history/` con su número de versión y fecha de vigencia. Nunca se sobrescriben — son parte de la trazabilidad del sistema.

---

## 5. Versionado y Firma

**Versión actual:** 1.0
**Fecha de vigencia:** 2026-05-31
**Autores:** Julián (immoralia) con visión de Marco Sapiña (CEO de Immoral Group)
**Próxima revisión planificada:** Al cerrar Fase 1 del roadmap BrianSpec, antes de Fase 2 (presentación al equipo).

Cualquier `PROJECT-CONSTITUTION.md` que herede de esta versión debe declararlo así en su cabecera:

```
Hereda de: BRIANSPEC-CONSTITUTION.md v1.0
```

---

*BrianSpec — Sistema de Spec-Driven Development de Immoral Group*
*Constitution v1.0 — Mayo 2026*
