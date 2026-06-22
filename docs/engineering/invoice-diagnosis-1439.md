# Diagnostico de facturacion electronica - #1439

## Ventas revisadas

| Venta | Factura | Resultado observado |
| --- | --- | --- |
| `04b46331-174d-4dab-ae8c-beccfc55683c` | `FEV-11` | Emision aceptada por API/api-facturacion/Matias; sin PDF persistido en R2. |
| `ff3d755e-b4dd-46da-aa23-bfb428ee18ca` | `FEV-15` | Emision aceptada por API/api-facturacion/Matias; sin PDF persistido en R2. |

La evidencia de logs y base de datos reunida en #1438/#1439 apunta a que el error
no nace en el payload de emision, el cliente, los pagos divididos ni PSE. Ambas
ventas tienen factura aceptada, `matias_uuid` y XML, pero `r2_pdf_key` esta nulo.

## Flujo reproducible

1. Abrir `/ventas/04b46331-174d-4dab-ae8c-beccfc55683c`.
2. Revisar `GET /api/orders/04b46331-174d-4dab-ae8c-beccfc55683c/invoice`.
3. Reintentar `POST /api/orders/04b46331-174d-4dab-ae8c-beccfc55683c/invoice`; debe responder de forma idempotente porque la factura ya esta aceptada.
4. Probar `POST /api/orders/04b46331-174d-4dab-ae8c-beccfc55683c/invoice/send-email` con `{ "email": "..." }`.
5. Repetir los pasos 1-4 para `/ventas/ff3d755e-b4dd-46da-aa23-bfb428ee18ca`.

## Mapa de codigo

| Area | Ruta / archivo | Observacion |
| --- | --- | --- |
| Detalle de venta | `front_nuxt/pages/ventas/[id].vue` | Carga `GET /api/orders/{id}/invoice`, emite con `POST /api/orders/{id}/invoice`, muestra descarga solo si `pdf_presigned_url` existe y muestra envio para facturas aceptadas. |
| Modal de envio | `front_nuxt/components/ventas/InvoiceEmailModal.vue` | Envia solo `{ email }` a `/api/orders/{id}/invoice/send-email`. |
| Gateway WARO | `api_warocol.com/app/services/facturacion_service.py` | Delega emision a api-facturacion y devuelve `pdf_presigned_url` solo cuando existe `r2_pdf_key`. |
| Envio por correo | `api_warocol.com/app/services/orders_service.py` | Bloquea facturas aceptadas si falta `r2_pdf_key`. |
| Api facturacion | `api_facturacion/app/routers/invoices.py` | Persiste facturas aceptadas aunque falle el procesamiento de artefactos PDF/XML. |
| Fallback Matias | `api_facturacion/app/routers/documents.py` | Ya tiene rutas para obtener PDF o enviar correo usando `matias_uuid`. |

## Conclusion por batch

- #1439 documenta el diagnostico: ambas emisiones fueron aceptadas y el fallo
  accionable es `accepted + matias_uuid + r2_pdf_key null`.
- #1440 debe enfocarse en visibilidad/UX de la accion de facturacion desde
  `/ventas/{id}` para ventas completadas, incluyendo pagos divididos/PSE.
- #1441 debe corregir el envio/descarga cuando falta `r2_pdf_key`, reutilizando
  el fallback de api-facturacion/Matias o agregando un helper equivalente en el
  gateway WARO.

