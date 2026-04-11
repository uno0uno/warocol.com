# Métodos de pago

Desde esta sección configuras los grupos y métodos de pago que aparecen en el POS, en los reportes y en el cierre contable.

---

## Cómo acceder

Finanzas → pestaña **Métodos de pago**

---

## Grupos de pago

Los métodos de pago están organizados en grupos. La vista principal muestra todos los grupos con:

- Nombre del grupo
- Slug (identificador interno)
- Número de métodos configurados
- Si genera cartera (ventas a crédito)
- Si es predeterminado o personalizable

### Tipos de grupos

| Tipo | Descripción |
|------|-------------|
| Predeterminado | Creado por WARO, no se puede eliminar (ej. Efectivo) |
| Personalizable | Puedes agregar y editar los métodos dentro del grupo |

El grupo **Efectivo** no se puede modificar — es el método base del sistema.

---

## Administrar métodos de un grupo

Haz clic en cualquier grupo (excepto Efectivo) para ver y gestionar sus métodos.

### Agregar un método

Haz clic en **Agregar método**. Ingresa el nombre (ej. "Nequi", "Bancolombia", "Visa") y guarda.

### Editar un método

Haz clic en el método para editar su nombre o desactivarlo.

### Desactivar un método

Los métodos desactivados no aparecen en el POS pero su historial de ventas se conserva.

---

## El campo "genera cartera"

Los grupos marcados como **genera cartera** crean una deuda pendiente en el módulo de Cartera cada vez que se registra una venta con ese método.

Esto corresponde a las ventas a crédito — el cliente se lleva el pedido y paga después.

---

## Preguntas frecuentes

**¿Puedo crear mis propios grupos de pago?**
No. Los grupos están definidos por WARO (Efectivo, Tarjeta, Digital, Crédito). Lo que puedes personalizar son los métodos dentro de cada grupo.

**¿Qué pasa si desactivo un método que ya tiene ventas?**
Las ventas anteriores no se modifican. El método simplemente deja de aparecer en el POS para nuevas ventas.

**¿Por qué no puedo editar el grupo Efectivo?**
El efectivo es el método base del sistema y está ligado directamente al cuadre de caja en el cierre contable. Por eso no se puede modificar.
