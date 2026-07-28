# Facturación electrónica DIAN

Desde **Facturación** configuras todo lo que tu negocio necesita para emitir facturas electrónicas válidas ante la DIAN: resolución, identidad fiscal, impuestos aplicados a ventas y estado del proveedor técnico.

## Cómo acceder

Menú lateral → **Facturación**. La pantalla es una sola vista con varias tarjetas apiladas.

---

## Lista de verificación para empezar a facturar

En la parte superior aparece un **banner de readiness** que revisa automáticamente si tu negocio tiene todo lo necesario para emitir facturas: resolución activa, datos fiscales completos, impuesto aplicado a ventas definido bajo el guardrail actual de WARO y proveedor técnico configurado.

- ✓ **Listo para facturar** — todos los checks aprobados.
- ⚠ **Faltan datos** — el banner lista exactamente qué tienes que completar antes de poder facturar.
- También debe estar configurado el **UUID cliente Matias** (`client_uuid`) cuando WARO emite como Casa de Software.

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

Formulario con la información que identifica al emisor y aparece en cada factura emitida. Estos campos describen tu identidad y responsabilidad fiscal; no activan por sí solos IVA, INC ni facturación electrónica.

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

Presiona **Guardar datos fiscales** para aplicar los cambios. Si cambias tipo de organización, régimen tributario o nivel de responsabilidad, revisa también los impuestos aplicados a ventas con tu contador.

---

## Impuestos aplicados a ventas

Toggles por impuesto. Cada uno afecta el cálculo y desglose de impuestos en POS y facturas. No cambian por sí solos tu tipo de organización, tu régimen tributario ni tu obligación de facturar electrónicamente.

| Impuesto | Aplica a | Modo |
|----------|----------|------|
| **INC 8%** | Ventas que deben liquidar Impoconsumo | Incluido / Sumado |
| **IVA 19%** | Ventas de negocios responsables de IVA | Incluido / Sumado |
| **IVA Licores 5%** | Botellas de licor para llevar cuando corresponda | Siempre se suma |

Presiona **Guardar configuración** después de cualquier cambio.

> Cambiar de "incluido" a "sumado" (o viceversa), o activar un impuesto, afecta cómo se calcula y desglosa el precio final en el checkout y en la factura. Coordina con tu contador antes de modificarlo.

### Cuándo dejar ventas sin IVA ni INC

Si tu contador confirma que el negocio puede emitir ventas sin IVA ni INC, deja ambos toggles apagados y revisa que **Datos fiscales del negocio** refleje ese escenario: persona natural, no responsable de IVA y nivel de responsabilidad **No aplica**.

En ese caso WARO no agrega impuesto estándar al POS ni fuerza IVA 19% para habilitar la emisión. La factura debe emitirse sin líneas de IVA/INC, mientras los demás requisitos siguen siendo obligatorios: resolución DIAN vigente, datos fiscales completos, facturación electrónica habilitada y UUID cliente Matias configurado.

Si el negocio es responsable de IVA o sus ventas deben liquidar Impoconsumo, no uses el modo sin impuesto: activa el impuesto correspondiente antes de vender y valida el modo **Incluido** o **Sumado** con tu contador.

### Negocios fuera de Colombia (modo comercial)

Si tu negocio opera en otro país del catálogo WARO, WARO aplica un **impuesto estándar de referencia** según el país (o, en EE. UU./Canadá, según el estado o provincia que elijas). En **Facturación → Impuestos aplicados a ventas** puedes **ajustar el porcentaje** cuando tu contador lo indique; el preset es solo el punto de partida.

Para **EE. UU. y Canadá**, v1 usa tasas de referencia a **nivel estado/provincia**. Los impuestos locales de ciudad o condado (meal tax, etc.) **no** están en esta versión: documenta el ajuste manual con tu contador si aplica.

Esto no reemplaza la facturación electrónica local (DIAN, CFDI, etc.) cuando aplique en tu jurisdicción.

---

## Proveedor de facturación electrónica

Tarjeta de salud del proveedor técnico de facturación. Esta sección valida la conexión operativa con Matias; es distinta de tu régimen fiscal y de los impuestos que aplicas a ventas.

- **Entorno** — Habilitación (pruebas) o Producción
- **UUID cliente Matias** — `client_uuid` del cliente emisor en Matias
- **Último documento emitido** — prefijo, número y fecha

Si esta tarjeta muestra errores, no podrás emitir facturas hasta que el proveedor se recupere. Contacta a soporte si la falla dura más de una hora.

### UUID cliente Matias para Casa de Software

WARO usa un JWT/PAT de Casa de Software para conectarse con Matias. Ese token identifica la cuenta técnica de WARO; el campo **UUID cliente Matias** (`client_uuid`) identifica cuál cliente emite la factura ante Matias y la DIAN.

Este valor lo entrega Matias para cada cliente. No uses el ID del negocio en WARO ni el NIT como reemplazo. Debe estar configurado antes de emitir en cualquier ambiente Matias, pero no define si tu negocio es responsable de IVA o INC.

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
Solicítalo o consúltalo en Matias para el cliente emisor. Es el `client_uuid` de Matias, no el identificador interno de WARO.

**¿Cambié de régimen tributario, qué hago?**
Actualiza el campo **Régimen tributario** en Datos fiscales y revisa **Impuestos aplicados a ventas**. El régimen describe tu responsabilidad fiscal; los toggles de impuestos controlan el cálculo aplicado en POS y facturas.

**¿Puedo facturar sin IVA ni INC?**
Sí, solo cuando la configuración fiscal del negocio permite ventas sin esos impuestos. WARO no debe activar IVA automáticamente para desbloquear la emisión; si el banner sigue marcando pendiente, revisa tipo de organización, responsabilidad IVA y nivel de responsabilidad con soporte o tu contador.

**¿Qué pasa si se acaba el rango de mi resolución?**
Solicita una nueva resolución en la DIAN, regístrala aquí con su propio prefijo y rango, y actívala. La anterior queda en histórico.
