/**
 * access-watcher.client.ts — Epic 4 (warocol.com#489) sub-task #562.
 *
 * Detects mid-session permission changes and silently redirects the user
 * off any page they can no longer access. Complements:
 *   - `module-access.global.ts` (#557) — gates on navigation
 *   - `useAccessStore.armPolling()` (#562) — refreshes state every 60s
 *
 * This plugin closes the gap: when the polling tick updates `modules` while
 * the user is parked on a static page, the route middleware never re-fires,
 * so we need a reactive watcher to yank them off the now-forbidden route.
 *
 * Client-only by file extension — Nuxt skips it during SSR, so the watcher
 * + navigateTo() never run on the server.
 */
export default defineNuxtPlugin(() => {
  const accessStore = useAccessStore()
  const route = useRoute()

  // Single derived gate. Reads `route.path`, `route.meta.module`, and
  // (through store.can) `enforcementMode` + `modulesSet` — all reactive,
  // so this recomputes whenever any input changes.
  const canStayOnRoute = computed<boolean>(() => {
    // Defensive: prevent redirect loop if /403 itself is somehow gated.
    if (route.path === '/403') return true
    // Page didn't opt in to module gating → always allowed.
    const moduleKey = route.meta.module
    if (!moduleKey) return true
    // store.can() returns true when enforcementMode !== 'enforce' (fail-open),
    // so today's `disabled`/`shadow` tenants never trigger the redirect.
    return accessStore.can(moduleKey)
  })

  // `flush: 'post'` ensures the watcher runs after Vue Router has finished
  // committing the navigation, so `route.meta.module` is the destination's
  // value, not the source's.
  watch(canStayOnRoute, (allowed) => {
    if (!allowed) navigateTo('/403')
  }, { flush: 'post' })
})
