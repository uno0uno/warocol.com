# Mesas

La gestión de mesas te permite organizar el salón de tu restaurante directamente desde el POS. Cuando está activa, el punto de venta muestra el plano del salón y cada mesa tiene su propia sesión de pedido.

## Cómo acceder

Menú lateral → **Operaciones → Mesas**. Desde aquí puedes:

- Activar o desactivar el módulo de mesas para el POS
- Activar **pedido por QR en mesa** y gestionar el enlace QR de cada mesa
- Ver el listado de mesas configuradas con su estado actual y, si aplica, el mesero asignado
- Crear, editar, desactivar y reactivar mesas

> La etiqueta del módulo es configurable. Algunos negocios la llaman "Cubículos" (peluquerías), "Habitaciones" (hoteles), "Pistas" (eventos), etc. La configuración se hace en **Operaciones → Personalizar**. Esta guía usa "Mesa" como término genérico.

---

## Activar el módulo de mesas

En la parte superior de la página verás el toggle **Gestión de mesas**.

- **Activado** — el POS muestra el plano del salón al abrirse y cada mesa tiene su propia sesión de pedido.
- **Desactivado** — el POS opera solo en modo mostrador.

> El cambio se refleja en el POS al instante. Si tienes una caja abierta atendiendo, recarga la pestaña del POS para ver el cambio.

---

## Configurar las mesas

### Crear una mesa

Haz clic en **+ Nueva mesa**. Ingresa:

| Campo | Descripción |
|-------|-------------|
| Nombre | Identificador de la mesa (ej. "Mesa 1", "Terraza A") |
| Capacidad | Número de personas que puede atender (opcional) |

### Editar una mesa

Haz clic en el ícono de edición junto a la mesa que quieres modificar. Puedes cambiar el nombre y la capacidad.

### Desactivar una mesa

Haz clic en el ícono de desactivar. WARO te pedirá confirmación antes de proceder.

No puedes desactivar una mesa que tenga una sesión abierta. Primero cierra el pedido desde el POS.

### Reactivar una mesa desactivada

Las mesas desactivadas no se eliminan: quedan en una lista aparte por si las necesitas más adelante. Para reactivarlas:

1. Filtra el listado por **Desactivadas** (o expande la sección "Mesas inactivas").
2. Toca el ícono de reactivar en la mesa correspondiente.
3. Confirma — la mesa vuelve a aparecer en el plano del salón inmediatamente.

---

## Estados de las mesas

| Estado | Significado |
|--------|-------------|
| **Libre** | Sin pedido activo, disponible para atender |
| **Ocupada** | Tiene un pedido en curso |
| **Pidiendo cuenta** | El cliente solicitó cerrar la cuenta |

---

## Columna Mesero (opcional)

Si tu negocio tiene activada la **atribución de meseros** (en **Operaciones → Propinas**), aparece una columna extra que muestra el mesero efectivo de la sesión actual de cada mesa. Esto facilita saber quién está atendiendo cada mesa antes de cobrar.

---

## Pedido por QR en mesa

Permite que los comensales pidan desde su celular escaneando un código en la mesa. El pedido **no entra al POS ni a cocina** hasta que el personal lo **acepta** en **Despacho → Pedidos en mesa (QR)**.

### Requisitos

1. **Gestión de mesas** activa (toggle superior de esta página).
2. **Pedido por QR en mesa** activo (segundo toggle en el bloque de módulos).
3. Cada mesa con QR **activado** y enlace generado.
4. Productos con **Pedido en mesa (QR)** marcado en **Menú → Productos** (independiente de domicilios).

### Activar el módulo QR

En el mismo bloque de módulos, debajo de **Gestión de mesas**, verás **Pedido por QR en mesa**.

- **Activado** — puedes habilitar QR por mesa y los clientes pueden enviar pedidos pendientes de confirmación.
- **Desactivado** — no se muestran controles QR en el listado ni en el panel de la mesa.

### QR por mesa

Con el módulo QR activo, cada mesa tiene controles para:

| Acción | Para qué sirve |
|--------|----------------|
| Activar QR en esta mesa | Genera el enlace público de esa mesa |
| **Copiar enlace** | Pegar en WhatsApp o donde compartas el menú |
| **Descargar PNG** | Imagen del código QR para imprimir en la mesa |
| **Regenerar enlace** | Invalida el QR anterior y crea uno nuevo (vuelve a imprimir si ya repartiste códigos) |

El enlace tiene la forma `https://warocol.com/{tu-negocio}/mesa/{código}` y **permanece estable** hasta que uses **Regenerar enlace**.

En escritorio también verás una columna **QR** en la tabla de mesas con accesos rápidos a copiar y descargar.

### Qué hace el cliente

1. Escanea el QR o abre el enlace.
2. Ve el menú (solo productos marcados para QR).
3. Arma el pedido, elige método de pago y envía.
4. Ve un mensaje de confirmación: el restaurante revisará el pedido antes de prepararlo.

### Qué hace el personal después

Los pedidos pendientes aparecen en **Despacho → Pedidos en mesa (QR)** como una lista (una fila por pedido). Haz clic en el pedido para ver el detalle y pulsa **Aceptar pedido** o **Rechazar**. Al aceptar, los ítems se agregan al tab de esa mesa en el **POS** y, si tienes comandas activas, se envían a cocina. Ver [Despacho](../despacho#pedidos-en-mesa-qr).

La campana de notificaciones abre el **detalle** del pedido cuando está disponible; en caso contrario, el listado filtrado por esa mesa.

---

## Preguntas frecuentes

**¿Dónde se toman los pedidos de las mesas?**
Desde el **POS**. Al entrar con el módulo activo verás el plano del salón; haz clic en una mesa para abrir su sesión de pedido.

**¿Puedo tener mesas configuradas sin activar el módulo?**
Sí. Las mesas quedan guardadas aunque el módulo esté desactivado. Al activarlo de nuevo, todas las mesas aparecen en el plano.

**¿Qué pasa si desactivo el módulo con mesas ocupadas?**
El toggle cambia la vista del POS, pero las sesiones abiertas no se cierran. Se recomienda cerrar todos los pedidos antes de desactivar el módulo.

**¿Una mesa desactivada se pierde para siempre?**
No. Queda en el listado de mesas inactivas y puedes reactivarla cuando quieras.

**¿En qué se diferencia del pedido por QR de Domicilios?**
En **Domicilios** el cliente pide por el canal online (envío, recogida o consumo en local) y el pedido sigue estados como Pendiente → Confirmado → En preparación. En **pedido QR en mesa** el cliente está físicamente en una mesa concreta, el menú es solo para esa mesa y el pedido queda **pendiente de aceptación** en **Despacho → Pedidos en mesa (QR)** hasta que el personal lo confirme.

**¿Cambia la URL si vuelvo a abrir Operaciones → Mesas?**
No. El enlace es estable mientras no uses **Regenerar enlace** en esa mesa.

**¿Qué ve el cliente después de enviar el pedido?**
Una pantalla de éxito indicando que el restaurante confirmará el pedido. Los ítems **no** aparecen en el POS ni se preparan hasta que alguien los **acepte** en Despacho.

**¿Un producto no sale en el menú QR?**
Revisa que tenga activo **Pedido en mesa (QR)** en **Menú → Productos** y que el módulo QR y el QR de esa mesa estén encendidos.
