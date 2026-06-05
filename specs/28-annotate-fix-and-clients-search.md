# SPEC-28: Fix de Anotar (notas de orador) y buscador/paginación de clientes

**Versión:** 1.0
**Estado:** implementada
**Última actualización:** 2026-06-05
**Owner:** Julián (julian@immoral.es)

---

## Descripción

Dos asuntos independientes pero pequeños. (1) Corregir el modo "Anotar" de la gestión de informe: hoy al activarlo aparece una pantalla de carga indebida, las notas se cargan con error ("Error al cargar notas…"), y el panel de notas encoge el preview del informe en lugar de mostrarse como un panel lateral sobrepuesto. (2) Añadir un buscador en vivo y paginación a la lista de clientes, que hoy carga todos los clientes sin filtro ni paginación.

## Actores

- **Empleado / Admin (Anotar):** activa el modo anotación sobre un informe HTML para escribir notas de orador internas.
- **Empleado / Admin (Clientes):** consulta la lista de clientes y necesita buscar y paginar.

## Flujos Principales

### Flujo 1: Activar Anotar sin errores ni pantalla de carga global
1. El empleado abre un informe HTML y pulsa "Anotar".
2. El panel de notas aparece a la derecha **sobrepuesto** sobre el área de preview, **sin cambiar el ancho del iframe** del informe.
3. Las notas existentes se cargan correctamente (sin el error de Server Component) y se muestran en el panel.
4. Mientras cargan, el indicador de carga aparece **solo dentro del panel** de notas, no como pantalla de carga que tape el preview.

### Flujo 2: Buscar y paginar clientes
1. El empleado abre la lista de clientes.
2. Escribe en un buscador y la lista se filtra en vivo por nombre y persona de contacto.
3. La lista se pagina mostrando un número fijo de clientes por página (24), con controles para avanzar/retroceder y un contador de resultados.
4. Al cambiar el texto de búsqueda, la paginación vuelve a la primera página.

## Flujos Alternativos / Edge Cases

- **Informe en PDF:** el botón "Anotar" permanece deshabilitado (comportamiento actual; las notas ancladas al DOM solo aplican a HTML).
- **Informe HTML sin notas:** el panel se muestra con el mensaje de estado vacío, sin error.
- **Anotar en pantallas estrechas (375/768 px):** el panel de notas se muestra de forma usable (puede ocupar ancho completo superpuesto); no debe dejar el preview inutilizable.
- **Búsqueda sin resultados:** se muestra un mensaje "no hay clientes que coincidan" y la paginación se oculta o muestra 0 resultados.
- **Lista con pocos clientes (≤24):** no se muestran controles de paginación (o se muestran deshabilitados); el buscador sigue disponible.

## Criterios de Aceptación

- [ ] CA-01: Al activar "Anotar" en un informe HTML, las notas se cargan sin mostrar el error "Error al cargar notas…".
- [ ] CA-02: Al activar "Anotar", no aparece ninguna pantalla de carga que cubra el preview del informe; el indicador de carga aparece únicamente dentro del panel de notas.
- [ ] CA-03: Con "Anotar" activo, el ancho del iframe del preview del informe no cambia respecto al modo normal (el panel de notas se superpone, no encoge el preview).
- [ ] CA-04: Crear, editar, eliminar una nota y ver su historial siguen funcionando tras el cambio.
- [ ] CA-05: La lista de clientes muestra un campo de búsqueda que filtra en vivo por nombre y persona de contacto (sin recargar la página).
- [ ] CA-06: La lista de clientes se pagina a 24 por página, con controles de avanzar/retroceder y un contador de resultados (p. ej. "1–24 de N").
- [ ] CA-07: Al cambiar el texto de búsqueda, la vista vuelve a la primera página.
- [ ] CA-08: El responsive se mantiene en 375 / 768 / 1280 px en el panel de Anotar y en la lista de clientes.

## Modelo de Datos

No se requieren cambios de esquema ni migraciones. Se usan las tablas existentes `report_notes`, `report_note_logs` (con sus constraints actuales, ya verificados como correctos) y `clients`.

> **Nota de causa raíz (Anotar):** el error NO se debe al nombre del foreign key — `report_notes_created_by_fkey` y `report_note_logs_performed_by_fkey` existen en la BD. La causa es que la lectura de notas hace un join embebido con `profiles` usando el cliente con RLS, y las políticas de `profiles` son **recursivas** (`profiles_select_admin` ejecuta un `SELECT ... FROM profiles WHERE role='admin'`), lo que rompe el render del Server Component. Es el mismo patrón ya documentado en `CLAUDE.md` ("Leer el rol del perfil SIEMPRE con admin client").

## UI / Páginas Afectadas

### Páginas nuevas
- Ninguna.

### Páginas modificadas
- **Panel de notas / gestión de informe** (`src/app/(panel)/informes/[id]/ReportManageClient.tsx`): cambiar el layout de Anotar para que el panel de notas se sobreponga (posicionamiento absolute/overlay sobre el contenedor del preview) en lugar de añadir una tercera columna que reduce el iframe. El contenedor del preview pasa a `relative` para anclar el overlay. Mantener el paso de `iframeRef` y el flujo de `&mode=annotate` del `previewSrc`.
- **Panel de notas** (`src/app/(panel)/informes/[id]/NotesPanel.tsx`): el estado `loading` ya no debe reemplazar todo el panel con `BrandLoader`; mostrar el indicador de carga dentro del panel manteniendo el encabezado "Notas de Orador" visible.
- **Lista de clientes (cliente)** (`src/app/(panel)/clientes/ClientesClient.tsx`): añadir input de búsqueda (estado local `query`) que filtra por `name` y `contact_name`, y paginación local a 24 por página (estado `page`, controles prev/next, contador). Reset a página 1 al cambiar `query`.

### Server actions / acciones modificadas
- **Notas** (`src/app/(panel)/informes/[id]/notes-actions.ts`): en `getNotes` y `getNoteHistory`, leer con el admin client (`createAdminClient()`) en lugar del cliente RLS, manteniendo la verificación de identidad por sesión server-side (`supabase.auth.getUser()`) y re-verificando que el usuario gestiona la versión (reutilizar el helper `managesVersion` ya existente en ese archivo) antes de devolver datos, dado que el admin client bypassa RLS.

### Componentes reutilizables
- Reutilizar `Input`/`Button` de shadcn/ui para el buscador y la paginación.
- Reutilizar `ClientTransitionLink` ya existente para cada fila de cliente.
- No es necesario un componente de paginación nuevo si se usa una paginación simple prev/next; opcionalmente puede usarse el patrón de `Pagination` de shadcn si ya existe en el proyecto.

### Breakpoints obligatorios
375px (mobile) · 768px (tablet) · 1280px (desktop)

## API / Endpoints

No se crean ni modifican rutas de API. Los cambios de notas son en server actions; el buscador/paginación de clientes es filtrado en cliente sobre datos ya cargados por el Server Component (`src/app/(panel)/clientes/page.tsx`), que sigue cargando la lista completa.

## Notas de Seguridad

- **Lectura de notas con admin client:** al pasar `getNotes`/`getNoteHistory` al admin client (que bypassa RLS), la autorización debe re-verificarse en código (mismo principio que `createNote`/`markOrphan` ya aplican con `managesVersion`). La identidad sigue derivándose de la sesión server-side, nunca de parámetros del cliente. Es el patrón estándar del proyecto para evitar la recursión RLS de `profiles`.
- El buscador de clientes filtra datos que el Server Component ya devuelve respetando el alcance del usuario (un empleado no-admin solo ve sus clientes; admin ve todos). El filtrado en cliente no amplía ese alcance.

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT:** overlay del panel de Anotar y loader interno (`ReportManageClient.tsx`, `NotesPanel.tsx`); buscador + paginación (`ClientesClient.tsx`).
- **BACKEND-AGENT:** cambiar `getNotes`/`getNoteHistory` a admin client con re-verificación de autorización (`notes-actions.ts`).
- **DB-AGENT:** sin tareas (no hay migraciones; constraints existentes verificados).

### Desglose de tareas
1. `notes-actions.ts` → `getNotes`: leer con `createAdminClient()`; verificar usuario autenticado y que gestiona la versión (`managesVersion`) antes de devolver; conservar el join `profiles(full_name)`.
2. `notes-actions.ts` → `getNoteHistory`: mismo patrón (admin client + verificación) para el join `profiles(full_name)` de los logs.
3. `NotesPanel.tsx`: sustituir el `return <BrandLoader/>` global del estado `loading` por un indicador dentro del panel sin ocultar el encabezado.
4. `ReportManageClient.tsx`: cambiar el grid de Anotar para no reducir el preview; renderizar `NotesPanel` como panel sobrepuesto a la derecha del área de preview (contenedor de preview `relative`, panel `absolute`/overlay con ancho ~320px y alto del preview). Mantener `iframeRef` y `&mode=annotate`. Definir comportamiento usable del overlay en móvil/tablet.
5. `ClientesClient.tsx`: añadir buscador en vivo (filtra `name` + `contact_name`, case-insensitive) y paginación a 24 por página con contador y reset a página 1 al cambiar la búsqueda.
6. Verificar responsive y los flujos de notas (crear/editar/borrar/historial) y de clientes (buscar/paginar).

### Dependencias con otras specs
- Ninguna bloqueante. Se apoya en la funcionalidad de notas de SPEC-20 (ya implementada) y en la lista de clientes de SPEC-03/23.

## Tests Requeridos

### Tests de integración obligatorios
- **Carga de notas:** `getNotes` de una versión con al menos una nota devuelve las notas (con `profiles.full_name`) sin error, ejecutándose como empleado creador y como admin.

### Tests opcionales
- E2E de activar Anotar y comprobar que el iframe no cambia de ancho.
- Revisión del buscador/paginación de clientes con un set de >24 clientes.

## Out of Scope (Explícito)

- **Paginación server-side** de clientes (`.range()`): se hace filtrado/paginación en cliente sobre la lista completa. Migrar a server-side queda para una spec futura si el volumen lo exige.
- **Búsqueda por otros campos** (espacios, verticales, destinatarios): solo nombre y persona de contacto.
- **Rediseño del panel de notas** más allá de su posicionamiento (overlay) y el loader interno.
- **Comentarios cliente↔empleado** (SPEC-08): no forma parte de esta spec.

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-05 | Versión inicial | Julián |
