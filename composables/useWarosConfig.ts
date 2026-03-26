/**
 * Waros Points System Composable
 * Fetches and mutates earning rules and the global system toggle.
 *
 * Migrated to Pinia Colada useQuery + useMutation — eliminates manual
 * isLoading/isSaving/error refs and try/catch/finally boilerplate.
 * toggleGlobal uses optimistic update with cache rollback on error.
 *
 * Pure helpers (getRuleMeta, configSummary, DEFAULT_CONFIGS) are re-exported
 * from warosConfigHelpers so callers that only need helpers can import
 * them directly without triggering useQuery.
 */

export type {
  WaroRule,
  WarosConfigResponse,
  TicketValueTier,
  PurchaseCountMilestone,
} from './warosConfigHelpers'

export { DEFAULT_CONFIGS, getRuleMeta, configSummary } from './warosConfigHelpers'

import type { WarosConfigResponse } from './warosConfigHelpers'
import { getRuleMeta, configSummary } from './warosConfigHelpers'

export const useWarosConfig = () => {
  const cache = useQueryCache()

  // ── Read ──────────────────────────────────────────────────────────────
  const { data, status, asyncStatus } = useQuery({
    key: ['waros', 'config'],
    query: () => $fetch<WarosConfigResponse>('/api/admin/waros/rules'),
  })

  const rules = computed(() => data.value?.rules ?? [])
  const isEnabled = computed(() => data.value?.is_enabled ?? false)
  const isLoading = computed(() => status.value === 'loading')
  const isRefreshing = computed(() => asyncStatus.value === 'loading' && data.value != null)
  const error = computed(() => null as string | null)

  // Alias for callers that call fetchRules() imperatively (puntos.vue)
  const fetchRules = () =>
    cache.invalidateQueries({ key: ['waros', 'config'] })

  // ── updateRule ────────────────────────────────────────────────────────
  const updateRuleMutation = useMutation({
    mutation: (vars: {
      rule_type: string
      payload: { is_active: boolean; config: Record<string, any> }
    }) =>
      $fetch(`/api/admin/waros/rules/${vars.rule_type}`, {
        method: 'PUT',
        body: vars.payload,
      }),
    onSettled: () => cache.invalidateQueries({ key: ['waros', 'config'] }),
  })

  const updateRule = (
    rule_type: string,
    payload: { is_active: boolean; config: Record<string, any> }
  ) => updateRuleMutation.mutateAsync({ rule_type, payload })

  const isSaving = updateRuleMutation.isLoading

  // ── toggleRule ────────────────────────────────────────────────────────
  const toggleRuleMutation = useMutation({
    mutation: (rule_type: string) =>
      $fetch(`/api/admin/waros/rules/${rule_type}/toggle`, { method: 'PATCH' }),
    onSettled: () => cache.invalidateQueries({ key: ['waros', 'config'] }),
  })

  const toggleRule = (rule_type: string) =>
    toggleRuleMutation.mutateAsync(rule_type)

  // ── toggleGlobal (optimistic) ─────────────────────────────────────────
  const toggleGlobalMutation = useMutation({
    mutation: (enabled: boolean) =>
      $fetch('/api/admin/waros/config', {
        method: 'PATCH',
        body: { is_enabled: enabled },
      }),
    onMutate(enabled) {
      const snapshot = cache.getQueryData<WarosConfigResponse>(['waros', 'config'])
      cache.setQueryData(
        ['waros', 'config'],
        (old: WarosConfigResponse | undefined) =>
          old ? { ...old, is_enabled: enabled } : old
      )
      return { snapshot }
    },
    onError(_err, _vars, context: { snapshot: WarosConfigResponse | undefined } | undefined) {
      if (context?.snapshot !== undefined) {
        cache.setQueryData(['waros', 'config'], context.snapshot)
      }
    },
    onSettled: () => cache.invalidateQueries({ key: ['waros', 'config'] }),
  })

  const toggleGlobal = (value: boolean) =>
    toggleGlobalMutation.mutateAsync(value)

  return {
    rules,
    isEnabled,
    isLoading,
    isRefreshing,
    isSaving,
    error,
    fetchRules,
    updateRule,
    toggleRule,
    toggleGlobal,
    getRuleMeta,
    configSummary,
  }
}
