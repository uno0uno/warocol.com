# Compras

Desde el módulo de Compras gestionas tus proveedores, registras las facturas de lo que compras, administras tus ingredientes propios y controlas la calidad de tus datos de abastecimiento.

---

## Proveedores

Un proveedor es la empresa o persona que te vende los insumos: el distribuidor de carnes, la empresa de bebidas, el mercado donde compras verduras, etc.

Registrar tus proveedores te permite hacerles órdenes de compra formales, tener historial de compras y configurar acuerdos de pago.

### ¿Es obligatorio registrar un proveedor antes de comprar?

No. Al crear una compra puedes escribir el nombre de un proveedor nuevo y el sistema lo crea automáticamente. Sin embargo, registrarlos con anticipación ahorra tiempo y da más control.

### Cómo crear un proveedor

Ve a **Abastecimiento → Proveedores → Nuevo proveedor**.

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

### Preguntas frecuentes — Proveedores

**¿Puedo tener varios acuerdos de pago con el mismo proveedor?**
Sí. Por ejemplo, pago inmediato para compras pequeñas y crédito a 30 días para compras grandes.

**¿Qué pasa si no tengo el NIT?**
El campo es obligatorio. Puedes poner un valor provisional y editarlo después.

**¿El proveedor recibe una notificación cuando lo creo?**
No. Solo cuando le envías una orden de compra y tiene email registrado.

---

## Registrar compra con IA

La funcionalidad de **Compra Directa** registra rápidamente las facturas que ya pagaste usando la cámara del celular. WARO lee los ítems con Inteligencia Artificial y procesa los datos automáticamente.

### Cómo usar el escáner de IA

Ve a **Abastecimiento → Compras Directas → Nueva compra**.

**1. Escanear la factura**

Haz clic en **Leer Factura con IA**. Toma una foto o sube una imagen. El sistema detecta el proveedor y los ingredientes en segundos.

**2. Detección automática del proveedor**

- Si el proveedor **no existe**, aparece la opción de crearlo al instante
- Si detecta un nombre parecido, te sugiere usarlo para evitar duplicados

**3. Autocompletado de ingredientes**

La IA llena la lista con los ítems de la factura e intenta hacer match con tus ingredientes existentes.

- **Mientras buscas:** aparece un indicador de carga en el campo — espera a que termine antes de revisar los resultados
- **Ingrediente no encontrado:** el buscador muestra "Sin resultados" y aparece el botón **+ Crear ingrediente**. Haz clic para abrir el panel de creación sin salir de la compra. Ver [campos del formulario](./abastecimiento/ingredientes-propios.md#crear-un-ingrediente-propio).
- **Valida cantidades y precios:** WARO puede sugerirte precios anteriores como referencia

### Finalizar la compra

Al guardar una Compra Directa, el stock de inventario **se actualiza en el mismo instante**. No necesitas registrar recepciones adicionales.

### Preguntas frecuentes — Compras con IA

**¿Qué pasa si la IA se equivoca en un precio?**
Antes de finalizar tienes control total para corregir precios, borrar ítems o ajustar cantidades manualmente.

**¿Qué diferencia hay con una Orden de Compra clásica?**
La compra directa prioriza velocidad y actualización inmediata del inventario, ideal para compras al paso. Las órdenes de compra son para operaciones estructuradas con flujos de aprobación y notificaciones al proveedor.

---

## Órdenes de compra

Las Órdenes de Compra (OC) son el flujo formal de abastecimiento: le envías una solicitud a tu proveedor, él la cotiza, tú la confirmas y registras la recepción cuando llega la mercancía.

Ve a **Abastecimiento → Compras → Nueva compra**.

### Flujo de una orden

```
Borrador → Enviada al proveedor → Cotizada → Confirmada → En preparación → Recibida → Pagada
```

| Estado | Qué significa |
|--------|---------------|
| **Borrador** | Creada pero no enviada |
| **Enviada** | El proveedor recibió la solicitud por email |
| **Cotizada** | El proveedor respondió con precios |
| **Confirmada** | Aceptaste la cotización |
| **En preparación** | El proveedor está alistando el pedido |
| **Recibida** | La mercancía llegó — el inventario se actualiza |
| **Pagada** | El pago quedó registrado en el módulo de Pagos |

### Crear una orden

1. Ve a **Abastecimiento → Compras → Nueva compra**
2. Selecciona el proveedor
3. Agrega ingredientes con la cantidad requerida
4. Agrega notas opcionales
5. Guarda como borrador o envía directamente al proveedor

### Recibir la mercancía

Cuando llegue el pedido, abre la OC y registra la recepción. En ese momento el stock de cada ingrediente se incrementa automáticamente. Si hay diferencias entre lo pedido y lo recibido, puedes ajustar las cantidades antes de confirmar la recepción.

### Preguntas frecuentes — OC

**¿El proveedor recibe algo?**
Si el proveedor tiene email registrado, WARO le envía la OC por correo. También puede acceder al portal del proveedor con el enlace que recibe.

**¿Puedo editar una OC ya enviada?**
Solo en estado Borrador. Una vez enviada, los cambios se manejan desde el detalle de la orden.

---

## Precios

Ve a **Abastecimiento → Precios** para ver el historial de precios de cada ingrediente.

Esta vista consolida los precios registrados en compras directas y recepciones de OC, permitiéndote detectar variaciones y negociar mejor con proveedores.

| Columna | Descripción |
|---------|-------------|
| Ingrediente | Nombre del insumo |
| Proveedor | Quién lo vendió |
| Precio unitario | Costo por unidad en esa compra |
| Fecha | Cuándo se registró |

Ordena por precio o fecha para identificar el proveedor más económico para cada ingrediente.

---

## Ingredientes Propios

Los ingredientes propios son los insumos específicos de tu restaurante que no están en el catálogo global de WARO.

Ve a **Abastecimiento → Ingredientes Propios** para crear, editar y organizar tu catálogo de ingredientes personalizados.

También puedes crear ingredientes propios directamente desde Compras Directas, Recetas, Productos y Modificadores — sin necesidad de salir del formulario en el que estás.

→ [Ver guía completa de Ingredientes Propios](./abastecimiento/ingredientes-propios.md)

---

## Calidad de datos

Ve a **Abastecimiento → Calidad de datos** para detectar anomalías en tus registros de compras e ingredientes.

### Score de calidad

El sistema evalúa tus datos y genera un puntaje de **0 a 100**. Un score alto indica que los datos están completos y consistentes.

### Tipos de anomalías

| Severidad | Qué indica |
|-----------|------------|
| **Crítico** | Dato faltante o erróneo que afecta el funcionamiento (ej: ingrediente sin unidad) |
| **Aviso** | Inconsistencia que puede generar errores (ej: precio muy diferente al histórico) |
| **Resuelto** | Anomalías que ya fueron corregidas en los últimos 30 días |

### Cómo usar este panel

Filtra por ingrediente o severidad y haz clic en cada anomalía para ver el detalle y el campo que necesita corrección. Resuelve los críticos primero — afectan el cálculo de costos y el control de inventario.
