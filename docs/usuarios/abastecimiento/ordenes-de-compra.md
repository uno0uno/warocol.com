# Órdenes de Compra

## ¿Qué es una orden de compra?

Es el pedido formal que le haces a un proveedor: qué insumos necesitas, en qué cantidad y a qué precio. WARO la genera como un documento que puedes enviarle al proveedor para que la confirme y la surta.

**Ejemplo:** Pedirle a tu distribuidor de carnes 20 kg de pechuga y 10 kg de carne molida.

---

## ¿Necesito tener el proveedor creado?

No es obligatorio. Si escribes el nombre de un proveedor que no existe, WARO lo crea automáticamente con los datos básicos. Puedes completar su información después en **Abastecimiento → Proveedores**.

Sin embargo, si ya tienes el proveedor registrado con acuerdos de pago, podrás seleccionarlos directamente al crear la orden.

---

## Cómo crear una orden de compra

Ve a **Abastecimiento → Compras → Nueva compra**.

El formulario tiene 3 pasos:

### Paso 1 — Información general

| Campo | Qué poner | Obligatorio |
|-------|-----------|:-----------:|
| Proveedor | Busca el proveedor por nombre. Si no existe, escríbelo y el sistema lo crea. | Sí |
| Tipo de pago / Acuerdo de pago | Cómo vas a pagar esta compra (contraentrega, crédito, etc.) | Sí |
| Notas | Cualquier instrucción especial para el proveedor | No |

**Sobre el tipo de pago:**
- Si el proveedor tiene acuerdos de pago configurados, aparece un interruptor para usar uno de ellos.
- Si no tiene acuerdos, seleccionas el tipo de pago directamente (contraentrega, crédito, etc.).

### Paso 2 — Alimentos (productos e ingredientes)

Aquí agregas lo que vas a pedir. Puedes agregar:
- **Ingredientes** del sistema (harina, aceite, queso, etc.)
- **Productos de reventa** (artículos que no preparas pero vendes, como gaseosas o snacks)

Por cada ítem defines:
- Nombre o búsqueda del ingrediente
- Cantidad solicitada
- Unidad (kg, litros, unidades...)
- Precio unitario acordado

### Paso 3 — Revisión y confirmación

Revisa el resumen de la orden: proveedor, número de ítems y total. Si todo está bien, haz clic en **Crear cotización**.

---

## ¿Qué pasa después de crear la orden?

La orden queda en estado **Creado**. A partir de ahí puedes:

1. **Enviarla al proveedor** — si tiene email registrado, recibe un enlace para verla y confirmarla
2. **Registrar la recepción** — cuando llega la mercancía, confirmas qué recibiste y en qué estado
3. **Registrar el pago** — cuando pagas, lo registras en la orden

Cada cambio de estado queda en el historial de la orden.

---

## Preguntas frecuentes

**¿Puedo editar la orden después de crearla?**
Depende del estado. En estado "Creado" puedes editarla. Una vez el proveedor la confirma o hay recepción registrada, los cambios son limitados.

**¿Qué diferencia hay entre una orden de compra y una compra directa?**
- **Orden de compra:** proceso formal con proveedor, cotización, confirmación y recepción por etapas.
- **Compra directa:** registro rápido de una compra que ya ocurrió (ej: fuiste al mercado y compraste algo al contado). Ve a **Abastecimiento → Compras Directas** para ese flujo.

**¿La orden actualiza el inventario automáticamente?**
Sí, pero solo cuando registras la **recepción** de los productos. Hasta ese momento el inventario no cambia.

**¿Puedo cancelar una orden?**
Sí, desde las acciones de la orden, siempre que no haya recepción registrada.
