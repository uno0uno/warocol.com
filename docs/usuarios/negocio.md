# Mi Negocio

Desde **Mi Negocio** controlas el perfil público de tu restaurante: cómo aparece en el directorio de WARO, los datos de contacto, horarios y la configuración de pedidos online.

## Cómo acceder

Menú lateral → **Cuenta → Mi Negocio**.

---

## Modo edición

La pantalla siempre está en modo lectura. Para hacer cambios, toca **Editar perfil** arriba a la derecha. Verás aparecer los campos editables y dos botones: **Guardar** o **Cancelar**.

> Todos los cambios se aplican al confirmar **Guardar**. Si tocas **Cancelar**, se descarta cualquier modificación de la sesión.

---

## Perfil público

Define cómo te ven los clientes que te encuentran en WARO o en tu enlace directo.

- **Nombre del negocio** — aparece como título de tu storefront.
- **Descripción** — texto corto que muestra de qué se trata tu restaurante.
- **Logo** y **banner** — se suben con el modal de imagen. Recomendamos un logo cuadrado y un banner horizontal.
- **Estado abierto/cerrado** — badge en vivo que se calcula automáticamente desde tu horario semanal.
- **Estado activo/oculto** — indica si tu perfil está publicado en el directorio.

---

## Visibilidad en el directorio

Toggle que controla si tu negocio aparece listado en `warocol.com/{ciudad}` para que clientes nuevos te descubran.

- **Activado** — apareces en el directorio público de tu ciudad.
- **Desactivado** — solo te encuentran quienes tengan tu enlace directo.

> Si activas el directorio pero **no tienes ciudad seleccionada**, aparece una advertencia. Sin ciudad no apareces en ningún listado.

---

## Tu enlace público

Tarjeta con el link de tu storefront: `warocol.com/{tu-slug}`.

- **Copiar** — copia el enlace al portapapeles.
- **Compartir** — usa el menú nativo de tu dispositivo (Web Share API). En navegadores que no lo soportan, abre WhatsApp directamente.

Comparte este link en tus redes y QR para que los clientes hagan pedidos online.

---

## Contacto

| Campo | Descripción |
|-------|-------------|
| **Dirección** | Calle, número, complemento |
| **Barrio** | Zona del local |
| **País** | Bloqueado en Colombia |
| **Ciudad** | Obligatoria si quieres aparecer en el directorio. Se elige de un catálogo |
| **Teléfono** | Para que clientes te contacten |
| **Email** | Para comunicaciones del negocio |

---

## Horario

Configura los horarios de atención día por día (lunes a domingo). El día actual se resalta. Para cada día puedes:

- Definir hora de **apertura** y **cierre**.
- Marcar el checkbox **Cerrado** si no abres ese día.

> Todos los horarios usan zona horaria de **Bogotá (UTC-5)**.

El estado "abierto/cerrado" del badge del perfil se calcula en vivo a partir de este horario.

---

## Pedidos en línea

Configura cómo recibes pedidos a través de tu storefront público:

- **Aceptar pedidos en línea** — toggle maestro. Si está apagado, los clientes ven tu menú pero no pueden ordenar.
- **Tiempo de preparación** — minutos estimados que tarda un pedido. Se muestra al cliente al ordenar.
- **Pedido mínimo** — monto mínimo en pesos para que el cliente pueda finalizar el pedido.

---

## Redes sociales

Links a tus cuentas. Aparecen como íconos en tu storefront público.

- Instagram
- WhatsApp
- Facebook
- Twitter / X
- TikTok

> Solo se muestran los que tengan link configurado. Los vacíos no aparecen.

---

## Preguntas frecuentes

**¿Por qué mi negocio no aparece en `warocol.com/{ciudad}`?**
Revisa: (1) que la **ciudad** esté seleccionada, (2) que el toggle **Visibilidad en el directorio** esté activo, y (3) que tengas al menos un horario abierto en la semana.

**¿Puedo recibir pedidos sin tener menú en línea?**
Necesitas tener al menos productos publicados en el [Menú](./menu) para que aparezcan en tu storefront.

**¿Cuándo se actualiza el estado abierto/cerrado?**
En tiempo real, según el horario que definiste y la hora de Bogotá.
