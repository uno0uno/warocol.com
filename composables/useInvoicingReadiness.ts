import { computed } from 'vue'
import { $fetch } from 'ofetch'
import { useQuery } from '@pinia/colada'

export interface InvoicingReadinessChecks {
  customer_requested:   boolean
  dev_flag_enabled:     boolean
  fiscal_data_complete: boolean
  active_resolution:    boolean
  taxes_configured:     boolean
  tax_requirement_satisfied: boolean
  matias_company_id_configured: boolean
}

export interface InvoicingReadinessResponse {
  ready:   boolean
  checks:  InvoicingReadinessChecks
  missing: string[]
}

/**
 * Single source of truth on the frontend for "can this tenant emit electronic
 * invoices right now?". Wraps GET /api/api/tenant/invoicing-readiness.
 *
 * The query key includes the active tenant id, so switching tenants
 * automatically refetches without explicit invalidation. After mutating
 * fiscal data / tax config / resolutions, callers must explicitly invalidate
 * the query so banners and gates update without waiting for staleTime:
 *
 *   const cache = useQueryCache()
 *   cache.invalidateQueries({ key: ['tenant', 'invoicing-readiness'] })
 */
export const useInvoicingReadiness = () => {
  const { currentTenant } = useTenantReactive()

  const { data, asyncStatus, refetch } = useQuery({
    key:       () => ['tenant', 'invoicing-readiness', currentTenant.value?.id],
    query:     () => $fetch<InvoicingReadinessResponse>('/api/api/tenant/invoicing-readiness'),
    enabled:   () => import.meta.client && !!currentTenant.value,
    staleTime: 60_000,
  })

  const ready     = computed(() => data.value?.ready === true)
  const missing   = computed(() => data.value?.missing ?? [])
  const checks    = computed(() => data.value?.checks)
  const isLoading = computed(() => asyncStatus.value === 'loading' && !data.value)

  return { data, ready, missing, checks, isLoading, refetch }
}
