# Integraciones API

WaRo expone dos APIs REST públicas que puedes usar para construir experiencias propias: tu propia tienda online, una app móvil, un kiosco de autoservicio o cualquier integración con sistemas externos.

**Nuestro rol:** Ingeniería pesada — backend, pagos, inventario, analítica, fidelización.
**Tu rol:** Diseño y frontend — la experiencia que ven tus clientes.

---

## Autenticación

### WaRo Colombia API

Todas las peticiones requieren un API key en el header:

```http
X-API-Key: waro_sk_TU_API_KEY
```

Obtén tu API key desde **Integraciones** en el panel de administración de WARO. Cada restaurante (tenant) tiene su propio key — nunca compartas un key entre negocios.


---

## WaRo Colombia API

### Flujo de checkout (custom storefront)

Construye tu propia tienda siguiendo este flujo:

```
1. GET  /v1/restaurant          → carga info del restaurante
2. GET  /v1/menu                → carga categorías y productos
3. GET  /v1/product/{id}        → carga modificadores de un producto (si has_modifiers=true)
4. POST /v1/otp/send            → envía código OTP al email del cliente
5. POST /v1/otp/verify          → verifica OTP → emite JWT del cliente
6. POST /v1/customer/validate   → valida que el cliente puede ordenar
7. POST /v1/cart/batch          → crea carrito con todos los ítems
8. POST /v1/cart/{id}/verify    → vincula cliente autenticado al carrito
9. PUT  /v1/cart/{id}/delivery  → configura domicilio o recogida
10. POST /v1/cart/{id}/checkout → confirma y genera la orden
```

### Restaurante y menú

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/v1/restaurant` | Perfil público del restaurante (nombre, descripción, logo) |
| `GET` | `/v1/menu` | Menú completo con productos agrupados por categoría |
| `GET` | `/v1/product/{product_id}` | Detalle de un producto con sus grupos de modificadores |

### Carrito

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/cart/batch` | Crea carrito con uno o más ítems en una sola petición |
| `GET` | `/v1/cart/session/{session_id}` | Recupera carrito activo por session ID |
| `PUT` | `/v1/cart/{id}/delivery` | Configura tipo (`delivery`/`pickup`) y dirección |
| `DELETE` | `/v1/cart/{id}/items/{item_id}` | Elimina un ítem del carrito |
| `DELETE` | `/v1/cart/{id}` | Vacía el carrito |
| `POST` | `/v1/cart/{id}/verify` | Vincula cliente autenticado al carrito |
| `POST` | `/v1/cart/{id}/checkout` | Confirma la orden |

> Los precios **siempre** se resuelven en el servidor según el `product_id`. Nunca envíes precios desde el cliente.

### OTP (autenticación del comprador)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/otp/send` | Envía código de 6 dígitos al email (válido 10 min) |
| `POST` | `/v1/otp/verify` | Verifica el código → devuelve JWT firmado |
| `POST` | `/v1/otp/resend` | Reenvía el código (cooldown de 60 s) |

### Clientes y direcciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/customer/validate` | Valida si el cliente puede ordenar en este tenant |
| `POST` | `/v1/addresses` | Crea dirección de domicilio (máx 5 por cliente) |
| `GET` | `/v1/addresses/customer/{id}` | Lista direcciones del cliente |
| `PUT` | `/v1/addresses/{id}` | Actualiza una dirección |
| `PATCH` | `/v1/addresses/{id}/set-default` | Marca como dirección predeterminada |
| `DELETE` | `/v1/addresses/{id}` | Elimina dirección (soft delete) |

### Ventas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/sales` | Lista órdenes paginadas con filtros (estado, fecha, método) |
| `POST` | `/v1/sales/metrics` | Métricas agregadas con agrupación por dimensión |
| `POST` | `/v1/sales/detail` | Detalle completo de una orden (ítems, modificadores, totales) |

### Menú API (gestión)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/menu/products` | Lista productos con filtros (disponibilidad, categoría, is_resale) |
| `POST` | `/v1/menu/recipes` | Lista recetas con composición de ingredientes |
| `POST` | `/v1/menu/modifiers` | Lista grupos de modificadores con sus opciones |

#### Modificadores — `option_type`

Cada opción de modificador tiene un tipo que define cómo el servidor descuenta inventario al confirmar la venta. El cliente **no** envía el tipo en el carrito: solo el `id` del modificador (y cantidad); la explosión de ingredientes ocurre en el servidor.

| Valor | Significado |
|-------|-------------|
| `INGREDIENT` | Un artículo de bodega (cantidad/unidad en la opción) |
| `RECIPE` | Receta base con multiplicador; puede incluir varios ingredientes |
| `PRODUCT` | Producto del menú enlazado; descuenta su composición |
| `NONE` | Solo precio de venta; sin movimiento de inventario |

En `GET /v1/product/{product_id}`, cada opción dentro de `modifier_groups` incluye `option_type`:

```json
{
  "modifier_groups": [
    {
      "id": "…",
      "name": "Extras",
      "modifiers": [
        {
          "id": "…",
          "name": "Queso extra",
          "price": 2000,
          "option_type": "INGREDIENT"
        },
        {
          "id": "…",
          "name": "Porción salsa BBQ",
          "price": 0,
          "option_type": "RECIPE"
        }
      ]
    }
  ]
}
```

Al crear o actualizar el carrito (`POST /v1/cart/batch`, etc.), los modificadores siguen el mismo shape de siempre — por ejemplo `{ "id": "…", "name": "Queso extra", "price": 2000, "quantity": 1 }`. No envíes `option_type` ni composición desde el cliente.

### Clientes API (gestión)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/customers` | Lista clientes paginados (búsqueda por nombre, email, teléfono) |
| `POST` | `/v1/customers/detail` | Perfil completo de un cliente con resumen de actividad |
| `POST` | `/v1/customers/orders` | Historial de órdenes de un cliente |
| `POST` | `/v1/customers/metrics` | Métricas agregadas (nuevos, recurrentes, LTV, top clientes) |

### Analítica

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/analytics/menu-analysis` | Matriz BCG del menú (popularidad vs. rentabilidad) |
| `POST` | `/v1/analytics/food-cost` | Food cost del período con comparativa periodo anterior |
| `POST` | `/v1/analytics/alerts` | Alertas operacionales detectadas por el motor de analítica |
| `POST` | `/v1/analytics/data-quality` | Auditoría de calidad de datos del tenant |
| `POST` | `/v1/analytics/cohort` | Análisis de retención por cohorte |
| `POST` | `/v1/analytics/rfm` | Segmentación RFM (Recency, Frequency, Monetary) |
| `POST` | `/v1/analytics/churn-risk` | Clientes en riesgo de abandono |
| `POST` | `/v1/analytics/waros` | Actividad del programa de puntos Waros |

### Financiero y WaRos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/v1/financial/products` | Rentabilidad por producto (margen, ingresos, participación) |
| `POST` | `/v1/waros/customer-summary` | Resumen de puntos de un cliente |
| `POST` | `/v1/waros/balances` | Balances en lote (hasta 250 perfiles) |
| `POST` | `/v1/waros/estimate` | Estimación de puntos que ganaría una compra |
| `POST` | `/v1/waros/customer-history` | Historial de transacciones del wallet |

---

## Consideraciones de implementación

**Precios server-side** — Nunca envíes precios desde el cliente. El servidor resuelve el precio según el `product_id`. Si un cliente manipula el precio en el frontend, el servidor lo ignora.

**Rate limiting** — La API tiene límites de peticiones por API key. Implementa reintentos con backoff exponencial para manejar errores 429.

**Colección Postman** — Descarga la colección para explorar todos los endpoints con ejemplos listos para ejecutar: [WaRo Colombia — Public API](https://github.com/uno0uno/api_warotickets/tree/master/postman). Incluye variables de ambiente para producción y local — configura `api_key` y `base_url` y tendrás todo funcionando.

---

## Soporte técnico

¿Tienes preguntas sobre la integración? Contacta al equipo de WaRo Labs:

- GitHub: [github.com/uno0uno](https://github.com/uno0uno)
- WaRo se encarga de la ingeniería pesada — tú de la experiencia que ven tus clientes.
