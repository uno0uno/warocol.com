<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- ── Summary cards ────────────────────────────────────────────────── -->
      <div v-if="filteredHistorial.length > 0" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        <MetricCard title="Total ventas"      :value="summaryStats.totalSales"     format="currency" variant="primary" />
        <MetricCard title="Diferencia de caja" :value="summaryStats.cashDifference" format="currency" variant="primary" />
        <MetricCard title="Efectivo"           :value="summaryStats.totalCash"      format="currency" variant="primary" />
        <MetricCard title="Tarjeta"            :value="summaryStats.totalCard"      format="currency" variant="primary" />
        <MetricCard title="Gastos efectivo"    :value="summaryStats.gastosEfectivo" format="currency" variant="primary" class="col-span-2 md:col-span-1" />
      </div>

      <!-- ── Filter bar ────────────────────────────────────────────────────── -->
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
          :max-date="new Date()"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />

        <button
          v-if="dateRangeDates"
          @click="dateRangeDates = null"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
          aria-label="Limpiar fechas"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div class="flex-1" />

        <div class="flex items-center gap-2 flex-shrink-0">
          <button
            @click="navigateTo({ path: '/finanzas/cierre/x', query: { start: periodStart, end: periodEnd } })"
            class="h-10 px-4 rounded-lg border-2 border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          >
            Cierre X
          </button>
          <button
            @click="navigateTo({ path: '/finanzas/cierre/z', query: { start: periodStart, end: periodEnd } })"
            class="h-10 px-4 rounded-lg border-2 border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          >
            Cierre Z
          </button>
          <button
            @click="navigateTo({ path: '/finanzas/cierre/mensual', query: { year: new Date().getFullYear(), month: new Date().getMonth() + 1 } })"
            class="h-10 px-4 rounded-lg border-2 border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          >
            Cierre Mes
          </button>
        </div>
      </div>

      <!-- ── Historial ─────────────────────────────────────────────────────── -->
      <UiResponsiveDataView
        :data="filteredHistorial"
        :columns="historialColumns"
        row-size="sm"
        empty-message="No hay cierres registrados."
      >
        <template #header>
          <h3 class="text-base font-bold text-text-primary">Historial de cierres</h3>
        </template>

        <template #cell-periodStart="{ row }">
          <NuxtLink
            :to="`/finanzas/cierre/${row.id}`"
            class="text-sm text-text-primary hover:text-primary transition-colors"
          >
            {{ formatDay(row.periodStart) }}
          </NuxtLink>
        </template>
        <template #cell-periodEnd="{ row }">
          <span class="text-sm text-text-secondary">{{ formatDay(row.periodEnd) }}</span>
        </template>
        <template #cell-totalSales="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-gastosEfectivo="{ value }">
          <span class="text-sm text-destructive">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-cashDifference="{ value }">
          <span class="text-sm font-semibold" :class="value >= 0 ? 'text-emerald-600' : 'text-destructive'">
            {{ value >= 0 ? '+' : '' }}{{ formatCurrency(value) }}
          </span>
        </template>
        <template #cell-closedAt="{ value }">
          <span class="text-xs text-text-secondary">{{ formatDate(value) }}</span>
        </template>
      </UiResponsiveDataView>

    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import MetricCard from '~/components/shared/MetricCard.vue'

definePageMeta({ layout: 'dashboard' })
useHead({ title: 'Cierre - Warocol' })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()

const today = new Date().toISOString().split('T')[0]

const dateRangeDates = ref<Date[] | null>(null)

const presetDates = ref([
  { label: 'Hoy',           value: [new Date(), new Date()] },
  { label: 'Ayer',          value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Último mes',    value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
}

const periodStart = computed(() =>
  dateRangeDates.value?.[0] ? fnsFormat(dateRangeDates.value[0], 'yyyy-MM-dd') : today
)
const periodEnd = computed(() =>
  dateRangeDates.value?.[1] ? fnsFormat(dateRangeDates.value[1], 'yyyy-MM-dd') : today
)

const { data: rawHistorial, status, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['cierre', 'list', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/cierre'),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const isLoading    = computed(() => !rawHistorial.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && rawHistorial.value != null)

const historialList = computed(() => rawHistorial.value?.data ?? [])

const filteredHistorial = computed(() => {
  if (!dateRangeDates.value?.[0] || !dateRangeDates.value?.[1]) return historialList.value
  const from = fnsFormat(dateRangeDates.value[0], 'yyyy-MM-dd')
  const to   = fnsFormat(dateRangeDates.value[1], 'yyyy-MM-dd')
  return historialList.value.filter((r: any) => r.periodStart >= from && r.periodStart <= to)
})

const summaryStats = computed(() => {
  const list = filteredHistorial.value
  return {
    count:          list.length,
    totalSales:     list.reduce((s: number, r: any) => s + (r.totalSales ?? 0), 0),
    totalCash:      list.reduce((s: number, r: any) => s + (r.totalCash ?? 0), 0),
    totalCard:      list.reduce((s: number, r: any) => s + (r.totalCard ?? 0), 0),
    gastosEfectivo: list.reduce((s: number, r: any) => s + (r.gastosEfectivo ?? 0), 0),
    cashDifference: list.reduce((s: number, r: any) => s + (r.cashDifference ?? 0), 0),
  }
})

const historialColumns = [
  { key: 'periodStart',    title: 'Período inicial', sortable: false },
  { key: 'periodEnd',      title: 'Período final',   sortable: false },
  { key: 'totalSales',     title: 'Ventas',          sortable: false },
  { key: 'gastosEfectivo', title: 'Gastos',          sortable: false },
  { key: 'cashDifference', title: 'Diferencia',      sortable: false },
  { key: 'closedAt',       title: 'Registrado',      sortable: false },
]

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const formatDay = (d: string) => {
  if (!d) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
  }).format(new Date(d + 'T12:00:00'))
}

const formatDate = (iso: string) => {
  if (!iso) return ''
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'America/Bogota',
  }).format(new Date(iso))
}

const formatPeriod = (start: string, end: string) => {
  if (!start) return ''
  const fmt = (d: string) => new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota',
  }).format(new Date(d + 'T12:00:00'))
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`
}

onMounted(() => {
  setRefreshHandler(refetch)
  registerProgressiveLoading(isRefreshing)
})
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
