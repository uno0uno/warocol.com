# Finanzas

El módulo de Finanzas agrupa las herramientas para controlar el dinero del negocio: arqueo diario, cierre contable mensual, cartera de clientes a crédito, gastos, métodos de cobro y los reportes contables (cuentas, asientos, balance y P&L).

## Cómo acceder

Menú lateral → **Finanzas**. La pantalla tiene nueve pestañas en este orden:

| Pestaña | Para qué |
|---------|----------|
| **Arqueo de caja** | Cuadre diario de caja (Cierre Z) y vista preview (Cierre X) |
| **Cierre contable** | Cierre mensual contable irreversible que bloquea las órdenes del mes |
| **Cartera** | Clientes con ventas a crédito pendientes de pago |
| **Gastos** | Costos operativos del negocio |
| **Métodos de pago** | Grupos y métodos disponibles en POS y reportes |
| **Cuentas** | Plan Único de Cuentas (PUC) del tenant |
| **Asientos** | Libro diario contable |
| **Balance** | Balance de comprobación por período |
| **P&L Mensual** | Estado de resultados mensual |

---

## Arqueo de caja

El **arqueo** registra el cuadre de caja de un período: cuánto vendiste, cuánto efectivo recibiste, cuánto contaste en caja y si hay diferencia. Es el equivalente digital de cuadrar la caja al final del turno.

> Esta sección es **reversible** (puedes eliminar un arqueo). El **Cierre contable mensual** (siguiente sección) es distinto e irreversible.

### Tres formas de arquear

Desde **Finanzas → Arqueo de caja** eliges cómo cerrar:

| Modo | Cuándo usarlo | Cómo iniciarlo |
|------|---------------|----------------|
| **Día completo** | Un solo cierre por día calendario (cierre nocturno o negocio de un turno único) | Tarjeta **Arqueo del día** o botón **Día completo** |
| **Turno u horario** | Varios cortes el mismo día (mañana / tarde / noche) o un rango entre fechas con hora exacta | Tarjeta **Turno u horario** |
| **Plantillas de turno** *(próximamente)* | Horarios fijos reutilizables (ej. almuerzo 12:00–15:00) configurados en Operaciones | Llegará en **Operaciones → Turnos** |

**Vista previa (Corte X):** revisa ventas y caja en vivo **sin registrar** nada. Enlace al pie de la pantalla principal de arqueo. Desde ahí puedes pasar a registrar con el mismo período.

> Los arqueos por horario muestran la ventana (ej. `14:00 – 22:30`) en el historial con la etiqueta **Por horario**. Los de día completo muestran **Día completo**.

### Historial de arqueos

La vista principal muestra todos los arqueos registrados. Cuando hay datos en el rango seleccionado, aparecen tarjetas de resumen:

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
| Ojo | Abre el detalle del arqueo en un panel lateral |
| Papelera | Elimina el arqueo (pide confirmación) |

El panel de detalle muestra: tipo de cierre (día completo o por horario), fechas y —si aplica— la ventana horaria, ventas del período, caja, métodos de pago, notas y fecha de registro.

### Arqueo del día (día completo)

Haz clic en **Arqueo del día**. El proceso tiene 5 pasos.

**Paso 1 — Período**

Selecciona el día que vas a cerrar. Usa los accesos rápidos (Hoy, Ayer, Anteayer) o abre el selector de fecha.

Una vez seleccionado, el sistema muestra automáticamente el resumen del período sin guardarlo:

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

Puedes agregar **notas** opcionales (observaciones, incidencias del día).

**Paso 5 — Cerrar**

Confirma el arqueo. El botón se activa solo después de revisar el resumen. Una vez registrado, el arqueo no se puede editar, solo eliminar.

### Arqueo por turno u horario

Haz clic en **Turno u horario**. En el primer paso defines el período:

1. Elige fechas (Hoy, Ayer, últimos 7 días, o un rango personalizado).
2. Activa **Horario** para acotar por hora (obligatorio si el rango abarca varios días).
3. Revisa el resumen previo y continúa con los mismos 5 pasos de conteo (efectivo, otros métodos, resumen, cerrar).

Útil cuando cierras caja entre turnos sin esperar al final del día.

### Eliminar un arqueo

Desde el historial, haz clic en el ícono de papelera. Al eliminar, el período queda liberado y puedes registrar un nuevo arqueo para esas mismas fechas. Los datos de ventas no se borran — solo el registro del arqueo.

### Preguntas frecuentes — Arqueo

**¿Puedo hacer arqueo de varios días a la vez?**
En **Arqueo del día**, un solo día por registro. En **Turno u horario** puedes elegir un rango de fechas; si abarca más de un día debes indicar hora de inicio y fin.

**¿Cuál modo elijo?**
- Un cierre al cerrar el local → **Día completo**.
- Varios cortes el mismo día (ej. almuerzo y cena) → **Turno u horario**.
- Horarios fijos repetibles → próximamente **Plantillas de turno** en Operaciones.

**¿Qué pasa si hay mesas abiertas?**
El sistema bloquea el arqueo y muestra cuántas mesas están abiertas. Ve al módulo de Mesas, cierra las sesiones pendientes y regresa.

**¿Qué es la diferencia de caja?**
Es la diferencia entre el efectivo que debería haber en caja (ventas en efectivo menos gastos en efectivo) y el efectivo que contaste físicamente. Una diferencia de $0 significa que el cuadre es perfecto.

---

## Cierre contable (mensual)

El **cierre contable** es el cierre del mes para efectos contables: bloquea todas las órdenes del período para que **nadie pueda modificarlas**. Sirve para que tu contador pueda preparar declaraciones e informes sabiendo que los números del mes ya están en firme.

> **Distinto del arqueo:** el arqueo es el cuadre diario de caja y se puede eliminar. El cierre contable es **mensual** e **irreversible** una vez confirmado.

### Vista anual

La pantalla muestra los **12 meses del año seleccionado** con su estado:

| Estado | Significado |
|--------|-------------|
| **Abierto** | El mes aún se puede modificar (órdenes editables) |
| **Cerrado** | Cerrado contablemente, todas las órdenes quedan bloqueadas |
| **Futuro** | Mes que aún no ha ocurrido |

### Cerrar un mes

Cada mes tiene un botón con ícono de candado para cerrarlo.

1. Toca el candado del mes a cerrar.
2. (Opcional) Agrega **notas para el contador** — un campo de texto libre donde puedes dejar observaciones.
3. Confirma.

Al confirmar:
- Todas las órdenes del mes quedan bloqueadas — ni el equipo ni los administradores pueden editarlas.
- El estado del mes cambia a "Cerrado".
- La acción **no es reversible desde la plataforma**. Si necesitas reabrir un mes, contacta a soporte.

### Preguntas frecuentes — Cierre contable

**¿Cuándo debería cerrar un mes?**
Después de que tu contador valide los reportes del mes y confirme que los datos están correctos. Habitualmente entre el día 5 y 10 del mes siguiente.

**¿Qué pasa con las ventas tardías de ese mes?**
Una vez cerrado, no se pueden registrar ventas con fecha del mes cerrado. Si necesitas registrar algo, debe ir al mes actual con una nota explicativa.

**¿Afecta al arqueo de caja?**
No. El cierre contable bloquea las **órdenes**, no los arqueos. Los arqueos diarios se siguen pudiendo crear o eliminar.

---

## Cartera

La cartera muestra todos los clientes que tienen ventas pendientes de pago — compras registradas a crédito que aún no han sido canceladas.

### Resumen general

Cuatro tarjetas con el estado consolidado de la cartera:

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

Haz clic en cualquier banda para filtrar la lista por ese rango. Haz clic de nuevo para quitar el filtro.

### Lista de clientes

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
Cuando en el POS se registra una venta con un método de pago del grupo **Crédito** (configurado como "genera cartera"), la orden queda pendiente de pago y aparece en cartera.

**¿Cómo se registra un pago?**
Entra al detalle del cliente y usa el botón de pago. Puedes abonar un monto parcial o pagar el total.

**¿Qué pasa con una deuda cuando se paga?**
La orden se marca como pagada y desaparece de la cartera. El historial de pagos queda registrado en el perfil del cliente.

---

## Gastos

Lleva el control de todos los costos del negocio que **no son compras de inventario**: arriendo, servicios públicos, mantenimiento, publicidad, etc.

### Ver gastos

Tres tarjetas del mes seleccionado:

- **Total gastos** — suma de todos los montos
- **Transacciones** — número de registros
- **Promedio** — gasto promedio por transacción

**Filtros disponibles:**

| Filtro | Descripción |
|--------|-------------|
| Mes | Selector de mes/año — por defecto el mes actual |
| Categoría | Filtra por la categoría del gasto |
| Tipo | COGS / Administrativo / Ventas / Financiero / Otro |
| Búsqueda | Texto libre sobre la descripción |

La tabla muestra columnas: fecha · categoría · recurrente · descripción · monto · acciones.

- El badge **Recurrente** indica gastos que se repiten periódicamente
- El ícono de ojo abre el detalle
- El ícono de papelera elimina el registro (pide confirmación)

La eliminación es permanente e incluye los documentos adjuntos.

### Registrar un gasto

Haz clic en **Nuevo gasto**. El wizard tiene tres pasos.

**Paso 1 — Datos básicos**

| Campo | Descripción |
|-------|-------------|
| Fecha | Fecha en que ocurrió el gasto |
| Categoría | Clasifica el gasto (arriendo, servicios, marketing, etc.) |
| Tipo | COGS / Administrativo / Ventas / Financiero / Otro |
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

### Gastos recurrentes — ver instancias

Cuando un gasto recurrente genera registros automáticos, cada instancia queda visible en su propia vista de detalle. Desde el listado puedes ver el historial de ejecuciones de ese gasto.

### Editar un gasto

Desde la lista, usa el ícono de editar. Puedes modificar fecha, categoría, descripción y monto. Para actualizar documentos adjuntos, elimina el gasto y vuélvelo a crear.

---

## Métodos de pago

Configuras los grupos y métodos de pago que aparecen en el POS, en los reportes y en el arqueo.

### KPIs

- **Efectivo** — total recibido en efectivo en el período
- **Predeterminados** — número de grupos creados por WARO
- **Personalizables** — número de grupos que puedes editar

### Grupos de pago

Los métodos están organizados en grupos. Cada grupo muestra:

- Nombre y slug
- Número de métodos configurados
- Si **genera cartera** (ventas a crédito)
- Si es predeterminado o personalizable

| Tipo | Descripción |
|------|-------------|
| Predeterminado | Creado por WARO, no se puede eliminar (ej. Efectivo) |
| Personalizable | Puedes agregar y editar los métodos dentro del grupo |

El grupo **Efectivo** no se puede modificar — es el método base del sistema.

### Administrar métodos de un grupo

Haz clic en cualquier grupo (excepto Efectivo) para ver y gestionar sus métodos.

- **Agregar un método** — botón **Agregar método**, ingresa nombre (ej. "Nequi", "Bancolombia", "Visa")
- **Editar un método** — clic en el método para editar nombre o desactivarlo
- **Desactivar un método** — los métodos desactivados no aparecen en el POS pero el historial de ventas se conserva

### El campo "genera cartera"

Los grupos marcados como **genera cartera** crean una deuda pendiente en la pestaña de Cartera cada vez que se registra una venta con ese método.

### Preguntas frecuentes — Métodos de pago

**¿Puedo crear mis propios grupos de pago?**
No. Los grupos están definidos por WARO (Efectivo, Tarjeta, Digital, Crédito). Lo que puedes personalizar son los métodos dentro de cada grupo.

**¿Qué pasa si desactivo un método que ya tiene ventas?**
Las ventas anteriores no se modifican. El método simplemente deja de aparecer en el POS para nuevas ventas.

**¿Por qué no puedo editar el grupo Efectivo?**
El efectivo es el método base del sistema y está ligado al cuadre de caja del arqueo. Por eso no se puede modificar.

---

## Cuentas

Consulta el **Plan Único de Cuentas (PUC)** colombiano de tu negocio. Aquí ves cada cuenta contable con su saldo, débitos y créditos del período.

### Filtros

| Filtro | Opciones |
|--------|----------|
| Clase PUC | 1-Activos · 2-Pasivos · 3-Patrimonio · 4-Ingresos · 5-Gastos · 6-Costos |
| Nivel | Cuenta · Subcuenta |
| Estado | Activa · Inactiva |
| Ver todas | Toggle para incluir cuentas padre además de las hijas |

### Tarjetas de resumen del período

- Saldo inicial
- Débitos del período
- Créditos del período
- Saldo final

### Detalle de una cuenta

Haz clic en cualquier cuenta para abrir el detalle con los movimientos contables que la afectaron en el período.

---

## Asientos

Es el **libro diario contable**: lista de todos los asientos generados por la operación del negocio (POS, gastos, salarios, etc.).

### Filtros

| Filtro | Opciones |
|--------|----------|
| Estado | Borrador (draft) · Publicado (posted) · Anulado (voided) |
| Módulo origen | POS · Gastos · Salarios · Otros |
| Rango de fechas | Selector personalizado |

### Tabla

Paginada (25 por página). Cada asiento muestra:

- Fecha
- Descripción
- Referencia (a la orden, gasto o documento de origen)
- Total de débitos y créditos
- Estado

Haz clic para **expandir** las líneas del asiento (cuenta + débito + crédito) y verificar el cuadre.

---

## Balance

El **balance de comprobación** te muestra que los débitos y créditos del período cuadran (suma de débitos = suma de créditos).

### Generar el reporte

1. Selecciona un **período** con los presets (mes actual, mes pasado, trimestre, año) o un rango personalizado.
2. (Opcional) Activa **incluir cuentas en cero** si quieres ver todas las cuentas, no solo las que tuvieron movimiento.
3. Toca **Consultar**.

### Resultado

Tabla agrupada **por clase PUC** (Activos, Pasivos, Patrimonio, Ingresos, Gastos, Costos) con subtotales por clase:

- Saldo inicial
- Débitos
- Créditos
- Saldo final

Al final, el sistema marca si el balance **cuadra** (los totales generales coinciden). Si no cuadra, hay un error de registro contable que tu contador debe revisar.

---

## P&L Mensual

Estado de Resultados (Profit & Loss) mensual consolidado.

### Cómo usarlo

- Botones de navegación **mes anterior / mes siguiente** para moverte entre períodos.
- La pantalla muestra el **P&L del mes seleccionado**: ingresos, costos, gastos y utilidad neta, agrupados por categoría.

### Para qué sirve

- Saber cuánto **ganó realmente** el negocio en el mes
- Identificar dónde se va el dinero (costos vs gastos administrativos vs ventas)
- Comparar mes a mes la evolución de la utilidad

### Preguntas frecuentes — Reportes contables

**¿Los reportes los puedo descargar para mi contador?**
La descarga directa depende de la versión. Si no ves el botón, pídele a soporte la exportación del período que necesites.

**¿Quién genera los asientos?**
Los genera la plataforma automáticamente cuando ocurren operaciones (cobro en POS, registro de gasto, pago de salario, etc.). Tu contador suele revisarlos y validarlos, no crearlos manualmente.
