<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })

definePageMeta({
  layout: 'dashboard',
  module: 'ventas',
})

useHead({ title: () => t('ventas.head.dashboard') })

const { currentTenant } = useTenantReactive()
const { formatCurrency } = useFormatters()
const { todayISO, monthBounds } = useTenantTimezone()
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

const monthRange = computed(() => {
  const bounds = monthBounds(todayISO())
  return { from: bounds.first, to: bounds.last }
})

const { data: dashboardData, asyncStatus: dashboardAsyncStatus, error: dashboardError, refetch: refetchDashboard } = useQuery({
  key: () => ['ventas', 'dashboard', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: {
    month?: { total_sales?: number; completed_orders?: number; avg_ticket?: number }
    main?: { total_sales?: number; completed_orders?: number; avg_ticket?: number }
  } }>('/api/orders/dashboard'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const { data: topProductsData, asyncStatus: topProductsAsyncStatus, error: topProductsError, refetch: refetchTopProducts } = useQuery({
  key: () => ['ventas', 'dashboard-top-products', currentTenant.value?.id, monthRange.value],
  query: () => $fetch<{ success: boolean; data: Array<{
    product_id: string
    product_name: string
    quantity_sold: number
    total_revenue: number
  }> }>('/api/orders/products-sold', {
    params: {
      date_from: monthRange.value.from,
      date_to: monthRange.value.to,
      sort: 'qty_desc',
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const monthMetrics = computed(() => {
  const month = dashboardData.value?.data?.month ?? {}
  const sales = Number(month.total_sales ?? 0)
  const orders = Number(month.completed_orders ?? 0)
  return {
    total_sales: sales,
    completed_orders: orders,
    avg_ticket: orders > 0 ? sales / orders : 0,
  }
})
const topProducts = computed(() => (topProductsData.value?.data ?? []).slice(0, 5))

const isInitialLoading = computed(() =>
  !!currentTenant.value
  && (
    (dashboardAsyncStatus.value === 'loading' && !dashboardData.value)
    || (topProductsAsyncStatus.value === 'loading' && !topProductsData.value)
  ),
)

const isRefreshing = computed(() =>
  dashboardAsyncStatus.value === 'loading' || topProductsAsyncStatus.value === 'loading',
)

const refreshAll = async () => {
  await Promise.all([refetchDashboard(), refetchTopProducts()])
}

onMounted(() => setRefreshHandler(refreshAll))
registerProgressiveLoading(isRefreshing)
onUnmounted(() => clearRefreshHandler(refreshAll))
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <div v-if="isInitialLoading" class="flex items-center justify-center min-h-[320px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="dashboardError || topProductsError" />

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <MetricCard
          :title="t('ventas.dashboard.monthSales')"
          :value="monthMetrics.total_sales ?? 0"
          format="currency"
          variant="primary"
        />
        <MetricCard
          :title="t('ventas.dashboard.monthOrders')"
          :value="monthMetrics.completed_orders ?? 0"
          format="number"
          variant="primary"
        />
        <MetricCard
          :title="t('ventas.dashboard.avgTicket')"
          :value="monthMetrics.avg_ticket ?? 0"
          format="currency"
          variant="primary"
        />
      </div>

      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-b border-border bg-surface-secondary">
          <div>
            <h2 class="text-base font-semibold text-text-primary">
              {{ t('ventas.dashboard.topProducts') }}
            </h2>
            <p class="text-xs text-text-secondary mt-0.5">
              {{ t('ventas.dashboard.topProductsHint') }}
            </p>
          </div>
          <NuxtLink
            to="/ventas/productos"
            class="text-sm font-medium text-primary hover:text-primary/80"
          >
            {{ t('ventas.dashboard.viewAllProducts') }}
          </NuxtLink>
        </div>

        <div v-if="topProducts.length === 0" class="px-6 py-10 text-center">
          <p class="text-sm text-text-secondary">{{ t('ventas.dashboard.noSalesYet') }}</p>
        </div>

        <ul v-else class="divide-y divide-border">
          <li
            v-for="(product, index) in topProducts"
            :key="product.product_id"
            class="flex items-center justify-between gap-4 px-4 md:px-6 py-3"
          >
            <div class="min-w-0 flex items-center gap-3">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-secondary text-xs font-bold text-text-secondary">
                {{ index + 1 }}
              </span>
              <div class="min-w-0">
                <p class="text-sm font-medium text-text-primary truncate">
                  {{ product.product_name }}
                </p>
                <p class="text-xs text-text-secondary">
                  {{ t('ventas.dashboard.unitsSold', { count: product.quantity_sold }) }}
                </p>
              </div>
            </div>
            <p class="text-sm font-semibold text-text-primary tabular-nums">
              {{ formatCurrency(product.total_revenue) }}
            </p>
          </li>
        </ul>
      </div>

      <div class="flex flex-wrap gap-2">
        <NuxtLink
          to="/ventas/ordenes"
          class="inline-flex min-h-[40px] items-center rounded-lg border border-border px-4 text-sm font-medium text-text-primary hover:bg-surface-secondary"
        >
          {{ t('ventas.nav.ordenes') }}
        </NuxtLink>
        <NuxtLink
          to="/ventas/productos"
          class="inline-flex min-h-[40px] items-center rounded-lg border border-border px-4 text-sm font-medium text-text-primary hover:bg-surface-secondary"
        >
          {{ t('ventas.nav.productos') }}
        </NuxtLink>
      </div>
    </template>
  </div>
</template>
