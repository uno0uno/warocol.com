# Visual Token Color Audit

Issue: #1172
Epic: #1173
Final audit: #1186
Current epic: #1179

## Search Counts

Search scope excludes `node_modules`, lock files, build output, `.nuxt`, `public`, and this audit note.

| Search | Before | After | Notes |
|---|---:|---:|---|
| `purple|violet` | 39 | 7 | Remaining refs are token comments, a blog gradient variant name, and one documented data palette. |
| 6-digit hex colors | 145 | 145 | Mostly token comments, data visualization palettes, social brands, and user-configurable color fallbacks. |
| Crocus brand hex values | 1 | 1 | `#7C3AED` remains in a POS product category palette. |

### Final Audit Counts (#1186)

Scope: `pages`, `components`, `layouts`, and `composables`; excludes `node_modules`, `.nuxt`, `.output`, `dist`, and `public`.

| Search | Before | After | Notes |
|---|---:|---:|---|
| Direct Tailwind color utilities | 1619 | 1527 | Supplier portal chrome/nav is covered by shell tokens in current `main`; payroll liquidation UI now uses semantic tokens. Remaining matches require module triage or documented exception categories below. |
| Hex / `rgb(a)` literals | 541 | 534 | Remaining literals are primarily print CSS, data/chart palettes, user-configurable colors, content styling, or token source comments. |
| Hover/focus/active/disabled color states | 229 | 202 | Payroll liquidation form/action states now use tokenized hover/focus roles; remaining states need PR-sized surface triage or exception documentation. |

## Converted

- Supplier and purchase preparation statuses now use semantic warning state tokens instead of purple utilities.
- Received supplier transition state now uses semantic success state tokens.
- POS cart preparation state now uses semantic warning state tokens.
- Digital payment icons and finance digital badges now use semantic info state tokens.
- WaRos checkout balance card now uses primary/surface/border tokens instead of violet utilities.
- Accounting class color helpers now use status chip tokens for the third class family.
- Auth logo, cierre period badges, loyalty frequency rule styling, and brand-avatar comments no longer use purple/violet literals.
- Supplier portal header, footer, mobile bottom navigation, modal info panel, and desktop sidebar now use `surface`, `border`, `text-*`, `primary`, `nav-*`, and `state-info-*` tokens instead of direct titan/crocus/blue/white utilities.
- Payroll liquidation form, preview, confirmation, success, form-control, and action states now use `surface`, `border`, `text-*`, `form-control-*`, `state-*`, and `action-*` tokens.

## Intentional Exceptions

- Data and category palettes: POS product category colors, menu product swatches, team member color palettes, and event gradients are visualization colors rather than brand state colors.
- User-configurable station colors: kitchen station dots, station forms, inherited station colors, and station fallback hex values preserve operator-selected colors.
- Third-party brand colors: WhatsApp, Facebook, and Instagram hover colors keep their external brand identity.
- Chart colors: analytics chart series and grid colors are chart configuration, not page chrome.
- Print/content CSS: print tickets, receipts, docs layout surfaces, city/blog article imagery overlays, and article CTA hard white/black values are scoped rendering contexts.
- Token comments: primitive token files document source hex values for maintainability.
- Static/legacy utilities that remain in active modules must be triaged per PR-sized surface before conversion; do not bulk-replace direct colors where the value represents data, external brand identity, print output, or operator configuration.

## Follow-Up Rule

New UI state colors should use semantic tokens such as `state-*`, `status-*`, `status-chip-*`, `data-table-*`, `control-*`, or `primary`, not direct `purple-*`, `violet-*`, or brand hex utilities.

Manual visual validation scope for #1186: supplier portal desktop/mobile navigation, supplier info bottom sheet, and payroll liquidation form/preview/confirmation/success states.
