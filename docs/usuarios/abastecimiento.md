# Abastecimiento

Desde **Abastecimiento** gestionas todo lo que entra a tu inventario: proveedores, compras (con IA o por orden formal), nivel de stock, ajustes manuales, movimientos automáticos, artículos de bodega propios y la calidad de tus datos.

## Cómo acceder

Menú lateral → **Abastecimiento**. La pantalla tiene seis pestañas en este orden:

| Pestaña | Para qué |
|---------|----------|
| **Proveedores** | Directorio de proveedores con acuerdos de pago |
| **Compra Directa** | Registrar facturas pagadas con escáner de IA |
| **Stock** | Vista de stock por artículo de bodega, con KPIs y alertas |
| **Ajustes** | Correcciones manuales al stock |
| **Catálogo de bodega** | Catálogo de artículos de bodega específicos de tu restaurante |
| **Calidad de Datos** | Anomalías detectadas en compras e artículos de bodega |

> El módulo de **Pagos** (registrar pagos a proveedores) y la vista de **Órdenes de Compra formales** se acceden desde acciones contextuales — ver [Pagar órdenes a proveedores](#pagar-ordenes-a-proveedores) y [Órdenes de compra](#ordenes-de-compra-formales) al final.

---

## Proveedores

Un proveedor es la empresa o persona que te vende los insumos: el distribuidor de carnes, la empresa de bebidas, el mercado donde compras verduras, etc.

Registrar tus proveedores te permite hacerles órdenes de compra formales, tener historial de compras y configurar acuerdos de pago.

### ¿Es obligatorio registrar un proveedor antes de comprar?

No. Al crear una compra puedes escribir el nombre de un proveedor nuevo y el sistema lo crea automáticamente. Sin embargo, registrarlos con anticipación ahorra tiempo y da más control.

### Cómo crear un proveedor

Ve a **Abastecimiento → Proveedores → + Nuevo Proveedor**.

**Información básica**

| Campo | Obligatorio |
|-------|:-----------:|
| Nombre | Sí |
| NIT / Cédula | Sí |
| Descripción | No |
| Email | No |
| Teléfono | No |

**Acuerdos de pago**

| Tipo | Cuándo usarlo |
|------|---------------|
| Pago contraentrega | Pagas al recibir la mercancía |
| Crédito | Pagas X días después de recibir |
| Pago en fecha fija | Pagas siempre el mismo día del mes |

Puedes configurar varios acuerdos para un mismo proveedor.

### Acciones por fila

- **Copiar enlace del portal del proveedor** — para enviárselo cuando creas una OC
- **Editar** datos básicos o acuerdos

### Preguntas frecuentes — Proveedores

**¿Puedo tener varios acuerdos de pago con el mismo proveedor?**
Sí. Por ejemplo, pago inmediato para compras pequeñas y crédito a 30 días para compras grandes.

**¿Qué pasa si no tengo el NIT?**
El campo es obligatorio. Puedes poner un valor provisional y editarlo después.

**¿El proveedor recibe una notificación cuando lo creo?**
No. Solo cuando le envías una orden de compra y tiene email registrado.

---

## Compra Directa

Registra rápidamente las facturas que ya pagaste usando la cámara del celular. WARO lee los ítems con Inteligencia Artificial y procesa los datos automáticamente.

### Lista de compras

Tabla con todas las compras directas registradas. Filtros por **proveedor**, **estado** (paid / invoiced / info) y **fecha**.

Arriba aparece la barra de **escaneos disponibles** según tu plan — cada compra registrada con IA consume uno.

### Cómo usar el escáner de IA

Ve a **Abastecimiento → Compra Directa → + Nueva Compra Directa**.

**1. Escanear la factura**

Haz clic en **Leer Factura con IA**. Toma una foto o sube una imagen. El sistema detecta el proveedor y los artículos de bodega en segundos.

**2. Detección automática del proveedor**

- Si el proveedor **no existe**, aparece la opción de crearlo al instante
- Si detecta un nombre parecido, te sugiere usarlo para evitar duplicados

**3. Autocompletado de artículos de bodega**

La IA llena la lista con los ítems de la factura e intenta hacer match con tus artículos de bodega existentes.

- **Mientras buscas:** aparece un indicador de carga — espera a que termine antes de revisar
- **Artículo de bodega no encontrado:** el buscador muestra "Sin resultados" y aparece el botón **+ Crear artículo de bodega** para abrir el panel de creación sin salir de la compra
- **Valida cantidades y precios:** WARO puede sugerirte precios anteriores como referencia

### Finalizar la compra

Al guardar una Compra Directa, el stock de inventario **se actualiza en el mismo instante**. No necesitas registrar recepciones adicionales.

### Preguntas frecuentes — Compras con IA

**¿Qué pasa si la IA se equivoca en un precio?**
Antes de finalizar tienes control total para corregir precios, borrar ítems o ajustar cantidades manualmente.

**¿Qué diferencia hay con una Orden de Compra clásica?**
La compra directa prioriza velocidad y actualización inmediata del inventario, ideal para compras al paso. Las órdenes de compra son para operaciones estructuradas con flujos de aprobación y notificaciones al proveedor.

---

## Stock

Radiografía completa de tu inventario: cuánto tienes, cuánto vale y cuáles artículos de bodega están en alerta.

### Métricas del panel

| Métrica | Qué indica |
|---------|------------|
| **Total artículos de bodega** | Número de artículos de bodega registrados |
| **Stock bajo** | Artículos de bodega que bajaron del mínimo configurado |
| **Stock crítico** | Artículos de bodega sin unidades o con stock negativo |
| **Valor total** | Suma del costo unitario × stock actual de todos los artículos de bodega |

### Filtros disponibles

- **Búsqueda** — por nombre de artículo de bodega
- **Categoría** — filtra por la categoría del artículo de bodega
- **Estado** — Todos · Crítico · Bajo · Normal
- **Unidad** — filtra por unidad de medida (kg, L, u, etc.)

### Columnas de la tabla

| Columna | Descripción |
|---------|-------------|
| Artículo de bodega | Nombre |
| Unidad | Unidad de medida |
| Stock Actual | Cantidad disponible ahora |
| Stock Mín | Nivel mínimo configurado — cuando se cruza aparece alerta |
| Stock Máx | Nivel máximo (referencia para la barra de progreso) |
| % Stock | Barra visual del nivel de llenado (actual / máximo) |
| Costo Unit. | Precio por unidad (basado en la última compra) |
| Valor Total | Costo unitario × stock actual |
| Estado | Normal · Bajo · Crítico con código de color |

### Estados de stock

| Estado | Color | Significado |
|--------|-------|-------------|
| **Normal** | Verde | Stock por encima del mínimo |
| **Bajo** | Amarillo | Stock entre 0 y el mínimo configurado |
| **Crítico** | Rojo | Stock en 0 o negativo |

### Ajuste rápido desde stock

El botón **Ajustar stock** en cualquier fila abre el panel lateral de ajuste con el artículo de bodega preseleccionado. Funciona incluso para artículos de bodega que están en 0.

---

## Ajustes

Un ajuste es una corrección manual al stock de un artículo de bodega. Se usa cuando la cantidad en el sistema no coincide con lo que tienes físicamente.

**Cuándo usar un ajuste:**
- Hiciste un conteo físico y el stock real es diferente al del sistema
- Se dañó o se perdió un artículo de bodega
- Recibiste una donación o muestra sin orden de compra
- Corriges un error de registro anterior

### Vista del historial

Tabla con todos los ajustes registrados. Cuatro KPIs en la parte superior:

| KPI | Qué muestra |
|-----|-------------|
| Total ajustes | Cantidad de ajustes en el periodo |
| Artículos de bodega ajustados | Cuántos artículos de bodega distintos tuvieron ajuste |
| Stock crítico | Cantidad de artículos de bodega en crítico hoy |
| Stock bajo | Cantidad de artículos de bodega en bajo hoy |

**Filtros:** artículo de bodega · tipo (Incremento / Decremento) · rango de fechas · búsqueda por motivo.

### Cómo registrar un ajuste

Ve a **Abastecimiento → Ajustes → + Nuevo ajuste**.

**Paso 1 — Selecciona el artículo de bodega**

Al seleccionarlo, WARO muestra su stock actual, mínimo y máximo configurados.

**Paso 2 — Configura el ajuste**

| Tipo | Cuándo usarlo |
|------|---------------|
| **Incremento** | Agregas unidades al stock |
| **Decremento** | Reduces unidades del stock |
| **Ajustar a** | Estableces el stock en un número exacto |

Ingresa la cantidad y verifica que la unidad sea correcta.

**Paso 3 — Motivo (opcional pero recomendado)**

Escribe brevemente por qué haces el ajuste. Ejemplos: `Conteo físico semanal`, `Merma por caducidad`, `Corrección de error`.

Haz clic en **Registrar ajuste**. El cambio se aplica de inmediato.

### Preguntas frecuentes — Ajustes

**¿Puedo deshacer un ajuste?**
No directamente. Si cometiste un error, crea otro ajuste que corrija el anterior.

**¿El ajuste aparece en los movimientos?**
Sí, como movimiento de tipo "Ajuste" en el historial.

---

## Movimientos

Los movimientos son el registro de todo lo que entra y sale del inventario. Cada vez que ocurre algo que afecta el stock, WARO lo anota automáticamente.

> Esta vista vive bajo `/inventario/movimientos` y está enlazada desde **Abastecimiento → Stock** cuando necesitas trazabilidad detallada de un artículo de bodega.

### Tipos de movimiento

| Tipo | Qué lo genera |
|------|---------------|
| **Compras** | Recepciones de órdenes de compra y compras directas |
| **Consumo** | Ventas de productos que usan el artículo de bodega en su receta |
| **Ajustes** | Ajustes manuales |
| **Pérdidas** | Mermas o bajas registradas |

### Filtros disponibles

- Búsqueda por nombre de artículo de bodega o referencia
- Rango de fechas
- Artículo de bodega específico
- Tipo de movimiento

**Qué muestra cada movimiento:** fecha y hora · artículo de bodega · tipo · cantidad (positiva = entró, negativa = salió) · referencia

### Para qué sirve revisar los movimientos

- **Detectar inconsistencias** — si el stock no cuadra, los movimientos explican qué pasó
- **Verificar recepciones** — confirmar que una compra ingresó al inventario
- **Auditoría** — trazabilidad completa de quién movió qué y cuándo
- **Identificar mermas** — detectar pérdidas recurrentes en algún artículo de bodega

### Preguntas frecuentes — Movimientos

**¿Puedo editar o eliminar un movimiento?**
No. Son registros permanentes e inmutables para garantizar la trazabilidad.

**¿El consumo de ventas se registra automáticamente?**
Sí, siempre que el producto vendido tenga una receta con artículos de bodega. Sin receta, no hay movimiento de consumo.

---

## Catálogo de bodega

Los **artículos de bodega propios** son insumos específicos de tu restaurante que no están en el catálogo global de WARO. Los creas tú mismo y los usas en recetas, productos, modificadores y compras directas.

### ¿Para qué sirven?

Cuando un artículo de bodega que necesitas no aparece en el buscador, puedes crearlo como artículo de bodega propio. Ejemplos: "Carne Angus especial", "Salsa secreta de la casa", "Queso artesanal regional".

Cada artículo de bodega propio puede tener una **base global** opcional: si existe un artículo de bodega similar en el catálogo global, vincularlo permite que WARO relacione precios y costos de forma más precisa.

### Vista del panel

Tres KPIs:

| KPI | Qué indica |
|-----|------------|
| Total Personalizados | Todos los artículos de bodega propios que tienes creados |
| Con base global | Los que están vinculados a un artículo de bodega del catálogo global |
| Sin base | Los que no tienen vínculo con el catálogo global |

Filtros: tipo (Alimento / Insumo / Servicio) · Archivados.

### Crear un artículo de bodega propio

Haz clic en **+ Nuevo artículo de bodega**. Se abre un panel lateral con el formulario:

| Campo | Obligatorio | Notas |
|-------|:-----------:|-------|
| Nombre | Sí | Ej: `Carne Angus especial`. Nombre interno, no lo ven tus clientes. |
| Tipo de artículo de bodega | Sí | **Solo se define al crear**. Elige: Alimento, Suministro o Servicio. Cuando creas el artículo de bodega desde otra sección (ej: Compras Directas), este campo se pre-llena según el contexto. |
| Tipo de medida | Sí | **Solo se define al crear** — no se puede cambiar después. Elige: Peso (gr/kg), Volumen (ml/lt) o Pieza (und). |
| Categoría | Sí | Agrupa el artículo de bodega. Ej: `Carnes`, `Salsas`, `Lácteos`. |
| Es reventa | No | Actívalo si este artículo de bodega se vende directamente sin preparación (ej: una botella). |

Al elegir el tipo de medida, WARO genera automáticamente las **unidades de compra** correspondientes. No necesitas configurarlas manualmente.

### Crear artículos de bodega desde otros formularios

No tienes que ir a esta sección cada vez. También puedes crear artículos de bodega propios directamente desde Recetas, Productos, Modificadores y Compras Directas — si buscas un artículo de bodega y no aparece, encontrarás la opción **+ Crear artículo de bodega** para abrirlo en un panel lateral sin salir de la página.

### Archivar un artículo de bodega propio

Si un artículo de bodega ya no lo usas, puedes archivarlo en lugar de eliminarlo. Archivar es la opción recomendada porque protege el historial.

Haz clic en el ícono de archivo (caja) en la fila del artículo de bodega. El sistema te pide confirmación y te muestra exactamente qué se verá afectado.

Al archivar un artículo de bodega:

- Desaparece de todas las recetas, modificadores y productos activos donde estaba incluido.
- El historial de compras, ventas y movimientos de inventario queda intacto — no se pierde ningún dato.
- El artículo de bodega ya no aparece en el buscador al crear recetas o compras nuevas.

### Restaurar un artículo de bodega archivado

Activa el filtro **Archivados** y haz clic en el ícono de restaurar en la fila correspondiente.

Al restaurar, el artículo de bodega vuelve a estar disponible en el buscador. Sin embargo, **no recupera automáticamente sus vínculos anteriores**: debes agregarlo de nuevo a las recetas, modificadores y productos donde lo necesites.

### Preguntas frecuentes — Catálogo de bodega

**¿Por qué el tipo de medida no se puede cambiar después de crear?**
Las unidades de compra se generan automáticamente con base en el tipo. Cambiar el tipo después afectaría todos los registros de compras e inventario vinculados.

**¿Qué pasa si no defino una categoría?**
La categoría es obligatoria. El formulario no deja guardar si está vacía.

**¿Los artículos de bodega propios los ven mis empleados?**
Sí, están disponibles para todos los usuarios del restaurante en el buscador de artículos de bodega.

**¿Qué pasa con las ventas y compras si archivo un artículo de bodega?**
Nada. El historial queda intacto. Solo se desvincula de las recetas y modificadores activos para que no aparezca en nuevos pedidos.

**Si restauro un artículo de bodega, ¿vuelve a mis recetas?**
No. Al restaurar el artículo de bodega queda activo de nuevo, pero debes re-vincularlo manualmente a cada receta, modificador o producto donde lo quieras usar.

---

## Calidad de Datos

Detecta anomalías en tus registros de compras e artículos de bodega.

### Score de calidad

El sistema evalúa tus datos y genera un puntaje de **0 a 100**. Un score alto indica que los datos están completos y consistentes.

### KPIs del panel

| KPI | Qué indica |
|-----|------------|
| Score | Puntaje global de calidad (0-100) |
| Críticos | Anomalías que requieren acción inmediata |
| Avisos | Inconsistencias menores |
| Resueltos en 30 días | Anomalías corregidas recientemente |

### Tipos de anomalías

| Severidad | Qué indica |
|-----------|------------|
| **Crítico** | Dato faltante o erróneo que afecta el funcionamiento (ej: artículo de bodega sin unidad) |
| **Aviso** | Inconsistencia que puede generar errores (ej: precio muy diferente al histórico) |
| **Resuelto** | Anomalías que ya fueron corregidas en los últimos 30 días |

### Cómo usar este panel

Filtra por **severidad** o por **artículo de bodega** y haz clic en cada anomalía para ver el detalle de la orden donde se detectó y el campo que necesita corrección. Resuelve los críticos primero — afectan el cálculo de costos y el control de inventario.

---

## Órdenes de compra (formales)

Las Órdenes de Compra (OC) son el flujo formal de abastecimiento: le envías una solicitud a tu proveedor, él la cotiza, tú la confirmas y registras la recepción cuando llega la mercancía.

> Las OC tradicionales se acceden desde acciones contextuales dentro de Abastecimiento. Para registro rápido de facturas pagadas, usa **Compra Directa**.

### Flujo de una orden

```
Borrador → Enviada → Cotizada → Confirmada → En preparación → Recibida → Pagada
```

| Estado | Qué significa |
|--------|---------------|
| **Borrador** | Creada pero no enviada |
| **Enviada** | El proveedor recibió la solicitud por email |
| **Cotizada** | El proveedor respondió con precios |
| **Confirmada** | Aceptaste la cotización |
| **En preparación** | El proveedor está alistando el pedido |
| **Recibida** | La mercancía llegó — el inventario se actualiza |
| **Pagada** | El pago quedó registrado en la sección de Pagos |

### Recibir la mercancía

Cuando llegue el pedido, abre la OC y registra la recepción. En ese momento el stock de cada artículo de bodega se incrementa automáticamente. Si hay diferencias entre lo pedido y lo recibido, puedes ajustar las cantidades antes de confirmar.

### Preguntas frecuentes — OC

**¿El proveedor recibe algo?**
Si el proveedor tiene email registrado, WARO le envía la OC por correo. También puede acceder al portal del proveedor con el enlace que recibe.

**¿Puedo editar una OC ya enviada?**
Solo en estado Borrador. Una vez enviada, los cambios se manejan desde el detalle de la orden.

---

## Pagar órdenes a proveedores

El registro de pagos a OC se hace desde acciones contextuales sobre las órdenes (icono en la fila o desde el detalle de la OC).

### Qué se paga

- **Contado** — órdenes confirmadas o en preparación que aún no se han pagado
- **Crédito / Fecha fija** — órdenes recibidas en espera de pago según el acuerdo del proveedor

Las órdenes **vencidas** muestran la fecha en rojo.

### Cómo registrar un pago

1. Selecciona una o varias órdenes
2. Presiona **Registrar pago**
3. Completa el formulario:

| Campo | Descripción |
|-------|-------------|
| Monto | Valor pagado (puede ser parcial) |
| Fecha de pago | Fecha en que se realizó el pago |
| Método | Transferencia · Efectivo · Cheque · Otro |
| Referencia | Número de comprobante o transferencia |
| Período | Mes y año del pago |
| Adjuntos | Comprobante de pago (imagen o PDF) |

4. Presiona **Registrar** — el sistema marca las órdenes como pagadas y guarda el registro para auditoría.

### Preguntas frecuentes — Pagos

**¿Puedo registrar un pago parcial?**
Sí. El monto puede ser menor al total de la orden.

**¿Qué pasa si selecciono varias órdenes?**
El formulario de pago se aplica a todas las órdenes seleccionadas en un solo paso.

**¿Dónde queda el comprobante adjunto?**
Vinculado al registro del pago, visible desde el historial de órdenes pagadas.
