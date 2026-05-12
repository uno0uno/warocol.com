/**
 * Access Store — Epic 4 (warocol.com#489) sub-task #555.
 *
 * Single source of truth for the current user's role, module access, and the
 * tenant's enforcement mode. Hydrates from GET /api/me/access (backend lives
 * in api-warolabs#200, merged via PR #219).
 *
 * Read by sidebar (#559), bottom nav (#560), route middleware (#557), and
 * page-level guards (#563). Refreshed periodically by polling (#562).
 *
 * Module string union is hand-maintained against the backend enum at
 * api_warocol.com/app/core/permissions.py:Module. If a new module is added
 * there, mirror it here.
 */
import { defineStore } from 'pinia'

export type Module =
  | 'pos'
  | 'ventas'
  | 'despacho'
  | 'menu'
  | 'operaciones'
  | 'abastecimiento'
  | 'analitica'
  | 'finanzas'
  | 'facturacion'
  | 'equipo'
  | 'integraciones'
  | 'mi_plan'
  | 'mi_negocio'
  // EVENTOS removed in api-warolabs#212 (PR #212 merged) — Eventos lives in warotickets.com

export type EnforcementMode = 'disabled' | 'shadow' | 'enforce'

interface AccessResponse {
  role: string | null
  modules: string[]
  enforcement_mode: EnforcementMode
}

export const useAccessStore = defineStore('access', () => {
  const role = ref<string | null>(null)
  const modules = ref<string[]>([])
  const enforcementMode = ref<EnforcementMode>('disabled')
  const isLoaded = ref(false)

  // O(1) membership lookup derived from the array.
  // Stored as `string[]` (not `Set`) because Pinia SSR serializes state to
  // the Nuxt payload as JSON, and Sets don't survive the round trip.
  const modulesSet = computed(() => new Set(modules.value))

  async function load() {
    try {
      const data = await $fetch<AccessResponse>('/api/me/access')
      role.value = data.role
      modules.value = data.modules ?? []
      enforcementMode.value = data.enforcement_mode ?? 'disabled'
      isLoaded.value = true
    } catch (err) {
      // Fail-open: keep current state. enforcementMode stays at its current
      // value (initially 'disabled' which makes can() always return true).
      // Matches the safety guarantee in Epic 4's body.
      console.error('useAccessStore.load() failed:', err)
    }
  }

  function clear() {
    role.value = null
    modules.value = []
    enforcementMode.value = 'disabled'
    isLoaded.value = false
  }

  /**
   * Returns true if the current user can access `module`.
   *
   * Fail-open semantics: when enforcementMode is 'disabled' or 'shadow',
   * always returns true so the frontend renders today's behavior (no menu
   * items hidden, no redirects). Backend mirrors this — shadow mode logs
   * but does not deny.
   *
   * Only 'enforce' mode actually checks membership against `modules`.
   */
  function can(module: Module): boolean {
    if (enforcementMode.value !== 'enforce') return true
    return modulesSet.value.has(module)
  }

  return {
    role: readonly(role),
    modules: readonly(modules),
    enforcementMode: readonly(enforcementMode),
    isLoaded: readonly(isLoaded),
    load,
    clear,
    can,
  }
})
