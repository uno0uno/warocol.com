# Ventas

Desde el módulo de Ventas consultas el historial completo de órdenes, las filtras, exportas y puedes registrar ventas que ocurrieron fuera del POS.

El módulo tiene tres pestañas en la barra superior:

- **Órdenes** — historial general de ventas (vista por defecto)
- **Productos** — qué productos se vendieron y en qué cantidad
- **Propinas** — historial de propinas. Ver [Propinas](./ventas/propinas)

> La **configuración** de propinas (activarlas, definir porcentajes sugeridos) vive en **Operaciones → Propinas**, no aquí.

---

## Ver ventas

Ve a **Ventas** en el menú lateral.

### Filtros disponibles

| Filtro | Opciones |
|--------|----------|
| Búsqueda | Número de orden, nombre o teléfono del cliente |
| Rango de fechas | Hoy · Ayer · Última semana · 15 días · 30 días · 90 días |
| Método de pago | Selecciona un grupo (ej: Tarjeta) o un método específico dentro del grupo (ej: Visa) |
| Mesero | Filtra órdenes atribuidas a un mesero del equipo |
| Canal | POS · Mesa · Online |
| Estado | Completada · Cancelada · Pendiente |

### Estados de una orden

- **Verde** — completada
- **Amarillo** — pendiente
- **Rojo** — cancelada

### Exportar

Usa el botón **Exportar** para recibir el reporte en tu correo con todas las órdenes del período filtrado.

### Ver detalle de una orden

Haz clic en cualquier fila para ver el desglose completo: productos, modificadores, cliente y total.

El detalle incluye, cuando aplica:
- **Mesero** asignado — clic para abrir su perfil en Equipo
- **Propina** cobrada — con monto, tipo (porcentaje sugerido o personalizada) y % sobre la venta
- Línea **Total cobrado** = subtotal + propina (solo si hubo propina)

Desde el detalle también puedes:
- **Imprimir** el recibo
- **Editar** ítems — eliminar productos o modificadores (el inventario se ajusta automáticamente)

---

## Registrar venta manual

Usa esta opción cuando una venta ocurrió fuera del POS: pago anticipado, pedido por teléfono, cortesía registrada después.

### Cuándo usarlo

- El cliente pagó antes de llegar al local
- La venta se procesó en papel y hay que ingresarla al sistema
- Necesitas registrar una venta en una fecha pasada

### Pasos

**1. Fecha y método de pago**

Selecciona la fecha (no puede ser futura) y el método: Efectivo, Tarjeta o Digital.

**2. Agregar productos**

Toca un producto para agregarlo al carrito. Si tiene modificadores, aparece un panel para elegirlos. Usa **+** / **−** para ajustar cantidades.

**3. Confirmar**

El panel derecho (escritorio) o el resumen inferior (móvil) muestra el total en tiempo real. Presiona **Registrar venta** para guardar.

El inventario se descuenta automáticamente si los productos tienen recetas configuradas.

### Preguntas frecuentes

**¿Se descuenta el inventario?**
Sí, igual que en el POS. Si el producto tiene receta, los artículos de bodega se descuentan al registrar.

**¿Puedo registrar una venta sin identificar al cliente?**
Sí, el cliente es opcional.

**¿Puedo usar una fecha de hace varios días?**
Sí. La venta aparecerá en los reportes de ese día.
