# Productos

## ¿Qué es un producto?

Un producto es lo que tus clientes ven y pueden pedir: tiene nombre, precio, descripción y una foto. Es lo que aparece en tu menú.

**Ejemplos:** Pizza Margarita, Hamburguesa Clásica, Limonada Natural.

---

## Antes de crear un producto

Cada producto puede estar vinculado a una receta base. La receta le dice a WARO qué artículos de bodega consume ese producto, lo que permite calcular costos y controlar inventario.

Si quieres ese control, crea primero la receta. Si por ahora solo necesitas registrar el producto, puedes crearlo sin receta y agregarla después.

**Orden recomendado:** receta → producto.

---

## Cómo crear un producto

Ve a **Menú → Productos → Nuevo producto**.

El formulario tiene 3 pasos:

### Paso 1 — Información general

| Campo | Qué poner | Obligatorio |
|-------|-----------|:-----------:|
| Nombre del producto | El nombre que verán tus clientes. Ej: `Pizza Margarita` | Sí |
| Descripción | Una descripción corta del plato | No |
| Categoría | A qué grupo pertenece (Entradas, Platos fuertes, Bebidas...) | Sí |
| Precio de venta | Precio en pesos colombianos | Sí |
| Costo real (sistema) | Lo calcula WARO desde la receta y las compras de artículos de bodega (solo lectura) | — |
| Mi costo del plato | Costo operativo que tú defines para márgenes y reportes; el sistema no lo sobrescribe | No |
| Tiempo de preparación | Cuántos minutos tarda en prepararse | No |
| Disponible para venta | Si está activo en tu menú | — |
| Disponible para domicilios | Si aparece en pedidos online (delivery / pickup) | — |
| Pedido en mesa (QR) | Si aparece en el menú QR de las mesas (solo si el módulo QR está activo en Operaciones) | — |

> Si desactivas "Disponible para venta", el producto no aparece en ningún menú hasta que lo actives de nuevo.
>
> **Pedido en mesa (QR)** es independiente de domicilios: un producto puede estar en el QR de mesa sin estar en delivery, y viceversa.

### Paso 2 — Receta / Artículos de bodega

Aquí vinculas el producto a una o más recetas base que ya creaste.

- Haz clic en **+ Agregar Receta Base**
- Busca y selecciona la receta
- Si el producto no tiene receta aún, puedes dejar este paso vacío y continuar

### Paso 3 — Revisión y confirmación

Revisa el resumen: nombre, categoría y estado. Si todo está bien, haz clic en **Crear producto**.

---

## Costo real vs mi costo del plato

WARO maneja dos costos por producto:

| Concepto | Quién lo define | Para qué sirve |
|----------|-----------------|----------------|
| **Costo real (sistema)** | WARO, al guardar el producto con receta | Refleja artículos de bodega y precios de compra; se actualiza si cambian compras o receta |
| **Mi costo del plato** | Tú, opcional | Tu referencia operativa (mano de obra, merma, proveedor distinto, etc.) |

En el listado verás **Margen real** (precio vs costo del sistema) y **Margen operativo** (precio vs tu costo), cuando hayas definido "Mi costo".

Si ambos costos difieren mucho, la fila se resalta en ámbar para que revises si conviene ajustar tu costo percibido o la receta.

---

## ¿El producto aparece en el menú online inmediatamente?

- **Domicilios / pedidos online:** sí, si está marcado **Disponible para domicilios**.
- **QR en mesa:** sí, si está marcado **Pedido en mesa (QR)** y el negocio tiene el módulo QR activo en **Operaciones → Mesas**.

Si no marcas ninguna de las dos, el producto existe en el sistema pero no es visible en esos canales.

---

## Preguntas frecuentes

**¿Puedo cambiar el precio después?**
Sí. Ve a **Menú → Productos**, abre el producto y edítalo.

**¿Qué pasa si no le asigno una receta?**
El producto funciona para ventas, pero WARO no podrá calcular su costo ni descontar artículos de bodega del inventario automáticamente.

**¿Puedo tener el mismo producto en varias categorías?**
No. Cada producto pertenece a una sola categoría. Si necesitas que aparezca en más de un lugar, considera crear variantes o usar modificadores.

**¿Cómo agrego una foto al producto?**
Desde la pantalla de edición del producto, después de crearlo.

**¿Por qué un producto no sale en el menú QR de la mesa?**
Revisa **Pedido en mesa (QR)** en el producto y que el módulo esté activo en **Operaciones → Mesas**. Ver [Mesas](../../operaciones/mesas#pedido-por-qr-en-mesa).
