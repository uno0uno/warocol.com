# Inventario

Desde el módulo de Inventario controlas el stock de tus ingredientes: puedes hacer ajustes manuales y consultar el historial de todos los movimientos.

---

## Registrar un ajuste

Un ajuste es una corrección manual al stock de un ingrediente. Se usa cuando la cantidad en el sistema no coincide con lo que tienes físicamente.

**Cuándo usar un ajuste:**
- Hiciste un conteo físico y el stock real es diferente al del sistema
- Se dañó o se perdió un ingrediente
- Recibiste una donación o muestra sin orden de compra
- Corriges un error de registro anterior

### Cómo registrar un ajuste

Ve a **Inventario → Ajustes → Nuevo ajuste**.

**Paso 1 — Selecciona el ingrediente**

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

## Ver movimientos

Los movimientos son el registro de todo lo que entra y sale del inventario. Cada vez que ocurre algo que afecta el stock, WARO lo anota automáticamente.

### Tipos de movimiento

| Tipo | Qué lo genera |
|------|---------------|
| **Compras** | Recepciones de órdenes de compra |
| **Consumo** | Ventas de productos que usan el ingrediente en su receta |
| **Ajustes** | Ajustes manuales |
| **Pérdidas** | Mermas o bajas registradas |

### Cómo ver los movimientos

Ve a **Inventario → Movimientos**. Lista ordenada por fecha, más reciente primero.

**Filtros disponibles:**
- Búsqueda por nombre de ingrediente o referencia
- Rango de fechas
- Ingrediente específico
- Tipo de movimiento

**Qué muestra cada movimiento:** fecha y hora · ingrediente · tipo · cantidad (positiva = entró, negativa = salió) · referencia

### Para qué sirve revisar los movimientos

- **Detectar inconsistencias** — si el stock no cuadra, los movimientos explican qué pasó
- **Verificar recepciones** — confirmar que una compra ingresó al inventario
- **Auditoría** — trazabilidad completa de quién movió qué y cuándo
- **Identificar mermas** — detectar pérdidas recurrentes en algún ingrediente

### Preguntas frecuentes — Movimientos

**¿Puedo editar o eliminar un movimiento?**
No. Son registros permanentes e inmutables para garantizar la trazabilidad.

**¿El consumo de ventas se registra automáticamente?**
Sí, siempre que el producto vendido tenga una receta con ingredientes. Sin receta, no hay movimiento de consumo.
