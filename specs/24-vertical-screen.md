# SPEC-24: Pantalla de Vertical — Logo Moderado y Tabla de Clientes

**Versión:** 2.1
**Estado:** draft
**Última actualización:** 2026-06-04
**Owner:** Julian
**Tipo:** fix-spec (itera sobre [`17-screen-replication.md`](17-screen-replication.md) CA-17.2 y el detalle de vertical; la spec original NO se modifica)
**Prioridad:** 2
**Implementador previsto:** Gemini (autosuficiente; firmas y rutas verificadas contra el código vivo el 2026-06-04).

---

## Descripción

Reordena la pantalla de detalle de una vertical (`/verticales/[slug]`). Reduce el logo de la vertical (hoy a todo el ancho y centrado) a un elemento moderado arriba a la izquierda, y sustituye el grid de tarjetas de cliente por una **tabla filtrable** (con fallback a tarjetas apiladas en móvil). Quita la acción "Nuevo espacio" y la reemplaza por **"Agregar cliente a esta vertical"** (asociar un cliente existente, creando su espacio en esta vertical y redirigiendo a él).

---

## Actores

- **Empleado:** ve los espacios (clientes) de la vertical que ha creado.
- **Admin:** ve todos.

---

## Decisiones de producto (resueltas con el responsable, NO inferir)

1. **"Agregar cliente" en vez de "Nuevo espacio".** Asocia un cliente **existente** a esta vertical: autocompletar de cliente → se crea su `client_space` en esta vertical. Recordatorio del modelo: un cliente puede pertenecer a varias verticales (un espacio por vertical), así que "agregar cliente" = crear un espacio de ese cliente aquí. Crear un cliente *nuevo* no es parte de esta pantalla (eso es el flujo de la spec 23).
2. **Tras agregar → ir al nuevo espacio.** Al asociar un cliente, se crea el espacio y se redirige a `/espacios/{spaceId}` (coherente con la spec 23). Si el cliente **ya** tiene espacio en esta vertical, no se duplica: se informa y se ofrece un enlace para ir a su espacio existente.
3. **Tabla en escritorio, tarjetas en móvil.** A partir de `sm` se muestra una `Table`; por debajo de `sm` se muestran tarjetas apiladas (reutilizando el layout de tarjeta actual). El filtro de texto aplica a ambos.
4. **Paginación en cliente, 20 por página.** La página carga todos los espacios de la vertical en **una sola query** (magra: solo columnas usadas) y la paginación + el filtro de texto se resuelven **en memoria** (cero llamadas adicionales al buscar o cambiar de página). Justificación (objetivos del responsable): minimiza las llamadas al servidor (1 query total vs. una por página/búsqueda/`count`) y no penaliza tiempos de interacción (búsqueda y cambio de página instantáneos, sin round-trip). El coste —payload inicial— se acota con la query magra. **Umbral de migración:** si una vertical llegara a superar ~500 espacios, migrar SOLO esta pantalla a paginación server-side (`.range()` + `ilike` + `count`); documentar si se alcanza.

---

## Inventario de artefactos reutilizables (VERIFICADO contra el código)

### Existentes
- **Página:** `src/app/(panel)/verticales/[slug]/page.tsx` (Server Component). Hoy carga `verticals` (id, name, slug, logo_url, color_hex), firma el logo con `getSignedLogoUrl`, y los `client_spaces` de la vertical con `clients(...)` y `client_recipients` (email primario). Filtra `created_by` para no-admin. **No carga recuento de informes** (a añadir).
- **Cliente:** `src/app/(panel)/verticales/[slug]/VerticalDetailClient.tsx`. Hoy: header con logo grande centrado (`h-20 sm:h-24`, `items-center`), buscador client-side (filtra por client_name/contact_name/contact_email), botón "Nuevo espacio" que abre `QuickCreateModal`, y grid de tarjetas (`sm:grid-cols-2 xl:grid-cols-3`).
- **`getSignedLogoUrl(path: string): Promise<string | null>`** en `src/app/(panel)/admin/verticales/actions.ts`.
- **`createSpace(clientId: string, verticalId: string, clientName: string)`** en `src/app/(panel)/espacios/actions.ts` → `{ success: true; id: string; slug: string } | { error: string }`. Valida duplicado por vertical y resuelve slug. Re-verifica creador∨admin del cliente.
- **Componente `Table`** y subcomponentes en `src/components/ui/table.tsx`: `Table, TableHeader, TableBody, TableHead, TableRow, TableCell` (el `Table` ya envuelve en `div.overflow-auto`).
- **`Card`, `Button`, `Input`, `Dialog`** en `src/components/ui/`.

### Provistos por la spec 23 (dependencia)
- **`ClientAutocomplete`** (`src/components/shared/ClientAutocomplete.tsx`) — `Input` + lista filtrada; props `{ onSelect, onNoMatch?, placeholder? }`. Reutilizar aquí para "Agregar cliente".
- **`searchClients(query: string)`** (`src/app/(panel)/clientes/actions.ts`) — rol-aware (`created_by` para no-admin). Devuelve `{ id; name }[]`.

> Si la spec 23 aún no estuviera implementada al empezar la 24, implementar un autocompletar mínimo equivalente aquí y unificar después. La 23 va antes en el plan, así que normalmente ya existirá.

---

## Flujos Principales

### Flujo 1: Cabecera con logo moderado
1. El usuario entra a `/verticales/[slug]`.
2. La cabecera muestra, **en una fila alineada a la izquierda**: el logo de la vertical en tamaño moderado (alto ~`h-10`/`h-12`, no a todo el ancho) y, a su lado, el **nombre de la vertical** visible (ya no `sr-only`) + el subtítulo. Se conserva el acento de color de la vertical (barra/punto).
3. Si la vertical no tiene logo, fallback a la inicial coloreada, también moderada y a la izquierda.

### Flujo 2: Tabla de clientes filtrable (escritorio) / tarjetas (móvil)
1. Bajo la cabecera, un `Input` de búsqueda (icono `Search`) filtra client-side por **nombre de cliente, persona de contacto y email** (case-insensitive) — misma lógica que el `filtered` actual.
2. **`sm` y superior:** `Table` con columnas:
   - **Cliente** (`client_name`)
   - **Contacto** (`contact_name`, o "—")
   - **Email** (`contact_email`, o "—")
   - **Teléfono** (`contact_phone`, o "—")
   - **Informes** (recuento, número)
   - **Acción**: botón/enlace "Ver informes" → `/espacios/{spaceId}`
   - (WhatsApp se omite en la tabla por espacio; sigue visible en el espacio del cliente.)
3. **Por debajo de `sm`:** tarjetas apiladas (una por espacio) reutilizando el layout de `Card` actual (con iconos `User`/`Mail`/`Phone` y botón "Ver informes"), añadiendo el recuento de informes.
4. Estados: vertical sin espacios → empty state con CTA "Agregar cliente a esta vertical"; filtro sin resultados → "Sin coincidencias".
5. **Paginación (cliente, 20/página):** sobre el array ya filtrado se muestran 20 filas por página. Controles simples: "Anterior" / "Siguiente" + indicador "Página X de Y" (o navegación numerada si se prefiere). Al cambiar el texto del buscador, la página se **resetea a 1**. Si el total filtrado ≤ 20, no se muestran controles de paginación. Aplica igual a tabla (`sm+`) y a tarjetas (móvil).

### Flujo 3: Agregar cliente a la vertical
1. El usuario pulsa **"Agregar cliente a esta vertical"** (sustituye a "Nuevo espacio").
2. Se abre un `Dialog` con `ClientAutocomplete` (clientes visibles para el usuario vía `searchClients`).
3. Al seleccionar un cliente `c`:
   - Si `c.id` **ya está** entre los espacios cargados de esta vertical (`spaces.some(s => s.client_id === c.id)`) → mostrar mensaje "{c.name} ya está en esta vertical" + botón "Ir a su espacio" (`/espacios/{spaceExistente.id}`). No se llama a `createSpace`.
   - Si no → `createSpace(c.id, vertical.id, c.name)`; si `success` → `router.push('/espacios/{id}')`; si `error` → mostrar el error en el diálogo.

---

## Flujos Alternativos / Edge Cases

- **Vertical sin clientes:** empty state con CTA "Agregar cliente a esta vertical".
- **Cliente ya asociado:** no se duplica (la comprobación client-side evita la llamada; `createSpace` además lo rechazaría en servidor). Se ofrece ir a su espacio existente.
- **Logo ausente:** fallback a inicial coloreada, moderada y a la izquierda.
- **No-admin:** la página ya filtra `created_by`; `searchClients` también. Solo ve/asocia sus propios clientes.
- **Recuento de informes:** se obtiene con el agregado `reports(count)` en el `select` de la página (patrón de `ClientesClient`); si el join resultara problemático, hacer una query agregada aparte por `space_id`. No debe romper la carga de la tabla; si falta, mostrar `0`.
- **autocompletar sin resultados:** en esta pantalla NO se crea cliente nuevo (eso es spec 23). Mostrar "Sin clientes. Crea uno desde «Nuevo cliente»" (sin acción inline de creación aquí).

---

## Criterios de Aceptación

- [ ] CA-24.1: En `/verticales/[slug]` el logo aparece **arriba a la izquierda, tamaño moderado** (no a todo el ancho ni centrado), con el **nombre de la vertical visible** a su lado y el acento de color conservado.
- [ ] CA-24.2: En `sm` y superior, los clientes se muestran en una `Table` con columnas Cliente, Contacto, Email, Teléfono, Informes (recuento) y acción "Ver informes".
- [ ] CA-24.3: Por debajo de `sm`, los clientes se muestran como **tarjetas apiladas** (no tabla con scroll), con el recuento de informes y botón "Ver informes".
- [ ] CA-24.4: El buscador filtra (tabla y tarjetas) por nombre de cliente, contacto y email (case-insensitive); sin resultados → "Sin coincidencias".
- [ ] CA-24.5: "Nuevo espacio" se sustituye por **"Agregar cliente a esta vertical"**, que asocia un cliente existente vía `ClientAutocomplete` + `createSpace`.
- [ ] CA-24.6: Al agregar un cliente nuevo a la vertical se **redirige a `/espacios/{spaceId}`**; si el cliente ya estaba asociado, **no se duplica** y se ofrece ir a su espacio existente.
- [ ] CA-24.7: La página carga el **recuento de informes** por espacio y se muestra en tabla y tarjetas.
- [ ] CA-24.8: La lista pagina **20 por página en cliente** (sobre el resultado filtrado), con controles "Anterior/Siguiente" + "Página X de Y"; el cambio de búsqueda resetea a página 1; sin controles si hay ≤20 resultados.
- [ ] CA-24.9: La carga de datos es **una sola query** (sin llamadas adicionales al buscar o paginar) y trae solo las columnas usadas por la tabla.
- [ ] CA-24.10: `QuickCreateModal` ya no se usa en esta pantalla (import eliminado).
- [ ] CA-24.11: Responsive 375 / 768 / 1280 (tarjetas en móvil, tabla en `sm+`).
- [ ] CA-24.12: `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

No introduce tablas ni columnas nuevas. Lectura de `verticals`, `client_spaces`, `clients`, `client_recipients` (email primario), `reports` (recuento por `space_id`). Inserción en `client_spaces` vía `createSpace` para "Agregar cliente".

---

## UI / Páginas Afectadas

### `src/app/(panel)/verticales/[slug]/page.tsx`
- Añadir al `select` de `client_spaces` el agregado de informes: `... , reports(count)`.
- Mapear `reports_count` (`s.reports?.[0]?.count ?? 0`) y `client_id` (`s.clients?.id`) en `formattedSpaces`.
- Ampliar el tipo del cast y el shape pasado a `VerticalDetailClient` (añadir `client_id: string` y `reports_count: number` a cada space).
- **Query magra:** seleccionar solo lo que la tabla usa. Mantener la extracción de email primario (ya existente), pero no añadir columnas ni joins que no se rendericen. El objetivo es 1 sola query barata que soporte filtro+paginación en cliente.

### `src/app/(panel)/verticales/[slug]/VerticalDetailClient.tsx`
- **Header:** reemplazar el bloque centrado (`p-8 sm:p-10 flex flex-col items-center`) por una fila a la izquierda con logo moderado (`h-10`/`h-12`) + nombre visible + subtítulo; conservar el acento de color (barra lateral o punto).
- **Interfaz `Space`:** añadir `client_id: string` y `reports_count: number`.
- **Listado:** renderizar `Table` (`sm:block`, oculta en móvil) y tarjetas (`sm:hidden`) a partir del mismo array `filtered`.
- **Botón:** "Agregar cliente a esta vertical" en lugar de "Nuevo espacio"; abre un `Dialog` con `ClientAutocomplete` y la lógica del Flujo 3.
- **Eliminar** el import y uso de `QuickCreateModal`.
- Recibe `vertical.id` (ya disponible) para pasar a `createSpace`.
- **Paginación:** estado local `page` (1-indexed); derivar `const pageSize = 20`, `const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))`, `const pageItems = filtered.slice((page-1)*pageSize, page*pageSize)`. Renderizar `pageItems` (tabla y tarjetas). Resetear `page` a 1 cuando cambie `search` (p. ej. en el `onChange` del buscador o con un `useEffect` sobre `search`). Controles de paginación solo si `filtered.length > pageSize`.

### Componente nuevo (opcional)
- `AddClientToVerticalDialog` (puede vivir inline en `VerticalDetailClient` o como componente aparte): `Dialog` + `ClientAutocomplete` + manejo de "ya asociado" / `createSpace` / redirect.

### Breakpoints obligatorios
375px (tarjetas) · 768px (tabla) · 1280px (tabla).

---

## API / Endpoints

No aplica. Reutiliza `createSpace` y `searchClients` existentes. No se crean acciones nuevas (salvo que el recuento se decida resolver con una acción agregada aparte).

---

## Notas de Seguridad

- Carga server-side con admin client + filtro `created_by` para no-admin (ya implementado en la página).
- `createSpace` re-verifica creador∨admin del cliente (RLS no aplica al service_role — patrón CLAUDE.md / SPEC-22.3).
- `searchClients` respeta `created_by` (no enumerar clientes ajenos).
- No se expone contenido de informe en esta pantalla.

---

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT:** cabecera con logo moderado; tabla + tarjetas responsive; diálogo "Agregar cliente".
- **BACKEND-AGENT:** solo si el recuento se resuelve con acción aparte; en principio basta con ampliar el `select` de la página.
- **DB-AGENT:** no aplica.

### Desglose de tareas
1. Página: añadir `reports(count)` al select; mapear `reports_count` y `client_id`; ampliar tipos.
2. Header: logo moderado arriba-izquierda + nombre visible + acento de color.
3. Listado: `Table` en `sm+`, tarjetas apiladas en móvil, ambos desde `pageItems`.
4. Paginación en cliente (20/página) sobre `filtered`; reset a página 1 al cambiar la búsqueda.
5. "Agregar cliente a esta vertical": `Dialog` + `ClientAutocomplete`; dedup client-side; `createSpace` + redirect / enlace a espacio existente.
6. Eliminar `QuickCreateModal` de esta pantalla.
7. Responsive 375/768/1280 + `pnpm build` verde.

### Dependencias con otras specs
- **Entrante:** [`23-creation-flows-and-nav.md`](23-creation-flows-and-nav.md) — `ClientAutocomplete` + `searchClients`. La 23 va primero.

---

## Tests Requeridos

### Tests de integración obligatorios
- Agregar cliente a vertical → crea el espacio y redirige; reintentar con el mismo cliente no duplica (server lo rechaza y/o el dedup client-side lo evita).

### Tests opcionales
- Unit del filtro client-side (nombre/contacto/email).

---

## Out of Scope (Explícito)

- Ordenación por columnas.
- Paginación **server-side** (esta spec la hace en cliente; ver umbral de migración en Decisiones).
- Crear un cliente *nuevo* desde la vertical (eso es el flujo de [`23`](23-creation-flows-and-nav.md)); aquí solo se **asocia** un cliente existente.
- Cambios en el dashboard, navbar o pantalla de espacio (specs 23 y 25).
- Editar/eliminar el espacio desde esta tabla (se gestiona desde la ficha del cliente).

---

## Notas de Implementación

*(se rellenan durante la implementación)*

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-04 | Versión inicial — logo moderado + tabla filtrable + "Agregar cliente a esta vertical". | Claude Code |
| 2.0 | 2026-06-04 | Detalle para Gemini: artefactos verificados (`Table`, `getSignedLogoUrl`, `createSpace`, query de la página), recuento de informes vía `reports(count)`, tabla en `sm+` + tarjetas en móvil (decisión), redirect al espacio tras agregar + dedup por `client_id` (decisión), dependencia de `ClientAutocomplete`/`searchClients` de la spec 23. | Claude Code |
| 2.1 | 2026-06-04 | Paginación en cliente, 20/página (decisión del responsable, optimizando llamadas y latencia): 1 query magra + filtro/paginación en memoria; reset a página 1 al buscar; umbral ~500 espacios para migrar a server-side. | Claude Code |
