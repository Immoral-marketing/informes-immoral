# PROJECT-CONSTITUTION.md

**Proyecto:** {{PROJECT_NAME}}
**Versión de Constitution del proyecto:** 1.0
**Hereda de:** BRIANSPEC-CONSTITUTION.md v1.0
**Última actualización:** {{DATE}}
**Owner del proyecto:** {{OWNER}}

> Este archivo se genera automáticamente por la skill `brianspec-init` durante el bootstrap del proyecto. Define las decisiones fundacionales específicas de este proyecto. Hereda y complementa los principios globales de `BRIANSPEC-CONSTITUTION.md` — nunca los contradice.

---

## 1. Descripción del proyecto

**Tipo de proyecto:** {{PROJECT_TYPE}}
*(web-app | automatización | skill-ia | otro: especificar)*

**Qué problema resuelve:**
{{PROBLEM_STATEMENT}}

**Actores principales:**
{{ACTORS}}

**Alcance del MVP:**
{{MVP_SCOPE}}

**Fuera de alcance (explícito):**
{{OUT_OF_SCOPE}}

---

## 2. Stack tecnológico

### Lenguajes y runtime

{{LANGUAGES_RUNTIME}}

### Frameworks y librerías principales

{{FRAMEWORKS}}

### Servicios y plataformas

{{SERVICES_PLATFORMS}}

### Justificación del stack

{{STACK_RATIONALE}}

---

## 3. Integraciones externas

### Skills externas

Skills del ecosistema Immoralia o de terceros que este proyecto consume:

{{EXTERNAL_SKILLS}}

### MCPs (Model Context Protocol)

Servidores MCP que la herramienta de IA usa dentro de este proyecto:

{{MCPS}}

### APIs de terceros

Servicios externos a los que el proyecto se conecta:

{{THIRD_PARTY_APIS}}

---

## 4. Herramienta de IA principal

**Copiloto declarado:** {{AI_TOOL}}
*(Claude Code | Codex CLI | Gemini CLI | Cursor | otro)*

**Archivos de contexto generados para esta herramienta:**

{{AI_TOOL_FILES}}

---

## 5. Agentes de construcción de este proyecto

Los agentes universales (SPEC, REVIEW, SECURITY) vienen del sistema BrianSpec y operan en cualquier proyecto. Los siguientes agentes de construcción son específicos de este proyecto y viven en `/agents/`:

{{CONSTRUCTION_AGENTS}}

---

## 6. Convenciones de código

### Nomenclatura

{{NAMING_CONVENTIONS}}

### Estructura de archivos

{{FILE_STRUCTURE}}

### Estilo

{{CODE_STYLE}}

### Tests

{{TESTING_CONVENTIONS}}

---

## 7. Modelo de datos

{{DATA_MODEL}}

*(Si aplica. Para proyectos sin base de datos, marcar como "No aplica" con justificación.)*

---

## 8. Convenciones operativas

### Git

- **Naming de ramas:** {{BRANCH_NAMING}}
- **Convención de commits:** {{COMMIT_CONVENTION}}
- **Política de PRs:** {{PR_POLICY}}

### Despliegue

{{DEPLOYMENT}}

### Variables de entorno

{{ENV_VARIABLES}}

---

## 9. Restricciones específicas del proyecto

Restricciones técnicas, de negocio, de seguridad o de cumplimiento que aplican solo a este proyecto:

{{PROJECT_CONSTRAINTS}}

---

## 10. Cómo aplica BrianSpec a este proyecto

### Comandos disponibles

- `brianspec-spec` → Generar/clarificar specs nuevas
- `brianspec-build` → Implementar specs con revisión automática
- `brianspec-archive` → Cerrar y archivar specs implementadas

### Umbral para spec

Sigue lo definido en `BRIANSPEC-CONSTITUTION.md` (P1). En este proyecto, **requiere spec** todo cambio que:

- Afecte al usuario final o introduzca comportamiento nuevo
- Modifique el modelo de datos
- {{PROJECT_SPECIFIC_SPEC_TRIGGERS}}

**NO requiere spec:**

- Hotfixes evidentes (typos, null checks, fixes de regression menores)
- Refactors internos sin cambio funcional
- Cambios de copy sin cambio de comportamiento
- {{PROJECT_SPECIFIC_NO_SPEC}}

### Política de tests

{{TESTING_POLICY}}

*(P9 — Tests donde aportan valor, no por ritual. Especificar qué tests son obligatorios en este proyecto.)*

---

## 11. Enmiendas a esta Constitution del proyecto

Esta Constitution del proyecto puede modificarse cuando una decisión fundacional cambie (cambio de stack mayor, cambio de owner, cambio de alcance). El cambio se versiona en el `CHANGELOG.md` del proyecto y se anuncia al equipo antes de aplicarse.

Las enmiendas al `BRIANSPEC-CONSTITUTION.md` global siguen su propio proceso, definido en su sección 4. Este proyecto no puede modificar la Constitution global.

---

*Proyecto {{PROJECT_NAME}} — Generado con BrianSpec v1.0 el {{DATE}}*
