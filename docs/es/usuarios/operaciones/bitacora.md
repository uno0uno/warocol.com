# Bitácora de operaciones

La **Bitácora de operaciones** es el registro de auditoría de acciones que **quedan guardadas en el servidor**: quién creó, editó o eliminó un registro, cuándo y —cuando aplica— con qué motivo. Hoy verás sobre todo eventos de POS; otros módulos se irán sumando.

## Cómo acceder

Menú lateral → **Operaciones → Bitácora**.

Verás un listado paginado de eventos. Arriba puedes filtrar por fechas, **módulo**, canal, tipo de acción y buscar por nombre de producto. Haz clic en una fila para ver el detalle técnico del evento (útil para soporte).

> **Permisos:** solo usuarios con acceso al módulo **Operaciones** pueden abrir la Bitácora (típicamente dueño, administrador y supervisor). El personal de caja sin ese módulo no verá la pestaña ni podrá consultar el historial.

---

## Qué registra (y qué no)

La Bitácora **no es un log de cada clic ni de cada consulta**. Solo se guarda un evento cuando el servidor persiste un alta, edición o baja (o una anulación / vacío equivalente).

| Sí queda | No queda |
|----------|----------|
| Crear, editar o eliminar un registro ya guardado | Abrir listados, buscar, exportar o recargar |
| Anular un pago, vaciar un tab o un carrito sincronizado | Teclear en un formulario antes de guardar |
| Motivo obligatorio cuando aplica (p. ej. quitar un ítem ya enviado a cocina) | Cambios solo en el dispositivo, sin llegar al servidor |

Si el listado está vacío justo después de activar la función, es normal: los eventos aparecen cuando el personal opere con la versión que incluye la bitácora.

---

## Qué registra la Bitácora (POS)

Cada fila de POS es un evento automático generado cuando el equipo usa el punto de venta.

| Acción en la Bitácora | Qué significa |
|----------------------|-----------------|
| **Producto agregado al tab** | Se añadió un ítem al tab de una mesa o barra |
| **Producto eliminado del tab** | Se quitó un ítem del tab (mesa/barra) |
| **Cantidad modificada** | Se cambió la cantidad de un ítem en el tab |
| **Tab vaciado** | Se vació el tab de una sesión de mesa o barra |
| **Línea eliminada del carrito** | Se eliminó un producto del carrito en mostrador o barra |
| **Carrito vaciado** | Se vació el carrito completo |
| **Pago anulado** | Se anuló un pago parcial ya registrado en el checkout |

En cada evento verás, entre otros datos:

- **Cuándo** — fecha y hora
- **Usuario** — quién realizó la acción en el sistema
- **Módulo** — POS hoy; ventas, despacho, CRM y demás cuando estén activos
- **Canal** — Mesa, Barra o Mostrador en POS; en otros módulos puede ir vacío
- **Resumen** — producto y cantidad, o datos del pago anulado
- **Mesa** — nombre de la mesa cuando aplica
- **Motivo** — texto capturado en el POS (ver políticas abajo)
- **Orden** — enlace a la venta cuando existe

---

## Qué no registra (POS)

| Situación | Por qué no aparece |
|-----------|-------------------|
| Productos en el carrito **antes de enviarlos al tab** o antes de que el carrito quede sincronizado con el servidor | Solo se auditan acciones que llegan al servidor |
| Acciones **anteriores al despliegue** de la bitácora en tu negocio | El registro es desde la activación en producción, no rellena el pasado |
| Anulación de una **venta completa** desde Ventas → Órdenes | Todavía es otro flujo; no es lo mismo que anular un pago parcial en checkout |
| Cambios de precio, descuentos o configuración del menú | Se irán sumando por módulo; el POS MVP no los cubría |

Si el listado está vacío justo después de activar la función, es normal: los eventos aparecen cuando el personal empiece a operar con la versión que incluye la bitácora.

---

## Cómo filtrar

| Filtro | Para qué sirve |
|--------|----------------|
| **Rango de fechas** | Acota el período (calendario con atajos como Hoy, Última semana, etc.) |
| **Módulo** | POS, Ventas, Despacho, etc., o todos. Vacío muestra todos los eventos (hoy, sobre todo POS) |
| **Canal** | Solo Mesa, solo Barra, solo Mostrador, o todos |
| **Acción** | Un tipo concreto (ej. solo “Pago anulado” o “Producto eliminado del tab”) |
| **Buscar producto** | Texto libre sobre el resumen (nombre del producto en el payload) |

Usa **Limpiar** para quitar todos los filtros. La lista se actualiza al cambiar filtros o al usar el botón de actualizar del encabezado del panel.

---

## Políticas de motivo

### Producto ya enviado a cocina (mesa o barra)

Si las **comandas** están activas y el producto **ya salió a cocina** (ya no está en estado “nuevo”), al eliminarlo del tab el POS pide un **motivo obligatorio** antes de confirmar. Ese texto queda guardado en la columna **Motivo** de la Bitácora y cocina sigue viendo la línea anulada en el KDS.

Si el producto **aún no se envió a cocina**, puedes eliminarlo sin escribir motivo.

### Anulación de un pago parcial

En el **checkout**, al quitar un pago ya registrado (ícono de papelera en cobro parcial), puedes escribir un motivo opcional. Si lo dejas en blanco, el sistema registra **“Sin motivo”** en la Bitácora.

> Si el pago era en **efectivo**, el POS te recuerda devolver el dinero físicamente al cliente antes de confirmar. Ver [Cobro parcial](../pos#cobro-parcial-split) en la guía del POS.

---

## Detalle de un evento

Haz clic en cualquier fila (o tarjeta en celular) para abrir el detalle. Ahí verás el **motivo** completo, el enlace a la **orden** si existe, y el **payload** en formato técnico (JSON) con todos los datos que guardó el sistema — útil si soporte necesita investigar un caso.

---

## Relación con otras pantallas

| Necesitas… | Ve a… |
|------------|--------|
| Configurar mesas, comandas o propinas | [Operaciones](../operaciones) |
| Cómo se elimina un pago o un producto en POS | [Procesar una venta en el POS](../pos) |
| Historial de ventas y anulación de orden completa | [Ventas](../ventas) |
| Números de facturación DIAN descartados | [Facturación — Bitácora de números quemados](../facturacion#bitácora-de-números-quemados) (es un registro distinto) |

---

## Preguntas frecuentes — Bitácora

**¿La Bitácora reemplaza las cámaras o el arqueo de caja?**
No. Es un registro de acciones sensibles en POS, no un video ni un cierre de caja.

**¿El cajero puede ver qué motivo puso el gerente?**
Solo si su rol tiene acceso a **Operaciones**. La mayoría de cajeros no ven la Bitácora.

**¿Puedo exportar a Excel?**
En el MVP no hay exportación desde la pantalla; usa filtros y paginación para revisar por período.

**¿Por qué no veo eventos de ayer si ya usábamos WARO?**
El registro comenzó cuando tu negocio quedó con la versión que incluye bitácora; no reconstruye el historial anterior.

**¿Eliminar un producto del carrito en mostrador siempre queda registrado?**
Sí, cuando el carrito está sincronizado con el servidor. Cambios solo en el carrito local, antes de que el sistema los guarde, no generan evento.
