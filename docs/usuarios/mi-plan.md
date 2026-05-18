# Mi Plan

Desde **Mi Plan** gestionas tu suscripción a WARO: ves el plan actual, suscribes uno nuevo, completas pagos pendientes y consultas el historial de transacciones y el uso de IA.

## Cómo acceder

Menú lateral → **Cuenta → Mi Plan**. La pantalla tiene dos pestañas:

| Pestaña | Para qué |
|---------|----------|
| **Historial** | Plan actual, suscripción, pagos y eventos |
| **Uso de IA** | Consumo mensual de escaneos de IA |

---

## Historial

### Tu plan actual

Tarjeta en la parte superior con:

- **Nombre del plan** (ej: Plan Profesional)
- **Estado** — badge con color
- **Ciclo de facturación** — Mensual o Anual
- **Próxima renovación** — fecha en la que se cobrará el siguiente período
- **Uso de escaneos del período** — barra de progreso `X de Y escaneos`. Cambia de color según el consumo:
  - **Verde** — bajo consumo
  - **Azul** — consumo moderado
  - **Amarillo** — cerca del límite
  - **Rojo** — al límite o por encima

### Estados posibles del plan

| Estado | Significado |
|--------|-------------|
| **Activo** | Plan vigente y pagado |
| **Pendiente** | Suscripción iniciada pero pago no confirmado todavía |
| **Gracia** | El pago de renovación falló; tienes un periodo limitado para regularizar antes de quedar cancelado |
| **Cancelado** | Suscripción cancelada — no se renovará |
| **Expirado** | El período pagado terminó y no se renovó |

### Suscribir o cambiar de plan

El botón principal cambia según el estado:

- **Suscribirse** — si nunca has tenido plan
- **Reactivar** — si tu plan está cancelado o expirado
- **Completar pago** — si está pendiente
- **Pagar ahora** — si está en período de gracia (con advertencia visible)

#### Wizard de suscripción (2 pasos)

**Paso 1 — elige el plan:**
- Toggle **Mensual / Anual** (anual usualmente tiene descuento)
- Tarjetas con los planes disponibles: precio, límite de escaneos, features incluidas, ahorro anual

**Paso 2 — datos y pago:**
- Confirma tu email
- Revisa el resumen
- Se redirige a **Wompi** para completar el pago

---

### Historial de pagos

Tabla paginada (20 por página) con todos los eventos de billing:

| Tipo de evento | Significado |
|----------------|-------------|
| `subscribe_initiated` | Iniciaste una suscripción |
| `payment_approved` | Pago aprobado |
| `payment_rejected` | Pago rechazado |
| `payment_failed` | Pago fallido |
| `payment_pending` | Pago en proceso |
| `subscription_created` | Suscripción activada |
| `subscription_renewed` | Renovación cobrada |
| `subscription_cancelled` | Suscripción cancelada |
| `subscription_expired` | Período pagado terminó |
| `plan_changed` | Cambio de plan |
| `gift_granted` | Período de regalo aplicado |

Cada fila muestra fecha, tipo (badge), monto y referencia.

### Detalle de un pago

Haz clic en cualquier fila para abrir el panel lateral con:

- **Monto** y, si aplica, **período/nota del regalo**
- **ID de transacción de Wompi** (botón para copiar)
- **Referencia del gateway** (botón para copiar)
- **URL del checkout** (botón para abrir en nueva pestaña)

Estos datos te sirven para soporte o conciliación contable.

---

## Uso de IA

Tabla con el consumo histórico de los **últimos 24 meses**:

| Columna | Descripción |
|---------|-------------|
| **Mes** | Mes y año |
| **Escaneos usados** | Cuántos escaneos consumiste |
| **Límite** | Cuántos escaneos te daba el plan ese mes |
| **% de uso** | Porcentaje sobre el límite |

Te sirve para entender tu patrón de consumo y decidir si necesitas un plan más grande.

> Los **escaneos** se usan principalmente en **Abastecimiento → Compra Directa** (registro de facturas con IA) y en Calidad de Datos.

---

## Preguntas frecuentes

**¿Qué pasa si se me pasa el período de gracia?**
Tu plan queda en estado **Expirado** y pierdes acceso a las funciones de tu suscripción hasta reactivar.

**¿Puedo cambiar de mensual a anual?**
Sí, abre el wizard de suscripción y elige el ciclo anual. El cambio se aplica al confirmar el pago.

**¿Dónde veo el comprobante de un pago?**
Abre el detalle del evento de pago — el botón **Abrir checkout** te lleva al recibo de Wompi.

**¿Por qué se ve el ID de transacción de Wompi?**
Para que puedas hacer trazabilidad con tu contador o reclamar con el banco si hay alguna disputa.
