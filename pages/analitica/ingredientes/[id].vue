<template>
  <div class="flex flex-col gap-4 pb-20">
    <div v-if="isLoading" class="flex min-h-[400px] items-center justify-center">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <section>
        <div class="min-w-0">
          <div class="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden">
            <h1 class="min-w-0 truncate text-xl font-bold leading-tight text-text-primary md:text-2xl">
              {{ ingredientName }}
            </h1>
            <UiStatusBadge
              :value="coverageLabel(metrics.data_coverage)"
              format="text"
              :variant="coverageVariant(metrics.data_coverage)"
              size="sm"
              class="shrink-0"
            />
            <span class="hidden h-1 w-1 rounded-full bg-border sm:inline-block" aria-hidden="true" />
            <span class="min-w-0 truncate rounded-md border border-border bg-surface px-2.5 py-1 text-sm font-medium leading-5 text-text-secondary">
              <span class="text-text-primary">{{ ingredientCategory }}</span>
              <span class="mx-1.5 text-border" aria-hidden="true">·</span>
              <span class="tabular-nums">{{ displayIngredientUnit }}</span>
              <span class="mx-1.5 text-border" aria-hidden="true">·</span>
              <span class="tabular-nums">{{ periodLabel }}</span>
            </span>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <MetricCard
          title="Consumo"
          :value="formatQuantity(metrics.consumed_quantity)"
          format="text"
          variant="primary"
          size="sm"
          :subtitle="displayIngredientUnit"
          class="min-w-0 overflow-hidden"
        />
        <MetricCard
          title="Costo estimado"
          :value="formatCurrency(metrics.estimated_consumed_cost)"
          format="text"
          variant="primary"
          size="sm"
          :subtitle="costBasisLabel"
          class="min-w-0 overflow-hidden"
        />
        <MetricCard
          title="Costo promedio"
          :value="formatUnitCost(metrics.weighted_avg_cost_per_unit)"
          format="text"
          variant="primary"
          size="sm"
          subtitle="Compra ponderada"
          class="min-w-0 overflow-hidden"
        />
        <MetricCard
          title="Último costo"
          :value="formatUnitCost(metrics.latest_cost_per_unit)"
          format="text"
          variant="primary"
          size="sm"
          :subtitle="latestCostLabel"
          class="min-w-0 overflow-hidden"
        />
        <MetricCard
          title="Variación"
          :value="formatCostVariation(metrics.cost_variation_pct)"
          format="text"
          variant="primary"
          size="sm"
          subtitle="Primera vs última compra"
          class="min-w-0 overflow-hidden"
        />
        <MetricCard
          title="Movimientos"
          :value="metrics.movement_count"
          format="number"
          variant="primary"
          size="sm"
          :subtitle="coverageLabel(metrics.data_coverage)"
          class="min-w-0 overflow-hidden"
        />
      </section>

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        search-placeholder="Buscar historial..."
        :search-fields="[]"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="historyTypeFilter"
            :class="[filterSelectClass, 'w-full sm:w-40 md:hidden']"
            aria-label="Filtrar historial por tipo"
          >
            <option value="">Tipo</option>
            <option v-for="option in historyTypeOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="recordKindFilter"
            :class="[filterSelectClass, 'w-full sm:w-40 md:hidden']"
            aria-label="Filtrar historial por registro"
          >
            <option value="">Registro</option>
            <option v-for="option in recordKindOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>

          <select
            v-model="unitFilter"
            :class="[filterSelectClass, 'w-full sm:w-32 md:hidden']"
            aria-label="Filtrar historial por unidad"
          >
            <option value="">Unidad</option>
            <option v-for="unit in historyUnits" :key="unit" :value="unit">
              {{ formatUnitLabel(unit) }}
            </option>
          </select>

          <input
            v-model="quantityMinFilter"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            :class="[filterSelectClass, 'w-full sm:w-28 md:hidden']"
            placeholder="Mín."
            aria-label="Cantidad mínima"
          />

          <input
            v-model="quantityMaxFilter"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            :class="[filterSelectClass, 'w-full sm:w-28 md:hidden']"
            placeholder="Máx."
            aria-label="Cantidad máxima"
          />

          <div class="inline-flex h-10 rounded-lg border-2 border-border bg-background p-0.5">
            <button
              v-for="option in granularityOptions"
              :key="option.value"
              type="button"
              class="rounded-md px-3 text-sm font-semibold transition-colors"
              :class="granularity === option.value ? 'bg-primary text-primary-foreground' : 'text-text-secondary hover:text-text-primary'"
              @click="granularity = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </template>
      </UiAdvancedFiltersBar>

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div class="rounded-lg border border-border bg-background p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-base font-bold text-text-primary">Consumo</h2>
              <p class="text-xs text-text-secondary">{{ chartSubtitle }}</p>
            </div>
            <BarChart3 class="h-5 w-5 flex-shrink-0 text-text-secondary" aria-hidden="true" />
          </div>
          <div v-if="selectedSeries.length === 0" class="flex h-[260px] items-center justify-center text-center">
            <div>
              <p class="font-semibold text-text-primary">Sin consumo registrado</p>
              <p class="mt-1 text-sm text-text-secondary">Cambia el rango de fechas para revisar otro periodo.</p>
            </div>
          </div>
          <ClientOnly v-else>
            <apexchart
              type="area"
              height="260"
              :options="consumptionChartOptions"
              :series="consumptionChartSeries"
            />
          </ClientOnly>
        </div>

        <div class="rounded-lg border border-border bg-background p-4">
          <div class="mb-3 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-base font-bold text-text-primary">Costo y unidad</h2>
              <p class="text-xs text-text-secondary">{{ chartSubtitle }}</p>
            </div>
            <LineChart class="h-5 w-5 flex-shrink-0 text-text-secondary" aria-hidden="true" />
          </div>
          <div v-if="selectedSeries.length === 0" class="flex h-[260px] items-center justify-center text-center">
            <div>
              <p class="font-semibold text-text-primary">Sin costo para graficar</p>
              <p class="mt-1 text-sm text-text-secondary">El reporte mostrará costos cuando existan movimientos.</p>
            </div>
          </div>
          <ClientOnly v-else>
            <apexchart
              type="line"
              height="260"
              :options="costChartOptions"
              :series="costChartSeries"
            />
          </ClientOnly>
        </div>
      </section>

      <section>
        <div class="min-w-0">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-text-primary">Historial analítico</h2>
              <p class="text-xs text-text-secondary">Consumos, compras y movimientos del periodo.</p>
            </div>
            <span class="text-xs font-semibold text-text-secondary">
              {{ historyTotal }} eventos
            </span>
          </div>

          <div
            v-if="isHistoryPageLoading"
            class="flex min-h-[200px] items-center justify-center"
            aria-live="polite"
            aria-busy="true"
          >
            <CommonsTheCustomLoader size="medium" />
          </div>

          <UiResponsiveDataView
            v-else
            row-size="sm"
            variant="default"
            :columns="historyColumns"
            :data="filteredHistoryRows"
            item-key="id"
            empty-message="Sin historial para este periodo"
            empty-sub-message="No hay compras ni movimientos analíticos con los filtros actuales"
          >
            <template #card="{ item, index }">
              <div
                v-if="item"
                class="flex items-center gap-3 border-b border-border px-3 py-3 transition-colors hover:bg-data-table-row-hover-bg"
                :class="historyMobileRowClass(index)"
              >
                <div class="min-w-0 flex-1">
                  <div class="flex items-baseline gap-2">
                    <span class="text-xs text-text-secondary">{{ item.dateLabel }}</span>
                    <NuxtLink
                      v-if="item.recordHref"
                      :to="item.recordHref"
                      class="truncate text-sm font-semibold text-primary hover:text-primary/80"
                      @click.stop
                    >
                      {{ item.recordLabel }}
                    </NuxtLink>
                    <span v-else class="truncate text-sm font-semibold text-text-primary">{{ item.recordLabel }}</span>
                  </div>
                  <p class="mt-0.5 truncate text-xs text-text-secondary">
                    {{ item.quantityLabel }} {{ item.unitLabel }} · {{ item.costLabel }}
                  </p>
                </div>

                <div class="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <span class="text-sm font-bold tabular-nums text-primary">{{ item.costLabel }}</span>
                  <UiStatusBadge
                    :value="item.kindLabel"
                    format="text"
                    :variant="item.kindVariant"
                    size="sm"
                  />
                </div>
              </div>
            </template>

            <template #cell-date="{ item }">
              <span class="text-sm text-text-secondary">{{ item.dateLabel }}</span>
            </template>

            <template #header-date>
              <UiTableHeaderFilter
                title="Fecha"
                filter-type="none"
                align="left"
              />
            </template>

            <template #header-type>
              <UiTableHeaderFilter
                v-model="historyTypeFilter"
                title="Tipo"
                filter-type="select"
                :options="historyTypeOptions"
                all-label="Tipo"
                align="center"
              />
            </template>

            <template #header-detail>
              <UiTableHeaderFilter
                v-model="recordKindFilter"
                title="Registro"
                filter-type="select"
                :options="recordKindOptions"
                all-label="Registro"
                align="left"
              />
            </template>

            <template #header-quantity>
              <UiTableHeaderFilter
                title="Cantidad"
                filter-type="number-range"
                :min-value="quantityMinFilter"
                :max-value="quantityMaxFilter"
                align="right"
                @update:min-value="quantityMinFilter = $event"
                @update:max-value="quantityMaxFilter = $event"
              />
            </template>

            <template #header-unit>
              <UiTableHeaderFilter
                v-model="unitFilter"
                title="Unidad"
                filter-type="select"
                :options="unitHeaderOptions"
                all-label="Unidad"
                align="center"
              />
            </template>

            <template #header-cost>
              <UiTableHeaderFilter
                title="Costo"
                filter-type="none"
                align="right"
              />
            </template>

            <template #cell-type="{ item }">
              <UiStatusBadge
                :value="item.kindLabel"
                format="text"
                :variant="item.kindVariant"
                size="sm"
              />
            </template>

            <template #cell-detail="{ item }">
              <div class="min-w-0">
                <NuxtLink
                  v-if="item.recordHref"
                  :to="item.recordHref"
                  class="text-sm font-semibold text-primary hover:text-primary/80"
                  @click.stop
                >
                  {{ item.recordLabel }}
                </NuxtLink>
                <span v-else class="text-sm font-semibold text-text-primary">{{ item.recordLabel }}</span>
              </div>
            </template>

            <template #cell-quantity="{ item }">
              <span class="text-sm font-semibold tabular-nums text-text-primary">{{ item.quantityLabel }}</span>
            </template>

            <template #cell-unit="{ item }">
              <span class="text-sm font-semibold text-text-secondary">{{ item.unitLabel }}</span>
            </template>

            <template #cell-cost="{ item }">
              <span class="text-sm tabular-nums text-text-primary">{{ item.costLabel }}</span>
            </template>
          </UiResponsiveDataView>

          <UiTablePagination
            v-if="historyTotal > historyPageSize"
            class="mt-4"
            :current-page="historyPage"
            :total-pages="historyTotalPages"
            :start-item="historyStartItem"
            :end-item="historyEndItem"
            :total-items="historyTotal"
            :can-previous-page="canPreviousHistoryPage"
            :can-next-page="canNextHistoryPage"
            @first-page="goToHistoryPage(1)"
            @previous-page="goToHistoryPage(historyPage - 1)"
            @next-page="goToHistoryPage(historyPage + 1)"
            @last-page="goToHistoryPage(historyTotalPages)"
          />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart3, LineChart } from 'lucide-vue-next'
import MetricCard from '~/components/shared/MetricCard.vue'
import { filterSelectClass } from '~/composables/useFilterSelectClass'
import { useFormatters } from '~/composables/useFormatters'
import { useIngredientAnalyticsFiltersStore } from '~/stores/ingredientAnalyticsFilters'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

type Coverage = 'recorded_movements' | 'no_recorded_consumption' | string
type Granularity = 'day' | 'month'

type IngredientReport = {
  ingredient?: {
    id?: string
    name?: string | null
    category?: string | null
    unit?: string | null
  }
  period?: {
    from?: string | null
    to?: string | null
    days?: number
    timezone?: string | null
  }
  metrics?: {
    consumed_quantity?: number | null
    purchase_quantity?: number | null
    estimated_consumed_cost?: number | null
    weighted_avg_cost_per_unit?: number | null
    latest_cost_per_unit?: number | null
    latest_cost_at?: string | null
    cost_basis?: string | null
    first_unit_cost?: number | null
    latest_purchase_unit_cost?: number | null
    cost_variation?: number | null
    cost_variation_pct?: number | null
    movement_count?: number | null
    data_coverage?: Coverage
  }
  series?: {
    day?: SeriesPoint[]
    month?: SeriesPoint[]
  }
  purchases?: PurchaseRow[]
  stock_movements?: MovementRow[]
  consumption_movements?: MovementRow[]
  history_pagination?: {
    limit?: number | null
    offset?: number | null
    total?: number | null
    has_more?: boolean | null
    unit?: string | null
    quantity_min?: number | null
    quantity_max?: number | null
  }
  data_coverage?: Coverage
}

type SeriesPoint = {
  period?: string | null
  consumed_quantity?: number | null
  estimated_consumed_cost?: number | null
  unit_cost?: number | null
  movement_count?: number | null
}

type PurchaseRow = {
  purchase_item_id?: string
  purchase_id?: string
  purchase_number?: string | null
  is_direct_entry?: boolean | null
  purchase_date?: string | null
  base_quantity?: number | null
  base_unit?: string | null
  purchase_quantity?: number | null
  purchase_unit?: string | null
  unit_cost?: number | null
  total_cost?: number | null
  received_at?: string | null
}

type MovementRow = {
  id?: string
  movement_type?: string | null
  quantity_change?: number | null
  consumed_quantity?: number | null
  unit?: string | null
  previous_stock?: number | null
  new_stock?: number | null
  cost_per_unit?: number | null
  reference_table?: string | null
  reference_id?: string | null
  reference_order_number?: number | null
  reason?: string | null
  notes?: string | null
  created_at?: string | null
}

type HistoryPagination = NonNullable<IngredientReport['history_pagination']>

type HistoryRow = {
  id: string
  timestamp: string
  dateLabel: string
  type: 'purchase' | 'movement'
  kindLabel: string
  kindVariant: 'success' | 'warning' | 'info' | 'secondary'
  recordLabel: string
  recordHref?: string | null
  quantityLabel: string
  unitLabel: string
  costLabel: string
  searchText: string
}

definePageMeta({ layout: 'dashboard', module: 'analitica' })

const route = useRoute()
const { dateAtNoon } = useTenantTimezone()
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { formatCalendarDate, formatCurrency, formatDateTime } = useFormatters()
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const ingredientAnalyticsFiltersStore = useIngredientAnalyticsFiltersStore()
const tenantId = computed(() => currentTenant.value?.id ?? null)
const ingredientDateFilters = computed(() => ingredientAnalyticsFiltersStore.ingredientsFor(tenantId.value))
const ingredientDateRangeDates = computed({
  get: () => ingredientDateFilters.value.dateRangeDates,
  set: (value) => {
    ingredientDateFilters.value.dateRangeDates = value
  },
})
const routeDateRange = ref<Date[] | null>(routeDateRangeDates())
const seedDateRangeFromRoute = () => {
  if (routeDateRange.value) ingredientDateRangeDates.value = routeDateRange.value
}
seedDateRangeFromRoute()
watch(tenantId, seedDateRangeFromRoute, { immediate: true })
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets(ingredientDateRangeDates)

const ingredientId = computed(() => String(route.params.id || ''))
const granularity = ref<Granularity>('day')
const lastUpdate = ref(new Date())
const historyPageSize = 25
const historyPage = ref(1)
const pendingHistoryPage = ref<number | null>(null)
const lastResolvedHistoryPagination = ref<HistoryPagination | null>(null)
const historyTypeFilter = ref('')
const recordKindFilter = ref('')
const unitFilter = ref(queryStringValue(route.query.unit))
const quantityMinFilter = ref(queryStringValue(route.query.quantity_min))
const quantityMaxFilter = ref(queryStringValue(route.query.quantity_max))
const historyOffset = computed(() => (historyPage.value - 1) * historyPageSize)

const granularityOptions: Array<{ label: string; value: Granularity }> = [
  { label: 'Día', value: 'day' },
  { label: 'Mes', value: 'month' },
]
const historyTypeOptions = [
  { label: 'Compra', value: 'purchase' },
  { label: 'Consumo', value: 'consumption' },
  { label: 'Entrada', value: 'entry' },
  { label: 'Ajuste', value: 'adjustment' },
  { label: 'Pérdida', value: 'loss' },
  { label: 'Movimiento', value: 'movement' },
]
const recordKindOptions = [
  { label: 'Orden', value: 'order' },
  { label: 'Compra', value: 'purchase' },
  { label: 'Sin registro', value: 'none' },
]

function queryStringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function routeDateRangeDates(): Date[] | null {
  const from = route.query.date_from
  const to = route.query.date_to
  if (typeof from !== 'string' || typeof to !== 'string') return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null

  const fromDate = dateAtNoon(from)
  const toDate = dateAtNoon(to)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return null
  return [fromDate, toDate]
}

const { data: reportData, error: fetchError, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['analytics', 'ingredient-report', currentTenant.value?.id, ingredientId.value, {
    from: dateRange.value.from,
    to: dateRange.value.to,
    limit: historyPageSize,
    offset: historyOffset.value,
    historyType: historyTypeFilter.value || null,
    recordKind: recordKindFilter.value || null,
    unit: unitFilter.value || null,
    quantityMin: quantityMinFilter.value || null,
    quantityMax: quantityMaxFilter.value || null,
  }],
  query: () => $fetch(`/api/analytics/ingredients/${encodeURIComponent(ingredientId.value)}/report`, {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      limit: historyPageSize,
      offset: historyOffset.value,
      history_type: historyTypeFilter.value || undefined,
      record_kind: recordKindFilter.value || undefined,
      unit: unitFilter.value || undefined,
      quantity_min: quantityMinFilter.value || undefined,
      quantity_max: quantityMaxFilter.value || undefined,
    },
  }),
  enabled: () => !!currentTenant.value && !!ingredientId.value,
  staleTime: 30_000,
})

const report = computed<IngredientReport>(() => ((reportData.value as any)?.data ?? {}) as IngredientReport)
const ingredient = computed(() => report.value.ingredient ?? {})
const reportPeriod = computed(() => report.value.period ?? null)
const metrics = computed(() => ({
  consumed_quantity: numberOrZero(report.value.metrics?.consumed_quantity),
  purchase_quantity: numberOrZero(report.value.metrics?.purchase_quantity),
  estimated_consumed_cost: numberOrZero(report.value.metrics?.estimated_consumed_cost),
  weighted_avg_cost_per_unit: numberOrNull(report.value.metrics?.weighted_avg_cost_per_unit),
  latest_cost_per_unit: numberOrNull(report.value.metrics?.latest_cost_per_unit),
  latest_cost_at: report.value.metrics?.latest_cost_at ?? null,
  cost_basis: report.value.metrics?.cost_basis ?? null,
  cost_variation_pct: numberOrNull(report.value.metrics?.cost_variation_pct),
  movement_count: numberOrZero(report.value.metrics?.movement_count),
  data_coverage: report.value.metrics?.data_coverage ?? report.value.data_coverage ?? 'no_recorded_consumption',
}))

const selectedSeries = computed<SeriesPoint[]>(() => report.value.series?.[granularity.value] ?? [])
const isLoading = computed(() => queryStatus.value === 'pending' && !reportData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && reportData.value != null)
const hasActiveFilters = computed(() =>
  !!dateRangeDates.value
  || !!localSearchTerm.value
  || !!appliedSearch.value
  || granularity.value !== 'day'
  || !!historyTypeFilter.value
  || !!recordKindFilter.value
  || !!unitFilter.value
  || !!quantityMinFilter.value
  || !!quantityMaxFilter.value,
)
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

const ingredientName = computed(() => ingredient.value.name || 'Ingrediente')
const ingredientCategory = computed(() => ingredient.value.category || 'Sin categoría')
const ingredientUnit = computed(() => ingredient.value.unit || 'und')
const displayIngredientUnit = computed(() => formatUnitLabel(ingredientUnit.value))
const periodLabel = computed(() => {
  if (!reportPeriod.value?.from || !reportPeriod.value?.to) return 'Periodo actual'
  return `${formatCalendarDate(reportPeriod.value.from)} - ${formatCalendarDate(reportPeriod.value.to)}`
})
const chartSubtitle = computed(() => granularity.value === 'day' ? 'Agrupado por día' : 'Agrupado por mes')
const latestCostLabel = computed(() => metrics.value.latest_cost_at ? formatDateTime(metrics.value.latest_cost_at) : 'Sin costo reciente')
const costBasisLabel = computed(() => {
  if (metrics.value.cost_basis === 'weighted_avg_purchase_cost') return 'Costo ponderado'
  if (metrics.value.cost_basis === 'latest_movement_cost') return 'Último movimiento'
  return 'Sin base de costo'
})

const chartCategories = computed(() =>
  selectedSeries.value.map((point) => formatSeriesPeriod(point.period))
)

const consumptionChartSeries = computed(() => [
  {
    name: 'Consumo',
    data: selectedSeries.value.map((point) => numberOrZero(point.consumed_quantity)),
  },
])

const costChartSeries = computed(() => [
  {
    name: 'Costo estimado',
    data: selectedSeries.value.map((point) => numberOrZero(point.estimated_consumed_cost)),
  },
  {
    name: 'Costo unitario',
    data: selectedSeries.value.map((point) => numberOrZero(point.unit_cost)),
  },
])

const consumptionChartOptions = computed(() => chartOptions({
  categories: chartCategories.value,
  type: 'area',
  colors: [hslToken('--state-info-icon', '#2563eb')],
  valueFormatter: (value: number) => `${formatQuantity(value)} ${displayIngredientUnit.value}`,
}))

const costChartOptions = computed(() => chartOptions({
  categories: chartCategories.value,
  type: 'line',
  colors: [
    hslToken('--state-success-icon', '#16a34a'),
    hslToken('--state-warning-icon', '#d97706'),
  ],
  valueFormatter: (value: number) => formatCurrency(value),
}))

const historyRows = computed<HistoryRow[]>(() => {
  const purchases = (report.value.purchases ?? []).map(purchaseHistoryRow)
  const movements = (report.value.stock_movements ?? []).map(movementHistoryRow)

  return [...purchases, ...movements].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
})

const filteredHistoryRows = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  if (!q) return historyRows.value
  return historyRows.value.filter((row) => row.searchText.includes(q))
})
const historyUnits = computed(() => {
  const values = new Set<string>()
  if (ingredientUnit.value) values.add(ingredientUnit.value)
  const purchases = report.value.purchases ?? []
  const movements = report.value.stock_movements ?? []
  purchases.forEach((row) => {
    const unit = row.purchase_unit || row.base_unit
    if (unit) values.add(unit)
  })
  movements.forEach((row) => {
    if (row.unit) values.add(row.unit)
  })
  return Array.from(values).sort()
})
const unitHeaderOptions = computed(() =>
  historyUnits.value.map((unit) => ({ label: formatUnitLabel(unit), value: unit })),
)
const historyPagination = computed(() => report.value.history_pagination ?? null)
const activeHistoryPagination = computed(() => historyPagination.value ?? lastResolvedHistoryPagination.value)
const reportHistoryPage = computed(() => {
  const limit = Number(historyPagination.value?.limit) || historyPageSize
  const offset = Number(historyPagination.value?.offset) || 0
  return Math.floor(offset / limit) + 1
})
const isHistoryPageLoading = computed(() =>
  reportData.value != null
    && pendingHistoryPage.value === historyPage.value
    && reportHistoryPage.value !== pendingHistoryPage.value,
)
const historyTotal = computed(() =>
  activeHistoryPagination.value?.total == null
    ? filteredHistoryRows.value.length
    : Number(activeHistoryPagination.value.total),
)
const historyTotalPages = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyPageSize)))
const historyStartItem = computed(() => historyTotal.value === 0 ? 0 : historyOffset.value + 1)
const historyEndItem = computed(() => Math.min(historyOffset.value + filteredHistoryRows.value.length, historyTotal.value))
const canChangeHistoryPage = computed(() => pendingHistoryPage.value === null && queryAsyncStatus.value !== 'loading')
const canPreviousHistoryPage = computed(() => canChangeHistoryPage.value && historyPage.value > 1)
const canNextHistoryPage = computed(() =>
  canChangeHistoryPage.value
  && (Boolean(activeHistoryPagination.value?.has_more) || historyPage.value < historyTotalPages.value),
)

function historyPaginationDebugSnapshot() {
  const reportLimit = Number(historyPagination.value?.limit) || historyPageSize
  const reportOffset = Number(historyPagination.value?.offset) || 0
  const apiTotal = historyPagination.value?.total == null ? null : Number(historyPagination.value.total)
  const apiTotalPages = apiTotal == null ? null : Math.max(1, Math.ceil(apiTotal / reportLimit))
  const stableTotal = lastResolvedHistoryPagination.value?.total == null ? null : Number(lastResolvedHistoryPagination.value.total)
  const stableTotalPages = stableTotal == null ? null : Math.max(1, Math.ceil(stableTotal / historyPageSize))

  return {
    queryAsyncStatus: queryAsyncStatus.value,
    queryStatus: queryStatus.value,
    requestedPage: historyPage.value,
    requestedOffset: historyOffset.value,
    pendingHistoryPage: pendingHistoryPage.value,
    reportHistoryPage: reportHistoryPage.value,
    currentPageOverTotal: `${historyPage.value}/${historyTotalPages.value}`,
    reportPageOverApiTotal: apiTotalPages == null ? `${reportHistoryPage.value}/unknown` : `${reportHistoryPage.value}/${apiTotalPages}`,
    reportOffset,
    reportLimit,
    apiTotal,
    apiTotalPages,
    stableTotal,
    stableTotalPages,
    total: historyTotal.value,
    totalPages: historyTotalPages.value,
    rows: filteredHistoryRows.value.length,
    rawPurchases: report.value.purchases?.length ?? 0,
    rawMovements: report.value.stock_movements?.length ?? 0,
    hasReportData: reportData.value != null,
    isHistoryPageLoading: isHistoryPageLoading.value,
  }
}

const historyColumns = [
  { key: 'date', title: 'Fecha', sortable: false, format: 'text', align: 'left' },
  { key: 'type', title: 'Tipo', sortable: false, format: 'text', align: 'center' },
  { key: 'detail', title: 'Registro', sortable: false, format: 'text', align: 'left' },
  { key: 'quantity', title: 'Cantidad', sortable: false, format: 'text', align: 'right' },
  { key: 'unit', title: 'Unidad', sortable: false, format: 'text', align: 'center' },
  { key: 'cost', title: 'Costo', sortable: false, format: 'text', align: 'right' },
] as const

function historyMobileRowClass(index: number) {
  return index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'
}

useHead(() => ({
  title: `${ingredientName.value} | Analítica de Ingredientes`,
}))

watch([dateRangeDates, granularity], () => {
  lastUpdate.value = new Date()
})

watch([dateRangeDates, appliedSearch, historyTypeFilter, recordKindFilter, unitFilter, quantityMinFilter, quantityMaxFilter], () => {
  console.log('[ingredient-history-pagination] filters changed, reset page', historyPaginationDebugSnapshot())
  pendingHistoryPage.value = null
  lastResolvedHistoryPagination.value = null
  historyPage.value = 1
})

watch([queryAsyncStatus, reportHistoryPage], ([status, reportPage], [previousStatus, previousReportPage]) => {
  console.log('[ingredient-history-pagination] query/page status changed', {
    previousStatus,
    status,
    previousReportPage,
    reportPage,
    ...historyPaginationDebugSnapshot(),
  })
  if (
    status === 'idle'
    && pendingHistoryPage.value !== null
    && reportPage === pendingHistoryPage.value
  ) {
    lastResolvedHistoryPagination.value = historyPagination.value
    console.log('[ingredient-history-pagination] pending page resolved', {
      resolvedPage: reportPage,
      ...historyPaginationDebugSnapshot(),
    })
    pendingHistoryPage.value = null
  }
})

watch(historyPagination, (pagination) => {
  if (!pagination) return
  lastResolvedHistoryPagination.value = pagination
}, { immediate: true })

watch(isHistoryPageLoading, (loading, previousLoading) => {
  console.log('[ingredient-history-pagination] local loader changed', {
    previousLoading,
    loading,
    ...historyPaginationDebugSnapshot(),
  })
})

watch(historyTotalPages, (totalPages) => {
  if (pendingHistoryPage.value !== null || queryStatus.value === 'pending') {
    console.log('[ingredient-history-pagination] total pages changed while page is pending, skip clamp', {
      totalPages,
      ...historyPaginationDebugSnapshot(),
    })
    return
  }
  if (historyPage.value > totalPages) historyPage.value = totalPages
})

watch(lastUpdate, () => {
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})

const handleRefresh = async () => {
  await refetch()
  lastUpdate.value = new Date()
}

onMounted(() => {
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  if (clearRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})

function performSearch() {
  applySearch()
}

function clearFilters() {
  clearSearch()
  clearDateRange()
  granularity.value = 'day'
  historyTypeFilter.value = ''
  recordKindFilter.value = ''
  unitFilter.value = ''
  quantityMinFilter.value = ''
  quantityMaxFilter.value = ''
  pendingHistoryPage.value = null
  lastResolvedHistoryPagination.value = null
  historyPage.value = 1
}

function goToHistoryPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), historyTotalPages.value)
  const isBlocked = pendingHistoryPage.value !== null || queryAsyncStatus.value === 'loading'
  console.log('[ingredient-history-pagination] page click', {
    requestedPageFromClick: page,
    nextPage,
    ignored: isBlocked || nextPage === historyPage.value,
    isBlocked,
    ...historyPaginationDebugSnapshot(),
  })
  if (isBlocked) return
  if (nextPage === historyPage.value) return
  pendingHistoryPage.value = nextPage
  historyPage.value = nextPage
  console.log('[ingredient-history-pagination] page state updated', historyPaginationDebugSnapshot())
}

function purchaseHistoryRow(row: PurchaseRow): HistoryRow {
  const timestamp = row.received_at || row.purchase_date || ''
  const quantity = row.purchase_quantity ?? row.base_quantity
  const unit = row.purchase_unit || row.base_unit || ingredientUnit.value
  const recordLabel = row.purchase_number ? `Compra ${row.purchase_number}` : 'Compra'
  const recordHref = purchaseLink(row)
  const costLabel = row.total_cost !== null && row.total_cost !== undefined
    ? formatCurrency(row.total_cost)
    : formatUnitCost(row.unit_cost)

  return {
    id: `purchase-${row.purchase_item_id || row.purchase_id || timestamp}`,
    timestamp,
    dateLabel: formatHistoryDate(timestamp),
    type: 'purchase',
    kindLabel: 'Compra',
    kindVariant: 'info',
    recordLabel,
    recordHref,
    quantityLabel: formatQuantity(quantity),
    unitLabel: formatUnitLabel(unit),
    costLabel,
    searchText: `${recordLabel} compra ${unit}`.toLowerCase(),
  }
}

function movementHistoryRow(row: MovementRow): HistoryRow {
  const movementType = row.movement_type || 'movement'
  const isConsumption = movementType === 'consumption' && numberOrZero(row.quantity_change) < 0
  const quantity = isConsumption ? row.consumed_quantity : row.quantity_change
  const recordLabel = movementRecordLabel(row)
  const recordHref = movementRecordLink(row)

  return {
    id: `movement-${row.id || row.created_at}`,
    timestamp: row.created_at || '',
    dateLabel: formatHistoryDate(row.created_at),
    type: 'movement',
    kindLabel: isConsumption ? 'Consumo' : movementKindLabel(movementType),
    kindVariant: isConsumption ? 'warning' : 'secondary',
    recordLabel,
    recordHref,
    quantityLabel: formatQuantity(quantity),
    unitLabel: formatUnitLabel(row.unit || ingredientUnit.value),
    costLabel: formatUnitCost(row.cost_per_unit),
    searchText: `${recordLabel} ${movementType} ${row.unit || ''}`.toLowerCase(),
  }
}

function purchaseLink(row: PurchaseRow): string | null {
  if (!row.purchase_id) return null
  if (row.is_direct_entry === false) return `/abastecimiento/compra/${row.purchase_id}`
  return `/abastecimiento/compras-directas/${row.purchase_id}`
}

function movementRecordLabel(row: MovementRow): string {
  if (row.reference_table === 'orders' && row.reference_order_number) {
    return `Orden #${row.reference_order_number}`
  }
  if (row.reference_table === 'orders') return 'Orden'
  return movementKindLabel(row.movement_type || 'movement')
}

function movementRecordLink(row: MovementRow): string | null {
  if (row.reference_table !== 'orders' || !row.reference_id) return null
  return `/ventas/${row.reference_id}`
}

function movementKindLabel(value: string): string {
  const labels: Record<string, string> = {
    purchase: 'Entrada',
    adjustment: 'Ajuste',
    loss: 'Pérdida',
  }
  return labels[value] ?? 'Movimiento'
}

function coverageLabel(value: Coverage): string {
  return value === 'recorded_movements' ? 'Registrado' : 'Sin consumo'
}

function coverageVariant(value: Coverage): 'success' | 'warning' {
  return value === 'recorded_movements' ? 'success' : 'warning'
}

function formatQuantity(value: number | string | null | undefined, maxFractionDigits = 2): string {
  return formatDomainQuantity(value, maxFractionDigits)
}

function formatUnitCost(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${formatCurrency(value)}/${displayIngredientUnit.value}`
}

function formatUnitLabel(value: string | null | undefined): string {
  const normalized = String(value || 'und').trim()
  const key = normalized.toLowerCase()
  const labels: Record<string, string> = {
    gramo: 'gr',
    gramos: 'gr',
    gram: 'gr',
    grams: 'gr',
    kilogramo: 'kg',
    kilogramos: 'kg',
    kilogram: 'kg',
    kilograms: 'kg',
    mililitro: 'ml',
    mililitros: 'ml',
    milliliter: 'ml',
    milliliters: 'ml',
    litro: 'lt',
    litros: 'lt',
    liter: 'lt',
    liters: 'lt',
    unidad: 'und',
    unidades: 'und',
    unit: 'und',
    units: 'und',
  }
  return labels[key] || normalized
}

function formatCostVariation(value: number | null): string {
  if (value === null) return '-'
  const percent = value * 100
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

function formatHistoryDate(value?: string | null): string {
  if (!value) return 'Sin fecha'
  return value.includes('T') ? formatDateTime(value) : formatCalendarDate(value)
}

function formatSeriesPeriod(value?: string | null): string {
  if (!value) return ''
  if (granularity.value === 'month') {
    const [year, month] = value.split('-')
    return month && year ? `${month}/${year.slice(2)}` : value
  }
  return formatCalendarDate(value)
}

function numberOrZero(value: number | string | null | undefined): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function numberOrNull(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function hslToken(name: string, fallback: string, seen = new Set<string>()): string {
  if (!import.meta.client) return fallback
  if (seen.has(name)) return fallback
  seen.add(name)

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const alias = value.match(/^var\((--[^)]+)\)$/)
  if (alias) return hslToken(alias[1], fallback, seen)

  return value ? `hsl(${value})` : fallback
}

function chartOptions(options: {
  categories: string[]
  type: 'area' | 'line'
  colors: string[]
  valueFormatter: (value: number) => string
}) {
  return {
    chart: {
      type: options.type,
      height: 260,
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: true },
      fontFamily: 'inherit',
    },
    colors: options.colors,
    stroke: {
      curve: 'smooth',
      width: options.type === 'area' ? 2 : [2, 2],
    },
    fill: options.type === 'area'
      ? {
          type: 'gradient',
          gradient: { type: 'vertical', opacityFrom: 0.22, opacityTo: 0.04 },
        }
      : { type: 'solid' },
    dataLabels: { enabled: false },
    markers: {
      size: 4,
      strokeColors: hslToken('--data-table-container-bg', '#fff'),
      strokeWidth: 2,
      hover: { size: 6 },
    },
    xaxis: {
      categories: options.categories,
      axisBorder: { color: hslToken('--data-table-border', '#e2e8f0') },
      axisTicks: { show: false },
      labels: {
        style: { colors: hslToken('--data-table-cell-muted', '#64748b'), fontSize: '11px' },
      },
      tooltip: { enabled: false },
    },
    yaxis: {
      labels: {
        style: { colors: hslToken('--data-table-cell-muted', '#64748b'), fontSize: '11px' },
        formatter: options.valueFormatter,
      },
    },
    grid: {
      borderColor: hslToken('--data-table-border', '#f1f5f9'),
      strokeDashArray: 4,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      padding: { left: 0, right: 8, top: 0, bottom: 0 },
    },
    tooltip: {
      shared: true,
      style: { fontSize: '12px' },
      y: {
        formatter: options.valueFormatter,
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '12px',
      labels: { colors: hslToken('--data-table-cell-text', '#0f172a') },
    },
  }
}
</script>
