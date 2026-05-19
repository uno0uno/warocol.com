# Despacho

El módulo de **Despacho** centraliza pedidos online, la cola de **pedidos QR en mesa** pendientes de confirmación y, opcionalmente, el monitor de comandas para cocina.

## Cómo acceder

Menú lateral → **Despacho**. Según la configuración del negocio verás hasta tres pestañas:

| Pestaña | Para qué |
|---------|----------|
| **Domicilios** | Pedidos online (domicilio, recogida y consumo en mesa) |
| **Pedidos en mesa (QR)** | Pedidos enviados por QR de mesa, pendientes de aceptar o rechazar (requiere mesas + módulo QR activos) |
| **Comandas** | Monitor en vivo de comandas de cocina (solo si el negocio tiene comandas activas) |

---

## Domicilios

Lista de pedidos que llegan por canales online: domicilios, recogidas en tienda y órdenes para consumo en el local.

### Columnas

`# Pedido` · `Fecha` · `Programado` (o "Inmediato") · `Tipo` · `Estado` · `Total` · `Cliente`

Puedes ordenar por cualquiera de esas columnas.

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

Si el cliente agendó el pedido para una hora específica, aparece en la columna **Programado**. Si no hay hora, se muestra **Inmediato**.

### Detalle del pedido

Haz clic en una orden para ver:

- **Cliente** — correo electrónico
- **Pedido** — número, fecha y hora programada
- **Estado actual** — badge con color
- **Total** — monto de la orden

#### Avanzar el estado

Según el estado actual, aparecen los botones de acción correspondientes:

```
Pendiente → Confirmar
Confirmado → En preparación
En preparación → Entregado
Entregado → Completado
```

También puedes **Cancelar** el pedido si aún está en pendiente, confirmado o en preparación.

#### Ítems del pedido

Tabla con producto, cantidad, precio unitario y subtotal. Los modificadores aparecen como sub-filas indentadas.

#### Información de entrega

- **Domicilio** — dirección completa, notas de entrega e instrucciones especiales
- **Recogida** — indicación de que el cliente retirará en tienda
- **En mesa** — indicación de servicio en el local

#### Historial de estados

Al final del detalle se muestra la línea de tiempo con cada cambio de estado y su fecha/hora.

---

## Pedidos en mesa (QR)

Cola de pedidos que los comensales envían desde el menú QR de cada mesa. Solo aparece si tienes **Gestión de mesas** y **Pedido por QR en mesa** activos en **Operaciones → Mesas**.

Configuración del QR y enlaces por mesa: ver [Mesas](../operaciones/mesas#pedido-por-qr-en-mesa).

### Vista general

- Los pedidos se agrupan **por mesa** en el panel izquierdo.
- Al seleccionar una mesa ves cada solicitud pendiente con ítems, notas y método de pago elegido por el cliente.
- Por defecto **todos los pedidos de la mesa vienen seleccionados** (puedes desmarcar los que no quieras incluir).

### Aceptar o rechazar

| Acción | Efecto |
|--------|--------|
| **Aceptar** | Los ítems seleccionados se agregan al tab de esa mesa en el **POS**. Si hay comandas activas, se envían a cocina automáticamente. |
| **Rechazar** | Descarta las solicitudes seleccionadas; no se agregan al POS. |

Tras aceptar verás un mensaje de confirmación (incluye número de comanda si aplica).

### Notificaciones

Cuando llega un pedido QR nuevo, la campana de notificaciones muestra **Pedido QR — {nombre de mesa}**. Al tocarla entras a esta pestaña con la mesa ya filtrada.

> **Diferencia con Domicilios:** los pedidos QR **no** usan el flujo Pendiente → Confirmado → Entregado de domicilios. Aquí solo existe la cola pendiente hasta que aceptas o rechazas.

---

## Comandas

Monitor en vivo para cocina. Solo aparece la pestaña si el negocio tiene **comandas activas** en su configuración.

### Columnas

`# Comanda` (formato `#N-NN`) · `Origen` (Mesa / Mostrador / Domicilio / Recogida) · `Destino` · `Estado` · `Items` · `Tiempo`

En la cabecera ves un contador `N activas` con la cantidad de comandas en curso.

### Estados

- **Pendiente** — recién recibida
- **En preparación**
- **Lista** — terminada, lista para entregar
- **Entregada**
- **Cancelada**

### Tiempo en vivo

La columna **Tiempo** muestra el tiempo transcurrido desde que entró la comanda. Cambia de color (amarillo, luego rojo) cuando supera el umbral configurado, para que cocina vea de un vistazo qué tickets están demorados.

### Ítems

Cada ítem aparece como `cantidad × nombre`. Los ítems cancelados se ven tachados, y los que tienen nota del cliente quedan resaltados.

### Acciones en masa

Selecciona comandas con el checkbox (o usa "seleccionar todas") y avanza varias a la vez. Los botones de acción se adaptan a la **intersección de transiciones permitidas** entre las comandas seleccionadas:

```
Pendiente      → En preparación · Cancelar
En preparación → Lista · Cancelar
Lista          → Entregada
```

### Detalle por comanda

El ícono de **ojo** abre un panel lateral con el detalle completo y acciones por ítem (marcar como listo, cancelar uno solo, etc.).

---

## Preguntas frecuentes

**¿Cómo activo o desactivo el módulo de Comandas?**
Se activa con el toggle de comandas en la configuración del negocio. Pídelo al administrador o contacta a soporte si no lo encuentras.

**¿Los pedidos online y las comandas se relacionan?**
Sí. Cuando se confirma un pedido de domicilio o se cobra una orden en mesa, el sistema genera automáticamente la(s) comanda(s) correspondientes en cocina.

**¿El monitor se actualiza solo?**
Sí, tanto Domicilios como Comandas refrescan en tiempo real.

**¿Dónde confirmo un pedido que mandó el cliente por QR?**
En **Despacho → Pedidos en mesa (QR)**, no en Domicilios.
