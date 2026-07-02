<script setup lang="ts">
import { useBilling, type BillingQuotaKey, type BillingUsageMetric } from '~/composables/useBilling'

interface Column {
  key: string
  title: string
  sortable?: boolean
  format?: string
  align?: 'left' | 'center' | 'right'
}

definePageMeta({})
useHead({ title: 'Uso restante — WaRo Admin' })

const { subscription, remainingUsage, isRefreshing, fetchBillingOverview } = useBilling()

const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const isInitialLoading = computed(() =>
  !!currentTenant.value &&
  (
    subscription.value === undefined ||
    (subscription.value !== null && remainingUsage.value === undefined)
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

const usagePercentage = (metric: BillingUsageMetric) =>
  metric.limit > 0 ? Math.min(Math.round((metric.used / metric.limit) * 100), 100) : 0

const scanUsage = computed<BillingUsageMetric>(() =>
  remainingUsage.value?.scan_usage ??
  fallbackUsageMetric(subscription.value?.scans_used ?? 0, subscription.value?.scan_limit ?? 0)
)
const electronicInvoiceUsage = computed<BillingUsageMetric>(() =>
  remainingUsage.value?.electronic_invoice_usage ?? fallbackUsageMetric()
)

interface QuotaDisplayConfig {
  key: BillingQuotaKey
  label: string
  description: string
  unit: string
  zeroLabel?: string
}

const quotaDisplayConfig: QuotaDisplayConfig[] = [
  { key: 'admin_users', label: 'Usuarios administrativos', description: 'Miembros internos activos del establecimiento', unit: 'usuarios administrativos' },
  { key: 'active_sessions_per_admin_user', label: 'Sesiones activas por usuario administrativo', description: 'Máximo de sesiones simultáneas por usuario interno', unit: 'sesiones' },
  { key: 'active_kitchens', label: 'Cocinas activas', description: 'Puntos de preparación activos', unit: 'cocinas' },
  { key: 'active_tables_including_bar', label: 'Mesas activas, incluida barra', description: 'Mesas operativas del establecimiento', unit: 'mesas' },
  { key: 'active_qr_tables', label: 'Mesas con QR activo', description: 'Mesas activas con venta por QR', unit: 'mesas QR' },
  { key: 'completed_online_orders_per_month', label: 'Pedidos en línea completados/mes', description: 'Pedidos públicos completados en el período actual', unit: 'pedidos' },
  { key: 'electronic_invoices_per_period', label: 'Facturación electrónica', description: 'Facturas incluidas en el período actual', unit: 'facturas', zeroLabel: 'No incluido' },
]

const quotaUsageRows = computed(() =>
  quotaDisplayConfig
    .map((config) => {
      const metric = remainingUsage.value?.quota_usage?.[config.key]
      if (!metric) return null
      return {
        resource: config.label,
        description: metric.limit > 0 ? config.description : config.zeroLabel ?? 'No incluido',
        used: metric.used,
        limit: metric.limit,
        remaining: metric.remaining,
        percentage: usagePercentage(metric),
        unit: config.unit,
        emptyMessage: metric.limit > 0 ? null : '0 disponibles',
      }
    })
    .filter((row): row is {
      resource: string
      description: string
      used: number
      limit: number
      remaining: number
      percentage: number
      unit: string
      emptyMessage: string | null
    } => row !== null)
)

const columns: Column[] = [
  { key: 'resource', title: 'Recurso', sortable: false },
  { key: 'used', title: 'Usado', sortable: false, align: 'right' },
  { key: 'limit', title: 'Disponible', sortable: false, align: 'right' },
  { key: 'remaining', title: 'Restante', sortable: false, align: 'right' },
]

const tableData = computed(() => {
  const quotaRows = quotaUsageRows.value
  return [
    {
      resource: 'Escaneos',
      description: 'Cupo del período actual',
      used: scanUsage.value.used,
      limit: scanUsage.value.limit,
      remaining: scanUsage.value.remaining,
      percentage: usagePercentage(scanUsage.value),
      unit: 'escaneos',
      emptyMessage: null,
    },
    {
      resource: 'Facturación electrónica',
      description: electronicInvoiceUsage.value.limit > 0
        ? 'Facturas incluidas en el período actual'
        : 'Sin cupo pagado - 0 restantes',
      used: electronicInvoiceUsage.value.used,
      limit: electronicInvoiceUsage.value.limit,
      remaining: electronicInvoiceUsage.value.remaining,
      percentage: usagePercentage(electronicInvoiceUsage.value),
      unit: 'facturas',
      emptyMessage: electronicInvoiceUsage.value.limit > 0 ? null : '0 disponibles',
    },
    ...quotaRows.filter((row) => row.resource !== 'Facturación electrónica'),
  ]
})

const periodLabel = computed(() => {
  const start = remainingUsage.value?.period_start ?? subscription.value?.current_period_start
  const end = remainingUsage.value?.period_end ?? subscription.value?.current_period_end
  if (!start || !end) return 'Período actual'

  const formatter = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${formatter.format(new Date(start))} - ${formatter.format(new Date(end))}`
})
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isInitialLoading" class="flex items-center justify-center min-h-[300px]">
      <div class="flex items-center gap-3 text-sm text-text-secondary">
        <UiLoadingMatrix size="5.5px" color="currentColor" />
        Cargando uso
      </div>
    </div>

    <template v-else>
      <div class="border border-border bg-surface">
        <div class="px-4 py-3 md:px-6 md:py-4 border-b border-border">
          <p class="text-xs font-medium text-text-secondary uppercase tracking-widest">Uso restante</p>
          <p class="mt-1 text-sm text-text-secondary">{{ periodLabel }}</p>
        </div>

        <UiResponsiveDataView
          row-size="sm"
          :columns="columns"
          :data="tableData"
          empty-message="No hay cupos disponibles"
          empty-sub-message="Los cupos aparecerán cuando tengas una suscripción activa"
          variant="default"
        >
          <template #card="{ item, index }">
            <div
              class="flex items-start gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
              :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            >
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-text-primary leading-tight">{{ item.resource }}</p>
                <p class="text-xs text-text-secondary mt-0.5">{{ item.description }}</p>
                <p class="text-xs text-text-secondary mt-2">
                  {{ item.used.toLocaleString('es-CO') }} de {{ item.limit.toLocaleString('es-CO') }} {{ item.unit }} usados
                </p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-sm font-bold text-text-primary">{{ item.remaining.toLocaleString('es-CO') }}</p>
                <p class="text-xs text-text-secondary">restantes</p>
              </div>
            </div>
          </template>

          <template #cell-resource="{ item }">
            <div>
              <p class="text-sm font-semibold text-text-primary">{{ item.resource }}</p>
              <p class="text-xs text-text-secondary mt-0.5">{{ item.description }}</p>
            </div>
          </template>

          <template #cell-used="{ item }">
            <span class="text-sm font-semibold text-text-primary">
              {{ item.used.toLocaleString('es-CO') }}
            </span>
            <span class="text-xs text-text-secondary"> {{ item.unit }}</span>
          </template>

          <template #cell-limit="{ item }">
            <span class="text-sm text-text-secondary">
              {{ item.limit.toLocaleString('es-CO') }}
            </span>
            <span v-if="item.emptyMessage" class="block text-xs text-text-secondary">{{ item.emptyMessage }}</span>
          </template>

          <template #cell-remaining="{ item }">
            <span class="text-sm font-semibold text-text-primary">
              {{ item.remaining.toLocaleString('es-CO') }}
            </span>
            <span class="block text-xs text-text-secondary">{{ item.percentage }}% usado</span>
          </template>
        </UiResponsiveDataView>
      </div>
    </template>
  </div>
</template>
