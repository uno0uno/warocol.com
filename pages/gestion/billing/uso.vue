<script setup lang="ts">
import {
  BILLING_QUOTA_RESOURCE_CONFIG,
  STARTER_DISPLAY_QUOTA_KEYS,
  STARTER_PLAN_SLUG,
  useBilling,
  type BillingQuotaKey,
  type BillingUsageMetric,
} from '~/composables/useBilling'

interface Column {
  key: string
  title: string
  sortable?: boolean
  format?: string
  align?: 'left' | 'center' | 'right'
}

definePageMeta({})
const { t, locale } = useI18n({ useScope: 'global' })
useHead({ title: () => t('billing.remainingUsageTitle') })

const { subscription, remainingUsage, isRefreshing, fetchBillingOverview, accessStatus, plans } = useBilling()

const { currentTenant } = useTenantReactive()
const accessStore = useAccessStore()
const isStarterTenant = computed(() =>
  accessStatus.value?.level === 'starter' || accessStore.planSlug === STARTER_PLAN_SLUG,
)
const starterPlan = computed(() => (plans.value ?? []).find(plan => plan.slug === STARTER_PLAN_SLUG) ?? null)
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const isInitialLoading = computed(() =>
  !!currentTenant.value &&
  (
    subscription.value === undefined ||
    accessStatus.value === undefined ||
    plans.value === undefined ||
    (
      !isStarterTenant.value
      && subscription.value !== null
      && remainingUsage.value === undefined
    )
  )
)

const loadAll = async () => {
  await fetchBillingOverview()
}

onMounted(() => { void loadAll(); setRefreshHandler(loadAll) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(loadAll))
watch(() => currentTenant.value?.id, loadAll)

const fallbackUsageMetric = (used = 0, limit = 0): BillingUsageMetric => ({
  used,
  limit,
  remaining: Math.max(limit - used, 0),
  period_start: subscription.value?.current_period_start ?? '',
  period_end: subscription.value?.current_period_end ?? '',
})

type UsageMetricValue = {
  used?: number
  limit?: number | null
  remaining?: number | null
}

interface UsageDisplayRow {
  resourceKey: string
  resource: string
  description: string
  used: number | null
  limit: number | null
  remaining: number | null
  percentage: number | null
  unit: string
  emptyMessage: string | null
  zeroLabel?: string
  limitsOnly?: boolean
}

const hasLimitedQuota = (metric: UsageMetricValue) =>
  typeof metric.limit === 'number' && metric.limit > 0

const usagePercentage = (metric: UsageMetricValue) =>
  hasLimitedQuota(metric) ? Math.min(Math.round(((metric.used ?? 0) / metric.limit!) * 100), 100) : 0

const localeCode = computed(() => toNumberLocaleTag(locale.value))
const metricLimitLabel = (metric: UsageMetricValue, zeroLabel = t('billing.notIncluded')) => {
  if (metric.limit === null) return t('billing.noLimit')
  if (typeof metric.limit !== 'number') return zeroLabel
  if (metric.limit <= 0) return zeroLabel
  return metric.limit.toLocaleString(localeCode.value)
}

const metricRemainingLabel = (metric: UsageMetricValue, zeroLabel = t('billing.notIncluded')) => {
  if (metric.limit === null) return t('billing.noLimit')
  if (typeof metric.limit !== 'number') return zeroLabel
  if (metric.limit <= 0) return zeroLabel
  return (metric.remaining ?? 0).toLocaleString(localeCode.value)
}

const scanUsage = computed<BillingUsageMetric>(() => {
  if (remainingUsage.value?.scan_usage) return remainingUsage.value.scan_usage
  if (isStarterTenant.value && starterPlan.value && !remainingUsage.value) {
    return {
      ...fallbackUsageMetric(0, starterPlan.value.scan_limit),
      used: 0,
    }
  }
  return fallbackUsageMetric(subscription.value?.scans_used ?? 0, subscription.value?.scan_limit ?? 0)
})
const electronicInvoiceUsage = computed<BillingUsageMetric>(() =>
  remainingUsage.value?.electronic_invoice_usage ?? fallbackUsageMetric()
)

const quotaDisplayConfig = [
  BILLING_QUOTA_RESOURCE_CONFIG.admin_users,
  BILLING_QUOTA_RESOURCE_CONFIG.active_sessions_per_admin_user,
  BILLING_QUOTA_RESOURCE_CONFIG.active_kitchens,
  BILLING_QUOTA_RESOURCE_CONFIG.active_tables_including_bar,
  BILLING_QUOTA_RESOURCE_CONFIG.active_qr_tables,
  BILLING_QUOTA_RESOURCE_CONFIG.completed_online_orders_per_month,
  BILLING_QUOTA_RESOURCE_CONFIG.electronic_invoices_per_period,
  BILLING_QUOTA_RESOURCE_CONFIG.api_tokens,
]

const usageLabels = computed<Record<string, { resource: string; description: string; unit: string; notIncluded?: string }>>(() => ({
  admin_users: { resource: t('billing.quotaAdminUsers'), description: t('billing.quotaAdminUsersDescription'), unit: t('billing.unitAdminUsers') },
  active_sessions_per_admin_user: { resource: t('billing.quotaSessions'), description: t('billing.quotaSessionsDescription'), unit: t('billing.unitSessions') },
  active_kitchens: { resource: t('billing.quotaKitchens'), description: t('billing.quotaKitchensDescription'), unit: t('billing.unitKitchens') },
  active_tables_including_bar: { resource: t('billing.quotaTables'), description: t('billing.quotaTablesDescription'), unit: t('billing.unitTables') },
  active_qr_tables: { resource: t('billing.quotaQrTables'), description: t('billing.quotaQrTablesDescription'), unit: t('billing.unitQrTables') },
  completed_online_orders_per_month: { resource: t('billing.quotaOnlineOrders'), description: t('billing.quotaOnlineOrdersDescription'), unit: t('billing.unitOnlineOrders') },
  electronic_invoices_per_period: { resource: t('billing.quotaInvoices'), description: t('billing.quotaInvoicesDescription'), unit: t('billing.unitInvoices'), notIncluded: t('billing.notIncluded') },
  api_tokens: { resource: t('billing.quotaApiTokens', 'API keys'), description: t('billing.quotaApiTokensDescription', 'Claves de API activas para integraciones'), unit: t('billing.unitApiTokens', 'API keys') },
  menu_products: { resource: t('billing.quota.menu_products'), description: t('billing.starterUsageValidatedOnSave'), unit: t('billing.unitProducts') },
  menu_categories: { resource: t('billing.quota.menu_categories'), description: t('billing.starterUsageValidatedOnSave'), unit: t('billing.unitCategories') },
  tenant_ingredients: { resource: t('billing.quota.tenant_ingredients'), description: t('billing.starterUsageValidatedOnSave'), unit: t('billing.unitIngredients') },
  modifier_groups: { resource: t('billing.quota.modifier_groups'), description: t('billing.starterUsageValidatedOnSave'), unit: t('billing.unitModifierGroups') },
  recipe_bases: { resource: t('billing.quota.recipe_bases'), description: t('billing.starterUsageValidatedOnSave'), unit: t('billing.unitRecipeBases') },
  recipe_lines_per_product: { resource: t('billing.quota.recipe_lines_per_product'), description: t('billing.starterUsageValidatedOnSave'), unit: t('billing.unitRecipeLines') },
  modifier_options_per_group: { resource: t('billing.quota.modifier_options_per_group'), description: t('billing.starterUsageValidatedOnSave'), unit: t('billing.unitModifierOptions') },
}))

const quotaUsageRows = computed(() =>
  quotaDisplayConfig
    .map((config): UsageDisplayRow | null => {
      const metric = remainingUsage.value?.quota_usage?.[config.key]
      if (!metric) return null
      return {
        resourceKey: config.key,
        resource: usageLabels.value[config.key]?.resource ?? config.label,
        description: hasLimitedQuota(metric)
          ? usageLabels.value[config.key]?.description ?? config.description
          : metric.limit === null
            ? t('billing.noLimitOverride')
            : usageLabels.value[config.key]?.notIncluded ?? t('billing.notIncluded'),
        used: metric.used,
        limit: metric.limit,
        remaining: metric.remaining,
        percentage: usagePercentage(metric),
        unit: usageLabels.value[config.key]?.unit ?? config.unit,
        emptyMessage: hasLimitedQuota(metric)
          ? null
          : metric.limit === null
            ? t('billing.noLimit')
            : t('billing.zeroAvailable'),
        zeroLabel: usageLabels.value[config.key]?.notIncluded ?? config.zeroLabel,
      }
    })
    .filter((row): row is UsageDisplayRow => row !== null)
)

const starterFallbackRows = computed(() => {
  if (!isStarterTenant.value || !starterPlan.value || remainingUsage.value) return [] as UsageDisplayRow[]

  return STARTER_DISPLAY_QUOTA_KEYS
    .map((key: BillingQuotaKey): UsageDisplayRow | null => {
      const rawLimit = starterPlan.value?.quotas?.[key]
      if (rawLimit === null || rawLimit === undefined) return null
      const limit = Number(rawLimit)
      // Include limit === 0 (e.g. api_tokens on Starter) as display-only policy lock (#1909).
      if (!Number.isFinite(limit) || limit < 0) return null
      const config = BILLING_QUOTA_RESOURCE_CONFIG[key]
      return {
        resourceKey: key,
        resource: usageLabels.value[key]?.resource ?? config.label,
        description: t('billing.starterUsageValidatedOnSave'),
        used: null,
        limit,
        remaining: null,
        percentage: null,
        unit: usageLabels.value[key]?.unit ?? config.unit,
        emptyMessage: limit === 0 ? t('billing.zeroAvailable') : null,
        limitsOnly: true,
      }
    })
    .filter((row): row is UsageDisplayRow => row !== null)
})

const columns = computed<Column[]>(() => [
  { key: 'resource', title: t('billing.resource'), sortable: false },
  { key: 'used', title: t('billing.used'), sortable: false, align: 'right' },
  { key: 'limit', title: t('billing.available'), sortable: false, align: 'right' },
  { key: 'remaining', title: t('billing.remaining'), sortable: false, align: 'right' },
  { key: 'percentage', title: t('billing.usedPercentage'), sortable: false, align: 'right' },
])

const tableData = computed(() => {
  const quotaRows = quotaUsageRows.value
  const starterScanRow = isStarterTenant.value && !remainingUsage.value && starterPlan.value
    ? {
        resourceKey: 'scans',
        resource: t('billing.scans'),
        description: t('billing.starterUsageValidatedOnSave'),
        used: null,
        limit: starterPlan.value.scan_limit,
        remaining: null,
        percentage: null,
        unit: t('billing.scansUnit'),
        emptyMessage: null,
        limitsOnly: true,
      }
    : {
        resourceKey: 'scans',
        resource: t('billing.scans'),
        description: t('billing.currentPeriodQuota'),
        used: scanUsage.value.used,
        limit: scanUsage.value.limit,
        remaining: scanUsage.value.remaining,
        percentage: usagePercentage(scanUsage.value),
        unit: t('billing.scansUnit'),
        emptyMessage: null,
      }

  return [
    starterScanRow,
    {
      resourceKey: 'electronic_invoices_per_period',
      resource: t('billing.quotaInvoices'),
      description: hasLimitedQuota(electronicInvoiceUsage.value)
        ? t('billing.invoicesCurrentPeriod')
        : t('billing.noPaidQuota'),
      used: electronicInvoiceUsage.value.used,
      limit: electronicInvoiceUsage.value.limit,
      remaining: electronicInvoiceUsage.value.remaining,
      percentage: usagePercentage(electronicInvoiceUsage.value),
      unit: t('billing.invoiceUnit'),
      emptyMessage: hasLimitedQuota(electronicInvoiceUsage.value) ? null : t('billing.zeroAvailable'),
      zeroLabel: t('billing.noPaidQuota'),
    },
    ...quotaRows.filter((row) => row.resourceKey !== 'electronic_invoices_per_period'),
    ...starterFallbackRows.value,
  ]
})

const periodLabel = computed(() => {
  const start = remainingUsage.value?.period_start ?? subscription.value?.current_period_start
  const end = remainingUsage.value?.period_end ?? subscription.value?.current_period_end
  if (!start || !end) return t('billing.currentPeriod')

  const formatter = new Intl.DateTimeFormat(localeCode.value, { day: 'numeric', month: 'short', year: 'numeric' })
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
})
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isInitialLoading" class="flex items-center justify-center min-h-[300px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <template v-else>
      <div class="rounded-xl border border-border bg-surface px-4 py-3 md:px-6 md:py-4">
        <p class="text-xs font-semibold text-text-secondary uppercase tracking-widest">{{ t('billing.remainingUsage') }}</p>
        <p class="mt-1 text-base font-medium leading-6 text-text-primary">{{ periodLabel }}</p>
      </div>

      <div>
        <UiResponsiveDataView
          row-size="sm"
          :columns="columns"
          :data="tableData"
          :empty-message="t('billing.noQuotasAvailable')"
          :empty-sub-message="t('billing.noQuotasAvailableSub')"
          variant="default"
        >
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-data-table-row-hover-bg"
              :class="index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-text-primary leading-tight truncate">{{ item.resource }}</p>
              </div>
              <div class="grid grid-cols-4 gap-3 text-right flex-shrink-0">
                <div>
                  <p class="text-xs text-text-secondary">{{ t('billing.used') }}</p>
                  <p class="text-sm font-semibold text-text-primary tabular-nums">
                    {{ item.limitsOnly || item.used === null ? '—' : item.used.toLocaleString(localeCode) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">{{ t('billing.availableShort') }}</p>
                  <p class="text-sm text-text-secondary tabular-nums">{{ metricLimitLabel(item, item.zeroLabel) }}</p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">{{ t('billing.remainingShort') }}</p>
                  <p class="text-sm font-semibold text-text-primary tabular-nums">
                    {{ item.limitsOnly || item.remaining === null ? '—' : metricRemainingLabel(item, item.zeroLabel) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">%</p>
                  <p class="text-sm text-text-secondary tabular-nums">
                    {{ item.limitsOnly || item.percentage === null ? '—' : `${item.percentage}%` }}
                  </p>
                </div>
              </div>
            </div>
          </template>

          <template #cell-resource="{ item }">
            <div>
              <p class="text-sm font-semibold text-text-primary">{{ item.resource }}</p>
            </div>
          </template>

          <template #cell-used="{ item }">
            <span class="text-sm font-semibold text-text-primary tabular-nums">
              {{ item.limitsOnly || item.used === null ? '—' : item.used.toLocaleString(localeCode) }}
            </span>
          </template>

          <template #cell-limit="{ item }">
            <span class="text-sm text-text-secondary tabular-nums">
              {{ metricLimitLabel(item, item.zeroLabel) }}
            </span>
            <span v-if="item.emptyMessage" class="block text-xs text-text-secondary">{{ item.emptyMessage }}</span>
          </template>

          <template #cell-remaining="{ item }">
            <span class="text-sm font-semibold text-text-primary tabular-nums">
              {{ item.limitsOnly || item.remaining === null ? '—' : metricRemainingLabel(item, item.zeroLabel) }}
            </span>
          </template>

          <template #cell-percentage="{ item }">
            <span class="text-sm text-text-secondary tabular-nums">
              {{ item.limitsOnly || item.percentage === null ? '—' : `${item.percentage}%` }}
            </span>
          </template>
        </UiResponsiveDataView>
      </div>
    </template>
  </div>
</template>
