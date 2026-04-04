# Integraciones API

WaRo expone dos APIs REST públicas que puedes usar para construir experiencias propias: tu propia tienda online, una app móvil, un kiosco de autoservicio o cualquier integración con sistemas externos.

**Nuestro rol:** Ingeniería pesada — backend, pagos, inventario, analítica, fidelización.
**Tu rol:** Diseño y frontend — la experiencia que ven tus clientes.

---

## Las dos APIs

| API | Base URL | Para qué |
|-----|----------|---------|
| **WaRo Colombia** | `https://api.warocol.com` | Restaurantes — menú, carrito, órdenes, clientes, analítica |
| **WaRo Tickets** | `https://api.warotickets.com` | Eventos — boletas, reservas, pagos, check-in QR |

---

## Autenticación

### WaRo Colombia API

Todas las peticiones requieren un API key en el header:

```http
X-API-Key: waro_sk_TU_API_KEY
```

Obtén tu API key desde **Integraciones** en el panel de administración de WARO. Cada restaurante (tenant) tiene su propio key — nunca compartas un key entre negocios.

### WaRo Tickets API

Los endpoints **públicos** (`/public/*`) no requieren autenticación.

Los endpoints de gestión usan autenticación por magic link:

```http
POST /auth/sign-in-magic-link   # solicita enlace al email
POST /auth/verify-code           # verifica el código → recibe token
Authorization: Bearer <token>    # usa el token en requests siguientes
```

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

## WaRo Tickets API

### Flujo de compra de boletas

```
1. GET  /public/events                        → lista eventos disponibles
2. GET  /public/events/{slug}                 → detalle del evento
3. GET  /public/events/{slug}/availability    → disponibilidad por área
4. GET  /units/event/{id}/area/{id}/map       → mapa de puestos (si aplica)
5. POST /reservations                         → reserva los puestos (bloqueo temporal)
6. POST /payments/intent                      → crea intención de pago
7. GET  /payments/{id}/status                 → verifica el estado del pago
8. GET  /qr/{reservation_id}/{unit_id}/image  → QR de la boleta
```

### Endpoints públicos (sin auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/public/events` | Lista eventos activos (paginado) |
| `GET` | `/public/events/{slug}` | Detalle de un evento por slug |
| `GET` | `/public/events/{slug}/availability` | Disponibilidad de áreas y puestos |
| `POST` | `/public/calculate-price` | Calcula precio con descuentos y etapas de venta |
| `GET` | `/areas/event/{id}/{area_id}/availability` | Disponibilidad de un área específica |
| `GET` | `/units/event/{id}/area/{area_id}/available` | Puestos disponibles en un área |
| `GET` | `/units/event/{id}/area/{area_id}/map` | Mapa de puestos (coordenadas y estado) |
| `POST` | `/promotions/validate` | Valida un código de descuento |
| `POST` | `/promotions/calculate-price` | Precio final después de aplicar promoción |
| `POST` | `/reservations` | Crea reserva (bloqueo temporal de puestos) |
| `POST` | `/payments/intent` | Crea intención de pago |
| `GET` | `/payments/{id}/status` | Estado del pago |

### Endpoints autenticados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/reservations/my-tickets` | Boletas del comprador autenticado |
| `GET` | `/reservations/{id}` | Detalle de una reserva |
| `POST` | `/reservations/{id}/cancel` | Cancela una reserva |
| `GET` | `/qr/{res_id}/{unit_id}` | Datos del QR de una boleta |
| `GET` | `/qr/{res_id}/{unit_id}/image` | Imagen del QR (PNG) |
| `POST` | `/qr/{res_id}/validate` | Valida QR en entrada (check-in) |
| `POST` | `/transfers/initiate` | Inicia transferencia de boleta a otro comprador |
| `POST` | `/transfers/accept` | Acepta una transferencia recibida |
| `POST` | `/transfers/cancel/{unit_id}` | Cancela una transferencia pendiente |

---

## Colecciones Postman

Descarga las colecciones para explorar todos los endpoints con ejemplos listos para ejecutar:

| Colección | Ambiente |
|-----------|---------|
| [WaRo Colombia — Public API](https://github.com/uno0uno/api_warotickets/tree/master/postman) | Producción / Local |
| [WaRo Tickets API](https://github.com/uno0uno/api_warotickets/tree/master/postman) | Producción / Local |

Las colecciones incluyen variables de ambiente para producción y local. Configura `api_key` y `base_url` y tendrás todos los ejemplos funcionando.

---

## Consideraciones de implementación

**Precios server-side** — Nunca envíes precios desde el cliente. El servidor resuelve el precio según el `product_id`. Si un cliente manipula el precio en el frontend, el servidor lo ignora.

**Timeouts de reserva** — Las reservas de boletas tienen un tiempo límite de bloqueo. Si el pago no se completa antes del timeout, los puestos se liberan automáticamente.

**Rate limiting** — Las APIs tienen límites de peticiones por API key. Implementa reintentos con backoff exponencial para manejar errores 429.

**Webhooks de pago** — Para Wompi y Bold, WaRo maneja los webhooks internamente. Tu integración solo necesita hacer polling a `/payments/{id}/status` o esperar la confirmación del checkout.

---

## Soporte técnico

¿Tienes preguntas sobre la integración? Contacta al equipo de WaRo Labs:

- GitHub: [github.com/uno0uno](https://github.com/uno0uno)
- WaRo se encarga de la ingeniería pesada — tú de la experiencia que ven tus clientes.
