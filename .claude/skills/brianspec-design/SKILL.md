---
name: brianspec-design
description: Aplica el sistema de diseño visual de Immoral Group en cualquier proyecto. Actívala cuando el usuario diga "arregla esta página", "arregla el diseño", "esta página no sigue el diseño", "crea una nueva página", "crea un módulo", "nueva página siguiendo el sistema", "inicializa el diseño", "monta el sistema visual", "instala el design system", o cualquier variante de crear/arreglar/inicializar el sistema visual de Immoral. Esta skill garantiza que la salida sea idéntica al diseño de propuestas-immoral definido en brand.md y tokenui.md.
---

# brianspec-design

## Propósito

Garantizar que cualquier página, componente o UI que se cree o modifique en un proyecto de Immoral Group sea **100% idéntica** al sistema de diseño definido en `brand.md` y `tokenui.md`.

Esta skill tiene tres modos de operación:

- **Modo ARREGLAR**: corregir un archivo existente que no sigue el diseño
- **Modo PÁGINA**: crear una nueva página o módulo desde cero
- **Modo INICIAR**: hacer bootstrap del sistema visual en un proyecto nuevo

---

## Contexto obligatorio

Antes de actuar en cualquier modo, leer:

1. `brand.md` — identidad de marca, colores exactos, tipografía, voz
2. `tokenui.md` — código exacto: clases Tailwind, componentes, animaciones

Si alguno de estos archivos no existe en el proyecto, ejecutar primero el **Modo INICIAR**.

---

## Modo ARREGLAR

**Activación**: "arregla esta página", "esta página no sigue el diseño", "arregla el diseño de X"

### Pasos

1. Leer `brand.md` y `tokenui.md`
2. Leer el archivo que el usuario señale (o pedir que lo indique si no especifica)
3. Auditar exhaustivamente, buscando **todos** los desvíos en estas categorías:

**Layout y estructura:**
- ¿El outer wrapper es `<div className="space-y-8">`? Si hay `container mx-auto`, `max-w-*`, padding propio → ARREGLAR
- ¿Los headers de página tienen `pb-6 border-b`?
- ¿El grid usa `grid-cols-1 lg:grid-cols-3 gap-8` para layout con sidebar?

**Tipografía y labels:**
- ¿Las labels de sección son `text-xs font-semibold uppercase tracking-wider text-muted-foreground`?
- ¿Hay `<CardTitle>` o `<CardDescription>` usados como labels internas? → REEMPLAZAR por `<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">`

**Botones:**
- ¿El CTA principal tiene `className="bg-brand hover:bg-brand/90 text-white"`?
- ¿Hay `<Button>` con `variant="default"` que debería ser brand?

**Animaciones:**
- ¿Las listas usan `variants.stagger` o `variants.staggerFast` en el padre?
- ¿Los hijos usan `variants.slideUp` o `variants.scaleIn`?
- ¿Los cards usan `{...interactive.card}`? ¿Los rows usan `{...interactive.row}`?
- ¿Hay transiciones inline en lugar de importadas de `@/lib/motion`?

**Otros:**
- ¿Las fechas son `toLocaleDateString('es-ES')`?
- ¿Los textos están en español?

4. Aplicar todos los arreglos en el archivo
5. Reportar qué cambios se hicieron, agrupados por categoría

**Qué NO cambiar**: lógica de negocio, tipos TypeScript, queries, props, nombres de funciones.

---

## Modo PÁGINA

**Activación**: "crea una nueva página", "crea un módulo", "nueva página siguiendo el sistema"

### Pasos

1. Leer `brand.md` y `tokenui.md`
2. Preguntar al usuario (si no lo especificó):
   - ¿Qué tipo de página? (lista, detalle, formulario, dashboard, mixta)
   - ¿Qué datos muestra?
   - ¿Tiene sidebar de info?
   - ¿Dónde va en la estructura de carpetas?

3. Crear la página aplicando los patrones de `tokenui.md`:

**Página de lista:**
```tsx
<div className="space-y-8">
  <div className="flex items-start justify-between pb-6 border-b">
    <div>
      <h1 className="text-xl font-bold">Título</h1>
      <p className="text-sm text-muted-foreground mt-1">Subtítulo</p>
    </div>
    <Button className="bg-brand hover:bg-brand/90 text-white">
      <Plus className="w-4 h-4 mr-2" /> Acción
    </Button>
  </div>
  {/* Grid animado */}
  <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    variants={variants.stagger} initial="hidden" animate="visible">
    {items.map(item => (
      <motion.div key={item.id} variants={variants.scaleIn} {...interactive.card}>
        <Card>...</Card>
      </motion.div>
    ))}
  </motion.div>
</div>
```

**Página de detalle (con sidebar):**
```tsx
<div className="space-y-8">
  <div className="flex items-start justify-between pb-6 border-b">...</div>
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
    <div className="lg:col-span-2 space-y-6">...</div>
    <div className="space-y-6">
      <div className="rounded-lg border p-4 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Título sidebar
        </p>
      </div>
    </div>
  </div>
</div>
```

4. Añadir todas las animaciones de `@/lib/motion`
5. Usar shadcn/ui para todos los componentes UI
6. TypeScript estricto, interfaces para todos los props
7. `'use client'` solo si hay hooks, eventos o motion

---

## Modo INICIAR

**Activación**: "inicializa el diseño", "monta el sistema visual", "instala el design system", "el proyecto no tiene motion.ts"

### Pasos

1. Verificar que `brand.md` y `tokenui.md` existen en la raíz del proyecto. Si no, copiarlos desde el template de BrianSpec.

2. Verificar que `src/lib/motion.ts` existe. Si no, crearlo con el contenido completo de la sección 14 de `tokenui.md`.

3. Verificar `globals.css` — debe tener los tokens de color de Immoral:
   ```css
   --color-brand: #3980E4;
   --color-accent: #A8FFFF;
   --color-black: #111111;
   --color-gray-light: #D8D8D8;
   --color-gray-mid: #5E5E5E;
   ```
   Y en `@theme inline`:
   ```css
   --color-brand: var(--color-brand);
   --font-sans: var(--font-lexend), ui-sans-serif, system-ui, sans-serif;
   ```

4. Verificar que Lexend está configurada en `src/app/layout.tsx`.

5. Verificar que `src/components/shared/MotionMain.tsx` existe. Si no, crearlo.

6. Verificar que `framer-motion` está en `package.json`. Si no: `npm install framer-motion`.

7. Reportar qué se creó y qué ya existía.

---

## Reglas de esta skill

1. **Nunca inventar clases** — solo usar las que están en `tokenui.md`.
2. **Leer `tokenui.md` completo antes de actuar** — no operar de memoria.
3. **No tocar lógica de negocio** en Modo ARREGLAR.
4. **Siempre verificar** que `motion.ts` existe antes de añadir animaciones.
5. **Idioma español** en toda la UI generada.

---

*Skill brianspec-design v1.0 — BrianSpec system · Immoral Group*
