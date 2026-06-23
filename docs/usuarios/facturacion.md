# Facturación electrónica DIAN

Desde **Facturación** configuras todo lo que tu negocio necesita para emitir facturas electrónicas válidas ante la DIAN: resolución, datos fiscales, impuestos y estado del proveedor técnico.

## Cómo acceder

Menú lateral → **Facturación**. La pantalla es una sola vista con varias tarjetas apiladas.

---

## Lista de verificación para empezar a facturar

En la parte superior aparece un **banner de readiness** que revisa automáticamente si tu negocio tiene todo lo necesario para emitir facturas (resolución activa, datos fiscales completos, configuración fiscal definida).

- ✓ **Listo para facturar** — todos los checks aprobados.
- ⚠ **Faltan datos** — el banner lista exactamente qué tienes que completar antes de poder facturar.
- En producción, también debe estar configurado el **UUID cliente Matias** (`companyId`) cuando WARO emite como Casa de Software.

---

## Resolución DIAN

Tabla con las resoluciones autorizadas por la DIAN. Cada fila muestra:

`N° Resolución` · `Prefijo` · `Rango (desde – hasta)` · `Número actual` · `Vigencia` · `Tipo` (Factura de venta / Nota crédito / Nota débito)

### Crear o editar una resolución

Botón **Nueva resolución** para registrar la que te asignó la DIAN. Para una existente puedes editar los campos.

> **Importante:** el sistema no permite **rebobinar el `Número actual`** una vez emitido. Solo se puede avanzar. Esto evita reutilizar números ya entregados a la DIAN.

### Activar / desactivar

Solo una resolución del mismo tipo puede estar activa a la vez. Al activar una, las anteriores quedan en histórico.

---

## Datos fiscales del negocio

Formulario con la información que aparecerá en cada factura emitida:

| Campo | Obligatorio |
|-------|:-----------:|
| NIT | Sí |
| Razón social | Sí |
| Tipo de organización | Sí |
| Régimen tributario | Sí |
| Nivel de responsabilidad | Sí |
| Dirección fiscal | Sí |
| Ciudad | Sí |
| Teléfono | Sí |
| Email de facturación | Sí |

Presiona **Guardar datos fiscales** para aplicar los cambios.

---

## Configuración fiscal

Toggles por impuesto. Cada uno permite elegir si el valor del impuesto **está incluido en el precio del producto** o si **se suma al precio** al cobrar.

| Impuesto | Aplica a | Modo |
|----------|----------|------|
| **INC 8%** | Restaurantes y bares sin franquicia | Incluido / Sumado |
| **IVA 19%** | Franquicias y negocios responsables de IVA | Incluido / Sumado |
| **IVA Licores 5%** | Botellas de licor para llevar | Siempre se suma |

Presiona **Guardar configuración** después de cualquier cambio.

> Cambiar de "incluido" a "sumado" (o viceversa) afecta cómo se desglosa el precio final en el checkout. Coordina con tu contador antes de modificarlo.

---

## Estado de Matias API

Tarjeta de salud del proveedor técnico de facturación:

- **Entorno** — Habilitación (pruebas) o Producción
- **UUID cliente Matias** — `companyId` del cliente emisor en Matias
- **Último documento emitido** — prefijo, número y fecha

Si esta tarjeta muestra errores, no podrás emitir facturas hasta que el proveedor se recupere. Contacta a soporte si la falla dura más de una hora.

### UUID cliente Matias para Casa de Software

WARO usa un JWT/PAT de Casa de Software para conectarse con Matias. Ese token identifica la cuenta técnica de WARO; el campo **UUID cliente Matias** (`companyId`) identifica cuál cliente emite la factura ante Matias y la DIAN.

Este valor lo entrega Matias para cada cliente. No uses el ID del negocio en WARO ni el NIT como reemplazo. En habilitación o sandbox puede estar vacío, pero en producción debe estar configurado antes de emitir.

---

## Bitácora de números quemados

Si el sistema detecta que un número de resolución no se pudo emitir correctamente, lo registra como **"quemado"** y avanza al siguiente.

### Cuándo aparece la alerta

En la parte superior de la pantalla aparece una alerta cuando hubo **gaps en los últimos 7 días**, con un enlace para abrir la bitácora.

### Cómo consultar la bitácora

Desde el banner de alerta o yendo a `/facturacion/audit`. La pantalla muestra:

- **4 tarjetas resumen**: últimas 24 h, últimos 7 días, últimos 30 días, total histórico
- **Tabla paginada** (50 por página) con: `Cuándo`, `Número quemado`, `Resolución`, `Motivo`, `Orden`
- Filtro por resolución

### Motivos posibles

| Motivo | Qué pasó |
|--------|----------|
| Ya validado en DIAN | El número ya había sido enviado a la DIAN y no se puede reutilizar |
| Error 5xx de Matias | El proveedor técnico devolvió un error de servidor |
| Timeout de red | La emisión se cortó por problema de conexión |

> Los números quemados son normales en operaciones de alto volumen y no implican problemas legales — la DIAN entiende que el gap está justificado mientras lo registres aquí.

---

## Preguntas frecuentes

**¿Por qué no puedo emitir facturas si todo parece configurado?**
Revisa el banner de readiness arriba: lista exactamente qué falta (resolución vencida, NIT vacío, etc.).

**¿Dónde consigo el UUID cliente Matias?**
Solicítalo o consúltalo en Matias para el cliente emisor. Es el `companyId` de Matias, no el identificador interno de WARO.

**¿Cambié de régimen tributario, qué hago?**
Actualiza el campo **Régimen tributario** en Datos fiscales y revisa la **Configuración fiscal** — los impuestos aplicables suelen cambiar.

**¿Qué pasa si se acaba el rango de mi resolución?**
Solicita una nueva resolución en la DIAN, regístrala aquí con su propio prefijo y rango, y actívala. La anterior queda en histórico.
