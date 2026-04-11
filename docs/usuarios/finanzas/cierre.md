# Cierre contable

El cierre contable (también llamado Cierre Z) registra el corte diario del negocio: cuánto vendiste, cuánto efectivo recibiste, cuánto contaste en caja y si hay diferencia. Es el equivalente digital de cuadrar la caja al final del turno.

---

## Cómo acceder

Finanzas → pestaña **Cierre**

---

## Historial de cierres

La vista principal muestra todos los cierres registrados, con tarjetas de resumen en la parte superior cuando hay datos en el rango seleccionado:

- **Total ventas** — suma de ventas del período filtrado
- **Diferencia de caja** — suma de diferencias entre efectivo esperado y contado
- **Efectivo** — total de ventas en efectivo
- **Tarjeta** — total de ventas con tarjeta
- **Gastos efectivo** — total de gastos pagados en efectivo

### Filtros

- **Rango de fechas** — selecciona un período con el selector o usa el botón **Mes actual**
- **Mesas abiertas** — si hay mesas sin cerrar aparece un aviso en naranja con un enlace directo al plano de mesas

### Acciones por cierre

Cada fila del historial tiene dos botones:

| Botón | Qué hace |
|-------|----------|
| Ojo | Abre el detalle del cierre en un panel lateral |
| Papelera | Elimina el cierre (pide confirmación) |

El panel de detalle muestra: ventas del período, caja (efectivo esperado, contado y diferencia), métodos de pago, notas y fecha de registro.

---

## Registrar un nuevo cierre

Haz clic en **Nuevo cierre**. El wizard tiene 5 pasos.

### Paso 1 — Período

Selecciona el día que vas a cerrar. Puedes usar los accesos rápidos (Hoy, Ayer, Anteayer) o abrir el selector de fecha.

Una vez seleccionado el día, el sistema muestra automáticamente el **Cierre X** — un resumen de las ventas del período sin guardar nada:

| Dato | Descripción |
|------|-------------|
| Total ventas | Suma de órdenes completadas |
| Efectivo recibido | Ventas pagadas en efectivo |
| Gastos en efectivo | Gastos registrados ese día |
| Efectivo esperado | Efectivo recibido menos gastos |
| Métodos de pago | Desglose por grupo (tarjeta, digital, etc.) |

Si hay mesas abiertas para ese período, el sistema bloquea el avance y muestra un aviso. Debes cerrar las mesas en el POS antes de continuar.

### Paso 2 — Contar efectivo

Ingresa el monto total de efectivo que tienes físicamente en caja al momento del cierre. El sistema calcula automáticamente la diferencia respecto al efectivo esperado.

- **Diferencia positiva** — sobra dinero en caja
- **Diferencia negativa** — falta dinero en caja

### Paso 3 — Otros métodos de pago

Verifica los montos de los demás métodos de pago (tarjeta, digital, etc.) según los registros del sistema. Este paso es informativo — no requiere ingresar montos manuales.

### Paso 4 — Resumen

Revisa el consolidado completo antes de confirmar:

- Total ventas del período
- Conteo de órdenes
- Desglose por método de pago
- Caja: esperado vs contado vs diferencia
- Gastos en efectivo

Puedes agregar **notas** opcionales al cierre (observaciones, incidencias del día).

### Paso 5 — Confirmar

Confirma el cierre. El botón se activa solo después de revisar el resumen. Una vez registrado el cierre no se puede editar, solo eliminar.

Al confirmar aparece una pantalla de éxito con el resumen del cierre. Desde ahí puedes volver al historial.

---

## Eliminar un cierre

Desde el historial, haz clic en el ícono de papelera de la fila correspondiente. Aparece una confirmación antes de proceder.

Al eliminar un cierre, el período queda liberado y puedes registrar un nuevo cierre para esas mismas fechas. Los datos de ventas no se borran — solo el registro del cierre.

---

## Preguntas frecuentes

**¿Puedo hacer cierre de varios días a la vez?**
El wizard está diseñado para cierres de un día. Si necesitas cerrar períodos más largos, registra cada día por separado.

**¿Qué pasa si hay mesas abiertas?**
El sistema bloquea el cierre y te muestra cuántas mesas están abiertas. Ve al módulo de Mesas, cierra las sesiones pendientes y regresa.

**¿Puedo ver el Cierre X sin registrar nada?**
Sí. El paso 1 del wizard muestra el Cierre X (preview) sin guardar ningún dato. Puedes consultarlo tantas veces como quieras.

**¿Qué es la diferencia de caja?**
Es la diferencia entre el efectivo que debería haber en caja (ventas en efectivo menos gastos en efectivo) y el efectivo que contaste físicamente. Una diferencia de $0 significa que el cuadre es perfecto.
