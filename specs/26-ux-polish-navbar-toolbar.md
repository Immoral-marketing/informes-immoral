# SPEC-26: Pulido UX — Navbar/logos y toolbar de gestión de informe

**Versión:** 1.0
**Estado:** implementada
**Última actualización:** 2026-06-05
**Owner:** Julián (julian@immoral.es)

---

## Descripción

Dos ajustes visuales en el panel del empleado detectados en uso real: (1) el navbar y su logo se ven demasiado pequeños, y (2) la barra de acciones de la pantalla de gestión de informe está demasiado apretada y, en pantallas medias, el nombre del informe aparece cortado. Esta spec agranda el navbar/logo de forma proporcional y descongestiona la toolbar para que el título del informe sea legible en todos los breakpoints.

## Actores

- **Empleado / Admin:** usa el panel; ve el navbar en todas las páginas y la toolbar en la gestión de un informe.

## Flujos Principales

### Flujo 1: Navbar y logo más grandes
1. El empleado navega por cualquier página del panel.
2. El navbar superior se muestra con una altura mayor que la actual y un logo de Immoral más grande, manteniendo el alineamiento vertical de todos los elementos (enlaces, botones de acción rápida, avatar).

### Flujo 2: Toolbar de gestión de informe descongestionada
1. El empleado abre la pantalla de gestión de un informe.
2. El nombre del informe se muestra completo o truncado con elipsis, pero **nunca recortado de forma abrupta** ni solapado con los botones, en 375 / 768 / 1280 px.
3. Los botones de acción (Nueva versión, Regenerar PIN, Enviar, Presentar, Anotar) se muestran con separación cómoda; cuando no caben en una fila, hacen wrap de forma ordenada sin amontonarse.
4. La fila inferior con la URL pública y el botón "Copiar URL" se mantiene legible.

## Flujos Alternativos / Edge Cases

- **Nombre de informe muy largo (>60 caracteres):** el título ocupa el ancho disponible y trunca con elipsis; al pasar el cursor puede mostrar el nombre completo (tooltip nativo vía `title`).
- **Pantalla estrecha (375 px):** el título ocupa su propia línea completa por encima de la botonera; los botones hacen wrap a varias filas.
- **Navbar en móvil (<640 px):** los enlaces de navegación y el botón "Nuevo cliente/informe" en texto se ocultan como ya ocurre hoy; el logo agrandado no debe romper el layout del header.

## Criterios de Aceptación

- [ ] CA-01: La altura del navbar es mayor que la actual (referencia: pasar de 64 px a 80 px) y todos sus elementos quedan centrados verticalmente sin desbordes.
- [ ] CA-02: El logo de Immoral del navbar es aproximadamente un 30 % más grande que el actual (referencia: de 140×38 a ~182×50), manteniendo la proporción del asset.
- [ ] CA-03: En la pantalla de gestión de informe, con un nombre de informe largo, el título no aparece cortado de forma abrupta ni solapa los botones en 375, 768 ni 1280 px.
- [ ] CA-04: Los botones de la toolbar tienen separación visual cómoda y, cuando no caben, hacen wrap ordenado (no quedan pegados unos a otros).
- [ ] CA-05: La fila de URL + "Copiar URL" sigue visible y funcional debajo del título.
- [ ] CA-06: Ningún cambio rompe el responsive en 375 / 768 / 1280 px en navbar ni en la toolbar.
- [ ] CA-07: Se respeta la identidad visual de Immoral (tipografía Lexend, paleta aprobada, logo correcto) en todos los elementos modificados.

## UI / Páginas Afectadas

### Páginas modificadas
- **Navbar global del panel** (`src/components/shared/Navbar.tsx`): aumentar altura del header (clase de altura `h-16` → `h-20`) y el tamaño del logo (`width`/`height` del `next/image` de `/immoral-logo-negro.png`). Revisar que el avatar y los enlaces sigan alineados (subir avatar a `w-9 h-9` si la proporción lo pide).
- **Toolbar de gestión de informe** (`src/app/(panel)/informes/[id]/ReportManageClient.tsx`, sección header líneas ~229-283): reestructurar el header para dar más aire. Recomendado: el bloque título+badge+URL ocupa una fila completa y la botonera va debajo (o a la derecha solo en breakpoints anchos). Considerar cambiar `md:flex-row` por `xl:flex-row` para que en tablet el título tenga línea propia. Subir el `gap` de la botonera (`gap-2` → `gap-2.5`) y mantener `flex-wrap`. Mantener `truncate` + `min-w-0` en el título y añadir `title={report.name}` para tooltip.

### Componentes reutilizables
- Ninguno nuevo. Reutiliza `Button` de shadcn/ui ya en uso.

### Breakpoints obligatorios
375px (mobile) · 768px (tablet) · 1280px (desktop)

## Notas de Seguridad

No aplica: cambios puramente visuales, sin tocar datos, sesiones ni contenido del informe.

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT:** único rol implicado. Ajustes de clases Tailwind y dimensiones de logo en los dos componentes citados. Sin backend, sin DB, sin migraciones.

### Desglose de tareas
1. En `Navbar.tsx`: cambiar `h-16` → `h-20` en el contenedor (línea ~46) y `width={140} height={38}` → `width={182} height={50}` en el logo (línea ~48). Verificar alineación de `nav`, botones y avatar.
2. En `ReportManageClient.tsx` (header ~229-283): reestructurar el layout del header para que el título no compita con la botonera en breakpoints medios; aumentar gap de botones; añadir `title` al `h1`.
3. Verificar visualmente en los tres breakpoints.

### Dependencias con otras specs
Ninguna.

## Tests Requeridos

### Tests de integración obligatorios
Ninguno (cambio visual). 

### Tests opcionales
Captura visual / revisión manual en 375 / 768 / 1280 px del navbar y de la toolbar con un nombre de informe largo.

## Out of Scope (Explícito)

- No se rediseña el menú de usuario ni los enlaces de navegación (solo tamaño/alineación si la altura lo requiere).
- No se cambia el comportamiento de ninguna acción de la toolbar (Nueva versión, Regenerar PIN, etc.).
- No se toca el contenido del informe ni el preview.

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-05 | Versión inicial | Julián |
