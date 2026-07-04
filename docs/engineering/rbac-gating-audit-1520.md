# RBAC gating coverage audit

Issue: #1520
Parent epic: #1519

This audit maps the current module-gating surface so follow-up batches can
complete enforcement without accidentally gating public, token, or synthetic
operator flows. It is not an implementation PR: no `definePageMeta({ module })`,
`require_module()`, role, or permission behavior changed here.

## Foundations

| Area | Current state | Follow-up |
| --- | --- | --- |
| Front route gate | `front_nuxt/middleware/module-access.global.ts:48` reads `to.meta.module`; pages without module meta pass through. | #1521 should add explicit page modules or documented exceptions. |
| Front module list | `front_nuxt/stores/access.ts:18` defines the frontend module union. | Keep aligned with backend `Module`. |
| Backend module list | `api_warocol.com/app/core/permissions.py:51` defines `Module`. Current values match the frontend union: `pos`, `ventas`, `despacho`, `menu`, `operaciones`, `abastecimiento`, `analitica`, `finanzas`, `facturacion`, `equipo`, `integraciones`, `mi_plan`, `mi_negocio`. | Re-check whenever a module is added or removed. |
| Backend gate | `api_warocol.com/app/core/permissions.py:329` exposes `require_module(Module.X)`. | #1522 should only add gates after excluding public/token/synthetic routes. |
| Access source | `/api/me/access` is loaded by `front_nuxt/stores/access.ts:68`. | Excepcion: must remain authenticated but ungated so the UI can learn access. |

## Front Route Matrix

| Surface | Path | Current gate | Recommended module | Classification | Batch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Ventas | `front_nuxt/pages/ventas/[id].vue:8` | dashboard, no module | `ventas` | missing | #1521 | Sales detail direct URL should match `/ventas`. |
| Ventas | `front_nuxt/pages/ventas/crear.vue:2` | dashboard, no module | `ventas` | missing | #1521 | Order creation route. |
| Ventas | `front_nuxt/pages/ventas/propinas/index.vue:7` | dashboard, no module | `ventas` or `finanzas` | decide | #1521 | Path is Ventas; financial reporting risk may justify `finanzas`. |
| Ventas | `front_nuxt/pages/ventas/index.vue:2` | `layout: false` redirect | none | excepcion | #1521 | Redirect wrapper to classify, not a private work surface. |
| Despacho | `front_nuxt/pages/despacho/comandas.vue:7` | dashboard, no module | `despacho` | missing | #1521 | Dispatch command view. |
| Despacho | `front_nuxt/pages/despacho/domicilios/index.vue:6` | dashboard, no module | `despacho` | missing | #1521 | Dispatch delivery list. |
| Despacho | `front_nuxt/pages/despacho/domicilios/[id].vue:7` | dashboard, no module | `despacho` | missing | #1521 | Dispatch delivery detail. |
| Despacho | `front_nuxt/pages/despacho/en-mesa/index.vue:8` | dashboard, no module | `despacho` | missing | #1521 | Table service dispatch list. |
| Despacho | `front_nuxt/pages/despacho/en-mesa/[id].vue:11` | dashboard, no module | `despacho` | missing | #1521 | Table service dispatch detail. |
| Analitica | `front_nuxt/pages/analitica/clientes/index.vue:9` | dashboard, no module | `analitica` | missing | #1521 | Customer analytics list. |
| Analitica | `front_nuxt/pages/analitica/clientes/[id].vue:14` | dashboard, no module | `analitica` | missing | #1521 | Customer analytics detail. |
| Analitica | `front_nuxt/pages/analitica/cocina.vue:209` | dashboard, no module | `analitica` | missing | #1521 | Kitchen analytics view. |
| Finanzas | `front_nuxt/pages/finanzas/gastos/**` | dashboard, no module | `finanzas` | missing | #1521 | Expense list/create/detail/instance routes. |
| Finanzas | `front_nuxt/pages/finanzas/contabilidad/**` | dashboard, no module | `finanzas` | missing | #1521 | Accounts, journal entries, trial balance. |
| Finanzas | `front_nuxt/pages/finanzas/metodos-pago/**` | dashboard, no module | `finanzas` | missing | #1521 | Payment method configuration. |
| Finanzas | `front_nuxt/pages/finanzas/pagos/**` | dashboard, no module | `finanzas` | missing | #1521 | Payment registration/list surfaces. |
| Finanzas | `front_nuxt/pages/finanzas/cierre-contable/index.vue:160` | dashboard, no module | `finanzas` | missing | #1521 | Period close surface. |
| Equipo | `front_nuxt/pages/equipo/miembros/[id].vue:8` | dashboard, no module | `equipo` | missing | #1521/#1523 | Team member detail should follow Equipo. |
| Equipo/Finanzas | `front_nuxt/pages/equipo/salarios/**` | dashboard, no module | `finanzas` | decide | #1521/#1523 | Backend salary router is `Module.FINANZAS`; UX path lives under Equipo. |
| Menu | `front_nuxt/pages/menu/index.vue:2` | dashboard, no module | `menu` | missing | #1521 | Parent route should not rely on `menu.vue` sibling. |
| Menu | `front_nuxt/pages/menu/categorias/index.vue:179` | inherited layout comment, no module | `menu` | missing | #1521 | Verify Nuxt meta merge before implementation; middleware reads route meta. |
| Menu | `front_nuxt/pages/menu/modificadores/**` | inherited layout comment, no module | `menu` | missing | #1521 | Modifier list/create/detail. |
| Menu | `front_nuxt/pages/menu/productos/**` | inherited layout comment, no module | `menu` | missing | #1521 | Product list/create/detail. |
| Menu | `front_nuxt/pages/menu/recetas/**` | inherited layout comment, no module | `menu` | missing | #1521 | Recipe list/create/detail. |
| Abastecimiento | `front_nuxt/pages/gestion/ingredientes/index.vue:459` | dashboard, no module | `abastecimiento` | missing | #1521 | Child of gated ingredient landing. |
| Operaciones | `front_nuxt/pages/operaciones/mesas.vue:5` | dashboard, no module | `operaciones` | missing | #1521 | Table/QR operations. |
| Operaciones | `front_nuxt/pages/operaciones/personalizar.vue:4` | dashboard, no module | `operaciones` | missing | #1521 | Operations audience configuration. |
| Operaciones | `front_nuxt/pages/operaciones/comandas.vue:538` | dashboard, no module | `operaciones` | missing | #1521 | Kitchen/command operations view. |
| Operaciones/Ventas | `front_nuxt/pages/operaciones/propinas.vue:4` | dashboard, no module | `ventas` or `finanzas` | decide | #1521 | Route path says Operaciones; page title says Ventas. |
| Plan/Billing | `front_nuxt/pages/billing/confirmacion.vue:83` | dashboard, no module | none | excepcion | #1521 | Payment confirmation flow; do not block confirmation callbacks. |
| System | `front_nuxt/pages/403.vue:74` | dashboard, no module | none | excepcion | #1521 | Must stay ungated to avoid redirect loops. |
| Legal | `front_nuxt/pages/terminos-y-condiciones.vue:138` | dashboard, no module | `mi_negocio` or none | decide | #1521 | Private dashboard legal page; classify before gating. |

## API Endpoint Matrix

| Surface | Path/endpoint | Current gate | Recommended module | Classification | Batch | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Access bootstrap | `api_warocol.com/app/routers/me.py:10` `GET /access` | valid session, no module | none | excepcion | #1522 | Required by frontend access store; module gate would deadlock discovery. |
| KDS synthetic | `api_warocol.com/app/routers/comandas.py:103` `GET ""` | service/session checks, no module | none | excepcion | #1522 | Comment says synthetic/operator path can have `role=None`. |
| KDS synthetic | `api_warocol.com/app/routers/comandas.py:158` `PATCH /{comanda_id}/status` | service/session checks, no module | none | excepcion | #1522 | Synthetic ready flow would 403 under `require_module`. |
| KDS synthetic | `api_warocol.com/app/routers/comandas.py:209` `PATCH /{comanda_id}/items/{item_id}/status` | service/session checks, no module | none | excepcion | #1522 | Same role-less synthetic session issue. |
| Station KDS token | `api_warocol.com/app/routers/stations.py:103` `GET /{station_id}` | token-by-UUID pattern, no module | none | excepcion | #1522 | Comment documents station UUID as access token; do not gate unless private caller found. |
| Notifications | `api_warocol.com/app/routers/notifications.py:53` stream | valid session, no module | global auth or per-module | decide | #1522 | Cross-module infra; decide policy explicitly. |
| Notifications | `api_warocol.com/app/routers/notifications.py:102`, `:112`, `:124` | valid session, no module | global auth or per-module | decide | #1522 | List/read/read-all may remain global authenticated infra. |
| Billing callback | `api_warocol.com/app/routers/billing.py:232` | no module by design | none | excepcion | #1522 | Comment says module gate would break payment confirmations. |
| Billing job | `api_warocol.com/app/routers/billing.py:297` | no module by design | none | excepcion | #1522 | Comment says module gate would break grace-reminder job. |
| Team members | `api_warocol.com/app/routers/tenants.py:22`, `:30`, `:40` | `Module.EQUIPO` | `equipo` | covered | #1523 | Members list/delete/role update already gated. |
| Invitations | `api_warocol.com/app/routers/invitations.py:23`, `:46`, `:55` | `Module.EQUIPO` | `equipo` | covered | #1523 | Send/list/cancel already gated. |
| Invitation accept | `api_warocol.com/app/routers/invitations.py:37` | token/public flow | none | excepcion | #1523 | Accept-by-token must remain public enough to onboard. |
| Payroll | `api_warocol.com/app/routers/salaries.py:87` and following | `Module.FINANZAS` | `finanzas` | covered/decide UX | #1523 | Backend treats salaries/payroll as financial risk. |

## Batch Routing

| Batch | Owns | Starting points |
| --- | --- | --- |
| #1521 | Front route metadata and any matching nav/action visibility gaps. | All `missing` front rows plus `decide` rows after product choice. |
| #1522 | API `require_module()` gaps after exception filtering. | Notifications policy is the main open item; public/token/synthetic exceptions stay ungated. |
| #1523 | Equipo roles, legacy/canonical taxonomy, and Equipo-vs-Finanzas decisions. | Team member detail, salary UX ownership, role labels and mutation semantics. |

## Excepciones

- Public/auth/content routes: auth pages, blog/docs/public restaurant, customer portal, supplier portal, table QR public flows.
- Access discovery: `/api/me/access`.
- Synthetic KDS/operator endpoints where sessions can have `role=None`.
- Token-by-link or token-by-UUID flows such as invitation accept and station KDS lookup.
- Billing payment confirmations and scheduled/grace jobs documented as unsafe to gate.
- `/403`, because it must remain reachable after a denial.

## Open Decisions

1. Decide whether `front_nuxt/pages/equipo/salarios/**` should gate as
   `finanzas` to match payroll API risk or as `equipo` to match navigation.
2. Decide whether notification endpoints are global authenticated
   infrastructure or should be split by source module.
3. Verify Nuxt route meta behavior for child menu routes that rely on inherited
   layout comments before assuming parent `menu.vue` module meta applies.
4. Decide whether tips surfaces belong to `ventas`, `finanzas`, or a mixed
   UX/API policy.
5. Decide whether `terminos-y-condiciones.vue` is a private business settings
   surface (`mi_negocio`) or a documented legal exception.
