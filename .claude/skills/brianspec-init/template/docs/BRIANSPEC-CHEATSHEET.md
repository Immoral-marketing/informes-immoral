# BrianSpec — Cheat-sheet del equipo

Guía rápida para trabajar en este proyecto con BrianSpec. Si es tu primer día, léela entera (5 minutos). Después, tenla a mano.

---

## El ciclo en una frase

> **La spec es el contrato. La IA lo ejecuta. La revisión valida que se cumple. Un humano aprueba.**

```
brianspec-spec   →   brianspec-build   →   [revisión humana]   →   brianspec-archive
(itera y aprueba)    (implementa + revisa)   (revisas el código)     (commit + push + archiva)
```

---

## Cómo unirte a un proyecto BrianSpec existente

**1. Instala BrianSpec** (una vez por máquina):
```bash
npx skills add Immoral-marketing/brianspec
```

**2. Restaura las skills del proyecto** (una vez por repo clonado):
```bash
npx skills experimental_install
```

**3. Autentica ClickUp** (una vez por máquina):
- Escribe `/mcp` en Claude Code → selecciona `clickup` → completa el login

**4. Abre el proyecto con Claude Code y di:**
> "lee el PROJECT-CONSTITUTION.md y el BRIANSPEC-CONSTITUTION.md para ponerte en contexto"

Los plugins y el MCP de ClickUp se instalaron automáticamente cuando se inicializó el proyecto con `brianspec-init`. Solo necesitas autenticar ClickUp con tu propia cuenta.

---

## Los 4 comandos y cuándo usarlos

| Skill | Para qué | Lo que dices |
|---|---|---|
| `brianspec-init` | Arranca un proyecto nuevo | "inicializa el proyecto con brianspec" — **solo una vez al crear el proyecto** |
| `brianspec-spec` | Itera una spec y la aprueba | "analizemos la SPEC-03" |
| `brianspec-build` | Implementa + revisa automáticamente | Se lanza solo tras aprobar, o "implementa la spec 03" |
| `brianspec-archive` | Commit con informe + push + archiva | "haz commit y push de la spec 03" |
| `brianspec-upgrade` | Actualiza BrianSpec y migra archivos de sistema | "actualiza brianspec" |

---

## El flujo completo spec a spec

```
1. "analizemos la SPEC-03"
   → BrianSpec lee la spec y detecta ambigüedades
   → Presenta cada una con opciones A / B / C argumentadas
   → Tú eliges. Una a la vez.
   → Cuando no quedan ambigüedades críticas: "¿aprobamos?"
   → Tú: "aprobada"
   → BrianSpec crea la tarea en ClickUp automáticamente
   → BrianSpec: "¿arranco el build?"

2. Tú: "sí"
   → Build arranca solo
   → Lee lecciones previas del proyecto (LESSONS-LEARNED.md)
   → Agentes implementan
   → REVIEW-AGENT + SECURITY-AGENT en paralelo
   → Informe consolidado

3. Revisas el código en tu IDE
   → Si todo ok: "haz commit y push de la spec 03"
   → BrianSpec hace el commit con el informe completo como mensaje
   → Push a la rama
   → Spec archivada en /specs/archive/
   → CHANGELOG actualizado
   → "¿pasamos a la SPEC-04?"
```

**Tu intervención:** elegir opciones de ambigüedad + decir "aprobada" + revisar código + confirmar merge. Todo lo demás lo hace el sistema.

---

## Reglas de oro

1. **No se construye sin spec aprobada** (P1). Si alguien pide "hazlo rápido sin spec", redirige a `brianspec-spec`.
2. **Ante la duda, opciones argumentadas — nunca inferir** (P2). El sistema presenta A/B/C, tú eliges.
3. **Un agente, una responsabilidad** (P4). Quien redacta no implementa; quien implementa no se autoaprueba.
4. **Revisión humana obligatoria** (P5). Los agentes son la primera línea, no la última.
5. **Se verifica CA por CA** (P6). Un CA en ❌ bloquea el merge. Sin excepciones.
6. **Trazabilidad total** (P7). Cada commit lleva el informe de la spec; las specs no se borran, se archivan.
7. **Acelera, no frena** (P8). Si una práctica añade fricción sin valor, se cuestiona.

---

## Estados de una spec

```
draft  →  aprobada  →  implementada (archivada)
```

- `draft` — generada en el bootstrap o en redacción. No se implementa.
- `aprobada` — un humano dijo "aprobada". Lista para `brianspec-build`. Tarea creada en ClickUp.
- `implementada` — construida, revisada, mergeada y archivada en `/specs/archive/`.

---

## ¿Necesito spec para esto?

**SÍ requiere spec:**
- Comportamiento nuevo visible para el usuario
- Cambios en el modelo de datos
- Autenticación, autorización o datos sensibles

**NO requiere spec:**
- Hotfixes evidentes (typos, null checks, regresión menor)
- Refactors internos sin cambio funcional
- Cambios de copy sin cambio de comportamiento

---

## Cómo escribir un buen CA

Debe poder responderse con **sí/no, sin interpretación**.

- ❌ "El dashboard funciona bien."
- ✅ "Dado un usuario autenticado, al abrir `/dashboard` ve sus últimas 10 operaciones ordenadas por fecha descendente en menos de 2 segundos."

Si un CA necesita "y" o "además", divídelo en dos.

---

## Dónde mirar

| Quiero saber… | Archivo |
|---|---|
| Principios del sistema | `BRIANSPEC-CONSTITUTION.md` |
| Stack, convenciones y ClickUp de este proyecto | `PROJECT-CONSTITUTION.md` |
| Flujo completo y agentes universales | `.brianspec/agents.md` |
| Errores pasados y lecciones aprendidas | `.brianspec/LESSONS-LEARNED.md` |
| Agentes de construcción de este proyecto | `/agents/` |
| Checklists de seguridad | `.brianspec/security-checklists.md` |
| Specs activas | `/specs/` |
| Specs cerradas | `/specs/archive/` |

---

## Errores típicos a evitar

- Codear "mientras tanto" sin spec aprobada → rompe P1.
- Aprobar tu propia implementación sin revisión humana → rompe P5.
- Meter cosas no pedidas en la implementación ("ya que estoy…") → lo caza REVIEW-AGENT.
- Cambiar la spec durante el build → para y vuelve a `brianspec-spec`.
- Reciclar números de spec → nunca; los huecos son aceptables (P7).
- Instalar el plugin `frontend-design@claude-plugins-official` Y la skill `frontend-design` → usar solo la skill (está en el proyecto).

---

*BrianSpec v1.2 — Sistema de Spec-Driven Development de Immoral Group.*
*Diseñado por immoralia para immoralia.*
