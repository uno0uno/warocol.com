# Nómina y prestaciones sociales

Desde **Equipo → Nómina** gestionas las **prestaciones sociales legales colombianas** (Prima, Cesantías, Vacaciones, Dotación, Horas Extras) y los pagos de **PILA** (seguridad social).

> **Diferencia con Salarios:** la pestaña de **Salarios** maneja los pagos mensuales del **salario base**. Nómina es complementaria — maneja las **prestaciones legales** y la **seguridad social**, que se pagan en frecuencias distintas (semestrales, anuales, mensuales según el concepto). Ver [Registrar pago de salario](./registrar-pago).

## Cómo acceder

Menú lateral → **Equipo → Nómina**.

---

## Filtros

| Filtro | Opciones |
|--------|----------|
| Año | Últimos 5 años |
| Mes | Mes específico del año seleccionado |
| Búsqueda | Por nombre del empleado |

---

## Tabla de prestaciones

Una fila por empleado, una columna por concepto:

| Columna | Qué representa |
|---------|----------------|
| **Prima S1** | Prima de servicios del primer semestre (pago en junio) |
| **Prima S2** | Prima de servicios del segundo semestre (pago en diciembre) |
| **Cesantías** | Aporte anual a la cesantía del empleado |
| **Int. Cesantías** | Intereses sobre cesantías (12% anual) |
| **Vacaciones** | Pago de vacaciones disfrutadas |
| **Dotación** | Tres pagos al año (abril, agosto, diciembre) para empleados con salario ≤ 2 SMMLV |
| **Horas Extras** | Pagos por horas extras del período |

Cada celda muestra:

- **Badge verde con monto** — la prestación ya se pagó en ese período
- **"Pendiente"** — aún no se ha registrado el pago

### Tipos de contrato

- **Empleado** — aplica a todas las prestaciones
- **Jornalero** — aplica a prestaciones excepto Dotación
- **Contratista** — excluido de esta vista (se gestiona por honorarios)

---

## Registrar prestaciones

Puedes seleccionar varias celdas a la vez:

- **Click en una celda** — selecciona ese pago individual
- **Click en una fila** — selecciona todas las prestaciones de ese empleado
- **Click en una columna** — selecciona ese concepto para todos los empleados
- **Selección masiva mixta** — combina celdas individuales

Cuando hay una selección activa, aparece una **barra de acciones** arriba con el total a registrar y un botón para abrir el panel lateral de pago.

### Panel lateral de pago

| Campo | Descripción |
|-------|-------------|
| Monto | Por defecto el calculado por WARO; puedes ajustarlo |
| Fecha de pago | Fecha en que se realizó el desembolso |
| Método de pago | Transferencia, efectivo, cheque, etc. |
| Referencia | Número de comprobante (opcional) |
| Notas | Observación adicional (opcional) |

Al confirmar, todas las prestaciones seleccionadas quedan registradas como pagadas y el badge cambia a verde.

---

## PILA (Planilla Integrada de Liquidación de Aportes)

La sección **PILA** está separada al pie de la pantalla. Es el pago mensual de seguridad social (salud, pensión, riesgos laborales, parafiscales) que cubre tanto el **aporte del empleado** como el **aporte del empleador**.

### Períodos pendientes

Lista los meses con pago de seguridad social pendiente. Cada fila muestra:

- Mes y año
- Total a pagar (aporte empleado + empleador)
- Cantidad de empleados incluidos

### Registrar el pago de PILA

1. Toca el botón **Registrar pago** de la fila.
2. Ingresa fecha y método de pago.
3. Adjunta el soporte de PILA si lo tienes.
4. Confirma.

### Historial de PILA

Debajo de los pendientes aparece la lista de PILA ya pagados con su fecha, monto y método.

---

## Preguntas frecuentes

**¿WARO calcula automáticamente los montos de cada prestación?**
Sí, en la mayoría de los casos. La plataforma usa el salario base configurado del empleado y los porcentajes legales colombianos para calcular Prima, Cesantías, Intereses, Vacaciones y Dotación. Siempre puedes ajustar el monto manualmente antes de registrar el pago.

**¿Cuál es la diferencia con Registrar pago de salario?**
"Registrar pago" en **Salarios** es el desembolso del salario corriente mensual. **Nómina** es para las prestaciones legales y la seguridad social, que tienen frecuencias y reglas diferentes.

**¿Y si tengo un contratista?**
Los contratistas se excluyen de esta vista porque no causan prestaciones sociales. Sus pagos se manejan como **Gastos** (Finanzas → Gastos) o como un esquema de salario por horas según corresponda.

**¿Puedo pagar prestaciones de varios empleados a la vez?**
Sí. Selecciona la columna (por ejemplo, "Prima S1") y todas las celdas de ese concepto quedan seleccionadas; el panel de pago consolida el monto total.

**¿Cómo sé si un mes de PILA ya fue pagado?**
Si está en la lista de **históricos** y no en **pendientes**, ya fue registrado. Para ver el comprobante, abre el detalle del pago.
