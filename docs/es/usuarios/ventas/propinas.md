# Historial de propinas

Desde **Ventas → Propinas** consultas todas las órdenes que cobraron propina, con sus métricas y filtros propios.

## Cómo acceder

Menú lateral → **Ventas** → pestaña **Propinas** (`/ventas/propinas`).

> Si las propinas no están activadas en **Operaciones → Propinas**, esta pantalla muestra un estado vacío con un botón para abrir la configuración.

---

## Métricas del periodo

Tres tarjetas en la parte superior, calculadas sobre el rango de fechas y filtros activos:

| Métrica | Qué muestra |
|---------|-------------|
| **Total propinas** | Suma de propinas cobradas en el periodo |
| **Promedio sobre venta** | Porcentaje promedio de propina respecto al subtotal de las órdenes con propina |
| **Órdenes con propina** | Cuántas órdenes registraron propina |

---

## Filtros

| Filtro | Opciones |
|--------|----------|
| Búsqueda | Número de orden |
| Rango de fechas | Hoy · Ayer · Última semana · 15 días · 30 días · 90 días o personalizado |
| Mesero | Filtra por el mesero atribuido |
| Canal | POS · Mesa · Online |
| Método de pago | Selecciona un grupo o un método específico |

Usa **Limpiar filtros** para volver al estado inicial (últimos 30 días, sin restricciones).

---

## Tabla de órdenes con propina

Cada fila muestra:

- **Fecha** de la orden
- **Orden** — número clickeable que abre el detalle en `/ventas/{id}`
- **Canal** — badge con POS, Mesa, Barra u Online
- **Subtotal** de la venta
- **Propina** cobrada
- **%** sobre el subtotal
- **Mesero** — clic para refiltrar la tabla por ese mesero
- **Método de pago**

Puedes ordenar por fecha, orden, subtotal, propina o método de pago. La tabla pagina de 25 en 25.

---

## Exportar

El botón **Exportar** envía por correo un reporte con todas las órdenes con propina del periodo y filtros activos. El sistema muestra un modal cuando el envío se procesa.

---

## Llegar pre-filtrado desde otras secciones

- Desde **Analítica → Ventas**, la tarjeta "Propinas del periodo" abre esta pantalla con el rango de fechas del dashboard ya aplicado.
- Desde **Equipo → Miembros → Ver perfil**, las propinas de ese mesero abren el historial pre-filtrado por su nombre.

---

## ¿Configurar propinas?

La configuración (activar/desactivar, porcentajes sugeridos, pre-selección) vive en **Operaciones → Propinas**. Esta pantalla es solo lectura: un historial para análisis y conciliación.
