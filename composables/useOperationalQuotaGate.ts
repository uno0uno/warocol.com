/**
 * Generic operational quota gate (warocol.com#1818).
 * Parameterized sibling of `useMenuCatalogQuotaGate` / `useWarehouseCatalogQuotaGate`:
 * keeps the create CTA clickable and opens the Mi Plan modal before the action
 * when the plan cap for `resource` is reached. Fails open when remaining-usage
 * lacks the metric — the API stays the source of truth (429 quota_exceeded on
 * create). Migrating the menu/warehouse gates onto this helper is a follow-up.
 */
import type {
  BillingRemainingUsage,
  BillingUsageMetric,
  OperationalQuotaKey,
} from '~/composables/useBilling'
import {
  BILLING_QUOTA_RESOURCE_CONFIG,
  resolveOperationalQuota,
  useBilling,
} from '~/composables/useBilling'

export function useOperationalQuotaGate(resource: OperationalQuotaKey) {
  const { t } = useI18n({ useScope: 'global' })
  const { fetchBillingOverview } = useBilling()

  const quotaLimitModalOpen = ref(false)
  const quotaLimitModalMessage = ref('')

  const formatMetricMessage = (metric: BillingUsageMetric | null | undefined) => {
    const result = resolveOperationalQuota(resource, metric ?? null)
    if (!metric || metric.limit === null) return result.message
    return `${result.message} Uso actual: ${metric.used.toLocaleString('es-CO')} de ${metric.limit.toLocaleString('es-CO')} ${result.unit}. Revisa Mi Plan para ampliar tu cupo.`
  }

  const fetchRemainingUsage = async () => {
    return await $fetch<BillingRemainingUsage>('/api/billing/remaining-usage')
  }

  const fetchQuotaStatus = async () => {
    try {
      const usage = await fetchRemainingUsage()
      const metric = usage.quota_usage?.[resource] ?? null
      const blocked = resolveOperationalQuota(resource, metric).blocked
      return { blocked, message: formatMetricMessage(metric) }
    } catch {
      // Fail open — API create still enforces 429.
      return { blocked: false, message: '' }
    }
  }

  const openQuotaLimitModalWithMessage = (message: string) => {
    quotaLimitModalMessage.value = message
      || BILLING_QUOTA_RESOURCE_CONFIG[resource]?.blockedMessage
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

  /** Create CTA: stay clickable; open Mi Plan modal instead of `open()` at cap. */
  const handleCreateClick = async (open: () => void) => {
    const result = await fetchQuotaStatus()
    if (result.blocked) {
      openQuotaLimitModalWithMessage(
        result.message
          || BILLING_QUOTA_RESOURCE_CONFIG[resource]?.blockedMessage
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
    handleCreateClick,
    ensureBillingOverview,
  }
}
