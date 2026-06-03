# SPEC-17: Replicación de Pantallas del Panel (parity con propuestas)

**Versión:** 1.0
**Estado:** aprobada
**Última actualización:** 2026-06-03
**Owner:** Julian
**Tipo:** fix-spec (extiende [`15-ui-replication.md`](15-ui-replication.md); las specs originales NO se modifican)
**Prioridad:** 2 (después de [`16-loading-and-motion.md`](16-loading-and-motion.md))

---

## Descripción

Replica la estructura visual de cuatro pantallas de `propuestas.immoral.es` adaptándolas al dominio "informes": **dashboard**, **detalle de vertical**, **espacio de cliente** y **menú de usuario del navbar**. Además, completa la migración de los **modales custom restantes** a shadcn `Dialog` y pule el **modal de vertical**. Mantiene la terminología **"Verticales"** (decisión del responsable: NO se adopta "Líneas de Negocio").

---

## Actores

- **Empleado:** ve sus verticales/clientes/espacios; crea informes.
- **Admin:** ve todo; accede a gestión de verticales y usuarios.

---

## Flujos Principales

### Flujo 1: Dashboard
1. El usuario entra a `/`. Ve hero banner (copy de informes), 3 acciones rápidas y el grid de verticales con logo prominente y barra de color.
2. Clic en una vertical → navega al **detalle de vertical** (`/verticales/[slug]`).

### Flujo 2: Detalle de vertical
1. El usuario entra a `/verticales/[slug]`. Ve cabecera con el logo grande de la vertical, su barra de color, buscador y los **espacios de cliente** de esa vertical como tarjetas.
2. Cada tarjeta muestra el cliente y sus datos de contacto, con botón **"Ver informes"** → `/espacios/[id]`.

### Flujo 3: Espacio de cliente
1. El usuario entra a `/espacios/[id]`. Ve eyebrow con el punto de color + nombre de la vertical, título del cliente con badge "Cliente", y layout de **2 columnas**: izquierda **Informes** (tarjetas con estado, versión, fecha, "Gestionar"), derecha **Datos de Contacto**.

### Flujo 4: Menú de usuario
1. El usuario abre el avatar del navbar. Ve nombre, email, badge de rol (con icono escudo si admin), enlaces de navegación (útiles en móvil), **"Cambiar PIN"** (ver [`21-employee-master-pin.md`](21-employee-master-pin.md)) y **"Cerrar sesión"**.

---

## Flujos Alternativos / Edge Cases

- **Vertical sin espacios:** el detalle de vertical muestra empty state con borde discontinuo y CTA "Crear primer cliente →" (a `/clientes`).
- **Buscador del detalle de vertical:** filtra client-side por nombre de cliente y por persona de contacto (case-insensitive). Sin resultados → mensaje "Sin coincidencias".
- **Empleado no-admin:** en el detalle de vertical y el dashboard solo ve los espacios/clientes que ha creado (filtro `created_by`), salvo admin que ve todo. Reusar el patrón ya existente.
- **Cliente con varios espacios:** un mismo cliente puede aparecer en varias verticales (un espacio por vertical). En el detalle de vertical se listan **espacios**, no clientes — cada tarjeta es un `client_space` de esa vertical.
- **CTA "+ Nuevo cliente" en el detalle de vertical (decisión, NO inferir):** en informes, "cliente" y "espacio (cliente×vertical)" son entidades separadas. Para evitar inventar un flujo nuevo, el botón del detalle de vertical es **"+ Nuevo espacio"** y abre el `QuickCreateModal` existente en su paso de creación de espacio (elegir cliente → se crea el espacio en ESTA vertical). Si se prefiere literalmente "+ Nuevo cliente", enlaza a `/clientes`. Implementar la primera opción ("+ Nuevo espacio" con `QuickCreateModal`), que es la que asocia un cliente a esta vertical. NO crear un flujo de creación de cliente nuevo embebido aquí.

---

## Criterios de Aceptación

- [ ] **CA-17.1:** El dashboard muestra hero banner con copy de **informes** (no "propuestas"), 3 acciones rápidas (Verticales, Gestión de usuarios solo-admin, Nuevo informe) y grid de verticales con **logo prominente** + barra de color superior + hover sutil.
- [ ] **CA-17.2:** Existe la ruta `/verticales/[slug]` con cabecera de vertical (logo grande, barra de color, nombre), buscador y tarjetas de espacio de cliente con datos de contacto y botón "Ver informes".
- [ ] **CA-17.3:** La pantalla `/espacios/[id]` usa layout de 2 columnas: izquierda lista de **Informes** con tarjetas (badge de estado/formato, versión, fecha, botón "Gestionar" + icono abrir), derecha tarjeta **Datos de Contacto** (persona, email, teléfono, creador, fecha). Eyebrow con punto de color de la vertical + badge "Cliente".
- [ ] **CA-17.4:** El menú de usuario del navbar incluye los enlaces de navegación (Dashboard, Clientes, y si admin Verticales + Usuarios), badge de rol con icono escudo para admin, ítem "Cambiar PIN" y "Cerrar sesión" en `text-destructive`.
- [ ] **CA-17.5:** Los modales `ClientFormModal` (clientes), `FormModal` y `RecipientFormModal` (detalle de cliente) y `CreateReportModal` + `PinModal` (espacios) usan shadcn `Dialog`; **ningún** modal del panel usa ya `fixed inset-0 bg-black/50` manual.
- [ ] **CA-17.6:** El modal de vertical muestra subtítulo descriptivo, etiqueta "Color de marca" y el área de logo con preview grande (ya parcialmente hecho en spec 15; se confirma parity con la foto de referencia).
- [ ] **CA-17.7:** Todas las pantallas usan tokens semánticos (sin hex de marca ni `bg-blue-*`); el `v.color_hex` dinámico sí se mantiene como dato.
- [ ] **CA-17.8:** Responsive correcto en 375 / 768 / 1280 en las cuatro pantallas (el layout de 2 columnas del espacio colapsa a 1 columna en móvil).
- [ ] **CA-17.9:** `pnpm build` pasa sin errores TypeScript (estricto, sin `any`, `exactOptionalPropertyTypes`).

---

## Modelo de Datos

No aplica (no hay tablas nuevas; solo lectura de `verticals`, `clients`, `client_spaces`, `client_recipients`, `reports`, `report_versions`). Nombres de columnas confirmados contra el esquema vivo (ver CLAUDE.md y notas abajo).

---

## UI / Páginas Afectadas

### Páginas nuevas

- **`src/app/(panel)/verticales/[slug]/page.tsx`** — detalle de vertical (Server Component). Carga la vertical por `slug`, su `logo` firmado (`getSignedLogoUrl`), y los `client_spaces` de esa vertical con su cliente y recipients (para datos de contacto). Filtra por `created_by` si no es admin. Pasa a un client component el listado + buscador.
- **`src/app/(panel)/verticales/[slug]/VerticalDetailClient.tsx`** — buscador + grid de tarjetas de espacio.

> **GOTCHA ruta:** `/admin/verticales` (gestión, admin) y `/verticales/[slug]` (detalle, cualquier empleado) son rutas distintas. No confundir. El detalle NO es admin-only.

### Páginas modificadas

- **`src/app/(panel)/page.tsx`** (dashboard) — copy del hero a informes; tarjetas de vertical con logo grande centrado (estilo foto 1) y barra de color; el enlace de cada vertical pasa de `/clientes?vertical={slug}` a **`/verticales/{slug}`**.
- **`src/app/(panel)/espacios/[id]/page.tsx`** + **`SpaceReportsClient.tsx`** — layout de 2 columnas (Informes / Datos de Contacto), eyebrow con color de vertical + badge "Cliente". Cargar también los datos de contacto del cliente (join a `clients` ya existe; añadir `contact_name`, y los `client_recipients` primarios para email). Las tarjetas de informe muestran badge de formato/estado, versión y fecha, con botón "Gestionar" → `/informes/[id]` y un icono de abrir externo.
- **`src/components/shared/Navbar.tsx`** — el `DropdownMenuContent` añade los enlaces de navegación + "Cambiar PIN" (abre `ChangePinModal` de la spec 21) + badge con icono `Shield` (lucide) para admin.
- **`src/app/(panel)/clientes/ClientesClient.tsx`** — `ClientFormModal` → `Dialog`. La lista de clientes puede mantener su estructura; migrar solo el modal.
- **`src/app/(panel)/clientes/[id]/ClientDetailClient.tsx`** — `FormModal` y `RecipientFormModal` → `Dialog`; sustituir `confirm()`/`alert()` de borrado por `AlertDialog` (coherencia con spec 15).
- **`src/app/(panel)/espacios/[id]/SpaceReportsClient.tsx`** — `CreateReportModal` y `PinModal` → `Dialog`. **Conservar toda la lógica** (validación de slug/nombre, upload, auto-send, generación de PIN).
- **`src/app/(panel)/admin/verticales/VerticalesClient.tsx`** — añadir subtítulo en el `DialogHeader` ("Modifica los datos del vertical seleccionado." / "Crea un nuevo vertical para organizar a tus clientes."). El resto ya está conforme.

### Componentes reutilizables

- Reutilizar `Card`, `Dialog`, `AlertDialog`, `Badge`, `Avatar`, `DropdownMenu`, `Input`, `Label`, `Button` de `src/components/ui/`.

### Breakpoints obligatorios

375px · 768px · 1280px (el grid de 2 columnas del espacio usa `grid-cols-1 lg:grid-cols-[1fr_320px]`).

---

## API / Endpoints

No aplica.

---

## Notas de Seguridad

- El detalle de vertical y el espacio se cargan con **admin client** server-side (igual que el resto del panel) y aplican el filtro `created_by` para no-admins. No se expone contenido de informe aquí (eso es spec 06/18).
- No se introducen endpoints nuevos ni se relaja RLS.

---

## Plan de Implementación

### Arquitectura propuesta

- **FRONTEND-AGENT:** todas las pantallas y la migración de modales.
- **Sin BACKEND-AGENT ni DB-AGENT** (salvo el ítem "Cambiar PIN" que solo enlaza al modal de la spec 21; si la 21 aún no está, dejar el ítem deshabilitado con tooltip "Próximamente").

### Referencias visuales (fotos de propuestas aportadas por el responsable)

- **Dashboard (foto 1):** hero oscuro con badge, título grande, subtítulo; 3 cards de acciones; grid de verticales con **logo grande centrado** sobre fondo claro y barra de color superior; hover `group-hover:scale-105` en el logo.
- **Detalle de vertical (foto 7):** logo grande de la vertical arriba, barra de color a la derecha, subtítulo "Administración de espacios de cliente en esta vertical.", buscador "Buscar por cliente, contacto…", botón "+ Nuevo cliente", tarjetas de cliente con iconos lucide (`User`, `Phone`, `Mail`, `MessageSquare`), "Creado por: X" y botón "Ver informes".
- **Espacio de cliente (foto 8):** eyebrow `● VERTICAL`, título `Cliente` + badge "Cliente", subtítulo; 2 columnas: izq. "Informes" con cards (nombre, badge estado, slug, vX, fecha, "Gestionar"), der. "Datos de Contacto".
- **Menú usuario (foto 6):** dropdown con nombre+email, badge rol, enlaces de navegación, "Cambiar PIN", "Cerrar sesión".

> Adaptación de copy: en propuestas dice "Propuestas Comerciales"/"Nueva propuesta"/"Ver propuestas". En informes es **"Informes"/"Nuevo informe"/"Ver informes"**.

### Snippets clave

**Dashboard — tarjeta de vertical con logo grande (sustituye la card actual):**
```tsx
<Link key={v.id} href={`/verticales/${v.slug}`} className="group">
  <Card className="relative overflow-hidden hover:shadow-md hover:border-primary/50 transition-all">
    <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: v.color_hex }} />
    <div className="flex flex-col items-center justify-center gap-3 p-6 pt-8 min-h-[160px]">
      <div className="flex items-center justify-center h-16 transition-transform group-hover:scale-105">
        {v.logo_signed_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.logo_signed_url} alt={v.name} className="max-h-14 max-w-[80%] object-contain" />
        ) : (
          <span className="text-3xl font-extrabold" style={{ color: v.color_hex }}>
            {v.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {v.espacios} espacio{v.espacios !== 1 ? "s" : ""} · {v.informes} informe{v.informes !== 1 ? "s" : ""}
      </p>
    </div>
  </Card>
</Link>
```

**Detalle de vertical — query server-side:**
```tsx
// page.tsx (resumen)
const { data: vRaw } = await supabaseAdmin
  .from("verticals").select("id, name, slug, logo_url, color_hex").eq("slug", slug).single();
const vertical = vRaw as { id: string; name: string; slug: string; logo_url: string | null; color_hex: string } | null;
if (!vertical) notFound();
const logoUrl = vertical.logo_url ? await getSignedLogoUrl(vertical.logo_url) : null;

let spacesQuery = supabaseAdmin
  .from("client_spaces")
  .select("id, slug, created_by, clients(id, name, contact_name, contact_phone, contact_whatsapp), client_recipients:clients(client_recipients(email, is_primary))")
  .eq("vertical_id", vertical.id)
  .order("created_at", { ascending: false });
if (!isAdmin) spacesQuery = spacesQuery.eq("created_by", user.id);
```
> **GOTCHA join:** el join anidado a `client_recipients` a través de `clients` puede inferir `never`; castear con `as unknown as <tipo>` (patrón CLAUDE.md). Si el join doble es problemático, hacer una segunda query a `client_recipients` por `client_id` y mapear el email primario.

**Espacio — layout de 2 columnas (en page.tsx / SpaceReportsClient):**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
  <section>{/* Informes (SpaceReportsClient) */}</section>
  <aside>
    <Card className="p-5 flex flex-col gap-4">
      <h2 className="font-bold text-foreground">Datos de Contacto</h2>
      {/* persona, email, teléfono, creado por, fecha — con iconos lucide */}
    </Card>
  </aside>
</div>
```

### Desglose de tareas

1. Dashboard: copy + tarjetas de vertical con logo grande + cambiar enlace a `/verticales/{slug}`.
2. Crear `/verticales/[slug]/page.tsx` + `VerticalDetailClient.tsx` (cabecera, buscador, tarjetas de espacio).
3. Reestructurar `/espacios/[id]` a 2 columnas con Datos de Contacto y tarjetas de informe con estado.
4. Navbar: enriquecer el dropdown (enlaces + Cambiar PIN + badge escudo).
5. Migrar a `Dialog`/`AlertDialog`: ClientesClient, ClientDetailClient, SpaceReportsClient (CreateReport + Pin).
6. Modal de vertical: añadir subtítulos.
7. `pnpm build` verde + revisión responsive.

### Dependencias con otras specs

- **Entrante:** [`16-loading-and-motion.md`](16-loading-and-motion.md) (los modales migrados deben animar). 
- **Cruzada:** [`21-employee-master-pin.md`](21-employee-master-pin.md) (el ítem "Cambiar PIN" del menú abre `ChangePinModal`; si 21 no está implementada aún, dejar el ítem deshabilitado).

---

## Tests Requeridos

### Tests de integración obligatorios

Ninguno nuevo (pantallas de lectura). Verificación manual de CA-17.1 a CA-17.9.

### Tests opcionales

- E2E de navegación dashboard → vertical → espacio → informe.

---

## Out of Scope (Explícito)

- Adoptar la terminología "Líneas de Negocio" (se mantiene "Verticales").
- Modo presentación y anotaciones (specs 18/19/20).
- Funcionalidad nueva de servidor; esta spec es presentación + migración de modales.
- Generación de QR para enlaces (propuestas usa QR; informes envía por email — fuera de alcance aquí).

---

## Notas de Implementación

- **Terminología:** UI siempre "Vertical(es)"; nunca "Línea de Negocio". El término de propuestas NO se adopta.
- **Copy informes:** "Informes" / "Nuevo informe" / "Ver informes" / "Gestionar".
- **Estado de informe en tarjetas:** informes no tiene un campo `status` como propuestas ("Pendiente/Aceptada"). Mostrar como badge el **formato** (PDF/HTML) y la **versión activa**; opcionalmente "auto-send" si `auto_send_on_publish`. No inventar estados que la BD no tiene.
- **Columnas confirmadas:** `clients(contact_name, contact_phone, contact_whatsapp)`, `client_recipients(email, is_primary)`, `client_spaces(slug, vertical_id, client_id, created_by)`, `reports(name, slug, current_version, auto_send_on_publish, created_at)`, `report_versions(format)`.

---

## Historial

| Versión | Fecha | Cambio | Autor |
|---------|-------|--------|-------|
| 1.0 | 2026-06-03 | Versión inicial. Dashboard, detalle de vertical, espacio de cliente, menú usuario + migración de modales restantes. | Claude Code |
