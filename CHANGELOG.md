# CHANGELOG

Todos los cambios relevantes del sistema BrianSpec se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado sigue [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.0.0] — 2026-05-31

### Lanzamiento inicial

Primera versión funcional del sistema BrianSpec.

#### Añadido

- `BRIANSPEC-CONSTITUTION.md` v1.0 con los once principios fundacionales del sistema.
- Estructura de carpetas base del repo template.
- Tres agentes universales definidos en `.brianspec/agents.md`: SPEC-AGENT, REVIEW-AGENT, SECURITY-AGENT.
- Checklists de seguridad por tipo de proyecto en `.brianspec/security-checklists.md` (web-app, automatización, skill-ia).
- Templates de spec por tipo de proyecto.
- Template de `PROJECT-CONSTITUTION.md` que cada proyecto rellena durante el bootstrap.
- Template de `agent-template.md` para que el bootstrap genere agentes de construcción adaptados a cada proyecto.
- Cuatro skills conversacionales: `brianspec-init`, `brianspec-spec`, `brianspec-build`, `brianspec-archive`.
- Soporte para herramientas de IA: Claude Code, Codex, Gemini CLI, Cursor (vía P11 — Adaptable al entorno del developer).

#### Notas

- Esta versión es la base mínima funcional. Los archivos no críticos (convenciones de Git, integración detallada con ClickUp, ejemplos por tipo de proyecto) se añadirán en versiones siguientes a partir del uso real del sistema.
- El primer proyecto que se construirá con BrianSpec es MeetFlow, que también servirá como primer caso documentado en `/examples/`.
