# SPEC-00: Visión General del Proyecto

**Versión:** 1.0
**Estado:** draft
**Última actualización:** 2026-06-02

---

## Descripción

informes.immoral.es es una plataforma interna de Immoral para entregar informes y reportes a clientes en formato PDF o HTML. Cada informe consta de un **documento principal** renderizable en el navegador más una lista opcional de **adjuntos descargables**. El cliente accede mediante URL pública protegida: por **magic link** enviado al email autorizado del cliente o por **PIN de 4 dígitos**. No requiere cuenta.

El sistema está organizado por verticales de negocio → clientes → espacios de cliente (cliente × vertical) → informes.

En Fase 2, el cliente puede dejar comentarios anclados al documento (estilo Figma) que el empleado responde en hilo sin sacar al cliente del informe. En Fase 3 se habilita un modo presentación sincronizado entre presentador y audiencia.

---

## Dominio

`https://informes.immoral.es`

---

## Actores

| Actor | Descripción |
|-------|-------------|
| **Admin** | Empleado de Immoral con acceso total. Gestiona verticales, dominios autorizados, usuarios y puede ver y operar sobre todo el contenido. |
| **Empleado** | Empleado de Immoral. Crea y gestiona informes propios y los que alguien le comparte explícitamente. Gestiona los destinatarios autorizados de los clientes que ha creado. |
| **Destinatario (cliente externo)** | Persona externa a Immoral, asociada a un cliente con email autorizado. Recibe magic links en su email y/o PIN. Accede al informe, descarga adjuntos y, en Fase 2, deja comentarios anclados y lee las respuestas del empleado. Su identidad queda asociada a cada acceso y a cada comentario. |

> No existe el actor "Espectador" anónimo de propuestas. Todo acceso al informe requiere identidad asociada (recipient via magic link) o credencial scoped (PIN). El PIN no asocia identidad — quien entra por PIN está autenticado para el informe pero no para un destinatario concreto.

---

## Estructura de URLs

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/` | Dashboard principal | Empleados autenticados |
| `/login` | Pantalla de inicio de sesión | Público |
| `/admin/verticales` | Gestión de verticales | Admin |
| `/admin/usuarios` | Gestión de usuarios y dominios | Admin |
| `/clientes` | Listado de clientes (panel interno) | Empleados |
| `/clientes/[cliente]` | Detalle de cliente + destinatarios + espacios | Empleados |
| `/[space-slug]/[report-slug]` | Vista pública del informe | Destinatario (magic link) / Cliente (PIN) |
| `/[space-slug]/[report-slug]/r/[token]` | Consumo de magic link → redirige al viewer con cookie | Público con token válido |

---

## Jerarquía de Contenido

```
Vertical (ej: immoralia)
└── Cliente (ej: Selvático)
    ├── Destinatarios autorizados (ej: olga@selvatico.es, marc@selvatico.es)
    └── Espacio de Cliente (cliente × vertical, ej: selvatico×immoralia)
        └── Informe (ej: informe-mensual-junio)
            ├── Documento principal (versionado: v1, v2, v3...)
            └── Adjuntos (descargables)
```

La URL pública de un informe es siempre:
`https://informes.immoral.es/[space-slug]/[report-slug]`

Ejemplo: `https://informes.immoral.es/selvatico/informe-mensual-junio`

---

## Convención de Slugs

- Generados automáticamente desde el nombre ingresado
- Reglas: minúsculas, sin acentos, espacios y caracteres especiales → guión `-`
- Ejemplos: "Selvático" → `selvatico`, "Informe Mensual Junio" → `informe-mensual-junio`
- Son **inmutables** una vez guardados (el usuario es advertido antes de confirmar)
- En caso de colisión dentro del mismo scope, el sistema sugiere una variante: `informe-mensual-junio-2`
- Scope de unicidad:
  - `client_spaces.slug` → global
  - `reports.slug` → único dentro de `(space_id, slug)`

---

## Modelo de Datos Completo

> Este modelo es la fuente única. Las migraciones SQL y los tipos TypeScript deben reflejarlo. Las specs funcionales referencian las tablas y campos relevantes aquí definidos.

### profiles
Extiende la tabla de usuarios de autenticación.
```
id                          uuid PK (igual que auth.users.id)
full_name                   text
role                        enum('admin', 'employee')
notification_email_enabled  boolean DEFAULT true
created_at                  timestamptz
```

### authorized_domains
Dominios de email autorizados para acceder al panel interno.
```
id          uuid PK
domain      text UNIQUE        -- ej: "immoral.es"
created_at  timestamptz
```

### verticals
Líneas o unidades de negocio de Immoral.
```
id          uuid PK
name        text               -- ej: "immoralia"
slug        text UNIQUE        -- ej: "immoralia"
logo_url    text               -- URL en storage
color_hex   text               -- ej: "#3980E4"
created_by  uuid → profiles
created_at  timestamptz
```

### clients
Entidad global que representa a un cliente real, independiente de los verticales.
```
id               uuid PK
name             text NOT NULL      -- ej: "Selvático"
contact_name     text (nullable)
contact_phone    text (nullable)
contact_whatsapp text (nullable)
created_by       uuid → profiles
created_at       timestamptz
```

### client_recipients
Lista de destinatarios autorizados que pueden recibir magic links. Cada cliente tiene N destinatarios.
```
id            uuid PK
client_id     uuid → clients
email         text NOT NULL                  -- email destino del magic link
full_name     text (nullable)
role_label    text (nullable)                -- ej: "Marketing Manager"
is_primary    boolean DEFAULT false          -- destinatario por defecto al enviar
created_by    uuid → profiles
created_at    timestamptz
-- UNIQUE (client_id, lower(email))
```

### client_spaces
Espacio que vincula a un cliente con un vertical. Agrupa los informes de ese cliente en ese vertical.
```
id           uuid PK
client_id    uuid → clients         -- obligatorio
vertical_id  uuid → verticals
slug         text UNIQUE            -- ej: "selvatico", generado desde clients.name
created_by   uuid → profiles
created_at   timestamptz
-- UNIQUE (client_id, vertical_id): un cliente no puede tener dos espacios en el mismo vertical
```

### reports
Informe con URL y PIN propios. Sin estado de aprobación, sin caducidad.
```
id                   uuid PK
space_id             uuid → client_spaces
name                 text
slug                 text                       -- único dentro de space_id
pin_hash             text                       -- bcrypt del PIN de 4 dígitos
pin_encrypted        text (nullable)            -- PIN cifrado para mostrarlo al empleado autenticado
pin_updated_at       timestamptz NOT NULL DEFAULT now()
auto_send_on_publish boolean DEFAULT false      -- toggle por informe: envía magic link al primary recipient al publicar
current_version      int DEFAULT 1
created_by           uuid → profiles
created_at           timestamptz
updated_at           timestamptz
```

### report_versions
Historial de versiones del documento principal de un informe.
```
id              uuid PK
report_id       uuid → reports
version_number  int
format          text NOT NULL              -- 'pdf' | 'html'
storage_path    text                       -- path en Supabase Storage
size_bytes      bigint
created_by      uuid → profiles
created_at      timestamptz
-- UNIQUE (report_id, version_number)
```

### report_attachments
Adjuntos descargables del informe (no del versionado).
```
id              uuid PK
report_id       uuid → reports
filename        text NOT NULL              -- nombre visible al cliente
mime_type       text NOT NULL
storage_path    text NOT NULL
size_bytes      bigint NOT NULL
display_order   int DEFAULT 0
created_by      uuid → profiles
created_at      timestamptz
```

### magic_link_tokens
Tokens one-time enviados por email al destinatario autorizado.
```
id            uuid PK
report_id     uuid → reports
recipient_id  uuid → client_recipients
token_hash    text NOT NULL              -- SHA-256(token); el token raw solo viaja en el email
expires_at    timestamptz NOT NULL       -- now() + 30 minutos
consumed_at   timestamptz (nullable)     -- NULL = no consumido
created_by    uuid → profiles            -- empleado que envió
created_at    timestamptz
```

### report_sessions
Sesiones de acceso de clientes externos. Una cookie en el navegador = una fila.
```
id            uuid PK
report_id     uuid → reports
recipient_id  uuid → client_recipients (nullable)  -- conocido si la sesión vino de magic link
token_hash    text NOT NULL                        -- SHA-256(session_token)
session_type  text NOT NULL DEFAULT 'pin'          -- 'pin' | 'magic_link' | 'presentation'
expires_at    timestamptz NOT NULL                 -- now() + 48h para pin/magic_link; NULL para presentation
ended_at      timestamptz (nullable)               -- solo presentation
created_at    timestamptz
```

### pin_attempts
Control de intentos fallidos de PIN para rate limiting.
```
id             uuid PK
report_id      uuid → reports
ip_address     text
attempts       int DEFAULT 0
blocked_until  timestamptz (nullable)
last_attempt   timestamptz
-- UNIQUE (report_id, ip_address)
```

### magic_link_requests
Control de solicitudes de magic link para rate limiting (anti-spam).
```
id            uuid PK
report_id     uuid → reports
recipient_id  uuid → client_recipients
ip_address    text
attempts      int DEFAULT 0
last_attempt  timestamptz
window_start  timestamptz
-- UNIQUE (report_id, recipient_id, ip_address)
```

### report_notes (Fase 2)
Comentarios anclados al documento.
```
id                   uuid PK
report_version_id    uuid → report_versions
author_type          text NOT NULL          -- 'employee' | 'recipient'
author_employee_id   uuid → profiles (nullable)
author_recipient_id  uuid → client_recipients (nullable)
parent_note_id       uuid → report_notes (nullable)  -- raíz vs respuesta en hilo
anchor_type          text NOT NULL          -- 'dom' | 'pdf_coords'
dom_selector         text (nullable)
pdf_page             int (nullable)
pdf_x_norm           numeric(5,4) (nullable)
pdf_y_norm           numeric(5,4) (nullable)
content              text NOT NULL
is_orphan            boolean DEFAULT false
created_at           timestamptz
deleted_at           timestamptz (nullable)
-- CHECK: exactamente uno de (author_employee_id, author_recipient_id) presente, consistente con author_type
-- CHECK: anchor_type='dom' implica dom_selector NOT NULL; anchor_type='pdf_coords' implica pdf_page, pdf_x_norm, pdf_y_norm NOT NULL
```

### report_note_logs (Fase 2)
Log append-only de cambios en comentarios.
```
id                id uuid PK
note_id           uuid → report_notes
action            text NOT NULL          -- 'created' | 'edited' | 'deleted'
previous_content  text (nullable)
performed_by_type text NOT NULL          -- 'employee' | 'recipient'
performed_by_id   uuid
performed_at      timestamptz
```

### notifications (Fase 2)
Notificaciones in-app para empleados.
```
id          uuid PK
user_id     uuid → profiles
type        enum('report_commented', 'report_reply_received', 'report_opened')
report_id   uuid → reports
note_id     uuid → report_notes (nullable)
read_at     timestamptz (nullable)
created_at  timestamptz
```

---

## Responsive Breakpoints

| Nombre | Ancho mínimo | Uso en la plataforma |
|--------|-------------|----------------------|
| mobile | 375px | Viewer del informe + UI responsive |
| tablet | 768px | Viewer del informe + UI responsive |
| desktop | 1280px | Viewer del informe + UI responsive (default) |

---

## Estados de una Sesión de Acceso

| Estado | Descripción |
|--------|-------------|
| Sin sesión | El cliente no tiene cookie válida. Ve modal con dos opciones: pegar PIN o reenviarme magic link. |
| Sesión activa por PIN | Cookie válida, `session_type='pin'`. No hay identidad de destinatario asociada. |
| Sesión activa por magic link | Cookie válida, `session_type='magic_link'`, `recipient_id` poblado. Los comentarios se asocian a ese recipient. |
| Sesión expirada | `expires_at < now()`. El servidor devuelve 401 y el viewer vuelve a mostrar el modal. |
| Sesión revocada | El empleado regeneró el PIN del informe; todas las sesiones de ese informe se eliminan. |

---

## Diferencias clave respecto al sistema de propuestas

| Aspecto | Propuestas | Informes |
|---------|-----------|----------|
| Contenido principal | HTML | PDF o HTML (+ adjuntos opcionales) |
| Acceso del cliente | PIN obligatorio | Magic link (preferente) + PIN (fallback), coexisten |
| Identidad del cliente | Anónima | Conocida si entra por magic link (recipient asociado) |
| Estado | pending / accepted / rejected | Sin estado, solo lectura |
| Caducidad | Configurable | No (los informes viven indefinidamente) |
| Interacción cliente | CTA aceptar/rechazar | Lectura + comentarios anclados (Fase 2) |
| Versionado | Sí | Sí |
| Modo presentación | Sí | Sí, Fase 3 |
| Infraestructura | Supabase compartido | Proyecto Supabase NUEVO e independiente |
