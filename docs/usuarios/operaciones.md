# Operaciones

El módulo de Operaciones agrupa la configuración del día a día del restaurante: cómo se ven las comandas en cocina, cómo se gestionan las mesas, qué se muestra en la plataforma, qué promociones aplican en caja y cómo se cobran las propinas.

## Cómo acceder

Menú lateral → **Operaciones**. La pantalla tiene siete pestañas:

| Pestaña | Para qué |
|---------|----------|
| **Comandas & Cocina** | Vista en tiempo real de los pedidos para el área de producción |
| **Mesas** | Plano del salón y configuración de mesas (la etiqueta cambia si tu tenant usa "Habitaciones", "Salones", etc.) |
| **Bitácora** | Auditoría de acciones en POS (eliminaciones, anulaciones de pago, etc.) |
| **Turnos** | Plantillas de horario reutilizables para arqueos por plantilla (Mañana, Tarde, Noche…) |
| **Personalizar** | Renombrar módulos, mostrar/ocultar secciones según el tipo de negocio |
| **Promociones** | Descuentos automáticos por horario, alcance y prioridad |
| **Propinas** | Activar propinas, definir porcentajes sugeridos |

---

## Comandas & Cocina

Pantalla en vivo para cocina: muestra las órdenes nuevas, en preparación y listas para entregar. Cada tarjeta tiene los ítems, modificadores y notas del cliente.

> Si necesitas configurar impresoras o la lógica de envío a cocina, contacta al equipo de soporte.

---

## Mesas

Aquí se activa/desactiva el módulo de mesas, se crean/editan/desactivan mesas, y se asigna la columna de mesero a las sesiones (si tu negocio tiene atribución de meseros activa).

Ver [Mesas](./operaciones/mesas) para la guía completa: estados, crear/editar, reactivar mesas inactivas, **pedido por QR en mesa** (activar módulo, enlace por mesa, copiar/imprimir), etiqueta configurable (Mesa / Cubículo / Habitación / etc.).

---

## Bitácora

Registro de auditoría del POS: quién eliminó productos del tab o carrito, vació tabs, anuló pagos parciales y con qué motivo. Pensado para dueños, administradores y supervisores.

Ver [Bitácora de operaciones](./operaciones/bitacora) para la guía completa: qué se registra, qué no, filtros, políticas de motivo obligatorio en cocina y anulaciones de pago.

Las líneas de [Venta libre en el POS](./pos-venta-libre) en mesa o barra aparecen como producto agregado o eliminado del tab; en mostrador, como línea o carrito vaciado.

---

## Turnos

Aquí defines los **turnos reutilizables** (nombre + hora de inicio y fin) que luego eliges al hacer un arqueo **Por plantilla** en Finanzas.

Ver [Turnos](./operaciones/turnos) para la guía completa: crear, editar, activar/desactivar plantillas y relación con el arqueo de caja.

---

## Personalizar

Adapta la nomenclatura y los módulos visibles al lenguaje de tu negocio. Ejemplos:

- Renombrar "Mesas" a "Habitaciones" (hoteles), "Pistas" (eventos), etc.
- Ocultar módulos que no usas (ej: Domicilios si no haces delivery)

Los cambios se aplican en todos los menús y reportes.

---

## Promociones

Pantalla para crear descuentos automáticos que se aplican en el POS cuando una línea cumple las condiciones configuradas.

### Lista de promociones

La tabla muestra nombre, tipo, valor, horario, alcance, prioridad y estado. Puedes buscar promociones y filtrar por **Tipo** o **Estado**.

Los tipos disponibles son:

| Tipo | Cuándo usarlo |
|------|---------------|
| **% descuento** | Descuento porcentual sobre el producto |
| **Descuento fijo** | Monto en pesos descontado |
| **2x1 / BOGO** | Compra cierta cantidad y lleva otra gratis |

### Crear o editar una promoción

Haz clic en **+ Nueva promoción** o en el ícono de lápiz de una promoción existente.

Configura:

- **Nombre** — ejemplo: Happy hour 20%
- **Tipo y valor** — porcentaje, monto fijo o regla 2x1 / BOGO
- **Alcance** — todos los productos, categorías específicas o productos específicos
- **Horarios** — días de la semana y hora de inicio/fin; puedes marcar si cruza medianoche
- **Vigencia** — fecha inicial y final opcionales
- **Prioridad** — si varias promociones aplican a la misma línea, gana la de mayor prioridad
- **Promoción activa** — si está apagada, no se aplica en el menú

Si eliges alcance por categorías o productos, debes seleccionar al menos una categoría o producto antes de guardar.

### Exclusión por ítem en checkout

En la parte superior de Promociones hay un toggle para permitir que el cajero desactive la promoción en una línea específica del checkout sin quitar el producto del carrito.

Úsalo cuando el descuento automático aplica en general, pero necesitas excluir un ítem puntual por una condición comercial del momento.

---

## Propinas

Pantalla para activar y configurar el cobro de propinas en el POS y en pedidos online.

### Activar propinas

Toggle maestro en la parte superior:

- **Activado** → los clientes verán la opción de propina en el checkout (POS y online)
- **Desactivado** → la propina queda oculta. El selector de mesero en el POS también desaparece

### Porcentajes sugeridos

Define hasta **5 chips** con los porcentajes que aparecen en el checkout (ej: 5% · 10% · 15%).

- Cada chip acepta entre **0 y 100**, con hasta 2 decimales.
- El cliente siempre puede ingresar un **monto personalizado** además de los chips.
- Los porcentajes se calculan sobre el subtotal **antes de impuestos**.

### Pre-seleccionar el primer porcentaje

Toggle opcional: si está activo, el primer chip aparece marcado por defecto en el checkout.

> **Recomendación:** mantenlo apagado. La **Ley 1935 de 2018** establece que la propina en Colombia es voluntaria. Pre-seleccionar un valor puede inducir cobros no consentidos.

### Distribución de propinas

> **Importante:** WARO atribuye la propina directamente al **mesero asignado a la orden**. La repartición posterior entre cocina, barra u otros equipos es responsabilidad del propietario y se gestiona fuera de la plataforma.

### Guardar cambios

Los cambios en porcentajes y pre-selección requieren tocar **Guardar cambios**. El toggle maestro se aplica al instante.

### Ver el historial

El botón **Ver historial de propinas →** lleva a `/ventas/propinas`, donde puedes consultar todas las órdenes con propina por mesero, canal y método de pago. Ver [Historial de propinas](./ventas/propinas).
