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

> Un producto puede funcionar sin ninguna composición. En ese caso WARO no calculará costos ni descontará inventario — útil para productos de reventa o que no controlas por ingrediente.

**¿Cuándo crear una receta primero?** Solo cuando esa preparación se reutiliza en varios productos. Si el plato es único, agrega los ingredientes directamente al producto. → [ver guía de recetas](./recetas.md)

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
| Tiempo de preparación | Cuántos minutos tarda en prepararse | No |
| Disponible para venta | Si está activo en tu menú | — |
| Disponible para domicilios | Si aparece en pedidos online (delivery / pickup) | — |

> Si desactivas "Disponible para venta", el producto no aparece en ningún menú hasta que lo actives de nuevo.

### Paso 2 — Recetas e ingredientes

Aquí defines de qué está hecho el producto. Tienes dos opciones independientes que puedes combinar:

**Agregar recetas** — haz clic en **+ Agregar Receta Base** y busca una receta ya creada. Útil cuando la preparación la comparten varios productos.

**Agregar ingredientes directos** — agrega ingredientes uno a uno con su cantidad, sin necesidad de una receta. Útil cuando el plato es único.

**Si el ingrediente no existe:** en el buscador aparece la opción **+ Crear ingrediente**. Haz clic para abrirlo en un panel lateral sin salir del formulario. Necesitarás: Nombre, Tipo de medida (Peso/Volumen/Pieza) y Categoría — los tres obligatorios. La categoría del ingrediente es independiente de la categoría del producto.

→ [Ver guía completa de Ingredientes Propios](../compras.md#ingredientes-propios)

Puedes dejar este paso completamente vacío si no necesitas control de costos ni inventario para este producto.

### Paso 3 — Revisión y confirmación

Revisa el resumen: nombre, categoría y estado. Si todo está bien, haz clic en **Crear producto**.

---

## ¿El producto aparece en el menú online inmediatamente?

Sí, siempre que tengas marcada la opción **Disponible para domicilios**. Si no la marcas, el producto existe en el sistema pero no es visible para tus clientes online.

---

## Preguntas frecuentes

**¿Puedo cambiar el precio después?**
Sí. Ve a **Menú → Productos**, abre el producto y edítalo.

**¿Qué pasa si no le asigno recetas ni ingredientes?**
El producto funciona para ventas, pero WARO no podrá calcular su costo ni descontar ingredientes del inventario automáticamente.

**¿Puedo asignar varias recetas al mismo producto?**
Sí. Puedes combinar múltiples recetas y además agregar ingredientes adicionales por fuera de ellas.

**¿Cómo agrego modificadores (tamaños, extras, salsas)?**
Los modificadores se crean por separado y se asignan a uno o más productos. Ver [guía de modificadores](./modificadores.md).

**¿Cómo agrego una foto al producto?**
Desde la pantalla de edición del producto, después de crearlo.
