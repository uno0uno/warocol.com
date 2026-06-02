# Recetas

## ¿Qué es una receta?

Una receta es una **composición reutilizable de artículos de bodega** que puedes asignar a uno o varios productos. Sirve para evitar repetir la misma lista de artículos de bodega en cada producto.

**Ejemplo práctico:** Tienes una salsa de la casa que usas en 5 platos diferentes. En vez de agregar los mismos 6 artículos de bodega en cada producto, creas una receta "Salsa de la Casa" con esos artículos de bodega y la vinculas a los 5 productos. Si cambias la receta, el cambio aplica a todos los productos que la usan.

Las recetas no las ven tus clientes. Son internas: sirven para controlar costos y descontar artículos de bodega del inventario automáticamente.

---

## ¿Cuándo usar recetas?

Las recetas son **opcionales**. Un producto puede tener:

| Configuración | Cuándo usarla |
|---------------|---------------|
| Solo artículos de bodega directos | El producto es sencillo y único — nadie más usa esos artículos de bodega en esa combinación |
| Solo recetas | La preparación es compartida con otros productos |
| Recetas + artículos de bodega adicionales | Tienes una base común (receta) más artículos de bodega propios del plato |

> Si un producto es único y simple, agrégale los artículos de bodega directamente sin crear una receta. Las recetas tienen valor cuando se **reutilizan**.

---

## Cómo crear una receta

Ve a **Menú → Recetas → Nueva receta**.

El formulario tiene 3 pasos:

### Paso 1 — Información general

| Campo | Qué poner |
|-------|-----------|
| Nombre | El nombre interno de la receta. Ej: `Salsa de la Casa`, `Base de Carne`, `Masa de Pizza` |
| Estado | Activa o Inactiva. Ponla activa si ya la usas. |

> El nombre es de uso interno. Usa nombres que describan la preparación, no el producto final.

### Paso 2 — Artículos de bodega

Aquí agregas cada artículo de bodega con su cantidad.

- Busca el artículo de bodega por nombre en el buscador
- Escribe la cantidad y la unidad (gramos, mililitros, unidades, etc.)
- Repite para cada artículo de bodega

**Si el artículo de bodega no existe:** en el buscador aparece la opción **+ Crear artículo de bodega**. Haz clic para abrirlo en un panel lateral sin salir del formulario.

Al crear el artículo de bodega desde aquí debes completar:

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| Nombre | Sí | Ej: `Carne Angus especial` |
| Tipo de medida | Sí | Peso (gr/kg), Volumen (ml/lt) o Pieza (und). Solo se define al crear — no cambia después. |
| Categoría | Sí | Ej: `Carnes`, `Salsas`, `Lácteos` |

Las unidades de compra se generan automáticamente según el tipo de medida. Cuando guardes el artículo de bodega, queda disponible de inmediato para seleccionarlo en la receta.

→ [Ver más sobre artículos de bodega propios](https://warocol.com/docs/usuarios/compras#artículos de bodega-propios)

### Paso 3 — Revisión y confirmación

Revisa el resumen: nombre, número de artículos de bodega y estado. Si todo está bien, haz clic en **Crear receta**.

---

## ¿Puedo editar una receta después?

Sí. Ve a **Menú → Recetas**, busca la receta y haz clic en ella para editarla. El cambio aplica a todos los productos que la usen, hacia adelante — las órdenes ya registradas no se ven afectadas.

---

## Preguntas frecuentes

**¿Una receta es obligatoria para crear un producto?**
No. Puedes crear un producto con artículos de bodega directos, sin ninguna receta.

**¿Un producto puede tener varias recetas?**
Sí. Puedes asignar más de una receta a un mismo producto, y además agregarle artículos de bodega adicionales por fuera de esas recetas.

**¿Puedo tener dos recetas con el mismo nombre?**
Sí, el sistema lo permite, pero no es recomendable. Usa nombres descriptivos para no confundirte.

**¿Qué pasa si cambio los artículos de bodega de una receta?**
El cambio aplica hacia adelante a todos los productos que usen esa receta. Las ventas ya registradas no cambian.
