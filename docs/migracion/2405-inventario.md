# 2405 — Inventario PRs y dependencias main (análisis, no merge)

**Main:** `warocol.com cde08e07` / `api-warolabs ff89d7d` — `branch --contains <pr-sha>` vacío para todos (no integrados)

## Front `warocol.com` (8 open)

| PR | headRef | Files | Objetivo origen |
|---|---|---|---|
| #2403 | wr-2402-nuxt-healthcheck-pr | docker-compose.prod.yml | #2402 healthcheck wget /health 15s/3s |
| #2340 | wr-2339-landing-template | pages/landing/[slug].vue, LeadModalForm.vue | #2339 squeeze ↔ api #859 |
| #2336 | wr-2334-bitacora-order-label | pages/operaciones/bitacora.vue, docs | #2334 bitácora link ↔ api #857 |
| #2283 | wr-2282-crear-lock | CreateTenantPanel.vue | #2282 lock Crear |
| #2268 | wr-2267-ui-accordion-menu-import | UiAccordionSection.vue, MenuImportUpload.vue, arqueo | #2267 accordion |
| #2266 | wr-2265-menu-import-ux-copy | MenuImportUpload.vue, i18n menu/abastecimiento | #2265 dropzone copy |
| #2264 | wr-2263-menu-import-slideover | MenuImportUpload.vue, MenuImportJobHistory.vue | #2263 slide-over |
| #2221 | fix/paddle-thank-you-duplicate-cta | pages/billing/confirmacion.vue | paddle thank-you |

## API `api-warolabs` (5 open)

| PR | headRef | Files | Objetivo |
|---|---|---|---|
| #897 | wr-896-jsonb-serialize | wompi_collections_service.py | #896 provider_payload JSONB |
| #859 | wr-2339-landing-template | leads.py, sql 20260816 | #2339 landing JSON |
| #857 | wr-2334-bitacora-order-label | operation_events_service.py | #2334 #N join orders |
| #840 | wr-839-create-slot | onboarding_service.py | #839 Starter 2º negocio |
| #820 | wr-819-api-key-require-module-bypass | permissions.py, docs | #819 bypass require_module |
| #899 | wr-898-fix-uq-period-tenant-active | cierre duplicate 409 | #898 cierre dup |

## Mapa dependencias

- Pair landing: #2340 ↔ #859 (merge juntos)
- Pair bitácora: #2336 ↔ #857
- Stack carga masiva: #2264 base → #2266 → #2268 (orden estricto)
- Infra solo: #2403 → deploy prod.yml

## Orden propuesto merge (ceñido a objetivos)

1. #2403 infra healthcheck
2. #2336+#857 bitácora
3. #2340+#859 landing
4. stack #2264 → #2266 → #2268
5. #2283 Crear lock, #2221 paddle
6. API #820 permissions, #840 onboarding, #897 wompi, #899 cierre

**Estado:** análisis only — no código en este batch.
