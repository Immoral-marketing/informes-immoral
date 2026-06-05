# SPEC-29: Pantalla de espacio (contacto, filtro/paginación informes) + drawer de Anotar

**Versión:** 1.0
**Estado:** draft
**Última actualización:** 2026-06-05
**Owner:** Julián (julian@immoral.es)

---

## Descripción

Dos áreas del panel del empleado detectadas en revisión visual con datos reales:

1. **Pantalla de espacio de cliente** (`/espacios/[id]`): los "Datos de Contacto" aparecen muy a la izquierda en ciertos breakpoints por la forma en que el grid colapsa. Además, cuando hay muchos informes en un espacio, la lista no tiene filtro ni paginación.

2. **Gestión de informe — modo Anotar**: el panel de notas de orador aparece como overlay absoluto encima del iframe (tapa el contenido), en lugar de abrirse como un **drawer lateral de toda la página** que empuja el layout sin solaparse. Además el botón "Anotar" genera una pantalla de carga que bloquea el preview.

---

## Actores

- **Empleado / Admin:** consulta el espacio de un cliente, gestiona los informes del espacio, y usa el modo de anotación durante la preparación de una presentación.

---

## Flujos Principales

### Flujo 1: Pantalla de espacio — layout de contacto correcto

1. El empleado abre `/espacios/[id]`.
2. En **desktop (≥1024 px)** la pantalla muestra dos columnas: informes a la izquierda (ancho flexible) y "Datos de Contacto" a la derecha (320 px fija), exactamente como hoy.
3. En **tablet (768–1023 px)** "Datos de Contacto" se coloca en la parte superior derecha, **no** en una columna completa a la izquierda. Opción recomendada: grid de dos columnas `md:grid-cols-[1fr_260px]` para que a partir de 768px ya haya sidebar.
4. En **móvil (<768 px)** la sección de contacto va debajo de la lista de informes en una sola columna.

### Flujo 2: Pantalla de espacio — filtro y paginación de informes

1. El empleado abre un espacio con muchos informes.
2. Bajo el título "Informes (N)" aparece un campo de búsqueda que filtra en vivo la lista por nombre de informe (case-insensitive, sin recargar página).
3. La lista se pagina a **12 informes por página** con controles prev/next y contador "X–Y de N".
4. Al cambiar el texto de búsqueda, la paginación vuelve a la primera página.
5. Con ≤12 informes o búsqueda con pocos resultados, los controles de paginación se ocultan.

### Flujo 3: Modo Anotar como drawer lateral de página

1. El empleado abre la gestión de un informe HTML y pulsa "Anotar".
2. Un **drawer** (panel lateral) se desliza desde el borde derecho de la ventana del navegador, superpuesto sobre **toda la página** (no sobre el iframe), con un ancho de ~360 px y altura completa de la ventana.
3. El contenido de la página (incluyendo el iframe de preview) **no se encoge ni se desplaza horizontalmente** — el drawer se superpone con un overlay semitransparente detrás.
4. El panel muestra el encabezado "Notas de Orador" y la lista de notas desde el primer instante; el indicador de carga aparece dentro del panel mientras las notas se cargan, sin bloquear el preview.
5. El empleado puede cerrar el drawer pulsando el botón × dentro del panel, pulsando el overlay semitransparente fuera, o volviendo a pulsar "Anotar" (toggle).
6. El `iframeRef` y el flujo de mensajes postMessage para anotar/resaltar siguen funcionando exactamente igual.

---

## Flujos Alternativos / Edge Cases

- **Búsqueda sin resultados en espacio:** mostrar "No hay informes que coincidan".
- **Informe en PDF:** "Anotar" permanece deshabilitado (sin cambios).
- **Drawer en móvil (375 px):** el drawer ocupa el 100% del ancho de la ventana con un `×` visible en la esquina superior derecha.
- **Drawer en tablet (768 px):** drawer de ancho completo o ~360 px según el espacio disponible.
- **Scroll del body con drawer abierto:** el scroll del body detrás del overlay puede bloquearse (`overflow-hidden` en `body`) para evitar desplazamiento accidental.

---

## Criterios de Aceptación

- [ ] CA-01: En la pantalla de espacio, a partir de 768 px, "Datos de Contacto" aparece como columna lateral derecha, no como bloque a ancho completo debajo ni desproporcionado a la izquierda.
- [ ] CA-02: En la pantalla de espacio, a menos de 768 px, "Datos de Contacto" aparece debajo de la lista de informes en una sola columna.
- [ ] CA-03: La pantalla de espacio muestra un campo de búsqueda que filtra en vivo la lista de informes por nombre (sin recargar la página).
- [ ] CA-04: La lista de informes se pagina a 12 por página con controles prev/next y contador "X–Y de N". Los controles se ocultan cuando hay ≤12 informes.
- [ ] CA-05: Al cambiar el texto del buscador, la paginación regresa a la página 1.
- [ ] CA-06: Al pulsar "Anotar", el panel de notas se abre como **drawer** superpuesto sobre toda la página desde el borde derecho, sin encoger ni desplazar el contenido existente.
- [ ] CA-07: El drawer tiene un ancho de ~360 px en desktop/tablet y ocupa el 100% del ancho en móvil (< 640 px).
- [ ] CA-08: El drawer se cierra al pulsar el botón ×, al pulsar fuera del panel (overlay), o al volver a pulsar "Anotar" (toggle).
- [ ] CA-09: Mientras las notas se cargan, el indicador aparece únicamente dentro del panel del drawer, sin bloquear el preview.
- [ ] CA-10: El flujo de creación, edición, eliminación e historial de notas sigue funcionando correctamente con el drawer abierto.
- [ ] CA-11: El responsive se mantiene en 375 / 768 / 1280 px en ambas pantallas afectadas.

---

## Modelo de Datos

No se requieren cambios de esquema ni migraciones.

---

## UI / Páginas Afectadas

### Páginas modificadas

- **Pantalla de espacio** (`src/app/(panel)/espacios/[id]/SpaceReportsClient.tsx`):
  - Cambiar `grid grid-cols-1 lg:grid-cols-[1fr_320px]` a `grid grid-cols-1 md:grid-cols-[1fr_260px] gap-8` para activar la sidebar desde 768 px.
  - Añadir estado `query` (string) y `page` (number) con `PAGE_SIZE = 12`.
  - Añadir input de búsqueda (filtra `r.name` case-insensitive) y controles prev/next con contador.

- **Gestión de informe** (`src/app/(panel)/informes/[id]/ReportManageClient.tsx`):
  - Eliminar el overlay `absolute` actual del `NotesPanel` dentro del área de preview.
  - Implementar el drawer como `<div>` posicionado `fixed right-0 top-0 h-full w-[360px] max-w-full z-50` con `translate-x-full` / `translate-x-0` controlado por `isAnnotateMode`.
  - Añadir overlay semitransparente `fixed inset-0 z-40 bg-black/40` visible cuando `isAnnotateMode` es `true`, con `onClick` para cerrar.
  - Bloqueo de scroll del body: `document.body.style.overflow = isAnnotateMode ? "hidden" : ""`.
  - El grid principal `lg:grid-cols-[300px_1fr]` **no cambia** con el estado `isAnnotateMode` (era el bug: antes añadía una tercera columna o cambiaba el overlay).
  - `iframeRef` y el paso a `NotesPanel` no cambian.

### Componentes reutilizables

- `NotesPanel.tsx`: sin cambios de lógica. Solo se renderiza en un contenedor diferente (el drawer fixed en lugar del overlay absolute).
- `Input`/`Button` de shadcn/ui para el buscador y paginación del espacio.

### Breakpoints obligatorios
375px (mobile) · 768px (tablet) · 1280px (desktop)

---

## API / Endpoints

Sin cambios. El buscador/paginación de informes es filtrado en cliente sobre los datos ya cargados por el Server Component (`page.tsx`). El drawer de Anotar usa la misma server action `getNotes` ya existente.

---

## Notas de Seguridad

Sin impacto en seguridad. Los cambios son puramente de layout y presentación. El drawer renderiza el mismo `NotesPanel` con los mismos guards de autorización.

---

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT:** único rol implicado. Sin cambios de backend, DB ni migraciones.

### Desglose de tareas

1. `SpaceReportsClient.tsx`: cambiar el breakpoint del grid de `lg` a `md` (ajustar ancho de sidebar a 260 px para que quepa bien en 768 px). Añadir estado `query`+`page`, input de búsqueda, lógica de filtrado + paginación 12 por página.
2. `ReportManageClient.tsx`:
   - Eliminar el `<div className="absolute top-0 right-0 h-full w-[320px]...">` que envuelve `NotesPanel`.
   - Añadir overlay: `{isAnnotateMode && <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsAnnotateMode(false)} />}`.
   - Añadir drawer: `<div className={`fixed right-0 top-0 h-full w-[360px] max-w-full z-50 bg-card shadow-2xl border-l border-border transition-transform duration-300 ${isAnnotateMode ? "translate-x-0" : "translate-x-full"}`}>` con un botón `×` en el encabezado y `<NotesPanel .../>` dentro.
   - Añadir scroll lock: `useEffect(() => { document.body.style.overflow = isAnnotateMode ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [isAnnotateMode])`.
   - El contenedor del preview pasa a `relative` puro sin necesidad de anidar el panel.

3. Verificar responsive en 375 / 768 / 1280 px y los flujos CRUD de notas.

### Dependencias con otras specs
- SPEC-28 (ya implementada): el fix del admin client en `notes-actions.ts` y el loader interno del panel siguen vigentes y no se tocan.
- SPEC-26 (ya implementada): el layout del header con título + botonera no cambia.

---

## Tests Requeridos

### Tests de integración obligatorios
Ninguno (cambio visual/layout).

### Tests opcionales
- Verificación manual del drawer en 375 / 768 / 1280 px.
- Verificar que el iframeRef sigue recibiendo los postMessage al anotar con el drawer abierto.

---

## Out of Scope (Explícito)

- Paginación server-side de informes (`.range()`): queda para una spec futura si el volumen lo exige.
- Búsqueda de informes por campos distintos al nombre.
- Rediseño del panel de notas más allá de su contenedor (drawer vs overlay).
- Cambio del botón "Anotar" en el modo presentación (`PresenterClient.tsx`): sigue igual.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-05 | Versión inicial | Julián |
