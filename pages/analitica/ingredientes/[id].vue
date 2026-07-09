<template>
  <div class="flex flex-col gap-4 pb-20">
    <div v-if="isLoading" class="flex min-h-[400px] items-center justify-center">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <section class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div class="min-w-0">
          <NuxtLink
            to="/analitica/ingredientes"
            class="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <ArrowLeft class="h-4 w-4" aria-hidden="true" />
            Volver a ingredientes
          </NuxtLink>
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="truncate text-xl font-bold text-text-primary md:text-2xl">
              {{ ingredientName }}
            </h1>
            <UiStatusBadge
              :value="coverageLabel(metrics.data_coverage)"
              format="text"
              :variant="coverageVariant(metrics.data_coverage)"
              size="sm"
            />
          </div>
          <p class="mt-1 text-sm text-text-secondary">
            {{ ingredientCategory }} · {{ ingredientUnit }} · {{ periodLabel }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 text-xs text-text-secondary md:justify-end">
          <span class="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2">
            <CalendarDays class="h-4 w-4" aria-hidden="true" />
            {{ reportPeriod?.timezone || timezone }}
          </span>
          <span class="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-2">
            <PackageCheck class="h-4 w-4" aria-hidden="true" />
            {{ relatedProducts.length }} productos
          </span>
        </div>
      </section>

      <section class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          title="Consumo"
          :value="formatQuantity(metrics.consumed_quantity)"
          format="text"
          variant="primary"
          :subtitle="ingredientUnit"
        />
        <MetricCard
          title="Costo estimado"
          :value="formatCurrency(metrics.estimated_consumed_cost)"
          format="text"
          variant="primary"
          :subtitle="costBasisLabel"
        />
        <MetricCard
          title="Costo promedio"
          :value="formatUnitCost(metrics.weighted_avg_cost_per_unit)"
          format="text"
          variant="primary"
          subtitle="Compra ponderada"
        />
        <MetricCard
          title="Último costo"
          :value="formatUnitCost(metrics.latest_cost_per_unit)"
          format="text"
          variant="primary"
          :subtitle="latestCostLabel"
        />
        <MetricCard
          title="Variación"
          :value="formatCostVariation(metrics.cost_variation_pct)"
          format="text"
          variant="primary"
          subtitle="Primera vs última compra"
        />
        <MetricCard
          title="Movimientos"
          :value="metrics.movement_count"
          format="number"
          variant="primary"
          :subtitle="coverageLabel(metrics.data_coverage)"
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

      <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div class="min-w-0">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 class="text-base font-bold text-text-primary">Historial analítico</h2>
              <p class="text-xs text-text-secondary">Consumos, compras y movimientos del periodo.</p>
            </div>
            <span class="text-xs font-semibold text-text-secondary">{{ filteredHistoryRows.length }} eventos</span>
          </div>

          <UiResponsiveDataView
            row-size="sm"
            :columns="historyColumns"
            :data="filteredHistoryRows"
            item-key="id"
            empty-message="Sin historial para este periodo"
            empty-sub-message="No hay compras ni movimientos analíticos con los filtros actuales"
          >
            <template #card="{ item }">
              <div class="rounded-lg border border-border bg-background p-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="font-semibold text-text-primary">{{ item.title }}</p>
                    <p class="mt-1 text-xs text-text-secondary">{{ item.subtitle }}</p>
                  </div>
                  <UiStatusBadge
                    :value="item.kindLabel"
                    format="text"
                    :variant="item.kindVariant"
                    size="sm"
                    class="flex-shrink-0"
                  />
                </div>
                <div class="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p class="text-xs text-text-secondary">Cantidad</p>
                    <p class="font-semibold tabular-nums text-text-primary">{{ item.quantityLabel }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-text-secondary">Costo</p>
                    <p class="font-semibold tabular-nums text-text-primary">{{ item.costLabel }}</p>
                  </div>
                </div>
              </div>
            </template>

            <template #cell-date="{ item }">
              <span class="text-sm text-text-secondary">{{ item.dateLabel }}</span>
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
                <p class="text-sm font-semibold text-text-primary">{{ item.title }}</p>
                <p class="text-xs text-text-secondary">{{ item.subtitle }}</p>
              </div>
            </template>

            <template #cell-quantity="{ item }">
              <span class="text-sm font-semibold tabular-nums text-text-primary">{{ item.quantityLabel }}</span>
            </template>

            <template #cell-cost="{ item }">
              <span class="text-sm tabular-nums text-text-primary">{{ item.costLabel }}</span>
            </template>
          </UiResponsiveDataView>
        </div>

        <aside class="flex flex-col gap-4">
          <div class="rounded-lg border border-border bg-background p-4">
            <h2 class="text-base font-bold text-text-primary">Stock</h2>
            <dl class="mt-3 space-y-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <dt class="text-text-secondary">Actual</dt>
                <dd class="font-semibold tabular-nums text-text-primary">{{ stockQuantityLabel(stock.current_stock) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-text-secondary">Mínimo</dt>
                <dd class="tabular-nums text-text-primary">{{ stockQuantityLabel(stock.minimum_stock) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-text-secondary">Máximo</dt>
                <dd class="tabular-nums text-text-primary">{{ stockQuantityLabel(stock.maximum_stock) }}</dd>
              </div>
              <div class="flex items-center justify-between gap-3">
                <dt class="text-text-secondary">Ubicación</dt>
                <dd class="truncate text-text-primary">{{ stock.location || 'No especificada' }}</dd>
              </div>
            </dl>
          </div>

          <div class="rounded-lg border border-border bg-background p-4">
            <h2 class="text-base font-bold text-text-primary">Productos relacionados</h2>
            <div v-if="relatedProducts.length === 0" class="mt-3 text-sm text-text-secondary">
              No hay productos relacionados en el reporte.
            </div>
            <ul v-else class="mt-3 space-y-3">
              <li
                v-for="product in relatedProducts"
                :key="product.product_id"
                class="border-b border-border pb-3 last:border-b-0 last:pb-0"
              >
                <p class="truncate text-sm font-semibold text-text-primary">{{ product.product_name }}</p>
                <p class="mt-0.5 text-xs text-text-secondary">
                  {{ relationLabel(product.relation_type) }} · {{ formatQuantity(product.quantity) }} {{ product.unit || ingredientUnit }}
                </p>
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, BarChart3, CalendarDays, LineChart, PackageCheck } from 'lucide-vue-next'
import MetricCard from '~/components/shared/MetricCard.vue'
import { useFormatters } from '~/composables/useFormatters'
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
  stock?: StockContext
  related_products?: RelatedProduct[]
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
  reason?: string | null
  notes?: string | null
  created_at?: string | null
}

type StockContext = {
  current_stock?: number | null
  minimum_stock?: number | null
  maximum_stock?: number | null
  last_updated?: string | null
  location?: string | null
}

type RelatedProduct = {
  product_id: string
  product_name: string
  relation_type?: string | null
  quantity?: number | null
  unit?: string | null
}

type HistoryRow = {
  id: string
  timestamp: string
  dateLabel: string
  type: 'purchase' | 'movement'
  kindLabel: string
  kindVariant: 'success' | 'warning' | 'info' | 'secondary'
  title: string
  subtitle: string
  quantityLabel: string
  costLabel: string
  searchText: string
}

definePageMeta({ layout: 'dashboard', module: 'analitica' })

const route = useRoute()
const { currentTenant } = useTenantReactive()
const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { formatCalendarDate, formatCurrency, formatDateTime } = useFormatters()
const { timezone } = useTenantTimezone()
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

const ingredientId = computed(() => String(route.params.id || ''))
const granularity = ref<Granularity>('day')
const lastUpdate = ref(new Date())

const granularityOptions: Array<{ label: string; value: Granularity }> = [
  { label: 'Día', value: 'day' },
  { label: 'Mes', value: 'month' },
]

const { data: reportData, error: fetchError, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['analytics', 'ingredient-report', currentTenant.value?.id, ingredientId.value, {
    from: dateRange.value.from,
    to: dateRange.value.to,
  }],
  query: () => $fetch(`/api/analytics/ingredients/${encodeURIComponent(ingredientId.value)}/report`, {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      limit: 200,
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

const stock = computed<StockContext>(() => report.value.stock ?? {})
const relatedProducts = computed<RelatedProduct[]>(() => report.value.related_products ?? [])
const selectedSeries = computed<SeriesPoint[]>(() => report.value.series?.[granularity.value] ?? [])
const isLoading = computed(() => queryStatus.value === 'pending' && !reportData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && reportData.value != null)
const hasActiveFilters = computed(() => !!dateRangeDates.value || !!localSearchTerm.value || !!appliedSearch.value || granularity.value !== 'day')
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

const ingredientName = computed(() => ingredient.value.name || 'Ingrediente')
const ingredientCategory = computed(() => ingredient.value.category || 'Sin categoría')
const ingredientUnit = computed(() => ingredient.value.unit || 'und')
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
  valueFormatter: (value: number) => `${formatQuantity(value)} ${ingredientUnit.value}`,
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

const historyColumns = [
  { key: 'date', title: 'Fecha', sortable: false, format: 'text', align: 'left' },
  { key: 'type', title: 'Tipo', sortable: false, format: 'text', align: 'center' },
  { key: 'detail', title: 'Detalle', sortable: false, format: 'text', align: 'left' },
  { key: 'quantity', title: 'Cantidad', sortable: false, format: 'text', align: 'right' },
  { key: 'cost', title: 'Costo', sortable: false, format: 'text', align: 'right' },
] as const

useHead(() => ({
  title: `${ingredientName.value} | Analítica de Ingredientes`,
}))

watch([dateRangeDates, granularity], () => {
  lastUpdate.value = new Date()
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
}

function purchaseHistoryRow(row: PurchaseRow): HistoryRow {
  const timestamp = row.received_at || row.purchase_date || ''
  const quantity = row.purchase_quantity ?? row.base_quantity
  const unit = row.purchase_unit || row.base_unit || ingredientUnit.value
  const title = row.purchase_number ? `Compra ${row.purchase_number}` : 'Compra registrada'
  const subtitle = row.received_at ? `Recibida ${formatDateTime(row.received_at)}` : 'Compra del periodo'
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
    title,
    subtitle,
    quantityLabel: `${formatQuantity(quantity)} ${unit}`,
    costLabel,
    searchText: `${title} ${subtitle} compra ${unit}`.toLowerCase(),
  }
}

function movementHistoryRow(row: MovementRow): HistoryRow {
  const movementType = row.movement_type || 'movement'
  const isConsumption = movementType === 'consumption' && numberOrZero(row.quantity_change) < 0
  const quantity = isConsumption ? row.consumed_quantity : row.quantity_change
  const title = movementTitle(row)
  const subtitle = [row.reason, row.notes, row.reference_table].filter(Boolean).join(' · ') || 'Movimiento de inventario analítico'

  return {
    id: `movement-${row.id || row.created_at}`,
    timestamp: row.created_at || '',
    dateLabel: formatHistoryDate(row.created_at),
    type: 'movement',
    kindLabel: isConsumption ? 'Consumo' : movementKindLabel(movementType),
    kindVariant: isConsumption ? 'warning' : 'secondary',
    title,
    subtitle,
    quantityLabel: `${formatQuantity(quantity)} ${row.unit || ingredientUnit.value}`,
    costLabel: formatUnitCost(row.cost_per_unit),
    searchText: `${title} ${subtitle} ${movementType} ${row.unit || ''}`.toLowerCase(),
  }
}

function movementTitle(row: MovementRow): string {
  if (row.movement_type === 'consumption') return 'Consumo registrado'
  if (row.movement_type === 'purchase') return 'Entrada por compra'
  if (row.movement_type === 'adjustment') return 'Ajuste de stock'
  if (row.movement_type === 'loss') return 'Pérdida registrada'
  return 'Movimiento de stock'
}

function movementKindLabel(value: string): string {
  const labels: Record<string, string> = {
    purchase: 'Entrada',
    adjustment: 'Ajuste',
    loss: 'Pérdida',
  }
  return labels[value] ?? 'Movimiento'
}

function relationLabel(value?: string | null): string {
  if (value === 'direct_recipe') return 'Receta directa'
  if (value === 'base_recipe') return 'Receta base'
  return 'Relacionado'
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
  return `${formatCurrency(value)}/${ingredientUnit.value}`
}

function formatCostVariation(value: number | null): string {
  if (value === null) return '-'
  const percent = value * 100
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

function stockQuantityLabel(value: number | null | undefined): string {
  return `${formatQuantity(value)} ${ingredientUnit.value}`
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
