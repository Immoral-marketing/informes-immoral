# SPEC-34: Fixes Post-Implementación SPEC-23 (Flujos de Creación)

**Versión:** 1.0
**Estado:** draft
**Tipo:** fix-spec (documenta cambios sobre lo implementado en [`23-creation-flows-and-nav.md`](23-creation-flows-and-nav.md); **NO** se modifica esa spec)
**Última actualización:** 2026-06-10
**Owner:** Julian
**Prioridad:** 1 (bloquea UX básica)

---

## Descripción

Registro de los arreglos a aplicar tras la implementación de SPEC-23 (flujos de creación rápida y navegación). El bug principal detectado en producción es un 404 al redirigir a `/espacios/{spaceId}` justo después de crear un cliente: el espacio se crea correctamente pero la navegación inmediata llega antes de que el Server Component tenga datos disponibles, o la ruta no existe / tiene un error al cargar datos en ese instante.

---

## Actores

- **Empleado / Admin:** crea un cliente y espera llegar al espacio listo para subir un informe.
- **Sistema:** crea el cliente y el espacio, y redirige correctamente.

---

## Cambios a Aplicar

### 34.1 — Fix: 404 al redirigir a `/espacios/{spaceId}` tras crear cliente

**Síntoma:** Al crear un cliente desde cualquier punto de entrada (navbar, dashboard, lista `/clientes`), el sistema redirige a `/espacios/{spaceId}` y aparece un 404. Si el usuario navega manualmente al mismo URL poco después, la página carga correctamente.

**Causa probable a investigar (en orden):**
1. La ruta `/espacios/[id]` no existe como ruta de Next.js y la redirección falla (ruta eliminada o renombrada en SPEC-31 sin actualizar SPEC-23).
2. La ruta existe pero el Server Component lanza un error al leer datos de un espacio recién creado (race condition entre insert y select, o datos aún no replicados).
3. La redirección en `router.push('/espacios/{spaceId}')` usa un ID incorrecto o undefined.

**Fix esperado según causa:**
- Si la ruta `/espacios/[id]` fue eliminada por SPEC-31 (que elimina la pantalla de espacio del panel): actualizar `createClientWithSpace` y todos los `router.push` de SPEC-23 para redirigir a `/clientes/{clientId}` en su lugar, que es donde ahora vive la tabla plana de informes.
- Si la ruta existe pero tiene race condition: añadir manejo de `notFound()` apropiado o un pequeño reintento de carga.
- Si el ID es undefined: corregir el retorno de `createClientWithSpace` para garantizar que siempre devuelve `spaceId` válido antes de redirigir.

**Nota crítica:** SPEC-31 (ya implementada) marca `/espacios/[id]` como "página eliminada" — es muy probable que esta sea la causa. En ese caso, la redirección correcta es a `/clientes/{clientId}` donde el empleado verá la tabla de informes del cliente recién creado y podrá crear su primer informe.

---

## Criterios de Aceptación

- [ ] **CA-34.1:** Al crear un cliente desde navbar, dashboard o lista `/clientes`, la redirección post-creación NO produce un 404.
- [ ] **CA-34.2:** Tras la redirección, el empleado aterriza en una página funcional desde la que puede crear un informe para el cliente recién creado (ya sea `/clientes/{clientId}` u otra ruta válida).
- [ ] **CA-34.3:** Si la ruta de destino cambió respecto a lo que decía SPEC-23 (de `/espacios/{spaceId}` a `/clientes/{clientId}`), todos los puntos de entrada de creación de cliente usan la misma ruta de destino.
- [ ] **CA-34.4:** `pnpm build` pasa sin errores TypeScript.

---

## Modelo de Datos

No introduce tablas ni columnas nuevas.

---

## Plan de Implementación

### Arquitectura propuesta

- **FRONTEND-AGENT:** investigar qué ruta existe actualmente para el destino post-creación de cliente; actualizar todos los `router.push` de SPEC-23 para apuntar a la ruta correcta.
- **BACKEND-AGENT:** verificar que `createClientWithSpace` devuelve `clientId` y `spaceId` correctamente; añadir `spaceId` a la respuesta si no está.

### Desglose de tareas

1. Verificar si `/espacios/[id]` existe como ruta activa en el proyecto (o fue eliminada por SPEC-31).
2. Determinar la ruta de destino correcta post-creación de cliente (candidatos: `/clientes/{clientId}` o `/espacios/{spaceId}` si existe).
3. Actualizar `router.push` en todos los puntos de entrada (navbar, dashboard, lista `/clientes`) para usar la ruta correcta.
4. Verificar que `createClientWithSpace` devuelve el ID necesario para construir la ruta de destino.
5. `pnpm build` verde.

### Dependencias con otras specs

- **SPEC-23** — corrige la redirección post-creación definida en esa spec.
- **SPEC-31** — si eliminó `/espacios/[id]`, determina la ruta de destino correcta.

---

## Notas de Implementación

- Este fix no debe cambiar el comportamiento de creación de cliente/espacio — solo la redirección post-creación.
- Verificar en SPEC-31 si la página `/espacios/[id]` fue explícitamente eliminada antes de asumir que existe. El síntoma del 404 apunta fuertemente a esa causa.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-10 | Versión inicial — fix post-SPEC-23 detectado en producción. | Claude Code |
