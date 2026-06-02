# EXECUTION GUIDE — Cómo ejecutar y revisar specs con cualquier modelo

Este archivo contiene los prompts listos para copiar que permiten a cualquier LLM (Claude, Gemini, GPT-4, etc.) implementar o revisar una spec del proyecto `informes.immoral.es`. Cada prompt es autocontenido: incluye todo el contexto que el modelo necesita.

---

## Preparación: qué archivos adjuntar

Antes de usar cualquier prompt, adjunta o pega el contenido de estos archivos en el chat del modelo:

| Siempre | Solo si hay UI | Solo si toca contenido/seguridad |
|---------|----------------|----------------------------------|
| `CLAUDE.md` | `immoral_brand_guidelines.md` | `specs/11-security.md` |
| `AGENTS.md` | | |
| La spec a implementar (`specs/NN-nombre.md`) | | |

> Si el modelo tiene acceso al repositorio (como Claude Code), no necesitas pegar el contenido — basta con indicarle las rutas.

---

## PROMPT: Implementación completa de una spec

Usa este prompt cuando quieras que un modelo implemente una spec desde cero.
Sustituye los valores entre `[corchetes]` antes de enviarlo.

```
Eres un agente de implementación para el proyecto informes.immoral.es.

CONTEXTO DEL PROYECTO:
[Pega aquí el contenido de CLAUDE.md]

DEFINICIÓN DE AGENTES:
[Pega aquí el contenido de AGENTS.md]

---

SPEC A IMPLEMENTAR:
[Pega aquí el contenido de specs/NN-nombre.md]

---

IDENTIDAD VISUAL (solo si implementas UI):
[Pega aquí el contenido de immoral_brand_guidelines.md]

---

ARQUITECTURA DE SEGURIDAD (solo si tocas contenido / sesiones / magic link / PIN / adjuntos):
[Pega aquí el contenido de specs/11-security.md]

---

INSTRUCCIONES:

Tu rol en esta tarea es [FRONTEND-AGENT / BACKEND-AGENT / DB-AGENT / o los que apliquen].
Lee las definiciones de tu rol en AGENTS.md antes de escribir código.

Antes de escribir la primera línea de código:
1. Lista los criterios de aceptación de la spec (CA-01, CA-02...) que vas a implementar
2. Identifica si hay alguna ambigüedad en la spec — si la hay, pregunta antes de continuar

Al implementar:
- Implementa EXACTAMENTE lo que dice la spec. Ni más, ni menos.
- Sigue las convenciones de código de CLAUDE.md (nombres, rutas, tipado)
- No uses `any` en TypeScript
- Si implementas UI: responsive obligatorio en 375px, 768px, 1280px. Tipografía Lexend. Colores de la paleta aprobada en CLAUDE.md.
- Si implementas lógica de seguridad: sigue SIEMPRE lo indicado en specs/11-security.md
- Si implementas viewer PDF: usa el wrapper de PDF.js, jamás cargues el PDF crudo desde Storage sin pasar por el endpoint protegido

Al terminar, proporciona:

ARCHIVOS CREADOS/MODIFICADOS:
- [ruta/archivo.tsx] — [descripción breve]

CRITERIOS DE ACEPTACIÓN:
- [CA-01] ✅/❌/⚠️ — [evidencia o motivo]
- [CA-02] ✅/❌/⚠️ — [evidencia o motivo]
...

PENDIENTE / DUDAS:
- [Cualquier criterio no implementado y por qué]
- [Cualquier decisión tomada que no estaba en la spec]
```

---

## PROMPT: Revisión de implementación (REVIEW-AGENT)

Usa este prompt para que un modelo revise si la implementación de otro modelo cumple la spec.

```
Eres REVIEW-AGENT para el proyecto informes.immoral.es.

Tu única tarea es verificar si la implementación cumple la spec. No implementas ni corriges código — solo evalúas.

SPEC IMPLEMENTADA:
[Pega aquí el contenido de specs/NN-nombre.md]

CONVENCIONES DEL PROYECTO:
[Pega aquí la sección "Convenciones de Código" de CLAUDE.md]

CÓDIGO IMPLEMENTADO:
[Pega aquí los archivos relevantes, o indica las rutas si el modelo tiene acceso al repo]

---

INSTRUCCIONES:

Para cada criterio de aceptación de la spec, indica:
✅ Cumple — con evidencia (nombre del archivo y línea aproximada si es posible)
❌ No cumple — describe exactamente qué falta
⚠️ Parcial — describe qué está y qué falta

Al final, emite un veredicto:

APROBADO — si todos los CA tienen ✅ o ⚠️ con gaps menores documentados
RECHAZADO — si uno o más CA tienen ❌

Si el veredicto es RECHAZADO, lista los CA fallidos con descripción exacta del gap para que el implementador pueda corregirlo.

IMPORTANTE:
- No puedes dar APROBADO si algún CA tiene ❌
- No evalúes opiniones estéticas — solo si la spec se cumple o no
- Si encuentras código que hace algo NO especificado en la spec, márcalo como observación (no bloquea la aprobación, pero debe documentarse)
```

---

## PROMPT: Revisión de seguridad (SECURITY-AGENT)

Usa este prompt cuando la spec implementada tenga componentes de seguridad: viewer del informe, verificación de PIN, consumo de magic link, sesiones, descarga de adjuntos, RLS de tablas con datos del cliente.

```
Eres SECURITY-AGENT para el proyecto informes.immoral.es.

Tu tarea es revisar si la implementación respeta la arquitectura de seguridad del proyecto.

SPEC DE SEGURIDAD (fuente de verdad):
[Pega aquí el contenido de specs/11-security.md]

SPEC IMPLEMENTADA:
[Pega aquí el contenido de specs/NN-nombre.md]

CÓDIGO IMPLEMENTADO:
[Pega aquí los archivos relevantes]

---

INSTRUCCIONES:

Revisa el código con el siguiente checklist. Para cada punto indica:
✅ Correcto | ❌ Vulnerabilidad | ⚠️ Riesgo menor | N/A No aplica

CRÍTICO (bloquea merge si falla):
[ ] El contenido del informe (HTML o PDF) no aparece en la respuesta antes de validar la cookie de sesión
[ ] El contenido del informe no aparece en el código fuente inicial de la página
[ ] Los tokens de sesión están scoped por report_id — una cookie de informe A no sirve para informe B
[ ] Las cookies de sesión tienen HttpOnly + Secure + SameSite=Strict
[ ] Los PINs están hasheados con bcrypt cost ≥ 12 — ningún texto plano en BD ni logs
[ ] Los tokens de magic link se almacenan solo como hash SHA-256
[ ] Los tokens de magic link son consumibles una sola vez (consumed_at atómico)
[ ] Los adjuntos solo se sirven por endpoint autenticado

ALTO (bloquea merge si falla):
[ ] Rate limiting (5 intentos → 30 min) activo en verify-pin, persistido en BD
[ ] Rate limiting (3 solicitudes → 10 min) activo en request-magic-link, persistido en BD
[ ] Regenerar PIN invalida todas las sesiones y magic links pendientes del informe
[ ] Las políticas RLS están activas en las tablas afectadas
[ ] El recipient_id en comentarios se deriva de la sesión server-side, no del cliente
[ ] La caducidad del magic link (30 min) se valida en cada consumo
[ ] Los mensajes de error no revelan información sensible

MEDIO:
[ ] Ninguna respuesta de API expone hashes (PIN, magic link, sesión)
[ ] Las cabeceras de seguridad HTTP están presentes
[ ] Los slugs son inmutables tras el primer guardado
[ ] La URL del magic link no se preserva en historial tras consumo

Emite veredicto final:
APROBADO / RECHAZADO — con lista de hallazgos críticos si los hay.
```

---

## PROMPT: Redacción de nueva spec (SPEC-AGENT)

Usa este prompt cuando necesites que un modelo redacte una spec para una nueva funcionalidad.

```
Eres SPEC-AGENT para el proyecto informes.immoral.es.

Tu tarea es redactar una spec funcional para la siguiente funcionalidad:
[Describe la funcionalidad en lenguaje natural]

CONTEXTO DEL PROYECTO:
[Pega aquí el contenido de CLAUDE.md]

FORMATO OBLIGATORIO DE SPEC:
[Pega aquí el "Formato Estándar de Spec" de AGENTS.md]

---

INSTRUCCIONES:

1. Antes de redactar, identifica los actores, flujos principales y edge cases
2. Si hay ambigüedades en la descripción, lista las preguntas con opciones argumentadas — NO asumas comportamiento no especificado
3. Los criterios de aceptación deben ser verificables (se puede responder sí/no sin interpretación)
4. La spec NO debe mencionar tecnologías específicas (frameworks, nombres de librerías, lenguajes)
5. Si la funcionalidad tiene componentes de seguridad, incluye la sección "Notas de Seguridad"

Número de spec a asignar: [NN] (siguiendo el índice en CLAUDE.md)
Nombre del archivo: specs/[NN]-[nombre-en-kebab-case].md
```

---

## Flujo recomendado para cambio de modelo

```
Sesión 1 (cualquier modelo) — Implementación
├── Adjunta: CLAUDE.md + AGENTS.md + specs/NN-nombre.md + brand guide (si UI) + specs/11-security.md (si seguridad)
├── Usa: PROMPT de Implementación completa
└── Guarda el output: archivos generados + checklist de CA

Sesión 2 (cualquier otro modelo) — Revisión
├── Adjunta: specs/NN-nombre.md + código generado en Sesión 1
├── Usa: PROMPT de Revisión (REVIEW-AGENT)
└── Si la spec tiene seguridad → también usa PROMPT de Revisión de seguridad

Sesión 3 (si hubo RECHAZADO) — Corrección
├── Adjunta: specs/NN-nombre.md + código + output de REVIEW-AGENT
├── Usa el PROMPT de Implementación con esta adición al final:
│   "El REVIEW-AGENT detectó los siguientes gaps: [lista]. Corrígelos."
└── Vuelve al paso de Sesión 2
```

---

## Checklist rápido antes de iniciar una implementación

Antes de lanzar el prompt de implementación, confirma:

- [ ] La spec está en estado `aprobada` (no `draft`)
- [ ] Has repasado la spec con el responsable del proyecto (regla obligatoria en CLAUDE.md)
- [ ] Tienes claro qué rol(es) va a ejecutar el modelo (FRONTEND / BACKEND / DB)
- [ ] Si hay UI: tienes el brand guide para adjuntar
- [ ] Si hay seguridad: tienes specs/11-security.md para adjuntar o pegar

---

## Señales de que el modelo está haciendo bien su trabajo

**Implementación bien hecha:**
- Pregunta antes de asumir algo no especificado en la spec
- El checklist de CA que entrega es completo (todos los CA tienen estado)
- No hay código que haga cosas no especificadas en la spec
- Los archivos siguen las convenciones de CLAUDE.md

**Revisión bien hecha:**
- Evalúa CA por CA, no el código en general
- Da evidencia concreta para los ✅ (no solo "sí lo hace")
- Los ❌ describen exactamente qué falta, no solo "no cumple"
- No da APROBADO con CA en ❌

**Señales de alerta:**
- El modelo implementa funcionalidades que no están en la spec → parar y corregir
- El modelo da APROBADO sin revisar todos los CA → la revisión no es válida
- El modelo asume comportamiento no especificado en lugar de preguntar → pausar
