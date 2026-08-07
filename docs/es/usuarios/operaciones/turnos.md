# Turnos

Los **turnos** son plantillas de horario reutilizables (nombre + hora de inicio y fin) que usas al hacer un arqueo **Por plantilla** en Finanzas. No sustituyen la planificación de personal ni el control de asistencia: solo definen la ventana de tiempo que el arqueo de caja va a cuadrar.

## Cómo acceder

Menú lateral → **Operaciones → Turnos**.

En la parte superior verás cuántos turnos están activos e inactivos. El listado muestra nombre, horario y estado.

> **Permisos:** configurar turnos requiere acceso al módulo **Operaciones**. Registrar un arqueo con esa plantilla se hace en **Finanzas → Arqueo de caja** (módulo **Finanzas**). Ver [Arqueo de caja](../finanzas#arqueo-de-caja).

---

## Crear un turno

Haz clic en **+ Nuevo turno**. Completa:

| Campo | Descripción |
|-------|-------------|
| **Nombre** | Identificador visible (ej. Mañana, Tarde, Noche). Obligatorio, hasta 80 caracteres. |
| **Inicio** | Hora de inicio del turno (formato 24 h). |
| **Fin** | Hora de fin del turno. |
| **Cruza medianoche** | Actívalo si el turno termina al día siguiente (ej. 22:00 – 06:00). |

Confirma con **Crear turno**. El turno queda **activo** de inmediato y aparece en el desplegable de arqueos por plantilla.

---

## Editar un turno

Haz clic en el ícono de lápiz junto al turno. Puedes cambiar nombre, horas y la opción **Cruza medianoche**. Guarda con **Guardar cambios**.

Los arqueos **ya registrados** conservan la etiqueta del nombre que tenían al momento del cierre; cambiar la plantilla no reescribe el historial.

---

## Desactivar y reactivar

- **Desactivar** — el turno deja de aparecer al crear un arqueo nuevo, pero sigue visible en el listado como inactivo. Los arqueos pasados que lo usaron no se modifican.
- **Reactivar** — vuelve a estar disponible en Finanzas → Arqueo → **Por plantilla**.

No se eliminan turnos desde la interfaz; desactivar es la forma de retirar uno que ya no uses.

---

## Relación con el arqueo de caja

| Acción | Dónde |
|--------|--------|
| Definir plantillas (Mañana, Tarde…) | **Operaciones → Turnos** |
| Cerrar caja con una plantilla | **Finanzas → Arqueo → Por plantilla** |
| Cerrar con horas a mano sin plantilla | **Finanzas → Arqueo → Horario personalizado** |
| Cerrar todo el día calendario | **Finanzas → Arqueo → Día completo** |

Al arquear por plantilla eliges el **turno** y el **día**; las horas se rellenan según la plantilla. Puedes hacer varios arqueos el mismo día si las ventanas **no se superponen** (por ejemplo Mañana y Tarde). Ver la sección *Varios arqueos el mismo día* en [Arqueo de caja](../finanzas#arqueo-de-caja).

---

## Preguntas frecuentes — Turnos

**¿Los turnos controlan quién puede cobrar en el POS?**
No. Solo definen ventanas de tiempo para el arqueo de caja.

**¿Puedo tener dos plantillas con el mismo horario?**
Sí, si los nombres son distintos (ej. "Mañana sala" y "Mañana terraza"). Al arquear eliges cuál aplica.

**Desactivé un turno y ya no sale al arquear. ¿Qué hago?**
Reactívalo desde el ícono de flecha circular en el listado, o crea una plantilla nueva.

**¿Turno nocturno que pasa de un día a otro?**
Activa **Cruza medianoche** al crear o editar la plantilla (ej. 22:00 – 06:00).
