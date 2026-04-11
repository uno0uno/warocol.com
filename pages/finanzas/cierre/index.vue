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
          <!-- Mesas abiertas indicator -->
          <NuxtLink
            v-if="openTablesCount > 0"
            to="/mesas"
            class="h-10 px-3 rounded-lg border-2 border-amber-300 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {{ openTablesCount }} mesa{{ openTablesCount !== 1 ? 's' : '' }} abierta{{ openTablesCount !== 1 ? 's' : '' }}
          </NuxtLink>

          <button
            @click="filterCurrentMonth"
            class="h-10 px-4 rounded-lg border-2 text-sm font-medium transition-colors"
            :class="isCurrentMonthActive
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-primary'"
          >
            Mes actual
          </button>

          <NuxtLink
            to="/finanzas/cierre/nuevo"
            class="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-1.5"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo cierre
          </NuxtLink>
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
          <button
            @click="openPanel(row.id)"
            class="text-sm text-text-primary hover:text-primary transition-colors text-left"
          >
            {{ formatDay(row.periodStart) }}
          </button>
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

  <FinanzasCierrePanel
    v-model="showPanel"
    :cierre-id="selectedCierreId"
    @deleted="onDeleted"
  />

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQueryCache } from '@pinia/colada'
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

const activeStart = computed(() => dateRangeDates.value ? periodStart.value : null)
const activeEnd   = computed(() => dateRangeDates.value ? periodEnd.value   : null)

// ── Open tables (informativo) ─────────────────────────────────────────────
const { data: todayPreview } = useQuery({
  key: () => ['cierre', 'open-tables', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: Record<string, any> }>('/api/cierre/preview', {
    params: { period_start: today, period_end: today, completed_only: false },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})
const openTablesCount = computed(() => todayPreview.value?.data?.openTablesCount ?? 0)

const { data: rawHistorial, status, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['cierre', 'list', currentTenant.value?.id, activeStart.value, activeEnd.value],
  query: () => $fetch<{ success: boolean; data: any[] }>('/api/cierre', {
    params: {
      period_start: activeStart.value ?? undefined,
      period_end:   activeEnd.value   ?? undefined,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 60_000,
})

const isLoading    = computed(() => !rawHistorial.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && rawHistorial.value != null)

const filteredHistorial = computed(() => rawHistorial.value?.data ?? [])

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

const filterCurrentMonth = () => {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last  = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  dateRangeDates.value = [first, last]
}

const isCurrentMonthActive = computed(() => {
  if (!dateRangeDates.value?.[0] || !dateRangeDates.value?.[1]) return false
  const now   = new Date()
  const first = fnsFormat(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
  const last  = fnsFormat(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')
  return activeStart.value === first && activeEnd.value === last
})

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

// ── Panel ─────────────────────────────────────────────────────────────────
const cache = useQueryCache()
const showPanel       = ref(false)
const selectedCierreId = ref<string | null>(null)

const openPanel = (id: string) => {
  selectedCierreId.value = id
  showPanel.value = true
}

const onDeleted = () => {
  cache.invalidateQueries({ key: ['cierre', 'list'] })
}

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>
