# SPEC-12: UX Polish — Fixes post-producción

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-02
**Owner:** David (immoralia)

---

## Descripción

Spec de corrección y mejora UX detectada tras el primer acceso a producción. Cubre 5 issues: contraste visual de botones, acceso rápido de creación desde navbar, visibilidad del panel admin, refresco inmediato de listas tras acciones CRUD, y rediseño del dashboard principal como vista mixta (verticales + actividad reciente).

---

## Issues Cubiertos

| # | Issue | Tipo | Impacto |
|---|-------|------|---------|
| 1 | Botones sin estado visual por defecto | Bug visual | Toda la app |
| 2 | Navbar sin acceso rápido a creación | UX gap | Panel interno |
| 3 | Panel admin no visible al primer login | Bug lógico | Admin |
| 4 | Lista de destinatarios no se actualiza tras guardar | Bug UX | Clientes |
| 5 | Dashboard principal vacío / sin estructura | UX gap | Toda la app |

---

## Issue 1 — Botones con contraste visible sin hover

### Problema
Los botones en el panel no se distinguen visualmente hasta que el usuario hace mouseOver. El variant `outline` tiene borde pero sin fondo, confundiéndose con el fondo claro del panel (`#D8D8D8`). Los botones de acción secundarios parecen texto plano.

### Solución
- **Botón primario (CTA principal):** `bg-primary` (#3980E4) con texto blanco — ya correcto en componente shadcn. Verificar que todas las acciones principales lo usen.
- **Botón secundario/outline:** añadir `bg-white` explícito + `border border-input` + `text-foreground` para que tenga fondo blanco claramente diferenciado del fondo del panel.
- **Botón destructivo:** `bg-destructive` con texto blanco, sin esperar hover.
- **Botón ghost:** reservar solo para acciones de baja prioridad (cancelar, cerrar), con texto `text-muted-foreground` visible.

### Cambios
- `src/components/ui/button.tsx` — ajustar variant `outline` para incluir `bg-white hover:bg-gray-50`
- Auditar pages del panel y reemplazar botones con clases Tailwind ad-hoc por el componente `Button` con el variant correcto

---

## Issue 2 — Botón de creación rápida en Navbar

### Descripción
El flujo actual para crear un espacio o informe requiere navegar manualmente: Clientes → cliente → crear espacio, y luego: Espacios → crear informe. El usuario necesita acceso rápido desde cualquier pantalla.

### Solución: botón `+` en Navbar con modal de selección

1. Botón `+` en la Navbar (junto a los links de nav), visible para todos los roles.
2. Al hacer clic: abre un `QuickCreateModal` con dos opciones:
   - **Nuevo espacio** → paso 1: selector de cliente (dropdown con todos los clientes) → paso 2: redirige a `/clientes/[id]` con param `?openSpace=true` para abrir el modal de creación de espacio ya existente.
   - **Nuevo informe** → paso 1: selector de cliente → paso 2: selector de espacio del cliente → redirige a `/espacios/[id]` con param `?openReport=true`.
3. El modal también tiene la opción de "Ir al cliente" directamente como alternativa.

### Flujo alternativo
El usuario puede seguir creando desde el flujo normal dentro de cada sección (cliente → espacio → informe). El botón `+` es un atajo, no reemplaza el flujo existente.

### Server actions necesarias en QuickCreateModal
- **Cargar clientes:** nueva server action `getClientsForSelect()` en `clientes/actions.ts` → devuelve `{id, name}[]` ordenado por nombre.
- **Cargar espacios de un cliente:** nueva server action `getSpacesForSelect(clientId)` en `espacios/actions.ts` → devuelve `{id, slug, verticals: {name}}[]`.
- Ambas usan `createAdminClient()` para ignorar RLS de employee.

### Edge cases
- Sin clientes: mostrar mensaje "Crea primero un cliente en /clientes" con link.
- Sin espacios para el cliente seleccionado: mostrar "Este cliente no tiene espacios. Crea uno primero." con link al cliente.

### Cambios
- `src/components/shared/Navbar.tsx` — añadir botón `+` con icono `Plus` de lucide-react
- `src/components/shared/QuickCreateModal.tsx` — nuevo componente con stepper de 2 pasos
- `src/app/(panel)/clientes/actions.ts` — añadir `getClientsForSelect()`
- `src/app/(panel)/espacios/actions.ts` — añadir `getSpacesForSelect(clientId)`
- `src/app/(panel)/clientes/[id]/SpacesSection.tsx` — leer `searchParams.openSpace` para auto-abrir modal (usar `useSearchParams()` con Suspense boundary)
- `src/app/(panel)/espacios/[id]/SpaceReportsClient.tsx` — leer `searchParams.openReport` para auto-abrir modal

### Criterios de Aceptación
- CA-01: El botón `+` aparece en la navbar para todos los roles
- CA-02: Al seleccionar "Nuevo espacio" se puede elegir cliente y abrir el modal de creación
- CA-03: Al seleccionar "Nuevo informe" se puede elegir cliente → espacio y abrir el modal de creación
- CA-04: El flujo de creación desde dentro del cliente/espacio sigue funcionando igual

---

## Issue 3 — Panel admin no visible para usuarios que no son el primer registro

### Problema
El primer usuario en entrar se convierte en admin (lógica de SPEC-01 CA-08). Si dos usuarios entran simultáneamente o en distinto orden, el segundo puede quedar como `employee` sin panel admin incluso siendo directivo.

### Solución inmediata (ya aplicada)
Se ha actualizado el rol de David a `admin` directamente en BD. No requiere código.

### Solución estructural
Añadir en `/admin/usuarios` la capacidad de que un admin promocione a otro admin. Ya está implementado en `EmployeeRoleManager` (CA-05 de SPEC-01). Solo requiere que el primer admin asigne roles manualmente a los demás.

### Documentación
- El panel admin (Verticales, Usuarios en navbar) solo es visible para `role='admin'`
- Tras actualizar el rol en BD, basta con un **refresh de página** (F5) o `router.refresh()` — el PanelLayout es un Server Component dinámico que re-fetcha el perfil de BD en cada render. No es necesario cerrar sesión.
- El badge de rol en el dropdown del Navbar viene del prop `userRole` que pasa el PanelLayout tras leer BD — siempre refleja el estado actual de BD en el siguiente render.

---

## Issue 4 — Lista de destinatarios sin refresco inmediato tras guardar

### Problema
Al añadir, editar o eliminar un destinatario en `/clientes/[id]`, la lista no se actualiza hasta que el usuario refresca la página manualmente. El feedback visual existe (botón de guardar) pero el resultado no se refleja.

### Causa
`ClientDetailClient.tsx` mantiene la lista de recipients en `useState(initial)`. Las server actions modifican la BD pero el estado local no se actualiza ni se llama a `router.refresh()`.

### Solución: actualización optimista + router.refresh()
- Tras acción exitosa: actualizar el estado local inmediatamente (feedback instantáneo) Y llamar a `router.refresh()` para sincronizar con BD.
- `addRecipient`: añadir el nuevo recipient al array local con los datos del formulario.
- `deleteRecipient`: filtrar el recipient del array local.
- `updateRecipient`: reemplazar el recipient en el array local con los datos actualizados.
- `router.refresh()` en background garantiza que si hay discrepancias (IDs reales, timestamps), la próxima navegación tiene datos frescos.

```typescript
// Patrón — add
const result = await addRecipient(clientId, formData);
if (!("error" in result)) {
  setRecipients(prev => [...prev, result.recipient]); // optimistic
  router.refresh(); // sync BD
  setShowRecipientForm(false);
}

// Patrón — delete
const result = await deleteRecipient(r.id, client.id);
if (!("error" in result)) {
  setRecipients(prev => prev.filter(x => x.id !== r.id)); // optimistic
  router.refresh();
}
```

### Cambios
- `src/app/(panel)/clientes/[id]/ClientDetailClient.tsx` — actualización optimista + router.refresh() en add/update/delete de recipient
- `src/app/(panel)/clientes/actions.ts` — hacer que `addRecipient` devuelva el recipient creado (actualmente puede no devolverlo)

### Criterios de Aceptación
- CA-05: Al añadir un destinatario, aparece en la lista sin recargar la página
- CA-06: Al editar un destinatario, los cambios se reflejan inmediatamente
- CA-07: Al eliminar un destinatario, desaparece de la lista inmediatamente

---

## Issue 5 — Dashboard mixto: verticales + actividad reciente

### Descripción
La pantalla principal (`/clientes`) muestra solo la lista plana de clientes. El usuario espera un dashboard con dos zonas:
1. **Verticales activas** — cards de verticales con count de clientes e informes
2. **Actividad reciente** — últimos informes creados/modificados con acceso directo

### Solución
Crear una nueva página de dashboard en `/` (que actualmente redirige a `/clientes`) con dos secciones:

#### Sección superior — Verticales
- Grid de cards por vertical (igual que propuestas)
- Cada card muestra: logo, nombre, count de clientes activos, count de informes
- Click en card → redirige a `/clientes?vertical=[slug]` (filtra la lista de clientes por vertical)

#### Sección inferior — Últimos informes
- Lista de los últimos 6-8 informes creados/modificados, ordenados por `updated_at desc`
- Cada item: nombre del informe, cliente, espacio, fecha, botón de acceso directo al informe
- Para admin: todos los informes. Para employee: solo los suyos.

### Navegación
- **Borrar `src/app/page.tsx`** — este archivo compite con `src/app/(panel)/page.tsx` por la ruta `/`. En Next.js App Router, el root siempre gana sobre el route group. Al borrarlo, `(panel)/page.tsx` toma control de `/` y hereda automáticamente el layout del panel (Navbar + auth guard).
- El dashboard vive en `src/app/(panel)/page.tsx` — ya existe, se amplía con las dos secciones.
- El link "Clientes" en navbar mantiene su destino `/clientes` (lista completa sin filtro de vertical).

### Criterios de Aceptación
- CA-08: La pantalla principal muestra verticales como cards en la parte superior
- CA-09: Las verticales muestran count de clientes e informes
- CA-10: La pantalla principal muestra los últimos 6 informes en la parte inferior
- CA-11: Para employee, los informes recientes son solo los suyos; para admin, todos
- CA-12: Click en una vertical filtra la lista de clientes por esa vertical
- CA-13: Click en un informe reciente va directamente a la gestión del informe

---

## Plan de Implementación

### Orden recomendado (de menor a mayor complejidad)

| Paso | Issue | Archivo(s) | Estimación |
|------|-------|-----------|-----------|
| 1 | Issue 4 — router.refresh en destinatarios | `ClientDetailClient.tsx` | 15 min |
| 2 | Issue 1 — Button outline con bg-white | `button.tsx` + auditoría | 30 min |
| 3 | Issue 5 — Dashboard mixto | `src/app/(panel)/page.tsx` | 1.5h |
| 4 | Issue 2 — QuickCreateModal en Navbar | `Navbar.tsx` + `QuickCreateModal.tsx` | 2h |

Issue 3 ya está resuelto (fix de BD directo).

### Dependencias
- Todos los issues son independientes entre sí
- Issue 2 depende de que los modales de creación existentes (SpacesSection, SpaceReportsClient) soporten apertura via searchParams

---

## Out of Scope (Explícito)

- Filtrado de clientes por vertical en `/clientes` con query param (solo redirect, no implementación del filtro en esta spec)
- Notificaciones en tiempo real (Realtime de Supabase) — reservado para SPEC-10
- Analytics de informes (vistas, aperturas) — fuera del MVP
- Sidebar de navegación lateral — se mantiene navbar horizontal

---

## Notas de Implementación

*(se rellenan durante la implementación)*

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-02 | Versión inicial — 5 issues post-producción | Claude Code |
