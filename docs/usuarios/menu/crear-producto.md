# Crear un producto

## ¿Qué es un producto?

Un producto es lo que tus clientes ven y pueden pedir: tiene nombre, precio, descripción y categoría. Es lo que aparece en tu menú.

**Ejemplos:** Pizza Margarita, Hamburguesa Clásica, Limonada Natural.

---

## Cómo funciona la composición de un producto

Cada producto puede tener ingredientes asignados de tres formas — puedes usar cualquiera de ellas o combinarlas:

| Opción | Cuándo usarla |
|--------|---------------|
| **Solo ingredientes directos** | El producto es único, no comparte su preparación con otros platos |
| **Solo recetas** | La preparación es una receta ya creada que se usa en varios productos |
| **Recetas + ingredientes adicionales** | Tienes una base común (receta) más ingredientes propios de este plato |

> **Con receta** en el asistente: WARO descontará inventario según la receta al vender.
>
> **Venta directa** (reventa): se vende por pieza (`und`); el sistema crea el insumo de stock y la equivalencia en gr o ml.

**¿Cuándo crear una receta primero?** Solo cuando esa preparación se reutiliza en varios productos. Si el plato es único, agrega los ingredientes directamente al producto. → [ver guía de recetas](./recetas.md)

---

## Cómo crear un producto

Ve a **Menú → Productos → Nuevo producto**.

El asistente tiene **4 pasos** si eliges **Con receta**, o **3 pasos** si eliges **Venta directa** (sin paso de receta).

### Paso 1 — Tipo de producto

Elige cómo se prepara o vende:

| Opción | Significado |
|--------|-------------|
| **Con receta** | Cocina · ingredientes y recetas base; cada venta descuenta inventario |
| **Venta directa** | Reventa · pieza (`und`) con equivalencia en gr o ml |

### Paso 2 — Información general

| Campo | Qué poner | Obligatorio |
|-------|-----------|:-----------:|
| Nombre del producto | El nombre que verán tus clientes. Ej: `Pizza Margarita` | Sí |
| Descripción | Una descripción corta del plato | No |
| Categoría | A qué grupo pertenece (Entradas, Platos fuertes, Bebidas...) | Sí |
| Precio de venta | Precio en pesos colombianos | Sí |
| Tiempo de preparación | Cuántos minutos tarda (solo **Con receta**) | No |
| Equivalencia gr/ml | Peso o volumen por unidad vendida (solo **Venta directa**) | Sí |
| Disponible para venta | Si está activo en tu menú | — |
| Disponible para domicilios | Si aparece en pedidos online (delivery / pickup) | — |
| Pedido en mesa (QR) | Si aparece en el menú QR de las mesas | — |

> Si desactivas "Disponible para venta", el producto no aparece en ningún menú hasta que lo actives de nuevo.
>
> **Pedido en mesa (QR)** es independiente de domicilios.

### Paso 3 — Receta (solo Con receta)

Aquí defines de qué está hecho el producto:

**Agregar recetas** — haz clic en **+ Agregar Receta Base** y busca una receta ya creada.

**Agregar ingredientes directos** — agrega ingredientes uno a uno con su cantidad.

**Si el ingrediente no existe:** en el buscador aparece **+ Crear ingrediente** (panel lateral sin salir del formulario).

→ [Ver más sobre ingredientes propios](https://warocol.com/docs/usuarios/compras#ingredientes-propios)

Puedes dejar recetas e ingredientes vacíos al crear; podrás completarlos después, pero el costo y el descuento de inventario serán más precisos con la receta definida.

### Paso 4 — Revisión y confirmación

Revisa el resumen: nombre, categoría, receta o datos de reventa, y estado. Si todo está bien, haz clic en **Crear producto**.

---

## ¿El producto aparece en el menú online inmediatamente?

Sí, siempre que tengas marcada la opción **Disponible para domicilios**. Si no la marcas, el producto existe en el sistema pero no es visible para tus clientes online.

---

## Preguntas frecuentes

**¿Puedo cambiar el precio después?**
Sí. Ve a **Menú → Productos**, abre el producto y edítalo.

**¿Qué pasa si no le asigno recetas ni ingredientes (Con receta)?**
El producto funciona para ventas, pero WARO no podrá calcular su costo ni descontar ingredientes del inventario automáticamente hasta que definas la receta.

**¿Puedo asignar varias recetas al mismo producto?**
Sí. Puedes combinar múltiples recetas y además agregar ingredientes adicionales.

**¿Cómo agrego modificadores (tamaños, extras, salsas)?**
Los modificadores se crean por separado y se asignan a uno o más productos. Ver [guía de modificadores](./modificadores.md).

**¿Cómo agrego una foto al producto?**
En el paso de información general, o desde la edición del producto después de crearlo.
