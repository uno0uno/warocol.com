<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { es } from 'date-fns/locale';
import { formatDistanceToNow } from 'date-fns';
import MetricCard from '~/components/shared/MetricCard.vue';
import SalesChart from '~/components/analytics/SalesChart.vue';

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive();

const lastUpdate = ref<Date>(new Date());
const currentTime = ref<Date>(new Date());

const paymentMethodFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const { dateRangeDates, presetDates, maxDate, formatDateRange, dateRange } = useDateRangePresets()
const { timezone, todayISO, addDaysISO, monthBounds } = useTenantTimezone()

const hasDateFilter = computed(() =>
  dateRangeDates.value && dateRangeDates.value.length === 2 && dateRangeDates.value[0] && dateRangeDates.value[1]
)

// Payment groups for filter dropdown
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'admin-groups', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: { id: string; slug: string; name: string; sortOrder: number; isActive: boolean }[] }>('/api/finanzas/metodos-pago/grupos'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() =>
  (paymentGroupsData.value?.data ?? []).filter(g => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder)
)

// Single dashboard call — no date filter needed.
const { data: dashboardData, status: dashboardStatus, asyncStatus: dashboardAsyncStatus, error: metricsError, refetch: refetchDashboard } = useQuery({
  key: () => ['analytics', 'ventas-dashboard', currentTenant.value?.id, {
    payment_method: paymentMethodFilter.value || null,
    status: statusFilter.value || null,
  }],
  query: () => $fetch('/api/orders/dashboard', {
    params: {
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

// Filtered metrics — only when a date range is selected.
const { data: filteredMetricsData, status: filteredMetricsStatus, asyncStatus: filteredMetricsAsyncStatus, error: filteredMetricsError, refetch: refetchFilteredMetrics } = useQuery({
  key: () => ['analytics', 'ventas-filtered-metrics', currentTenant.value?.id, {
    from: dateRange.value.from,
    to: dateRange.value.to,
    payment_method: paymentMethodFilter.value || null,
    status: statusFilter.value || null,
  }],
  query: () => $fetch('/api/orders/metrics', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined
    }
  }),
  enabled: () => !!currentTenant.value && !!hasDateFilter.value,
  staleTime: 30_000,
})

// warocol.com#641 — tip aggregates for the "Propinas del periodo" MetricCard.
// Reuses the same cache key as /operaciones/* and /ventas/propinas — Pinia
// Colada dedupes the network call.
const { data: ctxData } = useQuery({
  key: () => ['operaciones', 'restaurant-context', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any }>('/api/operaciones/restaurant-context'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const tipEnabled = computed<boolean>(() => ctxData.value?.data?.tip_enabled === true)

const { data: tipsAggData } = useQuery({
  key: () => ['analytics', 'tips-metrics', currentTenant.value?.id, dateRange.value.from, dateRange.value.to],
  query: () => $fetch<any>('/api/orders/tips', {
    params: {
      limit: 1,
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
    },
  }),
  enabled: () => !!currentTenant.value && tipEnabled.value,
  staleTime: 30_000,
})
const tipSum = computed<number>(() => tipsAggData.value?.aggregates?.sum_tip ?? 0)
const tipAvgPct = computed<number>(() => tipsAggData.value?.aggregates?.avg_pct ?? 0)

const { data: salesFlowData, status: salesFlowStatus, asyncStatus: salesFlowAsyncStatus, refetch: refetchSalesFlow } = useQuery({
  key: () => ['analytics', 'ventas-sales-flow', currentTenant.value?.id, {
    from: dateRange.value.from,
    to: dateRange.value.to,
    payment_method: paymentMethodFilter.value || null,
    status: statusFilter.value || null,
  }],
  query: () => $fetch('/api/orders/sales-flow', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const salesFlowLoading = computed(() => salesFlowStatus.value === 'pending')

const isRefreshing = computed(() =>
  (dashboardAsyncStatus.value === 'loading' && dashboardData.value != null) ||
  (filteredMetricsAsyncStatus.value === 'loading' && filteredMetricsData.value != null) ||
  (salesFlowAsyncStatus.value === 'loading' && salesFlowData.value != null)
)

const formatIsoDisplay = (iso: string, options: Intl.DateTimeFormatOptions = {}) => {
  const [year, month, day] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    ...options,
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const isoDayNumber = (iso: string) => {
  const [year, month, day] = iso.split('-').map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

const inclusiveDays = (fromIso: string, toIso: string) => isoDayNumber(toIso) - isoDayNumber(fromIso) + 1

const daysInTenantYear = (iso: string) => {
  const year = Number(iso.slice(0, 4))
  return inclusiveDays(`${year}-01-01`, `${year}-12-31`)
}

const daysElapsedInTenantYear = (iso: string) => inclusiveDays(`${iso.slice(0, 4)}-01-01`, iso)

const daysElapsedInTenantMonth = (iso: string) => {
  const bounds = monthBounds(iso)
  return inclusiveDays(bounds.first, iso)
}

const daysInTenantMonth = (iso: string) => {
  const bounds = monthBounds(iso)
  return inclusiveDays(bounds.first, bounds.last)
}

const forecast = computed(() => {
  const today = todayISO()
  if (!hasDateFilter.value) {
    const yearSales = dashboardData.value?.data?.year?.total_sales
    if (!yearSales) return 0
    return Math.round((yearSales / daysElapsedInTenantYear(today)) * daysInTenantYear(today))
  } else {
    const monthSales = dashboardData.value?.data?.month?.total_sales
    if (!monthSales) return 0
    return Math.round((monthSales / daysElapsedInTenantMonth(today)) * daysInTenantMonth(today))
  }
})

const forecastLabel = computed(() =>
  hasDateFilter.value
    ? `Forecast ${formatIsoDisplay(todayISO(), { month: 'long' })}`
    : `Forecast ${todayISO().slice(0, 4)}`
)
const forecastSubtitle = computed(() =>
  hasDateFilter.value ? 'Proyección fin de mes' : 'Proyección fin de año'
)

const chartTitle = computed(() => {
  const metadata = salesFlowData.value?.metadata
  const currentYear = todayISO().slice(0, 4)
  if (!dateRange.value.from || !dateRange.value.to) return `Flujo de Ventas (${currentYear})`
  const { from, to } = dateRange.value
  if (from && to) {
    if (from === to) return `Flujo de Ventas (${formatIsoDisplay(from)})`
    const groupingLabel = metadata?.grouping === 'hour' ? 'por Hora' : 'por Día'
    return `Flujo de Ventas ${groupingLabel} vs ${metadata?.comparison_label}`
  }
  return 'Flujo de Ventas'
})

const chartLabels = computed(() => {
  const currentYear = Number(todayISO().slice(0, 4))
  if (!dateRange.value.from || !dateRange.value.to) return { current: `${currentYear}`, comparison: `${currentYear - 1}` }
  const { from, to } = dateRange.value
  if (!from || !to) return { current: `${currentYear}`, comparison: `${currentYear - 1}` }
  if (from === to) return {
    current: formatIsoDisplay(from, { day: '2-digit', month: '2-digit' }),
    comparison: formatIsoDisplay(addDaysISO(from, -1), { day: '2-digit', month: '2-digit' })
  }
  const days_diff = inclusiveDays(from, to)
  return days_diff <= 30
    ? { current: 'Período Actual', comparison: 'Período Anterior' }
    : { current: 'Este Año', comparison: 'Año Anterior' }
})

const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

const handleRefresh = async () => {
  if (hasDateFilter.value) {
    await Promise.all([refetchFilteredMetrics(), refetchSalesFlow()])
  } else {
    await Promise.all([refetchDashboard(), refetchSalesFlow()])
  }
  lastUpdate.value = new Date()
}

watch(lastUpdate, () => {
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})

// Reactive key handles tenant/filter changes — only update lastUpdate on date change
watch(dateRangeDates, (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) {
    lastUpdate.value = new Date()
  }
})

let clockInterval: NodeJS.Timeout | null = null
onMounted(() => {
  clockInterval = setInterval(() => { currentTime.value = new Date() }, 60000)
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  if (clearRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})

const clearFilters = () => {
  paymentMethodFilter.value = null
  statusFilter.value = null
  dateRangeDates.value = null
  lastUpdate.value = new Date()
}

const metrics = computed(() => {
  if (hasDateFilter.value) {
    const data = filteredMetricsData.value?.data || {}
    return {
      total_sales: data.total_sales ?? 0,
      avg_ticket: data.avg_ticket ?? 0,
      completed_orders: data.completed_orders ?? 0,
      discount_count: data.discount_count ?? 0,
      total_discount_amount: data.total_discount_amount ?? 0,
      total_standard_tax: data.total_standard_tax ?? 0,
      total_liquor_tax: data.total_liquor_tax ?? 0,
      standard_tax_label: data.standard_tax_label ?? 'Impuesto',
    }
  }
  const main = dashboardData.value?.data?.main || {}
  return {
    total_sales: main.total_sales ?? 0,
    avg_ticket: main.avg_ticket ?? 0,
    completed_orders: main.completed_orders ?? 0,
    discount_count: main.discount_count ?? 0,
    total_discount_amount: main.total_discount_amount ?? 0,
    total_standard_tax: main.total_standard_tax ?? 0,
    total_liquor_tax: main.total_liquor_tax ?? 0,
    standard_tax_label: dashboardData.value?.data?.standard_tax_label ?? 'Impuesto',
  }
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <!-- Loading State -->
    <div v-if="!dashboardData && !hasDateFilter || (hasDateFilter && !filteredMetricsData)" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="metricsError || filteredMetricsError" />

    <!-- Main Content -->
    <div v-else class="space-y-8 pb-20">
      <!-- Filters Bar -->
      <ClientOnly>
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="es"
          placeholder="Rango de fechas"
          auto-apply
          :teleport="true"
          :timezone="timezone"
          :max-date="maxDate"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />
        <select v-model="paymentMethodFilter" aria-label="Filtrar por método de pago" class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[130px] flex-shrink-0">
          <option :value="null">Método pago</option>
          <option v-for="group in paymentGroups" :key="group.slug" :value="group.slug">{{ group.name }}</option>
        </select>
        <select v-model="statusFilter" aria-label="Filtrar por estado" class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[120px] flex-shrink-0">
          <option :value="null">Estado</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="pending">Pendientes</option>
        </select>
        <button v-if="dateRangeDates || paymentMethodFilter || statusFilter" @click="clearFilters" class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0" title="Limpiar filtros" aria-label="Limpiar filtros">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      </ClientOnly>
      <section>
        <div :class="['grid grid-cols-2 gap-3 md:gap-4 mb-6', tipEnabled ? 'md:grid-cols-5' : 'md:grid-cols-4']">
          <MetricCard title="Ventas Brutas" :value="metrics.total_sales" format="currency" variant="primary" />
          <MetricCard title="Ticket Promedio" :value="metrics.avg_ticket" format="currency" variant="primary" />
          <!-- warocol.com#641 — Tips card with deep-link to /ventas/propinas -->
          <NuxtLink
            v-if="tipEnabled"
            :to="{
              path: '/ventas/propinas',
              query: dateRange.from && dateRange.to ? { date_from: dateRange.from, date_to: dateRange.to } : {},
            }"
            class="contents"
            aria-label="Ver historial de propinas"
          >
            <MetricCard
              title="Propinas del periodo"
              :value="tipSum"
              format="currency"
              variant="primary"
              :subtitle="`Promedio: ${tipAvgPct.toFixed(2)}%`"
            />
          </NuxtLink>
          <MetricCard :title="metrics.standard_tax_label || 'INC 8%'" :value="metrics.total_standard_tax" format="currency" variant="primary" />
          <MetricCard :title="forecastLabel" :value="forecast" format="currency" variant="primary" :subtitle="forecastSubtitle" class="col-span-2 md:col-span-1" />
        </div>

        <!-- Rentabilidad Teaser Banner -->
        <NuxtLink
          to="/analitica/rentabilidad"
          class="flex items-center justify-between gap-4 bg-primary text-primary-foreground rounded-xl px-5 py-3 mb-6"
        >
          <p class="text-sm font-semibold leading-tight">Tu plato más vendido puede ser tu peor negocio</p>
          <span class="flex-shrink-0 bg-primary-foreground text-primary px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
            Ver Rentabilidad →
          </span>
        </NuxtLink>

        <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h4 class="text-slate-600 font-medium mb-4">{{ chartTitle }}</h4>
          <ClientOnly>
            <SalesChart
              :salesData="salesFlowData?.data || []"
              :loading="salesFlowLoading"
              :currentLabel="chartLabels.current"
              :comparisonLabel="chartLabels.comparison"
            />
          </ClientOnly>
        </div>
      </section>

    </div>
  </div>
</template>

<style>
.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 220px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder { color: hsl(var(--muted-foreground)) !important; }
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}
</style>
