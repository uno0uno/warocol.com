# 2406 — Integridad datos/tenant y permisos (análisis, ceñido a #819/#839/#896/#2334/#2339)

## RLS / scopes #820→#819
- `api_warocol.com/app/core/permissions.py:330 require_module` y :415 `require_any_module` bloquean enforce tenants si no tienen módulo. PR #820 bypass si `api_key_context.is_valid` → waro_sk_* no 403.
- Test: `tests/test_integraciones_permissions.py` (role-less pseudo-session + valid key) 3 passed.
- Sin merge → enforce 403 en `/v1/*` para API keys.

## Onboarding Starter #840→#839
- 2º negocio vía `Crear` no cierra Starter a `setup_complete`; mid-alta resume, Starter no ocupa slot unique.
- `onboarding_service.py` + tests `test_additional_tenant` 31 passed.

## Wompi JSONB #897→#896
- `wompi_collections_service.py:900 json.dumps(_jsonable(provider_payload))` fix DataError dict→JSONB; verify persiste provider_payload string.

## Bitácora #857→#2334
- `payment_voided` sin order_number → join `orders` fill #N; front quita Motivo column.

## Leads landing #859→#2339
- GET /leads/campaigns/{slug} retorna landing JSON (food-cost/ia-factura), YouTube drop.

**Análisis only — checklist para pre-migración, no código.**
