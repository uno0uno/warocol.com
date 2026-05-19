# Operaciones

El módulo de Operaciones agrupa la configuración del día a día del restaurante: cómo se ven las comandas en cocina, cómo se gestionan las mesas, qué se muestra en la plataforma y cómo se cobran las propinas.

## Cómo acceder

Menú lateral → **Operaciones**. La pantalla tiene cinco pestañas:

| Pestaña | Para qué |
|---------|----------|
| **Comandas & Cocina** | Vista en tiempo real de los pedidos para el área de producción |
| **Mesas** | Plano del salón y configuración de mesas (la etiqueta cambia si tu tenant usa "Habitaciones", "Salones", etc.) |
| **Turnos** | Plantillas de horario reutilizables para arqueos por plantilla (Mañana, Tarde, Noche…) |
| **Personalizar** | Renombrar módulos, mostrar/ocultar secciones según el tipo de negocio |
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
