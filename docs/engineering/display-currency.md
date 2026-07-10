# Display currency (no FX)

Batch **#1603** / epic **#1598**. Money **display** may follow tenant `currency_code` (default **COP**). This is not a multi-currency ledger.

## Layers

| Layer | Today | This batch |
|-------|--------|------------|
| **Display** | Hardcoded COP via `Intl` | `currency_code` from business profile → `formatMoney` / `useFormatters().formatCurrency` |
| **Storage / orders** | Numeric amounts, implicit COP | Unchanged — no amount conversion |
| **Transaction currency** | Single-currency CO product | Future epic (order-level currency, settlements) |
| **Electronic invoicing (FE)** | Colombia fiscal, COP, Matias | **Out of scope** — still COP; do not send multi-currency to Matias / `api-facturacion` |

## Source of truth

1. `tenant_public_profiles.currency_code` (API B1 #1599) when present  
2. Default **`COP`** if missing, invalid, or B1 not deployed  

Front types: `TenantBusinessProfile.currency_code` in `stores/tenants.ts`.  
Pure helper: `utils/currencyDisplay.ts` (`normalizeCurrencyCode`, `formatMoney`).  
UI entry: `composables/useFormatters.ts` → `formatCurrency`.

## Rules

- **No FX engine** — no rates, no dual books, no consolidation.
- Changing `currency_code` only changes **symbol/format** on wired formatters; stored numbers stay as-is.
- Prefer extending the shared helper over mass-replacing every `currency: 'COP'` call site.
- FE emit (`POST /api/orders/{id}/invoice`) must not gain a display-currency field from this work.

## Related

- Locale number punctuation: B3 #1601  
- UI string i18n: B4 #1602  
- Prefs API: B1 #1599  
