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

Haz clic en **Ir a checkout**. En la pantalla de checkout:

| Campo | Qué hacer |
|-------|-----------|
| Método de pago | Selecciona: **Efectivo**, **Tarjeta** o **Digital** |
| Puntos Waros | Si el cliente tiene puntos, puedes aplicarlos como descuento |

Confirma el pago. WARO registra la orden, actualiza el inventario y muestra el resumen de la venta.

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

### Cambiar de mesa

Dentro de una sesión de mesa, usa el botón **Cambiar mesa** en el carrito para volver al plano del salón sin cerrar el pedido.

---

## ¿Qué pasa después de cobrar?

- La orden queda registrada en el historial de ventas
- El inventario se descuenta automáticamente (si los productos tienen recetas)
- Si el cliente estaba identificado, acumula sus puntos Waros
- Aparece en el dashboard de analítica

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
