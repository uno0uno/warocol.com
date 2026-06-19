# QA checkout manual POS (#1402)

Ruta manual: `/pos/checkout`

## Matriz

| Area | Caso | Esperado |
| --- | --- | --- |
| Promociones | Sin promocion y sin descuento manual | El total coincide con el subtotal y el cobro simple se completa. |
| Promociones | Descuento manual fijo | El descuento se limita al subtotal disponible y aparece como descuento manual. |
| Promociones | Descuento manual porcentual | El porcentaje se calcula sobre el subtotal despues de promociones automaticas. |
| Promociones | Promocion automatica activa | La promocion aparece separada del descuento manual en resumen, recibo e historial. |
| Promociones | Promocion automatica + descuento fijo | El orden es promocion automatica, descuento manual, WaRo y metodo de pago. |
| Promociones | Promocion automatica + descuento porcentual | El porcentaje no se calcula sobre el subtotal bruto si la promo automatica aplica. |
| Wallet | Cliente no identificado | El metodo wallet no queda disponible para cobrar. |
| Wallet | Cliente identificado sin saldo | El checkout muestra saldo insuficiente o wallet no disponible. |
| Wallet | Pago total con wallet | La orden queda pagada y el movimiento de wallet queda asociado a la orden. |
| Wallet | Wallet con descuento manual | Wallet cobra el total final despues del descuento manual. |
| Wallet | Saldo insuficiente | El pago no se registra y la orden no queda pagada. |
| Split | Efectivo + tarjeta | Cada pago aparece en detalle de pago y el restante llega a cero. |
| Split | Efectivo + transferencia | El efectivo guarda recibido/cambio y transferencia no pide efectivo recibido. |
| Split | Wallet parcial + efectivo/tarjeta | Wallet se registra como metodo de pago y no como descuento. |
| Split | Wallet como primer pago | Se crea el primer `order_payments` y queda saldo pendiente si no cubre todo. |
| Split | Wallet como pago posterior | Se asocia el movimiento de wallet al `order_payments` posterior. |
| Split | Sobrepago | El API rechaza montos mayores al saldo pendiente. |
| Split | Anular pago no-wallet | El pago queda anulado, el saldo pendiente se recalcula y la orden se reabre si aplica. |
| Split | Anular pago wallet | El saldo wallet se restaura y queda trazabilidad en la bitacora. |
| Recibos | Prefactura antes de completar | Muestra subtotal, promociones, descuento manual, WaRo y pagos parciales. |
| Recibos | Recibo final impreso | Muestra total cobrado, detalle de pago, cambio de efectivo y descuentos separados. |
| Recibos | Recibo por correo | Mantiene promocion automatica, descuento manual y WaRo como lineas separadas. |
| Historial | Ventas lista | La venta muestra descuento y cantidad de pagos divididos cuando aplica. |
| Historial | Detalle de orden | Muestra pagos divididos, promociones, descuento manual, propina y cliente. |
| Reportes | Totales por metodo | Los splits suman desde `order_payments` y las ventas simples desde `orders`. |
| Regresion | Pago simple efectivo/tarjeta | Venta POS existente sigue completando sin split, wallet ni descuento. |
| Regresion | Venta manual en Ventas | El registro manual existente sigue funcionando. |

## Validacion automatizada

```bash
cd api_warocol.com
pytest tests/test_pos_cart.py tests/test_payment_void_operation_events.py tests/test_customer_wallet.py tests/test_pos_receipt_template.py
```

## Brechas a reportar en PR

- Si el flujo POS se refresca a mitad de split, confirmar si recupera los pagos parciales o documentarlo como riesgo residual.
- Si se valida mesa/bar, separar claramente la cobertura POS de la paridad de mesa.
- En escenarios con impuestos, revisar que promocion automatica, descuento manual y WaRo no dupliquen descuentos sobre la base.
