# RBAC enforcement validation runbook

Issue: #1524
Related validation: #1536
Parent epic: #1519

This runbook validates, tenant by tenant, that module gating behaves correctly
with `permissions_enforcement_mode = disabled`, `shadow`, and `enforce`.
Use it only against a seeded QA/staging tenant or a tenant explicitly approved
for validation.

This runbook also covers the cashier-only POS rollout from #1536: canonical
`cashier` users and legacy `employee` users default to POS access only. They can
operate POS, but they do not get Menú or Ventas unless a tenant override grants
those modules explicitly.

## Safety rules

- Never flip `enforce` globally.
- Capture the tenant's current mode before every test.
- Keep a SQL rollback open while testing.
- Reload the app after each mode flip so `/api/me/access` refreshes the current
  `enforcement_mode`.
- Wait up to 60 seconds for the enforcement mode cache to expire if the runtime
  is not restarted or `invalidate_enforcement_mode()` is not invoked.
- Wait up to 300 seconds for role-module override cache changes if the runtime
  is not restarted or `invalidate_role_modules()` is not invoked.
- Public, token, and synthetic flows must stay usable: auth, public restaurant,
  supplier portal, customer portal, table QR, KDS token flows, invitation accept,
  billing callbacks, scheduled billing jobs, and `/api/me/access`.

## References

| Area | Reference |
| --- | --- |
| Front route gate | `front_nuxt/middleware/module-access.global.ts` |
| Front access source | `front_nuxt/stores/access.ts` |
| Backend gate | `api_warocol.com/app/core/permissions.py` |
| Tenant mode column | `api_warocol.com/dbdoc/public.tenants.md` |
| Route/API audit | `front_nuxt/docs/engineering/rbac-gating-audit-1520.md` |

Expected mode behavior:

| Mode | Route behavior | API behavior | Signal |
| --- | --- | --- | --- |
| `disabled` | Existing access is unchanged. | Existing calls are not blocked by module gates. | No RBAC denial expected. |
| `shadow` | Existing access is unchanged. | Calls are allowed. | Unauthorized attempts emit `permissions.shadow` `would_deny`. |
| `enforce` | Unauthorized pages redirect to `/403`. | Unauthorized calls return HTTP 403 with the module in the detail. | Denial is user-visible. |

## SQL setup

Replace `:tenant_slug`, `:tenant_id`, `:role`, and `:module` before running.
Keep the rollback statements ready in the same session.

```sql
-- 1) Identify and capture the current mode.
SELECT id, slug, permissions_enforcement_mode
FROM tenants
WHERE slug = :tenant_slug;

-- Store this result outside the transaction/runbook notes:
-- original_mode = <permissions_enforcement_mode>

-- 2) Switch modes during validation.
UPDATE tenants
SET permissions_enforcement_mode = 'disabled'
WHERE id = :tenant_id;

UPDATE tenants
SET permissions_enforcement_mode = 'shadow'
WHERE id = :tenant_id;

UPDATE tenants
SET permissions_enforcement_mode = 'enforce'
WHERE id = :tenant_id;

-- 3) Fast rollback. Use the captured original mode when it was not disabled.
UPDATE tenants
SET permissions_enforcement_mode = 'disabled'
WHERE id = :tenant_id;
```

Optional override setup for a known test role:

```sql
-- Deny one module to a role that normally has it.
INSERT INTO tenant_role_module_overrides (tenant_id, role, module, granted)
VALUES (:tenant_id, :role, :module, false)
ON CONFLICT (tenant_id, role, module)
DO UPDATE SET granted = EXCLUDED.granted;

-- Grant one module to a role that normally lacks it.
INSERT INTO tenant_role_module_overrides (tenant_id, role, module, granted)
VALUES (:tenant_id, :role, :module, true)
ON CONFLICT (tenant_id, role, module)
DO UPDATE SET granted = EXCLUDED.granted;

-- Cleanup all temporary overrides for the test role.
DELETE FROM tenant_role_module_overrides
WHERE tenant_id = :tenant_id
  AND role = :role;
```

Use the owner role as the positive control. Use a restricted role such as
`cashier`, `kitchen`, or a temporary override as the negative control.

## Manual validation matrix

For each row, test three passes: `disabled`, `shadow`, then `enforce`.
In `disabled` and `shadow`, confirm the route and API call do not fail only
because of module RBAC. In `enforce`, confirm unauthorized access denies and
authorized access still works.

| Surface | Route check | API check | Authorized control | Denied control |
| --- | --- | --- | --- | --- |
| POS | `/pos` and checkout/product flows | POS cart or payment method POS endpoint | `owner` or `cashier` | role without `pos` via override |
| Ventas | `/ventas`, `/ventas/crear`, `/ventas/:id` | orders/sales endpoint used by the route | `owner`, `admin`, or `supervisor` | `cashier` or `kitchen` |
| Despacho | `/despacho/comandas`, `/despacho/domicilios`, `/despacho/en-mesa` | dispatch/comandas endpoint used by the route | `owner` or `kitchen` | `cashier` without `despacho` |
| Finanzas | `/finanzas`, gastos, pagos, contabilidad, arqueo | expenses/payment/accounting endpoint | `owner` or role with `finanzas` | `cashier` |
| Equipo | `/equipo`, `/equipo/miembros`, member detail | members/invitations endpoint | `owner` | `admin`, `cashier`, or role without `equipo` |
| Mi Negocio | `/negocio` and fiscal/business identity pages | tenant fiscal/business endpoint | `owner` | non-owner role without `mi_negocio` |
| Integraciones | `/integraciones` | session integration endpoint | `owner` or role with `integraciones` | `cashier` |

Payroll pages under `/equipo/salarios/**` are expected to validate as
`finanzas`, not `equipo`, because payroll is a financial risk surface.

## Cashier-only POS validation

Run this section with both a canonical `cashier` user and a legacy `employee`
user. The expected default access payload from `/api/me/access` is:

```json
{
  "modules": ["pos"]
}
```

Check the full response also reports the current `enforcement_mode` after each
mode flip.

### Default access

1. Sign in as `cashier`.
2. Confirm `/api/me/access` includes `pos` and does not include `menu`,
   `ventas`, `equipo`, `finanzas`, `mi_negocio`, or `integraciones`.
3. Repeat with a legacy `employee` user.

### Disabled mode

1. Set the tenant to `disabled`.
2. Reload the app.
3. Confirm `/pos` loads products through the POS catalog and checkout flows
   stay usable.
4. Visit `/menu`, `/ventas`, `/equipo`, `/finanzas`, `/negocio`, and
   `/integraciones`.
5. Expected result: module RBAC does not block these routes or APIs while the
   tenant is disabled. Other non-RBAC business checks may still apply.

### Shadow mode

1. Set the tenant to `shadow`.
2. Reload the app.
3. Confirm `/pos` and its POS API calls still work.
4. Visit `/menu` and `/ventas`; also sample `/equipo`, `/finanzas`, `/negocio`,
   and `/integraciones`.
5. Expected result: access is allowed, but denied modules emit
   `permissions.shadow` records with `would_deny`. At minimum, Menú and Ventas
   attempts for `cashier`/`employee` should produce shadow signals.

### Enforce mode

1. Set the tenant to `enforce`.
2. Reload the app.
3. Confirm `/pos` works and the product catalog loads from `/api/pos/products`.
4. Visit `/menu` and `/ventas`.
5. Sample `/equipo`, `/finanzas`, `/negocio`, and `/integraciones`.
6. Expected result: `/pos` remains usable; unauthorized routes redirect to
   `/403`; unauthorized APIs return HTTP 403 and mention the denied module.

### Explicit tenant overrides

Use overrides only when a tenant intentionally needs broader cashier access.
For example, grant Menú or Ventas temporarily to validate the exception path:

```sql
INSERT INTO tenant_role_module_overrides (tenant_id, role, module, granted)
VALUES (:tenant_id, 'cashier', 'menu', true),
       (:tenant_id, 'cashier', 'ventas', true)
ON CONFLICT (tenant_id, role, module)
DO UPDATE SET granted = EXCLUDED.granted;
```

After the cache expires or the API worker is restarted, `/api/me/access` should
include the granted modules and `enforce` should allow the matching routes.
Remove these temporary overrides before finishing validation. Legacy `employee`
sessions normalize to `cashier`, so override rows for this validation should use
`role = 'cashier'`.

## Mode-specific steps

### Disabled

1. Set the tenant to `disabled`.
2. Reload the frontend session or sign out and in.
3. Confirm `/api/me/access` reports `"enforcement_mode": "disabled"`.
4. Visit each route in the matrix with both positive and negative controls.
5. Call the matching API endpoints.
6. Expected result: no route redirect or API 403 caused by module RBAC.

### Shadow

1. Set the tenant to `shadow`.
2. Reload the frontend session or sign out and in.
3. Confirm `/api/me/access` reports `"enforcement_mode": "shadow"`.
4. Repeat the route and API checks with positive and negative controls.
5. Inspect application logs for `permissions.shadow` records.
6. Expected result: access is allowed, but denied controls produce
   `would_deny` records with `tenant_id`, `user_id`, `role`, `module`,
   `reason`, and `path`.

### Enforce

1. Set the tenant to `enforce`.
2. Reload the frontend session or sign out and in.
3. Confirm `/api/me/access` reports `"enforcement_mode": "enforce"`.
4. Visit each route in the matrix with the positive control.
5. Visit each route with the denied control.
6. Call the matching API endpoints with both controls.
7. Expected result: authorized access works; unauthorized routes redirect to
   `/403`; unauthorized APIs return HTTP 403 and mention the denied module.

## Rollback

Run rollback immediately after validation or after the first unexpected denial:

```sql
UPDATE tenants
SET permissions_enforcement_mode = 'disabled'
WHERE id = :tenant_id;

DELETE FROM tenant_role_module_overrides
WHERE tenant_id = :tenant_id
  AND role = 'cashier';
```

Then reload the frontend session and confirm `/api/me/access` reports
`"enforcement_mode": "disabled"`. If the runtime keeps returning the old mode,
wait up to 60 seconds or restart the relevant API worker. If role-module
overrides were changed, wait up to 300 seconds or restart the API worker so the
role-module cache is refreshed.

## Regression command

Run the targeted backend permission suite after documentation or verification
changes:

```bash
cd api_warocol.com
python -m pytest tests/test_permissions_dependency.py tests/test_me_access.py tests/test_pos_permissions.py tests/test_ventas_permissions.py tests/test_finanzas_permissions.py tests/test_equipo_permissions.py tests/test_mi_negocio_permissions.py tests/test_integraciones_permissions.py
```
