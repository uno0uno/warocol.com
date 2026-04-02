# Crear una orden de compra

## ¿Qué es una orden de compra?

Es el pedido formal que le haces a un proveedor: qué insumos necesitas, en qué cantidad y a qué precio. WARO genera el documento y puede enviárselo al proveedor para que lo confirme y lo surta.

**Ejemplo:** Pedirle a tu distribuidor 20 kg de pechuga y 10 kg de carne molida.

---

## ¿Necesito tener el proveedor creado primero?

No es obligatorio. Si escribes un proveedor que no existe, WARO lo crea automáticamente. Si ya lo tienes registrado con acuerdos de pago, podrás seleccionarlos directamente.

Ver [cómo registrar proveedores](./gestionar-proveedores.md).

---

## Cómo crear una orden de compra

Ve a **Abastecimiento → Compras → Nueva compra**.

El formulario tiene 3 pasos:

### Paso 1 — Información general

| Campo | Qué poner | Obligatorio |
|-------|-----------|:-----------:|
| Proveedor | Busca por nombre. Si no existe, escríbelo y el sistema lo crea. | Sí |
| Tipo de pago | Cómo vas a pagar esta compra | Sí |
| Notas | Instrucciones especiales para el proveedor | No |

**Sobre el tipo de pago:** si el proveedor tiene acuerdos de pago configurados, aparece un interruptor para activar uno. Si no, seleccionas el tipo directamente (contraentrega, crédito, etc.).

### Paso 2 — Alimentos

Aquí agregas lo que vas a pedir. Por cada ítem defines:

- Ingrediente o producto de reventa
- Cantidad solicitada
- Unidad (kg, litros, unidades...)
- Precio unitario acordado

Agrega todos los ítems que necesitas para esa compra.

### Paso 3 — Revisión y confirmación

Revisa el resumen: proveedor, número de ítems y total estimado. Haz clic en **Crear cotización**.

---

## Qué pasa después de crear la orden

La orden queda en estado **Creado**. A partir de ahí puedes:

1. **Enviarla al proveedor** — recibe un enlace por email para verla y confirmarla
2. **Registrar la recepción** — cuando llega la mercancía, confirmas qué recibiste
3. **Registrar el pago** — cuando pagas, lo anotas en la orden

Cada paso queda en el historial de la orden con fecha y usuario.

> El inventario solo se actualiza cuando registras la **recepción**. Hasta ese momento el stock no cambia.

---

## ¿Cuál es la diferencia con una compra directa?

| | Orden de compra | Compra directa |
|---|---|---|
| **Uso** | Pedido formal al proveedor con flujo de confirmación y recepción | Registro rápido de una compra que ya ocurrió |
| **Proveedor** | Puede recibir y confirmar la orden | No necesariamente |
| **Inventario** | Se actualiza al registrar recepción | Se actualiza al registrar |

Para compras que ya hiciste (ej: fuiste al mercado y pagaste en efectivo), usa **Abastecimiento → Compras Directas**.

---

## Preguntas frecuentes

**¿Puedo editar la orden después de crearla?**
Sí, mientras esté en estado "Creado". Una vez el proveedor la confirma o hay recepción registrada, los cambios son limitados.

**¿Puedo cancelar una orden?**
Sí, desde las acciones de la orden, siempre que no haya recepción registrada.
