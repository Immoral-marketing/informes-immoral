# Security Checklists — BrianSpec

**Versión:** 1.0
**Usado por:** SECURITY-AGENT (ver `.brianspec/agents.md`).

Este archivo contiene los checklists de seguridad que SECURITY-AGENT aplica según el `tipo` declarado en `PROJECT-CONSTITUTION.md` del proyecto.

Los checklists están diseñados para ser:
- **Aplicables incluso en MVPs.** No son "nice to have de proyecto maduro".
- **Verificables.** Cada ítem se puede responder con sí/no inspeccionando código o configuración.
- **Cortos.** El objetivo es cubrir el 80% de los riesgos reales sin convertirse en una auditoría completa.

---

## Cómo se usan

1. SECURITY-AGENT identifica el tipo de proyecto en `PROJECT-CONSTITUTION.md`.
2. Carga el checklist correspondiente de este archivo.
3. Evalúa cada ítem contra la spec (durante `brianspec-spec`) o contra el código (durante `brianspec-build`).
4. Para cada ítem no cumplido, genera un hallazgo clasificado por severidad.
5. Severidad por defecto de cada ítem está indicada con su icono (🔴 CRÍTICO, 🟠 ALTO, 🟡 MEDIO, 🟢 BAJO). SECURITY-AGENT puede elevar la severidad si el contexto del proyecto lo justifica, pero no bajarla sin justificación documentada.

---

## Checklist — Tipo: web-app

Aplica a aplicaciones web con backend y/o base de datos: webs públicas, aplicaciones internas, dashboards, paneles de administración, etc.

### Autenticación y autorización

- [ ] 🔴 Todas las rutas que devuelven datos sensibles validan la sesión del usuario antes de responder.
- [ ] 🔴 La autorización se valida server-side, no se confía en el cliente para decidir qué se muestra.
- [ ] 🟠 Los tokens de sesión tienen expiración explícita y mecanismo de revocación.
- [ ] 🟠 Las contraseñas (si aplica) se almacenan con hashing fuerte (bcrypt, argon2 o equivalente), nunca en texto plano.
- [ ] 🟠 Los flujos de recuperación de contraseña no exponen información sobre si un email existe en el sistema.

### Validación de inputs

- [ ] 🔴 Todos los inputs del cliente se validan en el servidor antes de procesarse, con esquema explícito (tipo, formato, longitud, rango).
- [ ] 🔴 Las queries a base de datos usan parametrización o un ORM que la garantiza. Nada de concatenación de strings con input del usuario.
- [ ] 🟠 Los inputs que se renderizan en HTML están escapados o se renderizan en contextos que evitan XSS (frameworks modernos lo hacen por defecto, verificar que no se desactiva con `dangerouslySetInnerHTML` o equivalentes sin sanitización).
- [ ] 🟡 Los uploads de archivos validan tipo, tamaño y se almacenan fuera de rutas servidas directamente.

### Base de datos

- [ ] 🔴 Si la base de datos soporta row-level security (Supabase, PostgreSQL), todas las tablas con datos de usuarios tienen políticas RLS aplicadas y verificadas.
- [ ] 🟠 Las credenciales de la base de datos no aparecen en código fuente ni en logs.
- [ ] 🟡 Las migraciones de schema son reversibles y están en control de versiones.

### Secretos y configuración

- [ ] 🔴 Ningún secreto (API key, token, password, certificate) aparece en código fuente, commits o logs.
- [ ] 🔴 `.env` y archivos equivalentes están en `.gitignore`.
- [ ] 🟠 Las claves de servicios externos (Stripe, OpenAI, etc.) tienen scopes mínimos necesarios.

### Errores y logging

- [ ] 🟠 Los errores devueltos al cliente no exponen stacktraces ni nombres internos de tablas, columnas o estructura del sistema.
- [ ] 🟡 Los logs incluyen suficiente contexto para depurar pero no incluyen secretos, tokens, ni datos personales completos.

### Endpoints sensibles

- [ ] 🔴 Los endpoints que envían emails, hacen pagos, modifican datos de otros usuarios o ejecutan operaciones costosas tienen rate limiting.
- [ ] 🟠 Los endpoints que aceptan callbacks de servicios externos (webhooks) verifican firma o token de autenticidad antes de procesar la petición.

### Datos personales (si aplica)

- [ ] 🟠 Hay una política clara de qué datos personales se almacenan y por cuánto tiempo.
- [ ] 🟠 Existe un mecanismo para que los usuarios soliciten exportación o eliminación de sus datos (RGPD).
- [ ] 🟡 Los datos sensibles (DNI, números de tarjeta, datos médicos) se cifran en reposo o no se almacenan si no son estrictamente necesarios.

---

## Checklist — Tipo: automatización

Aplica a workflows de automatización (n8n, Make, Zapier, scripts agendados, integraciones entre servicios).

### Credenciales e integraciones

- [ ] 🔴 Las credenciales de las APIs externas (OAuth tokens, API keys) se almacenan en el gestor de credenciales de la plataforma (n8n Credentials, etc.), nunca hardcoded en el workflow.
- [ ] 🔴 Las credenciales tienen scopes mínimos necesarios para el workflow. Si solo necesita leer, no tiene permisos de escritura.
- [ ] 🟠 Si el workflow accede a varios servicios, hay un inventario claro de qué credencial se usa para qué.

### Inputs y triggers

- [ ] 🔴 Los webhooks que disparan workflows verifican la autenticidad de la petición (firma, token compartido, IP allowlist).
- [ ] 🟠 Los datos que llegan al workflow se validan antes de pasarlos a operaciones sensibles (envíos de email, llamadas a APIs, escrituras en BBDD).
- [ ] 🟡 Los workflows que reciben texto de usuarios externos (formularios, mensajes) sanean ese texto antes de incorporarlo a operaciones (prompts de IA, plantillas de email).

### Manejo de errores

- [ ] 🟠 Cada workflow tiene una rama de error que captura fallos y los notifica (Slack, email) sin exponer secretos en el mensaje.
- [ ] 🟠 Los reintentos están limitados — no hay loops infinitos posibles.
- [ ] 🟡 Los errores no se silencian sin razón documentada. Un error silenciado es deuda futura.

### Datos sensibles en tránsito

- [ ] 🔴 Si el workflow procesa datos personales o sensibles, las APIs llamadas usan HTTPS sin excepción.
- [ ] 🟠 Los logs del workflow no almacenan datos sensibles completos (números de tarjeta, contraseñas, contenido de emails). Truncar o anonimizar.

### Costes y consumo

- [ ] 🟠 Las llamadas a APIs de pago (OpenAI, servicios de email masivo, etc.) tienen límite de ejecuciones por hora/día para evitar fugas de coste por bucles inesperados.
- [ ] 🟡 Los workflows que generan tareas en sistemas externos (ClickUp, Jira) tienen mecanismo de deduplicación para no crear duplicados en re-ejecuciones.

### Documentación

- [ ] 🟠 La spec del workflow declara qué hace si la API externa devuelve error, timeout, o respuesta inesperada. No se deja al criterio del implementador.

---

## Checklist — Tipo: skill-ia

Aplica a skills de IA (Claude Skills, Custom GPTs, agentes de Cursor, prompts complejos integrados en productos).

### Prompt injection y entrada no confiable

- [ ] 🔴 La skill identifica claramente qué inputs son confiables (del usuario que invoca la skill) y cuáles vienen de fuentes no confiables (archivos descargados, contenido web, transcripciones).
- [ ] 🔴 Las instrucciones del sistema (system prompt) NO se concatenan con texto de fuentes no confiables sin demarcación clara (etiquetas, bloques separados, instrucciones explícitas de tratar el contenido como datos no como instrucciones).
- [ ] 🟠 La skill no ejecuta acciones destructivas (envío de emails, llamadas a APIs de pago, borrado de archivos) basándose únicamente en instrucciones extraídas de contenido no confiable. Requiere confirmación del usuario humano para esas acciones.

### Secretos y claves

- [ ] 🔴 Ninguna API key aparece en el prompt, en el SKILL.md, ni en los archivos auxiliares de la skill.
- [ ] 🔴 Las claves se cargan desde variables de entorno o gestor de secretos de la plataforma, nunca desde código versionado.
- [ ] 🟠 Si la skill llama a APIs de terceros, las claves usadas son de la organización, no personales — para que la rotación sea posible sin perder acceso.

### Datos sensibles en el contexto

- [ ] 🔴 La skill no envía datos personales identificables (PII) a modelos de IA externos sin que esto esté declarado en la spec y aprobado.
- [ ] 🟠 Si la skill accede a información interna (ClickUp, Slack, emails internos), valida que el usuario que la invoca tiene permisos para esa información antes de procesarla.
- [ ] 🟡 La skill no almacena conversaciones o outputs en logs persistentes sin política clara de retención.

### Outputs y acciones

- [ ] 🟠 Las acciones que la skill ejecuta (crear tarea, enviar mensaje, modificar archivo) están enumeradas en la spec. No hay acciones implícitas no documentadas.
- [ ] 🟠 Las acciones reversibles se ejecutan directamente. Las acciones irreversibles (envíos masivos, eliminaciones, transacciones financieras) muestran resumen y piden confirmación antes de ejecutarse.
- [ ] 🟡 Los outputs que se van a usar en otros sistemas (código generado, contenido publicado) se marcan como tales para que el revisor humano sepa que requiere verificación.

### Costes de inferencia

- [ ] 🟠 Las skills que pueden encadenar muchas llamadas a modelos (loops, búsquedas iterativas) tienen un límite máximo de pasos o tokens.
- [ ] 🟡 La skill documenta en su SKILL.md cuántas llamadas a IA hace en una ejecución típica, para que el equipo pueda anticipar el coste.

### Robustez

- [ ] 🟠 La skill maneja gracefully el caso "el modelo no devuelve lo esperado" (formato JSON malformado, respuesta vacía, refuso del modelo). No asume que la respuesta siempre vendrá bien estructurada.
- [ ] 🟡 La skill documenta sus assumptions sobre el modelo (versión, capacidades) y avisa si se ejecuta contra un modelo distinto al esperado.

---

## Cuándo elevar severidad

SECURITY-AGENT puede elevar la severidad de un ítem cuando:

- El proyecto procesa datos especialmente sensibles (salud, finanzas, menores, comunicaciones privadas).
- El proyecto tiene exposición pública (no es interno).
- El fallo en ese ítem habilita el incumplimiento de obligaciones legales (RGPD, PCI-DSS, etc.).
- Existe evidencia de incidente previo en proyectos similares.

Si SECURITY-AGENT eleva la severidad, debe documentar el motivo en el hallazgo:

```
🔴 CRÍTICO (elevado desde 🟠 ALTO): [descripción]
Motivo de elevación: [el proyecto procesa datos de salud / es público / etc.]
```

---

## Cuándo NO bajar severidad

SECURITY-AGENT no puede bajar la severidad por defecto de un ítem. Las únicas formas válidas de no aplicar un ítem son:

- **No aplica:** el contexto del proyecto hace que el ítem no tenga sentido (por ejemplo, "credenciales de BBDD" en un proyecto que no usa base de datos). Documentar como `N/A` con motivo.
- **Mitigado por diseño:** el riesgo no existe por la arquitectura elegida, no porque se haya parcheado. Documentar con explicación.

Si SECURITY-AGENT cree que un ítem es excesivo para un proyecto concreto, no lo decide unilateralmente — lo escala como propuesta de enmienda al checklist (ver "Reglas de Enmienda" en `BRIANSPEC-CONSTITUTION.md`).

---

*BrianSpec v1.0 — Security Checklists*
