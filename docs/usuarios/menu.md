# Menú

Desde el módulo de Menú configuras todo lo que le ofreces a tus clientes: las preparaciones base (recetas), los productos que aparecen en el menú y las opciones adicionales (modificadores).

---

## Artículo de bodega vs producto de menú

Al buscar en un formulario de receta o producto verás **artículos de bodega** (y a veces filas marcadas **Reventa**). Si lo que buscas no existe, el sistema te pregunta qué quieres crear:

| Opción | Qué es | Cuándo usarla |
|--------|--------|---------------|
| **Artículo de bodega** | Materia prima en bodega (harina, queso, aceite) | Lo compras y usas en recetas o compras |
| **Producto de menú** | Lo que cobras en POS / domicilios | Platos preparados o **reventa** (gaseosa, snack vendido tal cual) |

**Reventa:** al crear un **producto de menú** de venta directa, el sistema crea solo el artículo de bodega de stock (1 unidad vendida = 1 und descontada). No hace falta crear primero un artículo de bodega suelto con el mismo nombre.

En **compras directas** (factura), “Crear…” solo abre artículo de bodega — no producto de menú.

---

## Recetas

Una receta es una **composición reutilizable de artículos de bodega** que puedes asignar a uno o varios productos. Sirve para evitar repetir la misma lista de artículos de bodega en cada producto.

**Ejemplo práctico:** Tienes una salsa de la casa que usas en 5 platos diferentes. En vez de agregar los mismos 6 artículos de bodega en cada producto, creas una receta "Salsa de la Casa" con esos artículos de bodega y la vinculas a los 5 productos. Si cambias la receta, el cambio aplica a todos.

Las recetas no las ven tus clientes. Son internas: sirven para controlar costos y descontar artículos de bodega del inventario automáticamente.

### ¿Cuándo usar recetas?

Las recetas son **opcionales**. Un producto puede tener:

| Configuración | Cuándo usarla |
|---------------|---------------|
| Solo artículos de bodega directos | El producto es sencillo y único |
| Solo recetas | La preparación es compartida con otros productos |
| Recetas + artículos de bodega adicionales | Tienes una base común más artículos de bodega propios del plato |

> Si un producto es único y simple, agrégale los artículos de bodega directamente. Las recetas tienen valor cuando se **reutilizan**.

### Cómo crear una receta

Ve a **Menú → Recetas → Nueva receta**. El formulario tiene 3 pasos:

**Paso 1 — Información general**

| Campo | Qué poner |
|-------|-----------|
| Nombre | Nombre interno. Ej: `Salsa de la Casa`, `Base de Carne` |
| Estado | Activa o Inactiva |

**Paso 2 — Artículos de bodega**

Busca el artículo de bodega por nombre, escribe la cantidad y la unidad. Repite para cada artículo de bodega. Si no aparece en la búsqueda, usa **Crear "…"** y elige **Artículo de bodega** o **Producto de menú** según corresponda.

**Paso 3 — Revisión y confirmación**

Revisa el resumen y haz clic en **Crear receta**.

### Editar una receta

Ve a **Menú → Recetas**, busca la receta y haz clic en ella. El cambio aplica hacia adelante a todos los productos que la usen.

### Preguntas frecuentes — Recetas

**¿Una receta es obligatoria para crear un producto?**
No. Puedes crear un producto con artículos de bodega directos, sin ninguna receta.

**¿Un producto puede tener varias recetas?**
Sí. Puedes asignar más de una receta y además agregar artículos de bodega adicionales.

**¿Qué pasa si cambio los artículos de bodega de una receta?**
El cambio aplica hacia adelante. Las ventas ya registradas no cambian.

---

## Productos

Un producto es lo que tus clientes ven y pueden pedir: tiene nombre, precio, descripción y categoría.

Cada producto puede tener artículos de bodega asignados de tres formas:

| Opción | Cuándo usarla |
|--------|---------------|
| **Solo artículos de bodega directos** | El producto es único, no comparte su preparación |
| **Solo recetas** | La preparación es una receta ya creada que usan varios productos |
| **Recetas + artículos de bodega adicionales** | Base común más artículos de bodega propios del plato |

> Un producto puede funcionar sin ninguna composición. En ese caso WARO no calculará costos ni descontará inventario.

### Cómo crear un producto

Ve a **Menú → Productos → Nuevo producto**. El formulario tiene 3 pasos:

**Paso 1 — Información general**

| Campo | Obligatorio |
|-------|:-----------:|
| Nombre del producto | Sí |
| Descripción | No |
| Categoría | Sí |
| Precio de venta | Sí |
| Tiempo de preparación | No |
| Disponible para venta | — |
| Disponible para domicilios | — |

**Paso 2 — Recetas e artículos de bodega**

- **+ Agregar Receta Base** — busca una receta ya creada
- **Artículos de bodega directos** — agrega artículos de bodega uno a uno con su cantidad

Si el artículo de bodega no existe, haz clic en **+ Crear artículo de bodega** para crearlo ahí mismo sin salir del formulario.

Puedes dejar este paso vacío si no necesitas control de costos.

**Paso 3 — Revisión y confirmación**

Revisa el resumen y haz clic en **Crear producto**.

### Preguntas frecuentes — Productos

**¿Puedo cambiar el precio después?**
Sí. Ve a **Menú → Productos**, abre el producto y edítalo.

**¿Qué pasa si no le asigno recetas ni artículos de bodega?**
El producto funciona para ventas, pero WARO no calculará su costo ni descontará inventario.

**¿Cómo agrego una foto al producto?**
Desde la pantalla de edición del producto, después de crearlo.

---

## Modificadores

Un modificador es una opción adicional que el cliente puede elegir al pedir un producto. Se agrupa en un **grupo de modificadores**.

**Ejemplos:**
- Grupo "Tamaño" → Personal, Mediana, Grande
- Grupo "Salsa" → BBQ, Rosada, Picante
- Grupo "Extras" → Queso extra (+$2.000), Tocineta (+$3.000)

### Conceptos clave

**Grupo:** la categoría de opciones (ej: "Tamaño").

**Obligatorio vs. opcional:** si el grupo es obligatorio, el cliente no puede pedir el producto sin elegir al menos una opción.

**Selección mínima y máxima:**
- Mín 0, Máx 1 → puede elegir una o ninguna
- Mín 1, Máx 1 → debe elegir exactamente una
- Mín 0, Máx 3 → puede elegir hasta 3 (como extras)

### Cómo crear un grupo de modificadores

Ve a **Menú → Modificadores → Nuevo grupo**. El formulario tiene 3 pasos:

**Paso 1 — Información del grupo**

| Campo | Obligatorio |
|-------|:-----------:|
| Productos a los que aplica | Sí |
| Nombre del grupo | Sí |
| Selección mínima | Sí |
| Selección máxima | Sí |
| Es obligatorio | — |

> Para un grupo de tamaños donde el cliente debe elegir uno: Mín 1, Máx 1, obligatorio.

**Paso 2 — Opciones del grupo**

Por cada opción defines nombre y precio adicional (0 si es gratis). Haz clic en **+ Agregar Modificador** para añadir más.

**Paso 3 — Revisión**

Revisa el resumen y haz clic en **Crear grupo**.

### Preguntas frecuentes — Modificadores

**¿Puedo asignar un grupo a varios productos?**
Sí. Al crear el grupo seleccionas todos los productos que lo necesitan.

**¿Puedo editar las opciones después?**
Sí. Ve a **Menú → Modificadores**, abre el grupo y edítalo.

**¿El cliente puede pedir un producto sin elegir un modificador obligatorio?**
No. El botón de agregar al carrito no se activa hasta que el cliente elija.

---

## Productos de reventa

Los **productos de reventa** son ítems que vendes tal como los compras, sin preparación: una lata de gaseosa, un paquete de papas, una botella de agua. Se comportan como productos normales en el POS y en domicilios, pero su stock se controla directamente sobre el artículo de bodega.

### Cómo gestionar productos de reventa

Ve a **Menú → Productos** y usa el filtro **Reventa** (o **Todos** para ver menú y reventa juntos).

1. **Crea o edita** el producto desde el catálogo — en creación elige el modo *Reventa · pieza (und)* o filtra la lista por Reventa
2. **Asigna el precio de venta** y la categoría
3. **Disponibilidad** — activa o desactiva con el toggle de estado o en modo edición masiva
4. Guarda los cambios

Cada producto de reventa usa **1 unidad** (`und`) del artículo de bodega vinculado — al vender una unidad del producto se descuenta una unidad del artículo de bodega en inventario. Para cantidades fraccionadas (por ejemplo vender medio envase en mililitros), configura la equivalencia gr/ml en la edición del producto.

### Preguntas frecuentes — Reventa

**¿El stock se descuenta automáticamente al vender?**
Sí. Cada vez que se vende una unidad del producto de reventa, se descuenta una unidad del artículo de bodega correspondiente en inventario.

**¿Puedo cambiar el precio después?**
Sí. Ve a **Menú → Productos**, filtra por **Reventa**, abre el producto y edita el precio.

**¿Qué pasa si desactivo un ítem que ya tiene ventas?**
Las ventas anteriores no se modifican. Solo deja de aparecer disponible en el POS y domicilios.
