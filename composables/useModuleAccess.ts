import type { ComputedRef } from 'vue'
import type { Module } from '~/stores/access'

/**
 * useModuleAccess — Epic 4 (warocol.com#489) sub-task #556.
 *
 * Thin composable wrapper over `useAccessStore` (#555). Components, the
 * sidebar (#559), bottom nav (#560), route middleware (#557), and
 * component-level guards (#563) call this instead of importing the store
 * directly.
 *
 * Pattern mirrors `composables/useTenantReactive.ts`:
 *   - Function-style (not `defineStore`, not `defineNuxtPlugin`)
 *   - Returns `computed` refs for reactive state
 *   - `can()` returns a `ComputedRef<boolean>` so templates auto-re-render
 *     when the user's access changes (e.g. when polling #562 picks up an
 *     owner-edited matrix)
 *
 * The composable is read-only by design. Mutation (`load`, `clear`) lives
 * on the store and is triggered by the auth middleware (#555) and the
 * polling task (#562). Components do not call mutations directly.
 */
export const useModuleAccess = () => {
  const store = useAccessStore()

  const role = computed(() => store.role)
  const planSlug = computed(() => store.planSlug)
  const enforcementMode = computed(() => store.enforcementMode)
  const isLoaded = computed(() => store.isLoaded)

  /**
   * Returns a `ComputedRef<boolean>` that's `true` when the current user
   * can access `module`.
   *
   * After access loads, membership reflects effective modules from
   * `/me/access` (role ∩ plan). Pre-load fail-open preserves hydration UX.
   */
  const can = (module: Module): ComputedRef<boolean> =>
    computed(() => store.can(module))

  return { role, planSlug, enforcementMode, isLoaded, can }
}
