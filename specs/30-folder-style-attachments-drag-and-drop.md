# SPEC-30: Adjuntos Estilo Carpeta y Subida Drag & Drop

**Versión:** 1.0
**Estado:** draft
**Última actualización:** 2026-06-08
**Owner:** Antigravity

---

## Descripción
Mejorar la experiencia de usuario (UX) en la gestión de adjuntos de los informes. En lugar de una lista simple con carga síncrona y opaca, se implementará una vista estilo "carpeta de archivos" con soporte para arrastrar y soltar (Drag & Drop), además de una interfaz de carga animada (overlay/modal) que muestre el progreso en tiempo real de los archivos subidos.

## Actores
- **Administrador / Empleado:** Usuario gestor del informe que sube y elimina adjuntos.

## Flujos Principales

### Flujo 1: Subida mediante Drag & Drop y Progreso
1. El usuario accede a la página de edición de un informe (`/informes/[id]`).
2. Visualiza la sección de "Adjuntos", que ahora cuenta con una zona delimitada y animada con el texto "Arrastra tus archivos aquí o haz clic para subir".
3. El usuario arrastra uno o varios archivos dentro del área de la "carpeta" o hace clic en ella para seleccionar archivos locales.
4. Al soltar/seleccionar los archivos:
   - Se muestra un overlay de carga animado en el panel de adjuntos (o pantalla completa) con una barra de progreso circular o lineal.
   - El overlay muestra textualmente el nombre del archivo actual en proceso y el porcentaje progresivo de subida (ej. "Subiendo marketing_report.pdf - 45%").
5. Una vez completado el 100%, se limpia el modal de carga y el nuevo archivo se lista en la "carpeta" de adjuntos.

### Flujo 2: Vista Estilo Carpeta
1. Los archivos adjuntos se listan simulando un explorador de archivos dentro de una tarjeta/carpeta estilizada.
2. Cada archivo tiene un icono representativo de su extensión/mimetype (ej. icono rojo para PDF, verde para Excel, azul para Word, imagen para PNG/JPG).
3. Se muestra el tamaño del archivo formateado y la fecha de creación.
4. El usuario puede hacer clic en "Descargar" o en el icono de eliminación (Trash) con diálogo de confirmación.

### Flujo 3: Vista del Cliente estilo Google Drive (Viewer)
1. Cuando el cliente accede a su visor de informe (`/[space]/[slug]`) y hace clic en la opción de ver "Adjuntos":
   - Se abre el modal de adjuntos (`AttachmentsModal.tsx`).
   - En lugar de listarse de manera genérica, los archivos se muestran en una cuadrícula (grid) que imita a **Google Drive**.
   - Cada tarjeta de archivo cuenta con un contenedor superior grande de previsualización (para imágenes muestra un preview recortado, para otros archivos muestra un gran icono de formato sobre un fondo tenue).
   - En la parte inferior de la tarjeta se detalla el nombre del archivo con un icono pequeño, su tamaño y el botón de descarga.

## Criterios de Aceptación
- [ ] CA-01: El panel de adjuntos debe soportar arrastrar archivos (Drag over / Drop) aplicando estilos interactivos activos (borde primario, fondo translúcido).
- [ ] CA-02: Se debe mostrar una pantalla o panel de carga animado que capture el porcentaje exacto de la subida (del 0% al 100%).
- [ ] CA-03: Para rastrear el progreso en tiempo real, la subida debe realizarse mediante un endpoint HTTP tradicional (ej: API route `POST`) utilizando un cliente XMLHttpRequest o fetch con streaming, ya que las Server Actions de Next.js no proveen progreso de subida nativo en el cliente.
- [ ] CA-04: La vista de los archivos ya subidos debe tener un estilo visual de "carpeta" limpia (grid o lista estructurada con colores Immoral, iconos descriptivos por tipo de archivo, tamaño y acciones).
- [ ] CA-05: El tamaño máximo de archivo de 25MB y los mimetypes permitidos (PDF, Word, Excel, PowerPoint, PNG, JPG, ZIP) deben validarse tanto en cliente antes de iniciar el progreso como en el backend.
- [ ] CA-06: El modal del cliente (`AttachmentsModal.tsx`) debe desplegar los adjuntos en un grid que simule a Google Drive (bloque de previsualización superior grande e información de archivo inferior con acciones).

## UI / Páginas Afectadas

### Páginas modificadas
- [ReportManageClient.tsx](file:///c:/Users/Julimuz/Immoral/informes-immoral/src/app/(panel)/informes/[id]/ReportManageClient.tsx): Reemplazar el input file simple y la lista clásica por el componente de carpeta drag & drop con barra de progreso.
- [AttachmentsModal.tsx](file:///c:/Users/Julimuz/Immoral/informes-immoral/src/app/[space]/[slug]/AttachmentsModal.tsx): Rediseñar el listado de archivos para adoptar la estética "Google Drive Grid".

### Componentes nuevos
- [NEW] [FolderAttachmentList.tsx](file:///c:/Users/Julimuz/Immoral/informes-immoral/src/components/reports/FolderAttachmentList.tsx): Renderizado tipo explorador de archivos con soporte de Drag & Drop y los mimetypes iconográficos.
- [NEW] [UploadProgressOverlay.tsx](file:///c:/Users/Julimuz/Immoral/informes-immoral/src/components/reports/UploadProgressOverlay.tsx): Overlay animado que muestra el progreso del archivo actual.

## API / Endpoints

### Endpoints nuevos
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|---------------|
| POST | /api/reports/[id]/attachments | Recibe un archivo adjunto, valida permisos de edición del informe, lo sube a storage e inserta en la base de datos. | Cookie de sesión activa (empleado/admin creador del informe) |

### Contratos de request/response
- **POST /api/reports/[id]/attachments**:
  - **Body**: `multipart/form-data` con el campo `file`.
  - **Response (200 OK)**:
    ```json
    {
      "success": true,
      "attachment": {
        "id": "uuid",
        "filename": "archivo.pdf",
        "mime_type": "application/pdf",
        "size_bytes": 102456,
        "storage_path": "...",
        "created_at": "...",
        "signed_url": "..."
      }
    }
    ```
  - **Response (400/403/500)**:
    ```json
    {
      "error": "Mensaje de error detallado"
    }
    ```

## Notas de Seguridad
- Se debe validar la sesión server-side utilizando el mismo helper de control de acceso: `assertCanManageReport` adaptado a la API route.
- El archivo debe sanitizarse (nombre libre de caracteres maliciosos, extensiones validadas) antes de guardarse en el bucket privado.

## Plan de Implementación

### Arquitectura propuesta
- **FRONTEND-AGENT:**
  1. Crear el componente `FolderAttachmentList` con hooks para los eventos de drag & drop (`onDragOver`, `onDragLeave`, `onDrop`).
  2. Crear el componente modal `UploadProgressOverlay` con soporte de visualización de porcentaje.
  3. Implementar función de subida usando `XMLHttpRequest` en el cliente para enganchar el evento `upload.onprogress`.
  4. Integrar ambos componentes en `ReportManageClient.tsx`.
- **BACKEND-AGENT:**
  1. Crear la ruta de API `POST /api/reports/[id]/attachments/route.ts` abstrayendo la lógica del Server Action `addAttachment` existente.

### Desglose de tareas
1. Definir endpoint `POST /api/reports/[id]/attachments/route.ts` y portar lógica de autorización de `actions.ts`.
2. Validar que la subida por API route respete las políticas RLS y los límites de tipo/tamaño.
3. Desarrollar componentes UI `FolderAttachmentList` y `UploadProgressOverlay` con Tailwind CSS.
4. Conectar la lógica de carga interactiva de `ReportManageClient.tsx` con el endpoint API en vez del Server Action directo.

## Out of Scope
- Descargas en lote (ZIP con todos los archivos de la carpeta).
- Crear subcarpetas dinámicas dentro del informe (los adjuntos se listan en un único nivel de carpeta lógica).
- Cambiar el nombre del archivo directamente desde la interfaz.
