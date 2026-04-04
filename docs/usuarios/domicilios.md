# Gestionar domicilios y pedidos online

El módulo de **Domicilios** muestra los pedidos que llegan por canales online: domicilios, recogidas en tienda y órdenes para consumo en el local.

## Acceder

Menú lateral → **Domicilios**

---

## Lista de pedidos

Columnas: número de orden · fecha · hora programada · tipo · estado · total · cliente

### Tipos de pedido

| Badge | Descripción |
|-------|-------------|
| Domicilio | El cliente pide envío a dirección |
| Recogida | El cliente recoge en el local |
| En mesa | Consumo en el local |

### Estados del pedido

| Estado | Significado |
|--------|-------------|
| Pendiente | Recibido, sin confirmar |
| Confirmado | Aceptado, en espera de preparación |
| En preparación | Cocina procesando el pedido |
| Entregado | Pedido entregado al cliente |
| Completado | Proceso finalizado |
| Cancelado | Pedido cancelado |

### Hora programada

Si el cliente agendó el pedido para una hora específica, aparece en la columna **Hora programada**. Si no hay hora, se muestra **Inmediato**.

---

## Detalle del pedido

Haz clic en una orden para ver:

- **Cliente** — correo electrónico
- **Pedido** — número, fecha y hora programada
- **Estado actual** — badge con color
- **Total** — monto de la orden

### Avanzar el estado

Según el estado actual, aparecen los botones de acción correspondientes:

```
Pendiente → Confirmar
Confirmado → En preparación
En preparación → Entregado
Entregado → Completado
```

También puedes **Cancelar** el pedido si aún está en pendiente, confirmado o en preparación.

### Ítems del pedido

Tabla con producto, cantidad, precio unitario y subtotal. Los modificadores aparecen como sub-filas indentadas.

### Información de entrega

- **Domicilio** — dirección completa, notas de entrega e instrucciones especiales
- **Recogida** — indicación de que el cliente retirará en tienda
- **En mesa** — indicación de servicio en el local

### Historial de estados

Al final del detalle se muestra la línea de tiempo con cada cambio de estado y su fecha/hora.
