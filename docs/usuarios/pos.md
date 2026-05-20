# Procesar una venta en el POS

## ¿Qué es el POS?

El POS (Punto de Venta) es la herramienta para tomar pedidos presenciales: en el mostrador, en la mesa o en caja. Desde aquí agregas productos al carrito, aplicas modificadores, identificas al cliente y cobras.

---

## Cómo abrir el POS

Ve a **POS** en el menú lateral.

- Si el módulo de mesas está **desactivado**, verás directamente la pantalla de productos.
- Si el módulo de mesas está **activo**, verás primero el plano del salón con todas las mesas configuradas.

---

## Modo mostrador (sin mesas)

### 1. Selecciona los productos

Busca el producto por nombre o navega por categorías. Haz clic en él para agregarlo al carrito.

Si el producto tiene **modificadores** (tamaños, extras, salsas), aparece un modal para que elijas las opciones antes de agregarlo.

Repite para cada producto del pedido.

### 2. Ajusta el carrito

En el carrito (panel derecho o inferior según el dispositivo) puedes:
- Cambiar la cantidad de cada ítem
- Eliminar un ítem
- Ver el total actualizado en tiempo real

### 3. Identifica al cliente (opcional)

Si el cliente está registrado, puedes buscarlo por número de teléfono. Esto permite:
- Acumular puntos Waros en su cuenta
- Ver su historial de compras e insights

Si el pedido es anónimo, puedes omitir este paso.

### 4. Cobra

Haz clic en **Ir a checkout**. En la pantalla de checkout puedes ajustar:

| Campo | Qué hacer |
|-------|-----------|
| Método de pago | Selecciona un grupo (ej: Tarjeta) o un método específico dentro del grupo. La lista la define el administrador. |
| Puntos Waros | Si el cliente tiene puntos, puedes aplicarlos como descuento |
| Descuento | Aplica un porcentaje o monto fijo sobre el subtotal |
| Mesero | Asigna el mesero responsable de la orden. Ver [Asignar mesero al cobrar](#asignar-mesero-al-cobrar) |
| Propina | Aparece solo si las propinas están activas. Ver [Propinas](#propinas) |
| Domicilio | Si la orden es para enviar, agrega dirección y valor de domicilio |
| Cobro parcial | Permite dividir el pago en varios métodos. Ver [Cobro parcial](#cobro-parcial-split) |

Confirma el pago. WARO registra la orden, actualiza el inventario y muestra el resumen de la venta.

---

### Asignar mesero al cobrar

Si las propinas están activas, aparece primero un selector de mesero en el checkout para atribuir la venta (y su propina) al miembro del equipo correspondiente.

- **Modo mesa:** el selector siempre aparece. Viene precargado con el mesero efectivo de la sesión (el último que tomó la orden), pero el cajero puede confirmarlo o cambiarlo antes de cobrar.
- **Modo mostrador / barra:** el selector solo aparece si todavía no se asignó un mesero desde el chip del carrito.
- Si las propinas están **desactivadas**, el selector no aparece y la venta no queda atribuida.

El mesero asignado queda visible en el detalle de la orden en **Ventas** y alimenta las métricas del perfil del mesero en **Equipo → Miembros**.

---

### Propinas

Si el administrador activó las propinas en **Operaciones → Propinas**, primero eliges el mesero; **solo entonces** aparece el selector de propina debajo.

- El cajero ve **chips con los porcentajes preconfigurados** (por ejemplo 5% · 10% · 15%) y debe tocar uno para aplicarlo sobre el subtotal antes de impuestos; si no elige ninguno, **no se cobra propina**.
- También puede ingresar un **monto personalizado** en pesos o elegir **Sin propina**.
- El botón "Confirmar" cambia su etiqueta a **Confirmar — $X.XXX** solo cuando hay propina seleccionada.
- La propina **no entra dentro de la base de impuestos**: se cobra encima del total.
- En el POS **nunca** se pre-selecciona un porcentaje automáticamente (la opción de pre-selección en Operaciones aplica solo a pedidos online).

> **Importante:** no se puede combinar propina con cobro parcial. Si activas el modo "cobro parcial", el selector de propina desaparece.

En mesas, la propina se envía al cerrar la sesión de la mesa.

---

### Cobro parcial (split)

Cuando un cliente quiere pagar con varios métodos (ej: parte en efectivo y parte con tarjeta):

1. Activa el toggle **Cobro parcial** en el checkout.
2. Selecciona el método y escribe el monto del primer pago. Confirma.
3. Repite para cada pago adicional hasta cubrir el total.
4. Si te equivocaste en un pago ya registrado, toca el ícono de **papelera** para eliminarlo. Puedes opcionalmente escribir un motivo. Si el pago fue en efectivo, el sistema te advierte que debes devolverlo físicamente al cliente.

Para pagos en efectivo, los presets de billetes (**$10K · $20K · $50K**) se suman acumulativamente al monto recibido, facilitando calcular el vuelto.

> **Importante:** no se puede combinar cobro parcial con propinas. Si activas split, el selector de propina desaparece.

---

## Modo mesas (plano del salón)

Si el módulo de mesas está activo, el POS muestra el plano del salón al abrirse.

### Abrir una mesa

Haz clic en cualquier mesa del plano para entrar a su sesión. El POS carga el carrito asociado a esa mesa.

Los estados de las mesas son:
- **Libre** — sin pedido activo
- **Ocupada** — tiene un pedido en curso
- **Pidiendo cuenta** — el cliente solicitó el cierre

### Agregar productos y cobrar

El flujo es igual al modo mostrador: selecciona productos, ajusta el carrito e identifica al cliente si aplica.

Al cobrar, la sesión de la mesa se cierra y el POS regresa al plano del salón.

### Pedidos aceptados desde QR

Si el negocio usa **pedido por QR en mesa**, cuando el personal **acepta** un pedido en **Despacho → Pedidos en mesa (QR)**:

- Los ítems aparecen en el tab de esa mesa (si ya tenías la mesa abierta, la lista se actualiza en unos segundos).
- En **checkout**, el método de pago que eligió el cliente en el QR suele venir **preseleccionado**; el cajero puede cambiarlo antes de cobrar.

Configuración del QR: [Operaciones → Mesas](./operaciones/mesas#pedido-por-qr-en-mesa).

### Cambiar de mesa

Dentro de una sesión de mesa, usa el botón **Cambiar mesa** en el carrito para volver al plano del salón sin cerrar el pedido.

---

## ¿Qué pasa después de cobrar?

- La orden queda registrada en el historial de ventas
- El inventario se descuenta automáticamente (si los productos tienen recetas)
- Si el cliente estaba identificado, acumula sus puntos Waros
- Si hubo propina, queda asociada a la orden y al mesero asignado
- Aparece en el dashboard de analítica

El modal de éxito muestra el desglose final: subtotal, descuento, **propina** (si aplica) y **Total cobrado** como línea destacada cuando hubo propina.

---

## Recibos y comprobantes

Cuando confirmas el pago aparece una pantalla de éxito con dos opciones para entregar el comprobante al cliente.

### Enviar recibo por correo

Si el cliente tiene correo electrónico registrado, el campo se pre-llena automáticamente. Si no, el cajero puede escribirlo en el momento.

Haz clic en **Enviar** para que el sistema despache el recibo al instante. El recibo incluye:

- Nombre del restaurante y datos de contacto
- Número de orden
- Productos comprados con cantidades y precios
- Total y método de pago

El botón cambia a **Enviado** cuando el correo fue despachado correctamente.

### Imprimir comprobante

Haz clic en **Imprimir comprobante** para abrir el diálogo de impresión del navegador. El formato está optimizado para impresoras térmicas de 58 mm.

---

## Preguntas frecuentes

**¿Puedo hacer una venta si un producto no tiene receta?**
Sí. La venta se registra normalmente, pero no habrá descuento de inventario.

**¿Puedo anular una venta ya cobrada?**
Sí, desde el historial de ventas en **Ventas → Órdenes**. Requiere permisos de administrador.

**¿El POS funciona sin internet?**
No. WARO requiere conexión a internet para registrar ventas.

**¿Puedo usar el POS desde el celular?**
Sí, la interfaz se adapta a pantallas pequeñas.

**¿Cómo activo o desactivo el módulo de mesas?**
Desde **Mesas** en el menú lateral. Ahí encontrarás el toggle para activar o desactivar la gestión de mesas.

**¿Puedo cobrar propinas en el POS?**
Sí, si el administrador las activó en **Operaciones → Propinas**. Allí también se definen los porcentajes sugeridos.

**¿Puedo eliminar un pago parcial ya registrado?**
Sí, con el ícono de papelera junto al pago. Puedes escribir un motivo opcional. Si el pago fue en efectivo, recuerda devolverlo físicamente al cliente.

**¿Puedo combinar propina y cobro parcial?**
No. Hay que elegir uno de los dos modos en cada venta.
