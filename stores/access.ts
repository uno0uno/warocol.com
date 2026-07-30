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
import { isInternalAccessDeniedError } from '~/utils/internalAccess'

export type Module =
  | 'pos'
  | 'ventas'
  | 'despacho'
  | 'menu'
  | 'operaciones'
  | 'abastecimiento'
  | 'analitica'
  | 'crm'
  | 'finanzas'
  | 'facturacion'
  | 'equipo'
  | 'integraciones'
  | 'mi_plan'
  | 'mi_negocio'
  // EVENTOS removed in api-warolabs#212 (PR #212 merged) — Eventos lives in warotickets.com

export type EnforcementMode = 'disabled' | 'shadow' | 'enforce'
export type AccessFeature = 'kali_enabled'

type AccessFeatures = Partial<Record<AccessFeature, boolean>>

interface AccessResponse {
  role: string | null
  modules: string[]
  plan_slug?: string | null
  enforcement_mode: EnforcementMode
  features?: AccessFeatures
}

// Polling handle — module scope so it survives store re-evaluation but stays
// per-tab on the client. Never written on SSR (the `import.meta.client` guard
// in armPolling() ensures every server request leaves this as null).
// Epic 4 (#562): refreshes access state every 60s so mid-session permission
// changes (owner edits matrix in Epic 5) propagate without a page reload.
const POLL_INTERVAL_MS = 60_000
let pollingHandle: ReturnType<typeof setInterval> | null = null

export const useAccessStore = defineStore('access', () => {
  const role = ref<string | null>(null)
  const modules = ref<string[]>([])
  const planSlug = ref<string | null>(null)
  const enforcementMode = ref<EnforcementMode>('disabled')
  const features = ref<AccessFeatures>({})
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
      planSlug.value = data.plan_slug ?? null
      enforcementMode.value = data.enforcement_mode ?? 'disabled'
      features.value = data.features ?? {}
      isLoaded.value = true
      armPolling()
    } catch (err) {
      if (isInternalAccessDeniedError(err)) {
        clear()
        throw err
      }
      // Fail-open: keep current state. enforcementMode stays at its current
      // value (initially 'disabled' which makes can() always return true).
      // Matches the safety guarantee in Epic 4's body. Polling stays unarmed
      // until a successful load — next auth navigation will retry.
      console.error('useAccessStore.load() failed:', err)
    }
  }

  function clear() {
    stopPolling()
    role.value = null
    modules.value = []
    planSlug.value = null
    enforcementMode.value = 'disabled'
    features.value = {}
    isLoaded.value = false
  }

  // Self-arms after first successful load. Idempotent — subsequent load()
  // calls (whether from auth middleware re-entry or from the polling tick
  // itself) won't double-arm.
  function armPolling() {
    if (!import.meta.client) return
    if (pollingHandle !== null) return
    pollingHandle = setInterval(() => { load() }, POLL_INTERVAL_MS)
  }

  function stopPolling() {
    if (pollingHandle !== null) {
      clearInterval(pollingHandle)
      pollingHandle = null
    }
  }

  /**
   * Returns true if the current user can access `module`.
   *
   * `/me/access` modules are already role ∩ plan (api-warolabs#694). Once
   * loaded, membership is always enforced so Starter nav/routes match the API
   * regardless of RBAC enforcement_mode. Pre-load keeps Epic 4 fail-open so
   * the shell does not flash empty during hydration.
   */
  function can(module: Module): boolean {
    if (isLoaded.value) {
      return modulesSet.value.has(module)
    }
    if (enforcementMode.value !== 'enforce') return true
    return modulesSet.value.has(module)
  }

  /**
   * Tenant feature capabilities are stricter than module access: missing
   * backend values must stay false so hidden beta/internal products do not
   * appear just because module RBAC is in shadow/disabled mode.
   */
  function hasFeature(feature: AccessFeature): boolean {
    return features.value[feature] === true
  }

  return {
    role: readonly(role),
    modules: readonly(modules),
    planSlug: readonly(planSlug),
    enforcementMode: readonly(enforcementMode),
    features: readonly(features),
    isLoaded: readonly(isLoaded),
    load,
    clear,
    can,
    hasFeature,
  }
})
