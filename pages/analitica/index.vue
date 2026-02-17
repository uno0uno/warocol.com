<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, inject } from 'vue';
import { Sparkles, Plus } from 'lucide-vue-next';
import { es } from 'date-fns/locale';
import { format as fnsFormat, startOfMonth, startOfYear, differenceInCalendarDays, getDaysInMonth, getDaysInYear, formatDistanceToNow } from 'date-fns';
// DashboardSidebar import removed as it's provided by layout
import MetricCard from '~/components/shared/MetricCard.vue';
import SalesChart from '~/components/analytics/SalesChart.vue';
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue';
import AlertsSection from '~/components/analytics/AlertsSection.vue';
import InvoiceModal from '~/components/analytics/InvoiceModal.vue';

const isInventoryUnlocked = ref(false);
const showInvoiceModal = ref(false);

// Inject refresh handler setter from layout
const setRefreshHandler = inject<((handler: (() => void | Promise<void>) | undefined) => void) | undefined>('setRefreshHandler');

// Last update timestamp
const lastUpdate = ref<Date>(new Date());
const currentTime = ref<Date>(new Date());

// Filter states
const paymentMethodFilter = ref<string | null>(null);
const statusFilter = ref<string | null>(null);
const dateRangeDates = ref<Date[] | null>(null);

// Preset ranges for the date picker shortcuts
const presetDates = ref([
  { label: 'Hoy', value: [new Date(), new Date()] },
  {
    label: 'Ayer',
    value: (() => {
      const d = new Date(); d.setDate(d.getDate() - 1); return [d, d]
    })()
  },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Últimos 15 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()] },
  { label: 'Último mes', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
]);

// Format function for the date picker display
const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  const to = fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })
  return `${from} - ${to}`
};

// Computed date range for API params (YYYY-MM-DD format)
const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return {
    from: fnsFormat(from, 'yyyy-MM-dd'),
    to: fnsFormat(to, 'yyyy-MM-dd')
  }
});

// Backend connection for metrics
const { data: metricsData, pending: metricsLoading, error: metricsError, refresh: refreshMetrics } = useAsyncData(
  'analytics-metrics',
  () => $fetch('/api/orders/metrics', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined
    }
  }),
  {
    server: false,
    lazy: true,
    default: () => ({ data: null })
  }
)

// Backend connection for sales flow (hourly data)
const { data: salesFlowData, pending: salesFlowLoading, refresh: refreshSalesFlow } = useAsyncData(
  'analytics-sales-flow',
  () => $fetch('/api/orders/sales-flow', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined
    }
  }),
  {
    server: false,
    lazy: true,
    default: () => ({ data: [], metadata: {} })
  }
)

// Load current month metrics for forecast (independent of date filter)
const currentMonthFrom = fnsFormat(startOfMonth(new Date()), 'yyyy-MM-dd')
const currentMonthToday = fnsFormat(new Date(), 'yyyy-MM-dd')

const { data: monthMetricsData, refresh: refreshMonthMetrics } = useAsyncData(
  'analytics-month-metrics',
  () => $fetch('/api/orders/metrics', {
    params: { date_from: currentMonthFrom, date_to: currentMonthToday }
  }),
  { server: false, lazy: true }
)

// Load current year metrics for annual forecast
const currentYearFrom = fnsFormat(startOfYear(new Date()), 'yyyy-MM-dd')

const { data: yearMetricsData, refresh: refreshYearMetrics } = useAsyncData(
  'analytics-year-metrics',
  () => $fetch('/api/orders/metrics', {
    params: { date_from: currentYearFrom, date_to: currentMonthToday }
  }),
  { server: false, lazy: true }
)

// Load food cost data for HealthSemaphore
const { data: foodCostData, refresh: refreshFoodCost } = useAsyncData(
  'analytics-food-cost',
  () => $fetch('/api/analytics/food-cost', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined
    }
  }),
  {
    server: false,
    lazy: true,
    default: () => ({ data: null })
  }
)

// Load menu analysis data for MenuMatrix
const { data: menuAnalysisData, refresh: refreshMenuAnalysis } = useAsyncData(
  'analytics-menu-analysis',
  () => $fetch('/api/analytics/menu-analysis', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      limit: 10
    }
  }),
  {
    server: false,
    lazy: true,
    default: () => ({ data: null })
  }
)

// Load alerts for AlertsSection
const { data: alertsData, refresh: refreshAlerts } = useAsyncData(
  'analytics-alerts',
  () => $fetch('/api/analytics/alerts', {
    params: {
      limit: 10
    }
  }),
  {
    server: false,
    lazy: true,
    default: () => ({ data: null })
  }
)

// Determine if dates are selected
const hasDateFilter = computed(() => {
  return dateRangeDates.value && dateRangeDates.value.length === 2 && dateRangeDates.value[0] && dateRangeDates.value[1]
})

// Forecast: annual when no dates selected, monthly when dates selected
const forecast = computed(() => {
  const today = new Date()

  if (!hasDateFilter.value) {
    // Annual forecast
    const yearData = yearMetricsData.value?.data
    if (!yearData || !yearData.total_sales) return 0
    const daysElapsed = differenceInCalendarDays(today, startOfYear(today)) + 1
    const totalDays = getDaysInYear(today)
    return Math.round((yearData.total_sales / daysElapsed) * totalDays)
  } else {
    // Monthly forecast
    const monthData = monthMetricsData.value?.data
    if (!monthData || !monthData.total_sales) return 0
    const daysElapsed = differenceInCalendarDays(today, startOfMonth(today)) + 1
    const totalDays = getDaysInMonth(today)
    return Math.round((monthData.total_sales / daysElapsed) * totalDays)
  }
})

const forecastLabel = computed(() => {
  if (!hasDateFilter.value) {
    return `Forecast ${fnsFormat(new Date(), 'yyyy')}`
  }
  return `Forecast ${fnsFormat(new Date(), 'MMMM', { locale: es })}`
})

const forecastSubtitle = computed(() => {
  if (!hasDateFilter.value) {
    return 'Proyección fin de año'
  }
  return 'Proyección fin de mes'
})

// Compute dynamic chart title based on date range and metadata
const chartTitle = computed(() => {
  const metadata = salesFlowData.value?.metadata
  if (!metadata) return 'Flujo de Ventas (2026)'

  const { comparison_label, grouping } = metadata

  if (!dateRangeDates.value) {
    // No filters = showing year-to-date
    const currentYear = new Date().getFullYear()
    return `Flujo de Ventas (${currentYear})`
  }

  const [from, to] = dateRangeDates.value
  if (from && to) {
    const isSameDay = from.toDateString() === to.toDateString()
    if (isSameDay) {
      return `Flujo de Ventas (${fnsFormat(from, 'dd/MM/yyyy')})`
    }
    const groupingLabel = grouping === 'hour' ? 'por Hora' : 'por Día'
    return `Flujo de Ventas ${groupingLabel} vs ${comparison_label}`
  }

  return 'Flujo de Ventas'
})

// Compute dynamic labels for the chart legend
const chartLabels = computed(() => {
  const metadata = salesFlowData.value?.metadata

  if (!dateRangeDates.value) {
    // No filters = showing year-to-date comparison
    const currentYear = new Date().getFullYear()
    return {
      current: `${currentYear}`,
      comparison: `${currentYear - 1}`
    }
  }

  const [from, to] = dateRangeDates.value
  if (!from || !to) {
    const currentYear = new Date().getFullYear()
    return {
      current: `${currentYear}`,
      comparison: `${currentYear - 1}`
    }
  }

  const isSameDay = from.toDateString() === to.toDateString()
  const days_diff = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

  if (isSameDay) {
    return {
      current: fnsFormat(from, 'dd/MM'),
      comparison: fnsFormat(new Date(from.getTime() - 24 * 60 * 60 * 1000), 'dd/MM')
    }
  }

  if (days_diff <= 30) {
    return {
      current: 'Período Actual',
      comparison: 'Período Anterior'
    }
  } else {
    return {
      current: 'Este Año',
      comparison: 'Año Anterior'
    }
  }
})

// Computed for last update text
const lastUpdateText = computed(() => {
  if (!lastUpdate.value) return 'Nunca actualizado'
  return formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es })
})

// Refresh handler for layout button
const handleRefresh = async () => {
  await Promise.all([
    refreshMetrics(),
    refreshSalesFlow(),
    refreshMonthMetrics(),
    refreshYearMetrics(),
    refreshFoodCost(),
    refreshMenuAnalysis(),
    refreshAlerts()
  ])
  lastUpdate.value = new Date()
}

// Update clock every minute
let clockInterval: NodeJS.Timeout | null = null
onMounted(() => {
  clockInterval = setInterval(() => {
    currentTime.value = new Date()
  }, 60000) // Update every minute

  // Register refresh handler for header button
  if (setRefreshHandler) {
    setRefreshHandler(handleRefresh)
  }
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)

  // Unregister refresh handler
  if (setRefreshHandler) {
    setRefreshHandler(undefined)
  }
})

// Refresh data when filters change
watch([paymentMethodFilter, statusFilter], async () => {
  await Promise.all([
    refreshMetrics(),
    refreshSalesFlow()
  ])
  lastUpdate.value = new Date()
})

// Refresh data when date range changes (only when both dates are selected or cleared)
watch(dateRangeDates, async (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) {
    await Promise.all([
      refreshMetrics(),
      refreshSalesFlow(),
      refreshFoodCost(),
      refreshMenuAnalysis()
    ])
    lastUpdate.value = new Date()
  }
})

// Clear filters function
const clearFilters = async () => {
  paymentMethodFilter.value = null
  statusFilter.value = null
  dateRangeDates.value = null
  await Promise.all([
    refreshMetrics(),
    refreshSalesFlow(),
    refreshFoodCost(),
    refreshMenuAnalysis()
  ])
  lastUpdate.value = new Date()
}

// Function to unlock inventory
const unlockInventory = () => {
  isInventoryUnlocked.value = true
  showInvoiceModal.value = false
}

const metrics = computed(() => {
  const data = metricsData.value?.data || {}
  return {
    total_sales: data.total_sales ?? 0,
    avg_ticket: data.avg_ticket ?? 0,
    completed_orders: data.completed_orders ?? 0,
    commission_savings: data.commission_savings ?? 0
  }
})

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-CO').format(value)
}


definePageMeta({
  layout: 'dashboard'
});
</script>

<template>
  <div class="space-y-4">
  <ClientOnly>
    <Teleport to="#dashboard-header-actions">
      <NuxtLink
        to="/abastecimiento/lector-facturas"
        class="flex items-center gap-1 md:gap-2 bg-primary text-primary-foreground px-2 md:px-4 py-2 md:py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-all"
        title="Cargar Factura IA"
      >
        <Sparkles :size="18" />
        <span class="hidden sm:inline">Cargar Factura IA</span>
      </NuxtLink>
      <NuxtLink
        to="/ventas"
        class="flex items-center gap-1 md:gap-2 bg-card border border-border text-foreground px-2 md:px-4 py-2 md:py-2.5 rounded-xl font-medium hover:bg-accent transition-all"
        title="Venta Nueva"
      >
        <Plus :size="18" />
        <span class="hidden sm:inline">Venta Nueva</span>
      </NuxtLink>
    </Teleport>
  </ClientOnly>

    <!-- Filters Bar -->
    <div class="flex items-center gap-2 w-full overflow-x-auto pb-2">
      <!-- Date Range Picker -->
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

      <!-- Payment Method Filter -->
      <select
        v-model="paymentMethodFilter"
        class="h-10 pl-3 pr-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[130px]"
      >
        <option :value="null">Método pago</option>
        <option value="cash">Efectivo</option>
        <option value="card">Tarjeta</option>
        <option value="digital">Digital</option>
      </select>

      <!-- Status Filter -->
      <select
        v-model="statusFilter"
        class="h-10 pl-3 pr-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer min-w-[120px]"
      >
        <option :value="null">Estado</option>
        <option value="completed">Completadas</option>
        <option value="cancelled">Canceladas</option>
        <option value="pending">Pendientes</option>
      </select>

      <!-- Clear Filters Button -->
      <button
        v-if="dateRangeDates || paymentMethodFilter || statusFilter"
        @click="clearFilters"
        class="h-10 px-3 rounded-lg border-2 border-slate-200 bg-white text-sm text-slate-500 hover:text-slate-700 hover:border-indigo-500 transition-colors"
        title="Limpiar filtros"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="metricsLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="metricsError" class="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div class="text-red-600 text-lg font-semibold">Error al cargar métricas</div>
      <div class="text-slate-600">{{ metricsError.message || 'No se pudo conectar con el servidor' }}</div>
      <button
        @click="refreshMetrics()"
        class="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Reintentar
      </button>
    </div>

    <!-- Main Content -->
    <div v-else class="space-y-8 pb-20">
      
      <!-- NIVEL 1: VENTAS (EL GANCHO) -->
      <section>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold flex items-center gap-2">
            <span class="w-2 h-6 bg-green-500 rounded-full"></span>
            Ventas en Tiempo Real
          </h3>
          <span class="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded uppercase">{{ lastUpdateText }}</span>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          <MetricCard
            title="Ventas Brutas"
            :value="metrics.total_sales"
            format="currency"
            variant="primary"
          />
          <MetricCard
            title="Pedidos Online"
            :value="metrics.completed_orders"
            format="number"
            variant="primary"
          />
          <MetricCard
            title="Ticket Promedio"
            :value="metrics.avg_ticket"
            format="currency"
            variant="primary"
          />
          <MetricCard
            title="Ahorro Comisiones"
            :value="metrics.commission_savings"
            format="currency"
            variant="primary"
            subtitle="Pedidos directos vs App"
          />
          <MetricCard
            :title="forecastLabel"
            :value="forecast"
            format="currency"
            variant="primary"
            :subtitle="forecastSubtitle"
          />
        </div>

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

      <!-- NIVEL 2: SALUD DEL MARGEN (LOCKED) -->
      <HealthSemaphore
        :isUnlocked="isInventoryUnlocked"
        :foodCostData="foodCostData?.data"
        :menuData="menuAnalysisData?.data"
        @unlock="showInvoiceModal = true"
      />

      <!-- NIVEL 3: ALERTAS DE GESTION -->
      <AlertsSection
        :alerts="alertsData?.data?.alerts"
        :class="!isInventoryUnlocked ? 'opacity-30 grayscale pointer-events-none' : ''"
      />

    </div>

    <InvoiceModal
      :show="showInvoiceModal"
      @close="showInvoiceModal = false"
      @confirm="unlockInventory"
    />
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
.dp-custom-input::placeholder {
  color: hsl(var(--muted-foreground)) !important;
}
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
