# Finanzas

El módulo de Finanzas agrupa las herramientas para controlar el dinero del negocio: cartera de clientes a crédito, cierre contable diario y configuración de métodos de cobro.

Ve a **Finanzas** en el menú lateral. Desde ahí accedes a las secciones mediante las pestañas superiores: **Cartera · Gastos · Cierre · Métodos de pago**.

---

## Cartera

La cartera muestra todos los clientes que tienen ventas pendientes de pago — compras registradas a crédito que aún no han sido canceladas.

### Resumen general

En la parte superior aparecen cuatro tarjetas con el estado consolidado de la cartera:

| Tarjeta | Qué muestra |
|---------|-------------|
| Total vigente | Suma de toda la deuda activa |
| Vencida | Monto de deuda con más de 30 días sin pago |
| Clientes | Número de clientes con deuda |
| En mora | Número de clientes con deuda vencida |

### Antigüedad de cartera

Debajo del resumen aparecen las bandas de antigüedad (aging). Cada banda muestra cuántos clientes y cuánto dinero hay en ese rango:

| Banda | Rango |
|-------|-------|
| 0–30 días | Deuda reciente |
| 31–60 días | Deuda con un mes de atraso |
| 61–90 días | Deuda con dos meses de atraso |
| 90+ días | Deuda crítica |

Haz clic en cualquier banda para filtrar la lista de clientes por ese rango. Haz clic de nuevo para quitar el filtro.

### Lista de clientes

La tabla muestra cada cliente con deuda pendiente:

| Columna | Descripción |
|---------|-------------|
| Cliente | Nombre y teléfono |
| Deuda total | Monto pendiente de pago |
| Días más antiguo | Cuántos días lleva la deuda más vieja sin pagar |
| Órdenes | Número de órdenes con saldo pendiente |
| Estado | Vigente (menos de 30 días) o Vencido |

Usa los botones encima de la tabla para filtrar: **Todos · Vencidos · Vigentes**.

Haz clic en cualquier fila para abrir el perfil del cliente con el detalle de cada orden pendiente, opciones de pago y el historial completo de abonos.

### Preguntas frecuentes — Cartera

**¿Cómo se genera la cartera?**
Cuando en el POS se registra una venta con el método de pago configurado como "genera cartera" (el grupo Crédito), la orden queda pendiente de pago y aparece en cartera.

**¿Cómo se registra un pago?**
Entra al detalle del cliente y usa el botón de pago. Puedes abonar un monto parcial o pagar el total.

**¿Qué pasa con una deuda cuando se paga?**
La orden se marca como pagada y desaparece de la cartera. El historial de pagos queda registrado en el perfil del cliente.

---

## Cierre contable

El cierre contable (también llamado Cierre Z) registra el corte diario del negocio: cuánto vendiste, cuánto efectivo recibiste, cuánto contaste en caja y si hay diferencia. Es el equivalente digital de cuadrar la caja al final del turno.

### Historial de cierres

La vista principal muestra todos los cierres registrados. Cuando hay datos en el rango seleccionado, aparecen tarjetas de resumen en la parte superior:

| Tarjeta | Descripción |
|---------|-------------|
| Total ventas | Suma de ventas del período filtrado |
| Diferencia de caja | Suma de diferencias entre efectivo esperado y contado |
| Efectivo | Total de ventas en efectivo |
| Tarjeta | Total de ventas con tarjeta |
| Gastos efectivo | Total de gastos pagados en efectivo |

**Filtros:** selector de rango de fechas con acceso rápido al **Mes actual**. Si hay mesas sin cerrar aparece un aviso en naranja con enlace directo al plano de mesas.

Cada fila del historial tiene dos botones:

| Botón | Qué hace |
|-------|----------|
| Ojo | Abre el detalle del cierre en un panel lateral |
| Papelera | Elimina el cierre (pide confirmación) |

El panel de detalle muestra: ventas del período, caja (efectivo esperado, contado y diferencia), métodos de pago, notas y fecha de registro.

### Registrar un nuevo cierre

Haz clic en **Nuevo cierre**. El proceso tiene 5 pasos.

**Paso 1 — Período**

Selecciona el día que vas a cerrar. Usa los accesos rápidos (Hoy, Ayer, Anteayer) o abre el selector de fecha.

Una vez seleccionado el día, el sistema muestra automáticamente el **Cierre X** — un resumen de las ventas del período sin guardar nada:

| Dato | Descripción |
|------|-------------|
| Total ventas | Suma de órdenes completadas |
| Efectivo recibido | Ventas pagadas en efectivo |
| Gastos en efectivo | Gastos registrados ese día |
| Efectivo esperado | Efectivo recibido menos gastos |
| Métodos de pago | Desglose por grupo (tarjeta, digital, etc.) |

Si hay mesas abiertas para ese período, el sistema bloquea el avance y muestra un aviso. Debes cerrar las mesas en el POS antes de continuar.

**Paso 2 — Efectivo**

Ingresa el monto total de efectivo que tienes físicamente en caja. El sistema calcula automáticamente la diferencia respecto al efectivo esperado.

- **Diferencia positiva** — sobra dinero en caja
- **Diferencia negativa** — falta dinero en caja

**Paso 3 — Otros métodos de pago**

Verifica los montos de los demás métodos de pago (tarjeta, digital, etc.) según los registros del sistema. Este paso es informativo — no requiere ingresar montos manuales.

**Paso 4 — Resumen**

Revisa el consolidado completo antes de confirmar:

- Total ventas del período
- Conteo de órdenes
- Desglose por método de pago
- Caja: esperado vs contado vs diferencia
- Gastos en efectivo

Puedes agregar **notas** opcionales al cierre (observaciones, incidencias del día).

**Paso 5 — Cerrar**

Confirma el cierre. El botón se activa solo después de revisar el resumen. Una vez registrado, el cierre no se puede editar, solo eliminar.

Al confirmar aparece una pantalla de éxito con el resumen. Desde ahí puedes volver al historial.

### Eliminar un cierre

Desde el historial, haz clic en el ícono de papelera de la fila correspondiente. Aparece una confirmación antes de proceder.

Al eliminar un cierre, el período queda liberado y puedes registrar un nuevo cierre para esas mismas fechas. Los datos de ventas no se borran — solo el registro del cierre.

### Preguntas frecuentes — Cierre

**¿Puedo hacer cierre de varios días a la vez?**
El wizard está diseñado para cierres de un día. Si necesitas cerrar períodos más largos, registra cada día por separado.

**¿Qué pasa si hay mesas abiertas?**
El sistema bloquea el cierre y muestra cuántas mesas están abiertas. Ve al módulo de Mesas, cierra las sesiones pendientes y regresa.

**¿Puedo ver el Cierre X sin registrar nada?**
Sí. El paso 1 del wizard muestra el Cierre X (preview) sin guardar ningún dato. Puedes consultarlo tantas veces como quieras.

**¿Qué es la diferencia de caja?**
Es la diferencia entre el efectivo que debería haber en caja (ventas en efectivo menos gastos en efectivo) y el efectivo que contaste físicamente. Una diferencia de $0 significa que el cuadre es perfecto.

---

## Métodos de pago

Desde esta sección configuras los grupos y métodos de pago que aparecen en el POS, en los reportes y en el cierre contable.

### Grupos de pago

Los métodos de pago están organizados en grupos. La vista principal muestra todos los grupos con:

- Nombre del grupo
- Slug (identificador interno)
- Número de métodos configurados
- Si genera cartera (ventas a crédito)
- Si es predeterminado o personalizable

| Tipo | Descripción |
|------|-------------|
| Predeterminado | Creado por WARO, no se puede eliminar (ej. Efectivo) |
| Personalizable | Puedes agregar y editar los métodos dentro del grupo |

El grupo **Efectivo** no se puede modificar — es el método base del sistema.

### Administrar métodos de un grupo

Haz clic en cualquier grupo (excepto Efectivo) para ver y gestionar sus métodos.

**Agregar un método**

Haz clic en **Agregar método**. Ingresa el nombre (ej. "Nequi", "Bancolombia", "Visa") y guarda.

**Editar un método**

Haz clic en el método para editar su nombre o desactivarlo.

**Desactivar un método**

Los métodos desactivados no aparecen en el POS pero su historial de ventas se conserva.

### El campo "genera cartera"

Los grupos marcados como **genera cartera** crean una deuda pendiente en el módulo de Cartera cada vez que se registra una venta con ese método. Esto corresponde a las ventas a crédito — el cliente se lleva el pedido y paga después.

### Preguntas frecuentes — Métodos de pago

**¿Puedo crear mis propios grupos de pago?**
No. Los grupos están definidos por WARO (Efectivo, Tarjeta, Digital, Crédito). Lo que puedes personalizar son los métodos dentro de cada grupo.

**¿Qué pasa si desactivo un método que ya tiene ventas?**
Las ventas anteriores no se modifican. El método simplemente deja de aparecer en el POS para nuevas ventas.

**¿Por qué no puedo editar el grupo Efectivo?**
El efectivo es el método base del sistema y está ligado directamente al cuadre de caja en el cierre contable. Por eso no se puede modificar.

---

## Gastos

Desde la pestaña Gastos llevas el control de todos los costos del negocio que no son compras de inventario: arriendo, servicios públicos, mantenimiento, publicidad, etc.

### Ver gastos

En la parte superior aparecen tres tarjetas del mes seleccionado:

- **Total gastos** — suma de todos los montos
- **Transacciones** — número de registros
- **Promedio** — gasto promedio por transacción

**Filtros disponibles:**

| Filtro | Descripción |
|--------|-------------|
| Mes | Selector de mes/año — por defecto el mes actual |
| Categoría | Filtra por tipo de gasto |
| Búsqueda | Texto libre sobre la descripción |

La tabla muestra columnas: fecha · categoría · recurrente · descripción · monto · acciones.

- El badge **Recurrente** indica gastos que se repiten periódicamente
- El ícono de ojo abre el detalle
- El ícono de papelera elimina el registro (pide confirmación)

La eliminación es permanente e incluye los documentos adjuntos.

### Registrar un gasto

Haz clic en **Nuevo gasto**. El formulario tiene tres pasos.

**Paso 1 — Datos básicos**

| Campo | Descripción |
|-------|-------------|
| Fecha | Fecha en que ocurrió el gasto |
| Categoría | Clasifica el gasto (arriendo, servicios, marketing, etc.) |
| Descripción | Detalle opcional |
| Monto | Valor en pesos colombianos |
| ¿Es recurrente? | Activa si el gasto se repite |

Si marcas recurrente, aparecen **Frecuencia** (mensual, quincenal, semanal) y **Fecha de fin** (opcional).

**Paso 2 — Documentos**

Adjunta el soporte: factura, comprobante o foto del recibo.

- Formatos aceptados: JPG, PNG, PDF
- Puedes arrastrar archivos o seleccionarlos desde el dispositivo
- Quedan vinculados al registro para auditoría

**Paso 3 — Confirmar**

Revisa el resumen y presiona **Registrar gasto**.

### Editar un gasto

Desde la lista, usa el ícono de editar. Puedes modificar fecha, categoría, descripción y monto. Para actualizar documentos adjuntos, elimina el gasto y vuélvelo a crear.
