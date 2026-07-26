/**
 * Warehouse catalog create gating (warocol.com#1814).
 * Mirrors `useMenuCatalogQuotaGate` for the `tenant_ingredients` growth quota
 * so Catálogo de bodega opens the Mi Plan modal before create when the plan
 * cap is reached (parity with menu catalog lists). API remains the source of
 * truth (create still enforces 429 via check_plan_quota_growth).
 */
import type {
  BillingRemainingUsage,
  BillingUsageMetric,
} from '~/composables/useBilling'
import {
  BILLING_QUOTA_RESOURCE_CONFIG,
  resolveOperationalQuota,
  useBilling,
} from '~/composables/useBilling'

const WAREHOUSE_QUOTA_RESOURCE = 'tenant_ingredients' as const

export function useWarehouseCatalogQuotaGate() {
  const { t } = useI18n({ useScope: 'global' })
  const { fetchBillingOverview } = useBilling()

  const quotaLimitModalOpen = ref(false)
  const quotaLimitModalMessage = ref('')

  const formatMetricMessage = (metric: BillingUsageMetric | null | undefined) => {
    const result = resolveOperationalQuota(WAREHOUSE_QUOTA_RESOURCE, metric ?? null)
    if (!metric || metric.limit === null) return result.message
    return `${result.message} Uso actual: ${metric.used.toLocaleString('es-CO')} de ${metric.limit.toLocaleString('es-CO')} ${result.unit}. Revisa Mi Plan para ampliar tu cupo.`
  }

  const fetchRemainingUsage = async () => {
    return await $fetch<BillingRemainingUsage>('/api/billing/remaining-usage')
  }

  const fetchQuotaStatus = async () => {
    try {
      const usage = await fetchRemainingUsage()
      const metric = usage.quota_usage?.[WAREHOUSE_QUOTA_RESOURCE] ?? null
      const blocked = resolveOperationalQuota(WAREHOUSE_QUOTA_RESOURCE, metric).blocked
      return { blocked, message: formatMetricMessage(metric) }
    } catch {
      // Fail open — API CREATE still enforces 429.
      return { blocked: false, message: '' }
    }
  }

  const openQuotaLimitModalWithMessage = (message: string) => {
    quotaLimitModalMessage.value = message
      || BILLING_QUOTA_RESOURCE_CONFIG[WAREHOUSE_QUOTA_RESOURCE]?.blockedMessage
      || t('menu.common.quotaBlocked', 'Cupo del plan alcanzado')
    quotaLimitModalOpen.value = true
  }

  const closeQuotaLimitModal = () => {
    quotaLimitModalOpen.value = false
  }

  const goToBillingFromQuotaLimitModal = async () => {
    quotaLimitModalOpen.value = false
    await navigateTo('/gestion/billing')
  }

  /** Warehouse catalog Nuevo: stay clickable; open Mi Plan modal when cap reached. */
  const handleWarehouseCreateClick = async (open: () => void) => {
    const result = await fetchQuotaStatus()
    if (result.blocked) {
      openQuotaLimitModalWithMessage(
        result.message
          || BILLING_QUOTA_RESOURCE_CONFIG[WAREHOUSE_QUOTA_RESOURCE]?.blockedMessage
          || t('menu.common.quotaBlocked', 'Cupo del plan alcanzado'),
      )
      return false
    }
    open()
    return true
  }

  const ensureBillingOverview = async () => {
    await fetchBillingOverview()
  }

  return {
    quotaLimitModalOpen,
    quotaLimitModalMessage,
    closeQuotaLimitModal,
    goToBillingFromQuotaLimitModal,
    handleWarehouseCreateClick,
    ensureBillingOverview,
  }
}
