# Venta libre en el POS

**Venta libre** te permite cobrar un **monto en pesos** que no está fijado en el menú: servicios especiales, cargos varios, ajustes puntuales, etc. El cajero ingresa el valor en el momento; no hace falta crear un producto nuevo en el menú por cada venta.

> El botón **Venta libre** solo aparece en el POS cuando un administrador lo activa en **Operaciones → Personalizar**.

---

## ¿Cómo funciona?

Tu negocio tiene **un solo producto contenedor** de venta libre (por ejemplo «Varios» o «Venta libre»). Cada vez que el cajero usa la función:

1. Toca **Venta libre** en el panel del carrito.
2. Escribe el **monto en COP** (obligatorio).
3. Opcionalmente escribe una **descripción** (ej. «Servicio de meseros», «Empaque especial»).
4. Confirma; el ítem se agrega con ese precio y sigue el flujo normal de cobro según el canal (mostrador, barra o mesa).

No creas productos en el menú por cada monto distinto: reutilizas siempre el mismo producto contenedor.

---

## Configuración inicial (administrador)

1. Entra a **Operaciones → Personalizar** (requiere permiso de Operaciones).
2. Activa el interruptor **Venta libre en POS**.
3. WARO crea o reactiva automáticamente el producto contenedor (por defecto «Venta libre») en la primera categoría de tu menú.

**Requisito:** debe existir al menos **una categoría** en el menú. Si no hay categorías, la activación falla con un mensaje para que crees una categoría primero.

Con el interruptor **desactivado**, el botón **Venta libre no aparece** en el POS (los cajeros no lo ven).

Detalles del producto contenedor (automático):

| Aspecto | Comportamiento |
|---------|----------------|
| **Cantidad** | Solo **uno** por negocio |
| **Precio en menú** | Simbólico ($1); en el POS el cajero define el monto real |
| **Receta / ingredientes** | Sin receta (no descuenta inventario por composición) |
| **Modificadores** | No aplican en venta libre |
| **Categoría fiscal** | Estándar (INC/IVA según tu configuración) |

---

## Uso en mostrador

Cuando el POS abre directamente en productos (módulo de mesas desactivado o modo mostrador):

1. En el panel del carrito, toca **Venta libre** (botón principal cuando el carrito está vacío).
2. Ingresa el monto y, si quieres, la descripción → **Agregar**.
3. El sistema abre el [checkout](./pos) automáticamente para cobrar (pago, propina, cliente, etc.).
4. Si necesitas mezclar con productos del menú, agrégalos antes o después según el flujo de tu negocio; con venta libre activa no verás **Procesar Orden** como paso intermedio obligatorio.

La descripción opcional se muestra como nombre de la línea en el carrito. No puedes editar la línea como un producto de catálogo (no hay modificadores ni cambio de precio desde el detalle del producto).

---

## Uso en mesa

Con el módulo de mesas activo, abre la **mesa** en el plano del salón:

1. Toca **Venta libre** en el panel inferior.
2. Ingresa monto y descripción opcional → **Agregar**.
3. El ítem va **directo al tab de la mesa** (lista de consumo de esa sesión), no al carrito temporal de mostrador.
4. Repite para más ítems del menú o más ventas libres.
5. Cuando el cliente pida la cuenta, usa **Pedir cuenta** y cobra desde el [checkout de mesa](./pos#modo-mesas-plano-del-salón).

> En mesa el flujo de venta libre **no es igual** al de mostrador: no pasa primero por «Procesar Orden» del carrito vacío; se suma al tab de la mesa.

---

## Uso en barra

La **barra** se comporta como una sesión de mesa especial en el plano:

1. Abre la barra como cualquier otra mesa/sesión.
2. **Venta libre** agrega el ítem al **tab de la barra** (igual que en mesa).
3. Si agregas productos del **catálogo** al carrito temporal, usa **Agregar y enviar a cocina** (no **Procesar Orden** cuando venta libre está activa en Personalizar).
4. Cierra con **Pedir cuenta** y checkout cuando corresponda.

---

## Después de cobrar

| Dónde | Qué verás |
|-------|-----------|
| **Ventas → Órdenes** | Una línea con el producto contenedor y el **precio que ingresó el cajero** (o la descripción si la escribió) |
| **Prefactura / recibo / correo** | Mismo desglose que el resto de la orden |
| **Analítica** | Cuenta como venta del producto contenedor con ese monto |

Si el producto contenedor no tiene receta, **no hay descuento de inventario** por esa línea (igual que otros productos sin composición).

---

## Bitácora de operaciones

Las ventas libres en **mesa o barra** generan eventos como **Producto agregado al tab** o **Producto eliminado del tab** si alguien quita la línea del tab.

En **mostrador** (o carrito de barra antes de sincronizar), aplican **Línea eliminada del carrito** o **Carrito vaciado** según la acción.

No hay un tipo de evento distinto llamado «venta libre»: se audita igual que cualquier otro ítem. Ver [Bitácora de operaciones](./operaciones/bitacora).

---

## Comandas y cocina

Si **Comandas & Cocina** está activo:

- Al agregar venta libre al **tab de mesa o barra**, el ítem puede **enviarse a cocina** con el mismo comportamiento que un producto normal de esa estación.
- Si escribiste **descripción**, puede aparecer en la comanda como nota (prefijo interno que ve cocina: varios / servicio especial).

Si tu negocio no usa comandas en barra o mesa, la venta libre solo suma al total del tab.

---

## Qué no está soportado

| Situación | Por qué |
|-----------|---------|
| Cobrar un monto **sin ninguna línea** en la orden | Siempre se usa el producto contenedor de venta libre |
| **Modificadores** (tamaño, extras) en venta libre | No permitido en esta versión |
| **Crear un producto nuevo en el menú** por cada monto | No es necesario: un solo producto contenedor + monto en el POS |
| Ver en Bitácora acciones **anteriores al despliegue** | La bitácora no rellena historial pasado |
| Cambiar el precio desde el editor de producto del carrito | La línea de venta libre no se edita como un plato de catálogo |

---

## Preguntas frecuentes

**¿Tengo que crear un producto en el menú cada vez que cobro algo distinto?**
No. Configuras **una vez** el producto contenedor de venta libre. El cajero solo ingresa el monto (y opcionalmente la descripción) en cada venta.

**¿Puedo usar venta libre para propinas?**
Puedes registrar un monto con descripción «Propina» si tu operación lo permite, pero las **propinas formales** del POS siguen el flujo de [Operaciones → Propinas](./operaciones) cuando están activas.

**¿Por qué el botón está deshabilitado?**
Falta el producto contenedor de venta libre en tu negocio. Contacta a soporte WARO para activarlo.

**¿Afecta inventario?**
Solo si el producto contenedor tiene receta o ingredientes asignados (no recomendado). Lo habitual es dejarlo sin composición.

**¿Puedo tener dos productos de venta libre?**
No. El sistema permite **un solo** producto contenedor por negocio.

---

## Ver también

- [Procesar una venta en el POS](./pos)
- [Bitácora de operaciones](./operaciones/bitacora)
- [Operaciones](./operaciones)
