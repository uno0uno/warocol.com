# Leer el dashboard de analítica

## ¿Para qué sirve la analítica?

La sección de analítica te muestra en números cómo va tu negocio: cuánto vendiste, cuáles son tus productos más pedidos, cómo se comportan tus clientes y qué tan rentable es cada plato.

---

## Cómo acceder

Ve a **Analítica**. El sistema te lleva directamente a la vista de **Ventas**, que es el dashboard principal.

Desde el menú de analítica también puedes acceder a:
- **Rentabilidad** — márgenes por producto
- **Clientes** — comportamiento y frecuencia de tus compradores
- **Puntos** — programa de puntos (Waros)

---

## Dashboard de ventas

### Filtros

En la parte superior puedes filtrar los datos por:

- **Método de pago** — selecciona un grupo o un método específico
- **Estado** — órdenes completadas, canceladas, pendientes
- **Rango de fechas** — Hoy · Ayer · Última semana · 15 días · 30 días · 90 días, o un rango personalizado

> Los datos se actualizan en tiempo real. Puedes usar el botón de recarga para ver los más recientes.

### Métricas principales

El dashboard muestra hasta cinco tarjetas con los indicadores del periodo filtrado:

| Métrica | Qué significa |
|---------|---------------|
| **Ventas Brutas** | Suma del subtotal de ventas en el periodo (antes de impuestos y propina) |
| **Ticket Promedio** | Cuánto se vende en promedio por orden |
| **Propinas del periodo** | Total cobrado en propinas y % promedio sobre venta. Aparece solo si las propinas están activas en **Operaciones → Propinas**. Al hacer clic, abre el [historial de propinas](./ventas/propinas) con el rango actual ya aplicado. |
| **INC 8%** | Impuesto al Consumo recaudado. La etiqueta varía según los impuestos configurados en tu tenant. |
| **Proyección** | Forecast del mes o año según el filtro activo |

> Cuando las propinas están desactivadas, la grilla colapsa a 4 columnas.

### Banner de rentabilidad

Debajo de las tarjetas aparece un banner ("Tu plato más vendido puede ser tu peor negocio") que invita a revisar el módulo de Rentabilidad para detectar productos con baja contribución.

### Gráfica de ventas

Debajo de las métricas verás una gráfica que muestra la evolución de ventas en el tiempo. Te permite identificar días pico, tendencias y caídas.

---

## Rentabilidad

Ve a **Analítica → Rentabilidad** para ver el costo vs. precio de venta de cada producto.

Esto es posible solo si tienes recetas con artículos de bodega y costos configurados. Sin recetas, este reporte no puede calcular márgenes.

---

## Clientes

Ve a **Analítica → Clientes** para ver:
- Quiénes son tus clientes frecuentes
- Con qué frecuencia regresan
- Cuánto gastan en promedio
- Qué productos prefieren

### Ver el perfil de un cliente

Haz clic en cualquier cliente de la lista para abrir su perfil. Verás:

- Nombre, teléfono y correo electrónico registrados
- Total comprado (monto acumulado)
- Fecha de primera y última compra
- Saldo de puntos Waros
- Historial completo de órdenes con fecha, productos, total y método de pago

Puedes filtrar el historial de órdenes por rango de fechas.

### Editar datos del cliente

En la parte superior del perfil hay un botón de editar (ícono de lápiz) junto al total comprado. Al hacer clic se abre un formulario inline donde puedes actualizar:

- Nombre
- Teléfono
- Correo electrónico

Haz clic en **Guardar** para aplicar los cambios o en **Cancelar** para cerrar sin modificar nada.

---

## Preguntas frecuentes

**¿Los datos son en tiempo real?**
Sí. Cada vez que se registra una venta, los datos se actualizan. Usa el botón de recarga si ves que algo no está al día.

**¿Por qué no veo datos de rentabilidad?**
Porque los productos vendidos no tienen recetas con artículos de bodega y costos asignados. Configura las recetas primero.

**¿Puedo exportar los reportes?**
Consulta con el administrador del sistema sobre las opciones disponibles.

---

## Puntos (Waros)

Ve a **Analítica → Puntos** para configurar el programa de puntos de tu restaurante.

Los **Waros** son el sistema de fidelización de WARO: tus clientes acumulan puntos con sus compras y los pueden redimir como descuento en futuras órdenes.

### Activar o desactivar el sistema

En la parte superior hay un toggle que habilita o deshabilita el sistema completo. Si está inactivo, los clientes no acumulan ni pueden redimir puntos aunque las reglas estén configuradas.

### Reglas de puntos

El sistema funciona con **reglas**. Cada regla define un evento que genera o consume puntos. Puedes activar o desactivar cada regla de forma independiente.

| Acción | Descripción |
|--------|-------------|
| Activar / desactivar | Toggle en la tarjeta de la regla |
| Editar | Clic en el ícono de edición — abre un modal con los parámetros configurables |

### Preguntas frecuentes — Puntos

**¿Los puntos afectan el inventario o las ventas?**
No. Son un sistema de fidelización paralelo. Las ventas se registran normalmente.

**¿El cliente ve sus puntos?**
Sí, a través del canal de pedidos online (portal de domicilios / checkout). En el POS no se muestra el saldo de puntos actualmente.

**¿Qué pasa si desactivo el sistema globalmente?**
Las reglas se conservan configuradas, pero no se acumulan ni se redimen puntos hasta que vuelvas a activarlo.
