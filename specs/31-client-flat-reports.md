# SPEC-31: Vista Plana de Informes en Cliente (Flat Reports View)

**Versión:** 1.0
**Estado:** draft
**Última actualización:** 2026-06-08
**Owner:** SPEC-AGENT

---

## Descripción
Actualmente, la arquitectura de la interfaz obliga al empleado a navegar por "Espacios" (Verticales) dentro de un Cliente para poder ver los informes. El objetivo de esta spec es aplanar esta experiencia: al entrar a un Cliente (`/clientes/[id]`), el usuario verá directamente una tabla de datos (Data Table) con **todas** las propuestas/informes de ese cliente, independientemente del vertical al que pertenezcan. El vertical pasará a ser simplemente una columna y un filtro en esta tabla.

## Actores
- **Empleado/Admin:** Accede a la ficha del cliente para ver, buscar y gestionar todas las propuestas de forma centralizada sin tener que saltar entre verticales.

## Flujos Principales

### Flujo 1: Visualización centralizada de informes
1. El empleado entra a `/clientes/[id]`.
2. En lugar de ver la sección "Espacios" (tarjetas), ve una sección "Propuestas" (Informes).
3. Se muestra una tabla con todos los informes de ese cliente, independientemente del vertical.
4. La tabla incluye columnas como: Nombre del Informe, Vertical (con su color/badge), Creado el, Última actualización.
5. El empleado puede buscar por nombre o filtrar por vertical directamente en la tabla.

### Flujo 2: Creación de un nuevo informe desde el cliente
1. El empleado hace clic en "Crear Propuesta" desde la vista del Cliente.
2. Se abre un único Modal con el formulario completo de creación de informe.
3. Este formulario incluye un dropdown/selector para elegir el **Vertical** (y si no existe un `client_space` en BD para ese vertical, se crea automáticamente por debajo).
4. El resto de campos (nombre, adjuntar PDF) se rellenan en el mismo modal sin pasos adicionales.

## Flujos Alternativos / Edge Cases
- **Cliente sin informes:** Se muestra un empty state invitando a crear la primera propuesta, pidiendo seleccionar el vertical inicial.
- **Cliente con muchos informes:** La tabla debe estar paginada o tener scroll virtual para no afectar el rendimiento.

## Criterios de Aceptación
- [ ] CA-01: La página `/clientes/[id]` ya no muestra las tarjetas de "Espacios" como navegación principal.
- [ ] CA-02: La página `/clientes/[id]` muestra una tabla con todos los informes de todos los espacios del cliente.
- [ ] CA-03: La tabla incluye una columna indicando claramente a qué Vertical pertenece cada informe.
- [ ] CA-04: Existe un input de búsqueda para filtrar informes por nombre.
- [ ] CA-05: Existe un selector/filtro para ver solo los informes de un vertical específico.
- [ ] CA-06: El botón de "Crear Informe" permite seleccionar el Vertical antes de proceder con la creación.

## Modelo de Datos (si aplica)
No hay cambios en el modelo de base de datos. La relación `clients` -> `client_spaces` -> `reports` se mantiene igual. Solo cambia la forma en que se consultan y presentan los datos mediante un `JOIN` (o select anidado en Supabase) para aplanar los resultados.

*Query propuesta conceptual:*
Consultar `reports` donde `space_id` pertenezca a los `client_spaces` de este `client_id`, haciendo fetch también de la data del vertical asociado.

## UI / Páginas Afectadas (si aplica)

### Páginas eliminadas
- **`/espacios/[id]/page.tsx`** y rutas hijas (completamente eliminadas, todo converge en la vista de cliente).

### Páginas modificadas
- **`/clientes/[id]/page.tsx`**: Reemplazar `SpacesSection` por el nuevo componente de tabla de informes.
- **`/clientes/[id]/ClientDetailClient.tsx`** (o similar): Ajustar botones de llamada a la acción.
- **`/clientes/[id]/...`** (Formularios de Creación): El modal de "Crear Propuesta" en el cliente debe incorporar el select de Verticales.

### Componentes reutilizables
- Se introducirá un nuevo componente `ClientReportsTable.tsx` que consumirá `shadcn/ui` (Table, Input, Select/Dropdown para filtros).

## API / Endpoints (si aplica)
Se requerirá actualizar las Server Actions (`actions.ts` en `clientes`) para obtener la lista plana de informes.
- Modificar o crear una función `getClientReports(clientId: string)` que retorne todos los informes con sus respectivos datos de vertical.

## Notas de Seguridad (si aplica)
Las políticas RLS actuales de `reports` y `client_spaces` ya cubren que un empleado solo pueda ver los informes a los que tiene acceso. Como se usará el admin client o el user client con RLS, hay que asegurar que la consulta plana respete los permisos de visualización del empleado.

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT**: Implementará `ClientReportsTable`, reemplazará la vista en `clientes/[id]/page.tsx` y añadirá el modal de selección de vertical al crear.
- **BACKEND-AGENT**: Implementará la consulta optimizada a Supabase para extraer la lista plana de informes de un cliente, resolviendo los nombres y colores de los verticales asociados.

### Desglose de tareas
*(Se definirá en detalle una vez aprobada la spec)*

### Dependencias con otras specs
- Reemplaza y anula `29-space-screen-and-annotate-drawer.md` respecto a la pantalla de espacio.

## Tests Requeridos
- Test de creación de informe en nuevo vertical (verifica creación on-the-fly del client_space).

## Out of Scope (Explícito)
- Modificar el modelo de datos subyacente (`client_spaces` se mantiene como pivote estructural por si en el futuro los espacios tienen configuraciones aisladas).

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-08 | Versión inicial (Draft) | SPEC-AGENT |
