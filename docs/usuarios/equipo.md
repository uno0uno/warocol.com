# Equipo

Desde el módulo de Equipo gestionas los miembros de tu restaurante: quién tiene acceso, con qué rol, cuánto gana y cuándo le pagas.

---

## Agregar un empleado

Registrar a tu equipo te permite controlar accesos, gestionar salarios y tener trazabilidad de quién registró cada operación.

### Cómo invitar a un miembro

Ve a **Equipo → Miembros → Invitar miembro**. Ingresa el correo electrónico — WARO le enviará un enlace para que cree su acceso.

### Roles disponibles

| Rol | Qué puede hacer |
|-----|-----------------|
| **Super Usuario** | Acceso total, incluyendo configuración de roles y billing |
| **Administrador** | Acceso completo a todas las secciones operativas |
| **Empleado** | Acceso limitado (principalmente POS y operaciones básicas) |
| **Miembro** | Acceso mínimo. Útil para personal que aparece como mesero o staff pero no opera la plataforma |

> El rol se puede cambiar después desde la lista de miembros.

### Preguntas frecuentes — Empleados

**¿El empleado puede ver toda la información del negocio?**
Depende del rol. Un "Empleado" tiene acceso restringido. Un "Admin" ve todo.

**¿Qué pasa si no llega el correo de invitación?**
Pídele que revise spam. Si no llega, reenvía la invitación desde la lista de miembros.

**¿Puedo tener varios administradores?**
Sí, no hay límite.

---

## Ver perfil de un mesero

Si tu restaurante tiene propinas activas, puedes abrir el perfil de cada miembro para ver cuánto recibe en propinas y qué tan bien lo está haciendo.

### Cómo acceder

Ve a **Equipo → Miembros**. En cada fila aparece un ícono de **ojo** ("Ver perfil") que abre `/equipo/miembros/{id}`.

### Qué muestra el perfil

- **Encabezado** con nombre, correo y rol del miembro.
- **Tres tarjetas** con el desempeño de propinas:
  - **Hoy** — total de propinas y promedio sobre la venta
  - **Últimos 7 días**
  - **Últimos 30 días**
- **Tabla "Últimas 10 propinas"** con: fecha, número de orden, canal (POS · Mesa · Barra · Online), subtotal, propina y porcentaje. El número de orden enlaza al detalle de la venta.

> Si las propinas no están activadas en **Operaciones → Propinas**, el perfil muestra el mensaje "Las propinas no están habilitadas en este restaurante" en lugar de las tarjetas.

---

## Configurar salario

Antes de registrar pagos, cada empleado necesita tener su salario configurado. WaRo admite tres esquemas.

Ve a **Equipo → Salarios** y busca al empleado.

### Tipos de salario

**Basado en SMMLV**

El salario es un múltiplo del Salario Mínimo Mensual Legal Vigente.
- Rango: 0.5× a 10×
- Accesos rápidos: 1× · 1.5× · 2× · 2.5× · 3×

**Monto fijo**

Valor mensual fijo en pesos colombianos.
- Accesos rápidos: $1.5M · $2M · $2.5M · $3M · $4M

**Por horas**

Tarifa por hora trabajada.
- Accesos rápidos: $5K · $8K · $10K · $15K · $20K por hora

### Frecuencia de pago

| Opción | Descripción |
|--------|-------------|
| Mensual | 1 pago al mes |
| Quincenal | 2 pagos al mes |
| Semanal | 4 pagos al mes |

El resumen lateral muestra en tiempo real el salario mensual total y el valor de cada pago.

### Notas

Campo opcional para observaciones sobre el acuerdo salarial (bonificaciones, prestaciones adicionales, etc.).

Presiona **Guardar configuración** para activar el salario.

---

## Registrar pago de salario

Registrar los pagos te da un historial claro de cuándo pagaste a cada empleado, cuánto y por qué período.

### Cómo registrar un pago

Ve a **Equipo → Salarios**, busca al empleado y haz clic en **Registrar pago**.

| Campo | Obligatorio |
|-------|:-----------:|
| Monto del pago | Sí |
| Fecha del pago | Sí |
| Método de pago (efectivo, transferencia, cheque, otro) | Sí |
| Referencia | No |
| Período del pago (mes y año) | Sí |

Si el empleado tiene salario configurado, WARO muestra el monto de referencia para ese período.

**Comprobantes:** adjunta fotos o PDFs como soporte del pago.

### Cómo ver el historial

Ve a **Equipo → Salarios** y selecciona al empleado. También puedes ver todos los pagos del equipo en **Equipo → Salarios → Pagos**.

### Preguntas frecuentes — Pagos

**¿Puedo registrar un pago parcial?**
Sí. El monto es libre, no tiene que ser exactamente el salario configurado.

**¿WARO calcula automáticamente las prestaciones sociales?**
El sistema registra los pagos, pero el cálculo de prestaciones (cesantías, vacaciones, etc.) debes hacerlo con tu contador.
