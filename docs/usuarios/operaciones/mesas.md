# Mesas

La gestión de mesas te permite organizar el salón de tu restaurante directamente desde el POS. Cuando está activa, el punto de venta muestra el plano del salón y cada mesa tiene su propia sesión de pedido.

## Cómo acceder

Menú lateral → **Operaciones → Mesas**. Desde aquí puedes:

- Activar o desactivar el módulo de mesas para el POS
- Ver el listado de mesas configuradas con su estado actual y, si aplica, el mesero asignado
- Crear, editar, desactivar y reactivar mesas

> La etiqueta del módulo es configurable. Algunos negocios la llaman "Cubículos" (peluquerías), "Habitaciones" (hoteles), "Pistas" (eventos), etc. La configuración se hace en **Operaciones → Personalizar**. Esta guía usa "Mesa" como término genérico.

---

## Activar el módulo de mesas

En la parte superior de la página verás el toggle **Gestión de mesas**.

- **Activado** — el POS muestra el plano del salón al abrirse y cada mesa tiene su propia sesión de pedido.
- **Desactivado** — el POS opera solo en modo mostrador.

> El cambio se refleja en el POS al instante. Si tienes una caja abierta atendiendo, recarga la pestaña del POS para ver el cambio.

---

## Configurar las mesas

### Crear una mesa

Haz clic en **+ Nueva mesa**. Ingresa:

| Campo | Descripción |
|-------|-------------|
| Nombre | Identificador de la mesa (ej. "Mesa 1", "Terraza A") |
| Capacidad | Número de personas que puede atender (opcional) |

### Editar una mesa

Haz clic en el ícono de edición junto a la mesa que quieres modificar. Puedes cambiar el nombre y la capacidad.

### Desactivar una mesa

Haz clic en el ícono de desactivar. WARO te pedirá confirmación antes de proceder.

No puedes desactivar una mesa que tenga una sesión abierta. Primero cierra el pedido desde el POS.

### Reactivar una mesa desactivada

Las mesas desactivadas no se eliminan: quedan en una lista aparte por si las necesitas más adelante. Para reactivarlas:

1. Filtra el listado por **Desactivadas** (o expande la sección "Mesas inactivas").
2. Toca el ícono de reactivar en la mesa correspondiente.
3. Confirma — la mesa vuelve a aparecer en el plano del salón inmediatamente.

---

## Estados de las mesas

| Estado | Significado |
|--------|-------------|
| **Libre** | Sin pedido activo, disponible para atender |
| **Ocupada** | Tiene un pedido en curso |
| **Pidiendo cuenta** | El cliente solicitó cerrar la cuenta |

---

## Columna Mesero (opcional)

Si tu negocio tiene activada la **atribución de meseros** (en **Operaciones → Propinas**), aparece una columna extra que muestra el mesero efectivo de la sesión actual de cada mesa. Esto facilita saber quién está atendiendo cada mesa antes de cobrar.

---

## Preguntas frecuentes

**¿Dónde se toman los pedidos de las mesas?**
Desde el **POS**. Al entrar con el módulo activo verás el plano del salón; haz clic en una mesa para abrir su sesión de pedido.

**¿Puedo tener mesas configuradas sin activar el módulo?**
Sí. Las mesas quedan guardadas aunque el módulo esté desactivado. Al activarlo de nuevo, todas las mesas aparecen en el plano.

**¿Qué pasa si desactivo el módulo con mesas ocupadas?**
El toggle cambia la vista del POS, pero las sesiones abiertas no se cierran. Se recomienda cerrar todos los pedidos antes de desactivar el módulo.

**¿Una mesa desactivada se pierde para siempre?**
No. Queda en el listado de mesas inactivas y puedes reactivarla cuando quieras.
