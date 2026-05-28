<template>
  <div class="page-layout">

    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- ── Summary cards ────────────────────────────────────────────────── -->
      <div
        v-if="filteredHistorial.length > 0"
        class="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-3 xl:grid-cols-5"
      >
        <MetricCard title="Total ventas" :value="summaryStats.totalSales" format="currency" variant="primary" />
        <MetricCard
          title="Diferencia de caja"
          :value="summaryStats.cashDifference"
          format="currency"
          :variant="summaryStats.cashDifference >= 0 ? 'primary' : 'destructive'"
        />
        <MetricCard title="Efectivo" :value="summaryStats.totalCash" format="currency" variant="primary" />
        <MetricCard title="Tarjeta" :value="summaryStats.totalCard" format="currency" variant="primary" />
        <MetricCard title="Gastos efectivo" :value="summaryStats.gastosEfectivo" format="currency" variant="primary" class="col-span-2 md:col-span-1 xl:col-span-1" />
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
            {{ openTablesCount }} {{ openTablesCount === 1 ? tableSingular.toLowerCase() : tablePlural.toLowerCase() }} {{ openTablesCount === 1 ? 'abierta' : 'abiertas' }}
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
            to="/finanzas/arqueo/apertura"
            class="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center flex-shrink-0"
          >
            Abrir turno
          </NuxtLink>

          <NuxtLink
            :to="`/finanzas/arqueo/x?start=${periodStart}&end=${periodEnd}`"
            class="h-10 px-4 rounded-lg border-2 border-border bg-background text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex items-center flex-shrink-0"
          >
            Corte X
          </NuxtLink>

        </div>
      </div>

      <!-- ── Nuevo arqueo (hub) ─────────────────────────────────────────────── -->
      <div>
        <h2 class="text-sm font-semibold text-text-primary mb-2">Nuevo arqueo</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NuxtLink
            :to="`/finanzas/arqueo/apertura?mode=day&start=${today}&end=${today}`"
            class="flex items-start gap-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors min-h-[44px]"
          >
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center text-primary" aria-hidden="true">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-text-primary">Día completo</p>
              <p class="text-xs text-text-secondary mt-0.5">Un cierre por día calendario (cierre nocturno o turno único).</p>
            </div>
          </NuxtLink>
          <NuxtLink
            :to="`/finanzas/arqueo/z?mode=template&start=${today}&end=${today}`"
            class="flex items-start gap-3 p-4 rounded-lg border-2 border-primary/20 bg-surface hover:border-primary/40 hover:bg-primary/5 transition-colors min-h-[44px]"
          >
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary" aria-hidden="true">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-text-primary">Por plantilla</p>
              <p class="text-xs text-text-secondary mt-0.5">Turno fijo ya configurado (Mañana, Tarde, noche…).</p>
            </div>
          </NuxtLink>
          <NuxtLink
            :to="`/finanzas/arqueo/z?mode=custom&start=${today}&end=${today}`"
            class="flex items-start gap-3 p-4 rounded-lg border-2 border-violet-200 bg-violet-50/40 hover:border-violet-300 hover:bg-violet-50 transition-colors min-h-[44px]"
          >
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center text-violet-800" aria-hidden="true">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-semibold text-text-primary">Horario personalizado</p>
              <p class="text-xs text-text-secondary mt-0.5">Ventana a mano por horas o entre varios días.</p>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- ── Historial ─────────────────────────────────────────────────────── -->
      <HealthSemaphore :is-unlocked="true" title="Historial de arqueos">
      <UiResponsiveDataView
        :data="filteredHistorial"
        :columns="historialColumns"
        row-size="sm"
        empty-message="No hay arqueos registrados."
      >
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="openPanel(item.id)"
          >
            <div class="flex-1 min-w-0">
              <div class="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 items-center">
                <span
                  class="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  :class="periodBadgeClass(item)"
                >{{ periodTypeLabel(item) }}</span>
                <span class="text-sm font-bold text-text-primary">{{ formatPeriodDates(item) }}</span>
                <span class="text-xs text-text-secondary font-mono">{{ formatPeriodTimes(item) ?? '—' }}</span>
              </div>
              <p class="text-xs text-text-secondary mt-0.5">Registrado {{ formatDate(item.closedAt) }}</p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(item.totalSales) }}</span>
              <span class="text-xs font-semibold" :class="item.cashDifference >= 0 ? 'text-success' : 'text-destructive'">
                {{ item.cashDifference >= 0 ? '+' : '' }}{{ formatCurrency(item.cashDifference) }}
              </span>
            </div>
          </div>
        </template>

        <template #cell-periodType="{ row }">
          <span
            class="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded whitespace-nowrap"
            :class="periodBadgeClass(row)"
          >{{ periodTypeLabel(row) }}</span>
        </template>
        <template #cell-periodDate="{ row }">
          <span class="text-sm font-bold text-text-primary whitespace-nowrap">{{ formatPeriodDates(row) }}</span>
        </template>
        <template #cell-periodTime="{ row }">
          <span v-if="formatPeriodTimes(row)" class="text-xs text-text-secondary font-mono whitespace-nowrap">{{ formatPeriodTimes(row) }}</span>
          <span v-else class="text-xs text-text-tertiary">—</span>
        </template>
        <template #cell-periodEnd="{ row }">
          <span v-if="row.periodStart !== row.periodEnd" class="text-sm text-text-secondary">{{ formatDay(row.periodEnd) }}</span>
          <span v-else class="text-xs text-text-tertiary">—</span>
        </template>
        <template #cell-totalSales="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-gastosEfectivo="{ value }">
          <span class="text-sm text-destructive">{{ formatCurrency(value) }}</span>
        </template>
        <template #cell-cashDifference="{ value }">
          <span class="text-sm font-semibold" :class="value >= 0 ? 'text-success' : 'text-destructive'">
            {{ value >= 0 ? '+' : '' }}{{ formatCurrency(value) }}
          </span>
        </template>
        <template #cell-closedAt="{ value }">
          <span class="text-xs text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1">
            <button
              @click="openPanel(row.id)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-surface-secondary hover:text-primary transition-colors"
              title="Ver detalle"
              aria-label="Ver detalle"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              @click="openDeleteModal(row)"
              class="flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Eliminar"
              aria-label="Eliminar arqueo"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>

    </div>

  <FinanzasCierrePanel
    v-model="showPanel"
    :cierre-id="selectedCierreId"
    @deleted="onDeleted"
  />

  <!-- Delete confirmation modal -->
  <Teleport to="body">
    <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="closeDeleteModal" />
      <div class="relative bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
        <div class="text-center">
          <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 class="text-lg font-bold text-text-primary mb-1">Eliminar arqueo</h3>
          <p class="text-sm text-text-secondary mb-6">
            ¿Eliminar el arqueo del período <strong>{{ formatPeriodDates(cierreToDelete) }}</strong><template v-if="formatPeriodTimes(cierreToDelete)"> ({{ formatPeriodTimes(cierreToDelete) }})</template>? Esta acción no se puede deshacer.
          </p>
          <div class="flex gap-3">
            <button
              @click="closeDeleteModal"
              :disabled="deleting"
              class="flex-1 min-h-[44px] px-4 py-2 border-2 border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              @click="handleDelete"
              :disabled="deleting"
              class="flex-1 min-h-[44px] px-4 py-2 bg-destructive text-white rounded-lg text-sm font-semibold hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {{ deleting ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQueryCache } from '@pinia/colada'
import { useFormatters } from '~/composables/useFormatters'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import {
  addDaysBogotaISO,
  bogotaDateAtNoon,
  bogotaISOFromDate,
  bogotaMonthBounds,
  todayBogotaISO,
} from '~/utils/bogotaDate'
import MetricCard from '~/components/shared/MetricCard.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({ layout: 'dashboard', module: 'finanzas' })
useHead({ title: 'Arqueo de caja - Warocol' })

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const { singular: tableSingular, plural: tablePlural } = useTableLabel()

const today = todayBogotaISO()
const todayNoon = bogotaDateAtNoon(today)

const dateRangeDates = ref<Date[] | null>(null)

const presetDates = ref([
  { label: 'Hoy',           value: [new Date(todayNoon), new Date(todayNoon)] },
  { label: 'Ayer',          value: (() => { const d = bogotaDateAtNoon(addDaysBogotaISO(today, -1)); return [d, d] })() },
  { label: 'Última semana', value: [bogotaDateAtNoon(addDaysBogotaISO(today, -7)), new Date(todayNoon)] },
  { label: 'Último mes',    value: [bogotaDateAtNoon(addDaysBogotaISO(today, -30)), new Date(todayNoon)] },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yy', { locale: es })}`
}

const periodStart = computed(() =>
  dateRangeDates.value?.[0] ? bogotaISOFromDate(dateRangeDates.value[0]) : today
)
const periodEnd = computed(() =>
  dateRangeDates.value?.[1] ? bogotaISOFromDate(dateRangeDates.value[1]) : today
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
  { key: 'periodType',     title: 'Tipo',            sortable: false },
  { key: 'periodDate',     title: 'Fecha',           sortable: false },
  { key: 'periodTime',     title: 'Horario',         sortable: false },
  { key: 'periodEnd',      title: 'Hasta',           sortable: false },
  { key: 'totalSales',     title: 'Ventas',          sortable: false },
  { key: 'gastosEfectivo', title: 'Gastos',          sortable: false },
  { key: 'cashDifference', title: 'Diferencia',      sortable: false },
  { key: 'closedAt',       title: 'Registrado',      sortable: false },
  { key: 'actions',        title: 'Acciones',        sortable: false },
]

const formatCurrency = (value?: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value ?? 0)

const filterCurrentMonth = () => {
  const { first, last } = bogotaMonthBounds(today)
  dateRangeDates.value = [bogotaDateAtNoon(first), bogotaDateAtNoon(last)]
}

const isCurrentMonthActive = computed(() => {
  if (!dateRangeDates.value?.[0] || !dateRangeDates.value?.[1]) return false
  const { first, last } = bogotaMonthBounds(today)
  return activeStart.value === first && activeEnd.value === last
})

const { formatDateTime: _fmtDateTime } = useFormatters()
const { formatPeriodDates, formatPeriodTimes, periodTypeLabel, periodBadgeClass } = useCierrePeriod()

const formatDay = (d: string) => {
  if (!d) return ''
  return _fmtDateTime(d + 'T00:00:00')
}

const formatDate = (iso: string) => {
  if (!iso) return ''
  return _fmtDateTime(iso)
}

// ── Panel ─────────────────────────────────────────────────────────────────
const cache = useQueryCache()
const showPanel        = ref(false)
const selectedCierreId = ref<string | null>(null)

const openPanel = (id: string) => {
  selectedCierreId.value = id
  showPanel.value = true
}

const onDeleted = () => {
  cache.invalidateQueries({ key: ['cierre', 'list'] })
}

// ── Delete modal ───────────────────────────────────────────────────────────
const showDeleteModal  = ref(false)
const cierreToDelete   = ref<any>(null)
const deleting         = ref(false)

const openDeleteModal = (row: any) => {
  cierreToDelete.value = row
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (deleting.value) return
  showDeleteModal.value = false
  cierreToDelete.value  = null
}

const handleDelete = async () => {
  if (!cierreToDelete.value) return
  deleting.value = true
  let succeeded = false
  try {
    await $fetch(`/api/cierre/${cierreToDelete.value.id}`, { method: 'DELETE' })
    cache.invalidateQueries({ key: ['cierre', 'list'] })
    succeeded = true
  } catch {
    // keep modal open on error
  } finally {
    deleting.value = false
    if (succeeded) {
      showDeleteModal.value = false
      cierreToDelete.value = null
    }
  }
}

registerProgressiveLoading(isRefreshing)
onMounted(() => { setRefreshHandler(refetch) })
onUnmounted(() => { clearRefreshHandler(refetch) })

</script>
