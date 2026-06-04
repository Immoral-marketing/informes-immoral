# SPEC-25: Logo de Cliente + Co-branding Immoral × Cliente

**Versión:** 2.0
**Estado:** aprobada
**Última actualización:** 2026-06-04
**Owner:** Julian
**Tipo:** feature-spec (añade logo a `clients`; toca formulario de cliente, lista de clientes, cabecera del espacio, viewer público y pantallas de carga; introduce co-branding visual y transiciones premium)
**Prioridad:** 3

---

## Descripción

Asocia un **logo** a cada cliente y lo usa para construir una identidad visual de **colaboración Immoral × Cliente** en todas las superficies que ve el cliente y en la navegación interna del empleado.

El logo se sube al crear/editar el cliente (PNG/SVG, fondo transparente recomendado) y se muestra como **lockup co-branded `[logo Immoral] × [logo cliente]`** en:

1. El **viewer público** del cliente (cabecera del informe y modal de acceso PIN/magic link).
2. Las **pantallas/transiciones de carga** (transición co-branded al entrar a un espacio; loader del viewer mientras carga el documento).
3. La **cabecera del espacio** del cliente (`/espacios/[id]`): logo + nombre.
4. La **lista de clientes** (`/clientes`) y las tablas/tarjetas donde aparece el cliente.

Si el cliente **no tiene logo**, todas las superficies degradan limpiamente al tratamiento actual (solo Immoral / inicial coloreada), sin reservar huecos ni romper el layout.

> **Cambio de alcance respecto a v1.0:** la v1.0 marcaba el viewer público y el magic link como *Out of Scope*. El responsable ha pedido explícitamente el co-branding en esas superficies (sensación de "trabajamos juntos"). Esta versión lo incorpora como núcleo de la spec.

---

## Actores

- **Empleado / Admin:** sube, reemplaza y quita el logo del cliente.
- **Empleado / Admin (lector):** ve el logo co-branded al navegar (lista, espacio, transiciones).
- **Cliente (espectador público):** ve el lockup Immoral × su-logo en el modal de acceso, en la cabecera del viewer y en el loader del documento.

---

## Decisiones de producto (resueltas con el responsable — NO inferir)

1. **Co-branding en pantallas de carga.** El lockup Immoral × cliente debe aparecer en: (a) **transición al entrar al espacio** (panel), (b) **viewer público del cliente**. El **loading global del panel** (`loading.tsx`) NO puede mostrar el logo del cliente porque Next.js lo renderiza antes de resolver qué cliente es; ahí se mantiene solo el `BrandLoader` de Immoral. → Ver decisión 6.
2. **Cabecera del viewer público:** lockup `[logo Immoral] × [logo cliente] · nombre del informe`. Si el cliente no tiene logo → solo `[logo Immoral] · nombre` (comportamiento actual).
3. **Formato del logo:** PNG y SVG (igual que verticales), máx 2 MB. Render con `<img>` normal (NO `next/image`) sobre signed URL — ver Nota de Implementación NI-1 sobre por qué el SVG "no se ve" hoy.
4. **Transición co-branded al entrar al espacio (panel):** se dispara desde la fila/tarjeta del cliente (que sí conoce el logo) **antes de navegar**, mostrando un overlay `Immoral × cliente` animado, en lugar de depender de `loading.tsx`. Decisión del responsable: "transición co-branded tras navegar".
5. **Modal de acceso del viewer (PIN/magic link):** también muestra el lockup co-branded, no solo el viewer ya autenticado. Refuerza la colaboración desde el primer instante.
6. **Loading global del panel:** sin cambios (solo Immoral). Es una limitación técnica honesta, no un olvido. Documentado para que no se reabra.
7. **Ficha de cliente `/clientes/[id]`:** muestra el logo en su cabecera por coherencia (decisión 2 heredada de v1.0, confirmada).
8. **Si no hay logo:** fallback al tratamiento actual en cada superficie. Nunca un hueco vacío.

---

## Flujos Principales

### Flujo 1: Subir / reemplazar / quitar logo del cliente
1. En el formulario de cliente (crear o editar) hay un **área de logo** opcional: zona de subida con **preview** inmediato (PNG/SVG).
2. Al guardar, el archivo se sube al bucket privado `client-logos` y se almacena el **path relativo** en `clients.logo_url` (no la URL completa — patrón CLAUDE.md).
3. Al editar: se puede **reemplazar** (sube nuevo, borra el anterior del bucket) o **quitar** (`logo_url` → null y borra el archivo).

### Flujo 2: Co-branding en el viewer público del cliente
1. El cliente abre `/[space]/[slug]` (o entra vía magic link `r/[token]`).
2. **Modal de acceso (PIN/magic link):** muestra el lockup `Immoral × logo-cliente` sobre el fondo oscuro.
3. Tras autenticar, la **cabecera del viewer** muestra `[Immoral] × [logo-cliente] · nombre del informe`.
4. Mientras carga el documento, el **loader del viewer** muestra el lockup co-branded (no solo "Cargando documento…").
5. Si el cliente no tiene logo → todas estas superficies muestran solo Immoral (degradación limpia).

### Flujo 3: Transición co-branded al entrar al espacio (panel)
1. El empleado hace click en una fila/tarjeta de cliente (lista de clientes o tabla de la vertical).
2. Se muestra un **overlay co-branded `Immoral × logo-cliente`** animado mientras Next.js navega y resuelve el espacio.
3. Al montar la página del espacio, el overlay se desvanece; la cabecera ya muestra el logo + nombre del cliente.

### Flujo 4: Logo en lista de clientes y cabecera del espacio
1. **Lista `/clientes`:** cada fila muestra el logo del cliente (si existe) en lugar de la inicial coloreada.
2. **Cabecera `/espacios/[id]`:** logo del cliente arriba y, debajo, el nombre. Fallback a inicial si no hay logo.

---

## Flujos Alternativos / Edge Cases

- **Sin logo:** fallback al nombre/inicial en cada superficie; el lockup co-branded colapsa a solo Immoral. No se reserva hueco.
- **SVG que "no se ve":** causado por `next/image` (Next bloquea SVG remoto sin `dangerouslyAllowSVG`). Se resuelve renderizando el logo de cliente con `<img>` normal. NO habilitar `dangerouslyAllowSVG` global en `next.config` (riesgo XSS por SVG con scripts servido inline). Ver NI-1 y Notas de Seguridad.
- **Formato/tamaño inválido:** rechazo server-side (MIME ∉ {png, svg+xml} o > 2 MB) con mensaje claro, igual que verticales.
- **Reemplazo:** al subir uno nuevo se borra el anterior del bucket (evitar huérfanos), patrón `uploadLogo(file, oldPath)` de verticales.
- **Logo muy ancho/alto en barra estrecha (viewer 48px):** el lockup limita la altura del logo de cliente (`max-h`) y usa `object-contain`; nunca empuja el nombre del informe fuera de pantalla.
- **URL firmada:** signed URL en runtime con admin client (buckets privados — patrón CLAUDE.md de Storage). En el viewer público, la URL se firma server-side en `page.tsx` y se pasa al cliente (el espectador no está autenticado en Supabase Auth, así que NO puede firmar por sí mismo).
- **Permisos:** editar el logo sigue las reglas de edición de cliente (creador ∨ admin), re-verificadas en código (service_role bypasea RLS — patrón SPEC-22.3).
- **Transición de navegación sin logo:** si el cliente no tiene logo, el overlay de transición muestra solo el `BrandLoader` de Immoral (no un hueco).

---

## Criterios de Aceptación

### Datos / Storage
- [ ] CA-25.1: `clients` tiene columna `logo_url text NULL` que almacena el **path** dentro del bucket (no la URL completa).
- [ ] CA-25.2: Existe el bucket **privado** `client-logos`.
- [ ] CA-25.3: La migración se **aplica a la BD remota** y se **regeneran los tipos** (`src/types/supabase.ts`); verificado contra `information_schema.columns`. El bucket se crea explícitamente (no basta el `.sql` de la columna) — ver NI-2.

### Formulario de cliente
- [ ] CA-25.4: El formulario (crear y editar) permite subir, **reemplazar** y **quitar** el logo, con **preview** inmediato. Acepta PNG/SVG, máx 2 MB.
- [ ] CA-25.5: La subida/eliminación usa **admin client** (service_role), guarda el **path relativo** y borra el archivo anterior al reemplazar/quitar. Nunca expone la URL pública cruda.
- [ ] CA-25.6: MIME y tamaño se validan **server-side** antes de subir (rechazo con mensaje claro).

### Co-branding viewer público
- [ ] CA-25.7: La **cabecera del viewer** (`ViewerShell`) muestra `[Immoral] × [logo-cliente] · nombre`. Sin logo → solo `[Immoral] · nombre` (comportamiento actual intacto).
- [ ] CA-25.8: El **modal de acceso** (`AccessModal`, PIN y magic link) muestra el lockup `Immoral × logo-cliente`. Sin logo → solo Immoral.
- [ ] CA-25.9: El **loader del documento** del viewer muestra el lockup co-branded mientras carga.
- [ ] CA-25.10: La signed URL del logo en el viewer público se firma **server-side** en `[space]/[slug]/page.tsx` y se pasa al `ViewerShell` (el espectador no puede firmar). El logo se renderiza con `<img>`, no `next/image`.

### Co-branding panel
- [ ] CA-25.11: Al hacer click en un cliente (lista de clientes y tabla de vertical), se muestra un **overlay de transición co-branded** `Immoral × logo-cliente` durante la navegación. Sin logo → `BrandLoader` de Immoral.
- [ ] CA-25.12: La **cabecera de `/espacios/[id]`** muestra el logo del cliente arriba y el **nombre** debajo; fallback a inicial si no hay logo.
- [ ] CA-25.13: La **lista `/clientes`** muestra el logo del cliente (si existe) en cada fila, en lugar de la inicial.
- [ ] CA-25.14: La ficha `/clientes/[id]` muestra el logo en su cabecera (decisión 7).

### Calidad
- [ ] CA-25.15: El **loading global del panel** (`loading.tsx`) NO se modifica para intentar mostrar el logo de cliente (limitación técnica documentada en decisión 6).
- [ ] CA-25.16: Responsive 375 / 768 / 1280 en formulario, lockups, cabeceras y overlay de transición. En el viewer (barra 48px) el logo de cliente respeta `max-h` y no desplaza el nombre.
- [ ] CA-25.17: Animaciones de marca premium en el lockup y el overlay (fade/scale suaves, reutilizando el `EASE_OUT` y el patrón de `BrandLoader`). Sin "saltos" ni parpadeos de layout (sin CLS).
- [ ] CA-25.18: `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

### Cambios
- **`clients`**: nueva columna `logo_url text NULL` — path relativo dentro de `client-logos`.
- **Storage**: nuevo bucket **privado** `client-logos`.

### Migración
```sql
ALTER TABLE clients ADD COLUMN logo_url text;
```
- Crear el bucket `client-logos` (privado). Replicar la configuración de `vertical-logos` (que se creó **fuera de migración SQL** — no hay `.sql` que lo cree; ver NI-2). Las operaciones de Storage se hacen siempre con service_role (admin client), por lo que **no se requieren policies RLS de Storage** para el flujo de empleado/viewer (el viewer recibe signed URLs firmadas server-side).
- Aplicar al proyecto remoto (`apply_migration` / `supabase db push`) y regenerar tipos. RLS de `clients` no cambia (añadir columna no altera políticas existentes).

---

## UI / Páginas Afectadas

### Componentes nuevos
- **`src/components/shared/CoBrandLockup.tsx`** (`"use client"` o server según uso): renderiza `[Immoral] × [logo-cliente]`. Props: `clientLogoUrl: string | null`, `clientName: string`, `variant: "viewer" | "modal" | "loader" | "header"`, tamaños/colores por variante. El logo de Immoral usa el asset local (`/immoral-logo-blanco.png` sobre oscuro, `/ISO-Negro.png` sobre claro). El logo de cliente con `<img>` + `object-contain` + `max-h`. Si `clientLogoUrl` es null → renderiza solo Immoral.
- **`src/components/shared/ClientTransitionLink.tsx`** (`"use client"`): wrapper de navegación que, al hacer click, muestra un overlay co-branded (reutiliza `CoBrandLockup variant="loader"` sobre el patrón de `BrandLoader`) y luego navega con `router.push`. Recibe `href`, `clientLogoUrl`, `clientName`. Usado por la lista de clientes y la tabla de la vertical.

### Páginas / componentes modificados
- **`src/components/clients/ClientFields.tsx`**: añadir área de logo (input file + preview + botón quitar). El componente pasa de campos planos a incluir el bloque de logo. Mantener `exactOptionalPropertyTypes` (props opcionales como `T | undefined`).
- **`src/app/(panel)/clientes/actions.ts`** (`createClient`/`createClientWithSpace` y `updateClient`): aceptar y persistir el logo (subir a `client-logos`, guardar path, reemplazo/borrado). Helper `getSignedClientLogoUrl(path)` análogo a `getSignedLogoUrl` de verticales. Replicar `uploadLogo(file, oldPath)`.
- **`src/app/(panel)/clientes/ClientesClient.tsx`**: usar logo en la fila (firmar URLs server-side en `clientes/page.tsx` y pasarlas); envolver cada fila con `ClientTransitionLink`.
- **`src/app/(panel)/clientes/page.tsx`**: cargar `logo_url` de cada cliente y firmar la URL.
- **`src/app/(panel)/clientes/[id]/`**: cabecera con logo (decisión 7).
- **`src/app/(panel)/espacios/[id]/page.tsx` + `SpaceReportsClient.tsx`**: cargar `logo_url` del cliente (vía `clients(...)` ya presente en el select; añadir `logo_url`), firmar server-side, mostrar en cabecera (logo arriba + nombre debajo).
- **`src/app/(panel)/verticales/[slug]/page.tsx` + `VerticalDetailClient.tsx`**: añadir `logo_url` al select de `clients`, firmar URLs, mostrar logo en tabla/tarjetas y envolver la navegación con `ClientTransitionLink`.
- **`src/app/[space]/[slug]/page.tsx`**: resolver `client_id` → `clients.logo_url` (vía `client_spaces.client_id`), firmar la URL **server-side** y pasarla al `ViewerShell` (nuevo prop `clientLogoUrl: string | null`, `clientName: string`).
- **`src/app/[space]/[slug]/ViewerShell.tsx`**: cabecera con `CoBrandLockup` en lugar de `Immoral | nombre`; loader del documento con lockup; pasar logo al `AccessModal`.
- **`src/app/[space]/[slug]/AccessModal.tsx`**: añadir lockup co-branded en la cabecera del modal (nuevos props `clientLogoUrl`, `clientName`).

### Breakpoints obligatorios
375px · 768px · 1280px. Verificar el lockup en la barra de 48px del viewer.

---

## API / Endpoints

No aplica (server actions + Storage admin client). El logo se entrega vía signed URL firmada en runtime:
- **Panel:** firmada server-side en cada page que lo necesita.
- **Viewer público:** firmada server-side en `[space]/[slug]/page.tsx` y pasada al cliente como prop (el espectador no está autenticado en Supabase Auth y no puede firmar). TTL razonable (3600s, como verticales).

---

## Notas de Seguridad

- Bucket **privado**; nunca servir el logo por URL pública cruda. Signed URL en runtime con admin client (patrón CLAUDE.md de Storage).
- Operaciones de Storage (upload/delete/sign) **siempre** con admin client (service_role).
- La edición del logo **re-verifica en código** que el usuario es creador del cliente ∨ admin (RLS no aplica al service_role — patrón SPEC-22.3).
- Validar **MIME y tamaño server-side** (no confiar en el `accept` del input ni en el MIME del navegador como única defensa).
- **SVG inline = vector de XSS.** NO habilitar `dangerouslyAllowSVG` en `next.config` (haría que `next/image` sirviera SVG con `Content-Type` que puede ejecutar scripts). Renderizar el logo de cliente con `<img src={signedUrl}>`: el navegador carga el SVG como imagen externa, sin ejecutar su JS embebido en el contexto de la app. (El bucket privado + signed URL + `<img>` mantiene el SVG fuera del origin ejecutable.)
- El logo del cliente en el viewer público se firma server-side; el espectador nunca recibe credenciales de Storage.

---

## Plan de Implementación

### Arquitectura propuesta
- **DB-AGENT:** migración (columna `logo_url`) + creación del bucket `client-logos`; aplicar remoto + regenerar tipos; verificar en `information_schema`.
- **BACKEND-AGENT:** persistencia del logo en create/update de cliente (`uploadLogo`/reemplazo/borrado); helper `getSignedClientLogoUrl`; validación MIME/tamaño; firmar URLs en las pages (panel + viewer público).
- **FRONTEND-AGENT:** `CoBrandLockup`, `ClientTransitionLink`, área de logo en el formulario, cabeceras (espacio, ficha, lista), co-branding en viewer (cabecera + modal + loader), animaciones.

### Desglose de tareas
1. **DB:** `clients.logo_url` + bucket `client-logos`; aplicar remoto + regenerar tipos; verificar `information_schema`.
2. **Backend:** `uploadLogo`/`getSignedClientLogoUrl`; integrar en create/update de cliente (reemplazo/borrado); validación.
3. **`CoBrandLockup`:** componente con variantes (viewer / modal / loader / header), `<img>` para cliente, fallback a solo Immoral.
4. **Formulario:** área de logo (upload + preview + quitar) en `ClientFields`.
5. **Viewer público:** firmar logo en `page.tsx`; lockup en `ViewerShell` (cabecera + loader) y `AccessModal`.
6. **Panel:** cabecera del espacio (logo + nombre); logo en lista de clientes y tabla de vertical; ficha de cliente.
7. **`ClientTransitionLink`:** overlay co-branded al navegar; aplicar en lista de clientes y tabla de vertical.
8. **Animaciones premium** (fade/scale, sin CLS) + responsive + `pnpm build` verde.

### Dependencias con otras specs
- **Cruzada con [`23-creation-flows-and-nav.md`](23-creation-flows-and-nav.md):** el área de logo vive en `ClientFields` (extraído por 23). 23 ya está implementada, así que el campo se añade directamente ahí. `createClientWithSpace` y `updateClient` (en `clientes/actions.ts`) deben aceptar el logo.
- **Cruzada con [`24-vertical-screen.md`](24-vertical-screen.md):** la tabla/tarjetas de la vertical (24, implementada) gana columna/elemento de logo y `ClientTransitionLink`. Verificar que `formattedSpaces` arrastra `logo_url` firmado.

---

## Tests Requeridos

### Tests de integración obligatorios
- Crear/editar cliente con logo → `logo_url` guarda el **path** (no URL) y la signed URL se genera.
- Reemplazo de logo → el archivo anterior se borra del bucket (sin huérfanos).
- Cliente sin logo → todas las superficies degradan a solo Immoral / inicial, sin error ni hueco.

### Tests opcionales
- Validación MIME/tamaño (rechaza JPG, GIF, >2 MB).
- Viewer público con cliente con logo → la cabecera y el modal muestran el lockup; la signed URL llega como prop (no se firma en cliente).

---

## Out of Scope (Explícito)

- Recorte/edición de imagen en cliente (crop, resize) — se sube tal cual.
- Logo por espacio o por informe (el logo es del cliente).
- Co-branding en el **loading global del panel** (`loading.tsx`) — limitación técnica (decisión 6); ahí solo Immoral.
- Validación automática de "fondo transparente" (no es fiable detectarlo server-side) — se recomienda al usuario en el copy del formulario, no se fuerza.
- Versionado/histórico de logos de cliente.

---

## Notas de Implementación

### NI-1 — Por qué el SVG "no se visualiza" hoy y cómo arreglarlo
El SVG que el responsable subió no se ve porque `next/image` **bloquea SVG remoto** salvo que se active `dangerouslyAllowSVG` en `next.config` (no activado, y NO debe activarse por XSS). Solución adoptada: renderizar el logo de cliente con **`<img src={signedUrl}>`** (no `next/image`). Esto aplica a todas las superficies del logo de cliente. El logo de Immoral sigue con `next/image` porque es un asset **local** PNG conocido.

### NI-2 — El bucket NO se crea con el `.sql` de la columna
El bucket `vertical-logos` no tiene migración SQL que lo cree (se creó vía dashboard/API de Storage). Por tanto, crear el `.sql` de `clients.logo_url` **NO crea el bucket**. El bucket `client-logos` debe crearse explícitamente (dashboard de Supabase o `apply_migration` con SQL de `storage.create_bucket`/insert en `storage.buckets`). Gap recurrente: no asumir que la migración de la columna basta. Verificar el bucket existe antes de cerrar el build.

### NI-3 — Firmar el logo en el viewer público es server-side obligatorio
El espectador del viewer no tiene sesión de Supabase Auth; no puede generar signed URLs. La URL debe firmarse en `[space]/[slug]/page.tsx` (admin client) y pasarse como prop a `ViewerShell` → `AccessModal`. No intentar firmar desde el cliente.

*(Se completan más notas durante la implementación.)*

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-04 | Versión inicial — columna logo_url + bucket + subida en formulario + visualización en espacio. Viewer y magic link marcados Out of Scope. | Claude Code |
| 2.0 | 2026-06-04 | Ampliación de alcance: co-branding Immoral × cliente en viewer público (cabecera + modal + loader), transición co-branded en panel, logo en lista de clientes; `CoBrandLockup` y `ClientTransitionLink`; decisiones de producto resueltas con el responsable; NI-1/2/3 (SVG con `<img>`, bucket aparte, firma server-side). | Claude Code |
