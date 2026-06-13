/**
 * module-access.global.ts — Epic 4 (warocol.com#489) sub-task #557.
 *
 * Route-level enforcement of module access. Activates only when:
 *   1. The destination page declares `definePageMeta({ module: 'X' })` (#558).
 *   2. The tenant's `enforcement_mode` is `'enforce'` (flipped per-tenant in
 *      Epic 6).
 *
 * Otherwise no-op (fail-open). Mirrors the backend's behavior — backend's
 * `require_module()` also passes through on `'disabled'` / `'shadow'` modes,
 * so the frontend gate matches what the API would actually return.
 *
 * Execution order: runs after `auth.global.js` (which hydrates
 * `useAccessStore`) and after `billing-gate.global.ts` (no point gating
 * modules for a user who's about to be redirected to billing).
 *
 * Redirect target `/403` ships in #561. Until that lands, a denial would
 * hit a 404 — but denial only triggers when `enforcement_mode === 'enforce'`
 * AND a page has `module` meta, neither of which exists in production
 * today. The coordination requirement: #561 must merge BEFORE any tenant
 * is flipped to `'enforce'`.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return

  // Skip-list: routes that never require module gating. Mirrors the lists
  // in auth.global.js and billing-gate.global.ts. If this list drifts,
  // extract to utils/route-helpers.ts as a follow-up.
  const skipExact = ['/', '/bogota']
  const skipPrefixes = [
    '/auth/',
    '/proveedor/',
    '/blog',
    '/docs',
    '/403', // prevent infinite redirect loop if /403 itself gets gated
  ]
  const skipLayouts = ['public-restaurant', 'customer-portal', 'kds']

  if (
    skipExact.includes(to.path) ||
    skipPrefixes.some((p) => to.path.startsWith(p)) ||
    skipLayouts.includes(to.meta?.layout as string) ||
    to.meta?.publicAccess === true
  ) return

  // Page didn't opt in to module gating → pass through.
  // PageMeta.module type augmentation lives in app.d.ts (added in #558).
  const moduleKey = to.meta.module
  if (!moduleKey) return

  const { can, enforcementMode } = useModuleAccess()

  // Fail-open: only 'enforce' mode actually denies. 'disabled' and 'shadow'
  // let the request through (backend behavior matches).
  if (enforcementMode.value !== 'enforce') return

  // Denied → redirect to /403 (page ships in #561).
  if (!can(moduleKey).value) {
    return navigateTo('/403')
  }
})
