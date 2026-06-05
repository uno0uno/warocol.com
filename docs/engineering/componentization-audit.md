# Frontend componentization audit

Issue: #1155
Epic: #1154

This audit captures the current frontend UI/component landscape so later
componentization batches can stay small, reviewable, and evidence-based. It is
not a refactor plan for changing all pages at once.

## Foundations

| Area | Current state | Follow-up |
| --- | --- | --- |
| Tokens | `assets/css/design-tokens.css` defines HSL semantic tokens for light/dark themes, surface/text tokens, status tokens, and OKLCH status badge colors. | Keep new shared components on semantic tokens such as `bg-surface`, `text-text-primary`, `border-border`, `bg-primary`, and status tokens. |
| Tailwind mapping | `tailwind.config.js` maps token variables into Tailwind colors, border radius, and font families. | Treat Tailwind token classes as the public styling API for shared components. |
| Global CSS order | `nuxt.config.ts` loads `main.scss`, then `design-system.css`, then `design-tokens.css`, then `fonts.css`. | Avoid changing global order without a visual smoke pass. |
| Tailwind layers | Both `assets/css/main.scss` and `assets/css/design-system.css` include `@tailwind base`, `@tailwind components`, and `@tailwind utilities`. | Decide one owner for Tailwind layer imports before broad CSS cleanup. |
| Article styles | Both `main.scss` and `design-system.css` define `.article-style`; `design-system.css` currently wins when selectors overlap because it loads later. | Batch #1159 should choose one article-style owner before blog/content changes. |
| Date picker styles | Global VueDatePicker styling exists in `main.scss`; `UiAdvancedFiltersBar` also contains date-picker overrides. | Batch #1156 should document/centralize the input styling contract before more date-filter work. |

## Shared Component Map

### Canonical UI Layer

`components/ui` is the canonical shared UI layer. Existing adoption is already
high enough that future work should consolidate around it instead of creating a
parallel system.

| Component/pattern | Evidence | Routing |
| --- | --- | --- |
| `UiStatusBadge` | Broadly used across operational pages. | Keep as canonical status indicator in #1156. |
| `UiResponsiveDataView` + `UiDataTable` | Used by many list/table pages; wraps desktop table plus mobile card slots. | Use as canonical responsive list/table pattern in #1156/#1158. |
| `UiAdvancedFiltersBar` + `UiFilterSelect` | Existing replacement for legacy filters; includes date range support. | Consolidate filters/toolbars in #1156. |
| `UiButton` | CVA-based variants with token classes. | Use as button/action reference in #1156. |
| `UiModal` + `UiBottomSheetModal` | Existing desktop/mobile modal split. | Keep for responsive modal work in #1156/#1158. |
| `UiModuleNavigation` | Used by module landing pages such as menu, ventas, finanzas, operaciones, inventario, and abastecimiento. | Preserve as module navigation primitive in #1157. |
| `UiLoadingDots`, `UiLoadingMatrix`, `UiSkeleton` | Shared loading visuals, but coexist with `CommonsTheCustomLoader`. | Decide loading-state ownership in #1156. |

### Legacy/Common Layer

`components/Commons` is still live and should not be treated as dead code.

| Component | Current role | Recommendation |
| --- | --- | --- |
| `CommonsTheCustomLoader` | Primary loading component across many pages and components. | Migrate by family only after #1156 defines loading primitives. |
| `CommonsTheErrorState` | Common page/error state. | Keep until #1156 defines whether error states live in `components/ui` or `Commons`. |
| `CommonsInlineDots` | Small inline busy indicator. | Compare with `UiLoadingDots` before consolidation. |
| `CommonsImageUploadModal` | Domain-ish shared modal. | Keep unless replaced by a specific upload primitive. |
| `CommonsDataTable` | Legacy TanStack table wrapper, separate from `UiDataTable`. | Verify consumers before deciding whether it migrates or stays. |
| `CommonsToastContainer` | Bridge around `UiToast`. | Review with toast ownership in #1156. |

### Layout and Shell Components

| Area | Current role | Routing |
| --- | --- | --- |
| `layouts/dashboard.vue` | Large private app shell: sidebar, header actions, subscription banner, content scroll, mobile cart/nav, notifications. | Split carefully in #1157; preserve tenant, billing, notifications, POS mobile cart behavior. |
| `components/DashboardSidebar.vue` | Central dashboard nav and module-access filtering. | Keep nav data/access logic stable in #1157. |
| `components/DashboardBottomNav.vue` | Mobile dashboard navigation plus bottom-sheet menus. | Treat with dashboard shell in #1157. |
| `components/DashboardTenantSelector.vue` | Tenant switcher in dashboard shell. | Preserve behavior in #1157. |
| `components/layout/Header.vue`, `Footer.vue`, `BottomNav.vue` | Public/default/blog/public-restaurant layout pieces. | Public/content cleanup belongs to #1159. |

## Repeated Patterns

| Pattern | Current state | Target batch |
| --- | --- | --- |
| Responsive list/table pages | Many modules already use `UiResponsiveDataView`; a few pages still have custom table/list compositions. | #1156, #1158 |
| Filters/toolbars | `UiAdvancedFiltersBar` is the newer pattern; `components/shared/FiltersBar.vue` is deprecated. | #1156 |
| Loading/error/empty states | `CommonsTheCustomLoader`, `CommonsTheErrorState`, `UiLoadingDots`, `UiLoadingMatrix`, `UiSkeleton`, and `UiTableEmpty` overlap. | #1156 |
| Module landing navigation | `UiModuleNavigation` is shared across module landing pages. | #1157 |
| Dashboard shell header actions | `layouts/dashboard.vue` owns route title, dynamic actions, refresh, tenant selector, notifications, status, and business toggle. | #1157 |
| Public/content article styling | `.article-style` is duplicated across global CSS files. | #1159 |
| Large domain pages | POS, checkout, menu products, purchase forms, sales detail, payroll, and dashboard shell are large extraction candidates. | #1158 |

## Prioritized Follow-Ups

1. #1156: define shared UI ownership around `components/ui`.
2. #1156: decide loading/error/empty-state ownership before migrating `Commons` usage.
3. #1156: migrate the two remaining `SharedFiltersBar` consumers to `UiAdvancedFiltersBar`.
4. #1157: split `layouts/dashboard.vue` by shell parts without changing module access, tenant, billing, notification, or POS mobile-cart behavior.
5. #1158: extract operational pages by subflow, starting with list/table/filter patterns before POS checkout internals.
6. #1159: resolve `.article-style` ownership before editing blog/content pages.
7. #1160: delete candidates only after tag, import, and auto-import checks pass.

## Cleanup Candidates

These are candidates, not deletions for this batch.

| Candidate | Evidence | Required verification before deletion |
| --- | --- | --- |
| `components/shared/FiltersBar.vue` | File is marked deprecated and points new list pages to `UiAdvancedFiltersBar`; current known consumers are `pages/operaciones/mesas.vue` and `pages/mis-pedidos/index.vue`. | Migrate both consumers, then search tags/imports/references. |
| `components/Commons/DataTable.vue` | Separate table wrapper from canonical `UiDataTable`/`UiResponsiveDataView`. | Search component tags, imports, Nuxt auto-import names, and dynamic references before deciding. |
| Duplicate `.article-style` rules | Defined in both `main.scss` and `design-system.css`. | Decide owner, compare blog article rendering, then remove duplicate rules in a public/content PR. |
| Duplicate Tailwind layer imports | Both `main.scss` and `design-system.css` include Tailwind layer directives. | Confirm intended CSS entrypoint and run visual smoke after any change. |
| `pages/abastecimiento/ingredientes.vue.disabled` | Disabled route file exists. | Check git history, route usage, and product intent before removal. |
| Unused global utility classes | Classes such as older button/card/input helpers may overlap with `components/ui`. | Search class usage in pages/components before removing. |

## Verification Method

Before deleting or renaming any component in later batches:

1. Search component tags and aliases.

```bash
rg -n "<SharedFiltersBar|<CommonsDataTable|<Ui[A-Za-z0-9]+|<Commons[A-Za-z0-9]+" pages components --glob "*.vue"
```

2. Search explicit imports and file references.

```bash
rg -n "components/shared/FiltersBar|components/Commons/DataTable|~/components/Commons|@/components/Commons" pages components composables --glob "*.{vue,ts,js}"
```

3. Account for Nuxt auto-imports and dynamic usage. Absence of explicit imports
   is not enough to prove a component is unused.

4. Run the available baseline validation.

```bash
npm run build
```

5. Smoke touched route families on desktop and mobile. Suggested families:
   dashboard shell, one `UiModuleNavigation` landing page, one
   `UiResponsiveDataView` list page, POS if touched, and one public/blog page if
   content styles are touched.

## Out Of Scope For #1155

- Refactoring pages or components.
- Removing ambiguous components.
- Changing the visual system or token values.
- Changing API calls, stores, tenant access, payments, auth, routing, or
  business logic.
