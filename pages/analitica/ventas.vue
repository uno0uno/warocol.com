<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { es } from 'date-fns/locale';
import { format as fnsFormat, startOfMonth, startOfYear, differenceInCalendarDays, getDaysInMonth, getDaysInYear, formatDistanceToNow } from 'date-fns';
import MetricCard from '~/components/shared/MetricCard.vue';
import SalesChart from '~/components/analytics/SalesChart.vue';

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText } = useLayoutActions()
const { onTenantChange } = useTenantReactive();

const lastUpdate = ref<Date>(new Date());
const currentTime = ref<Date>(new Date());

const paymentMethodFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const dateRangeDates = ref<Date[] | null>(null);

const presetDates = ref([
  { label: 'Hoy', value: [new Date(), new Date()] },
  { label: 'Ayer', value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Últimos 15 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()] },
  { label: 'Último mes', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
]);

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
};

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return { from: fnsFormat(from, 'yyyy-MM-dd'), to: fnsFormat(to, 'yyyy-MM-dd') }
});

// Single dashboard call replaces 3 separate /orders/metrics calls on initial load.
// When no date filter is active, this is the only metrics endpoint needed.
const { data: dashboardData, pending: metricsLoading, error: metricsError, refresh: refreshDashboard } = useAsyncData(
  'ventas-dashboard',
  () => $fetch('/api/orders/dashboard', {
    params: {
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined
    }
  }),
  { server: false, lazy: true, default: () => ({ data: null }), watch: [paymentMethodFilter, statusFilter] }
)

// Separate filtered metrics call — only used when the user picks an explicit date range.
// Returns just the main metrics for the selected period (month/year cards stay from dashboardData).
const { data: filteredMetricsData, pending: filteredMetricsPending, error: filteredMetricsError, refresh: refreshFilteredMetrics } = useAsyncData(
  'ventas-filtered-metrics',
  () => $fetch('/api/orders/metrics', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined
    }
  }),
  { server: false, lazy: true, immediate: false, default: () => ({ data: null }) }
)

const { data: salesFlowData, pending: salesFlowLoading, refresh: refreshSalesFlow } = useAsyncData(
  'ventas-sales-flow',
  () => $fetch('/api/orders/sales-flow', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined
    }
  }),
  { server: false, lazy: true, default: () => ({ data: [], metadata: {} }), watch: [paymentMethodFilter, statusFilter] }
)

const hasDateFilter = computed(() =>
  dateRangeDates.value && dateRangeDates.value.length === 2 && dateRangeDates.value[0] && dateRangeDates.value[1]
)

const forecast = computed(() => {
  const today = new Date()
  if (!hasDateFilter.value) {
    const yearSales = dashboardData.value?.data?.year?.total_sales
    if (!yearSales) return 0
    const daysElapsed = differenceInCalendarDays(today, startOfYear(today)) + 1
    return Math.round((yearSales / daysElapsed) * getDaysInYear(today))
  } else {
    const monthSales = dashboardData.value?.data?.month?.total_sales
    if (!monthSales) return 0
    const daysElapsed = differenceInCalendarDays(today, startOfMonth(today)) + 1
    return Math.round((monthSales / daysElapsed) * getDaysInMonth(today))
  }
})

const forecastLabel = computed(() =>
  hasDateFilter.value ? `Forecast ${fnsFormat(new Date(), 'MMMM', { locale: es })}` : `Forecast ${fnsFormat(new Date(), 'yyyy')}`
)
const forecastSubtitle = computed(() =>
  hasDateFilter.value ? 'Proyección fin de mes' : 'Proyección fin de año'
)

const chartTitle = computed(() => {
  const metadata = salesFlowData.value?.metadata
  if (!dateRangeDates.value) return `Flujo de Ventas (${new Date().getFullYear()})`
  const [from, to] = dateRangeDates.value
  if (from && to) {
    if (from.toDateString() === to.toDateString()) return `Flujo de Ventas (${fnsFormat(from, 'dd/MM/yyyy')})`
    const groupingLabel = metadata?.grouping === 'hour' ? 'por Hora' : 'por Día'
    return `Flujo de Ventas ${groupingLabel} vs ${metadata?.comparison_label}`
  }
  return 'Flujo de Ventas'
})

const chartLabels = computed(() => {
  const currentYear = new Date().getFullYear()
  if (!dateRangeDates.value) return { current: `${currentYear}`, comparison: `${currentYear - 1}` }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { current: `${currentYear}`, comparison: `${currentYear - 1}` }
  if (from.toDateString() === to.toDateString()) return {
    current: fnsFormat(from, 'dd/MM'),
    comparison: fnsFormat(new Date(from.getTime() - 86400000), 'dd/MM')
  }
  const days_diff = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1
  return days_diff <= 30
    ? { current: 'Período Actual', comparison: 'Período Anterior' }
    : { current: 'Este Año', comparison: 'Año Anterior' }
})

const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

const handleRefresh = async () => {
  if (hasDateFilter.value) {
    await Promise.all([refreshFilteredMetrics(), refreshSalesFlow()])
  } else {
    await Promise.all([refreshDashboard(), refreshSalesFlow()])
  }
  lastUpdate.value = new Date()
}

watch(lastUpdate, () => {
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})

onTenantChange(handleRefresh)

let clockInterval: NodeJS.Timeout | null = null
onMounted(() => {
  clockInterval = setInterval(() => { currentTime.value = new Date() }, 60000)
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})
onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  if (setRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})

watch(dateRangeDates, async (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) {
    if (val) {
      await Promise.all([refreshFilteredMetrics(), refreshSalesFlow()])
    } else {
      await Promise.all([refreshDashboard(), refreshSalesFlow()])
    }
    lastUpdate.value = new Date()
  }
})

const clearFilters = async () => {
  paymentMethodFilter.value = null
  statusFilter.value = null
  dateRangeDates.value = null
  filteredMetricsData.value = { data: null }
  await Promise.all([refreshDashboard(), refreshSalesFlow()])
  lastUpdate.value = new Date()
}

const metrics = computed(() => {
  if (hasDateFilter.value) {
    const data = filteredMetricsData.value?.data || {}
    return {
      total_sales: data.total_sales ?? 0,
      avg_ticket: data.avg_ticket ?? 0,
      completed_orders: data.completed_orders ?? 0,
      commission_savings: dashboardData.value?.data?.commission_savings ?? 0,
    }
  }
  const main = dashboardData.value?.data?.main || {}
  return {
    total_sales: main.total_sales ?? 0,
    avg_ticket: main.avg_ticket ?? 0,
    completed_orders: main.completed_orders ?? 0,
    commission_savings: dashboardData.value?.data?.commission_savings ?? 0,
  }
})

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)

</script>

<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="metricsLoading || (hasDateFilter && filteredMetricsPending)" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="metricsError || filteredMetricsError" class="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div class="text-red-600 text-lg font-semibold">Error al cargar métricas</div>
      <div class="text-slate-600">{{ (metricsError || filteredMetricsError)?.message || 'No se pudo conectar con el servidor' }}</div>
      <button @click="handleRefresh()" class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">
        Reintentar
      </button>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-8 pb-20">
      <!-- Filters Bar -->
      <ClientOnly>
      <div class="flex items-center gap-2 w-full overflow-x-auto pb-2">
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="es"
          placeholder="Rango de fechas"
          auto-apply
          :teleport="true"
          :max-date="new Date()"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />
        <select v-model="paymentMethodFilter" aria-label="Filtrar por método de pago" class="h-10 pl-3 pr-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[130px]">
          <option :value="null">Método pago</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="digital">Digital</option>
        </select>
        <select v-model="statusFilter" aria-label="Filtrar por estado" class="h-10 pl-3 pr-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[120px]">
          <option :value="null">Estado</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="pending">Pendientes</option>
        </select>
        <button v-if="dateRangeDates || paymentMethodFilter || statusFilter" @click="clearFilters" class="h-10 px-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-500 hover:text-slate-700 hover:border-indigo-500 transition-colors" title="Limpiar filtros" aria-label="Limpiar filtros">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      </ClientOnly>
      <section>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          <MetricCard title="Ventas Brutas" :value="metrics.total_sales" format="currency" variant="primary" />
          <MetricCard title="Pedidos Online" :value="metrics.completed_orders" format="number" variant="primary" />
          <MetricCard title="Ticket Promedio" :value="metrics.avg_ticket" format="currency" variant="primary" />
          <MetricCard title="Ahorro Comisiones" :value="metrics.commission_savings" format="currency" variant="primary" subtitle="Pedidos directos vs App" />
          <MetricCard :title="forecastLabel" :value="forecast" format="currency" variant="primary" :subtitle="forecastSubtitle" />
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
