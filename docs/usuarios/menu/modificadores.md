# Modificadores

## ¿Qué es un modificador?

Un modificador es una opción adicional que el cliente puede elegir al pedir un producto. Se agrupa en lo que se llama un **grupo de modificadores**.

**Ejemplos:**
- Grupo "Tamaño" → opciones: Personal, Mediana, Grande
- Grupo "Salsa" → opciones: BBQ, Rosada, Picante
- Grupo "Sin..." → opciones: Sin cebolla, Sin tomate, Sin lechuga
- Grupo "Extras" → opciones: Queso extra (+$2.000), Tocineta (+$3.000)

Cada grupo se asigna a uno o más productos. Cuando un cliente pide ese producto, verá las opciones del grupo para personalizar su pedido.

---

## Conceptos clave antes de empezar

**Grupo:** el nombre de la categoría de opciones (ej: "Tamaño").

**Modificadores:** cada opción dentro del grupo (ej: "Personal", "Mediana", "Grande"). Cada uno puede tener un precio adicional o ser gratis.

**Obligatorio vs. opcional:** si el grupo es obligatorio, el cliente no puede pedir el producto sin elegir al menos una opción. Si es opcional, puede ignorarlo.

**Selección mínima y máxima:** cuántas opciones puede/debe elegir el cliente.
- Mín 0, Máx 1 → el cliente puede elegir una opción o ninguna
- Mín 1, Máx 1 → el cliente debe elegir exactamente una opción
- Mín 0, Máx 3 → el cliente puede elegir hasta 3 opciones (como extras)

---

## Cómo crear un grupo de modificadores

Ve a **Menú → Modificadores → Nuevo grupo**.

El formulario tiene 3 pasos:

### Paso 1 — Información del grupo

| Campo | Qué poner | Obligatorio |
|-------|-----------|:-----------:|
| Productos | Los productos a los que aplica este grupo | Sí |
| Nombre del grupo | Lo que verá el cliente. Ej: `Tamaño`, `Extras`, `Salsa` | Sí |
| Selección mínima | Cuántas opciones debe elegir mínimo el cliente | Sí |
| Selección máxima | Cuántas opciones puede elegir máximo | Sí |
| Orden de visualización | Si tienes varios grupos, cuál aparece primero (menor número = primero) | No |
| Es obligatorio | Si el cliente debe elegir sí o sí antes de pedir | — |

> **Tip:** Para un grupo de tamaños donde el cliente debe elegir uno, pon Mín: 1 y Máx: 1, y márcalo como obligatorio.

### Paso 2 — Opciones del grupo (modificadores)

Aquí agregas cada opción disponible. Por cada una defines:

| Campo | Qué poner |
|-------|-----------|
| Nombre | El nombre de la opción. Ej: `Grande`, `BBQ`, `Queso extra` |
| Precio adicional | Cuánto suma al precio base. Si es gratis, pon 0. |

Haz clic en **+ Agregar Modificador** para agregar más opciones.

Cada modificador puede tener ingredientes asociados para control de inventario. Si al buscar un ingrediente no aparece, encontrarás la opción **+ Crear ingrediente** para crearlo en un panel lateral sin salir del formulario. Necesitarás: Nombre, Tipo de medida y Categoría (los tres obligatorios).

→ [Ver más sobre ingredientes propios](https://warocol.com/docs/usuarios/compras#ingredientes-propios)

### Paso 3 — Revisión

Revisa el resumen y haz clic en **Crear grupo**.

---

## ¿Cuándo el modificador suma al precio?

Cuando el cliente elige una opción con precio adicional, ese valor se suma automáticamente al precio del producto al momento del pago.

---

## Preguntas frecuentes

**¿Puedo asignar un grupo a varios productos?**
Sí. Al crear el grupo, seleccionas todos los productos que lo necesitan.

**¿Puedo editar las opciones después de crear el grupo?**
Sí. Ve a **Menú → Modificadores**, abre el grupo y edítalo.

**¿Qué pasa si no agrego ninguna opción en el paso 2?**
El grupo se crea vacío. Los clientes no verán nada para seleccionar. Agrégalas después desde la edición.

**¿El cliente puede pedir un producto sin elegir un modificador obligatorio?**
No. Si el grupo es obligatorio, el botón de "Agregar al carrito" no se activa hasta que el cliente elija.
