<template>
  <div class="flex flex-col gap-3 md:gap-4 pb-20">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
      <section class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4 mb-6">
        <MetricCard
          title="Ingredientes"
          :value="summary.totalIngredients"
          format="number"
          variant="primary"
          :subtitle="summary.periodLabel"
        />
        <MetricCard
          title="Costo estimado"
          :value="summary.estimatedCostLabel"
          format="text"
          variant="primary"
          :subtitle="`${summary.movementCount} movimientos`"
        />
        <MetricCard
          title="Con consumo"
          :value="summary.recordedRows"
          format="number"
          variant="primary"
          :subtitle="`${summary.coveragePct}% con movimientos`"
        />
        <MetricCard
          title="Variación costo"
          :value="summary.avgCostVariationPct"
          format="percentage"
          :precision="1"
          variant="primary"
          subtitle="Último vs promedio base"
        />
      </section>

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        search-placeholder="Buscar ingrediente..."
        :search-fields="[]"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="ingredientFilter"
            :class="[filterSelectClass, 'w-full sm:w-52 md:hidden']"
            aria-label="Filtrar por ingrediente"
          >
            <option value="">Ingrediente</option>
            <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
              {{ ingredient.name }}
            </option>
          </select>

          <select
            v-model="categoryFilter"
            :class="[filterSelectClass, 'w-full sm:w-40 md:hidden']"
            aria-label="Filtrar por categoría"
          >
            <option value="">Categoría</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>

          <select
            v-model="sortOption"
            :class="[filterSelectClass, 'w-full sm:w-56 md:hidden']"
            aria-label="Ordenar ingredientes"
          >
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <UiResponsiveDataView
        row-size="sm"
        :columns="ingredientTableColumns"
        :data="displayRows"
        item-key="ingredient_id"
        empty-message="No hay consumo de ingredientes"
        empty-sub-message="No se encontraron movimientos de consumo o compras para el periodo seleccionado"
        :sort-field="tableSortField"
        :sort-direction="tableSortDirection"
        variant="default"
        @sort="handleTableSort"
        @row-click="openIngredientMovements"
      >
        <template #card="{ item, index }">
          <div
            class="flex items-start gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-text-primary truncate">{{ item.ingredient_name }}</span>
                <UiStatusBadge
                  :value="coverageLabel(item.data_coverage)"
                  format="text"
                  :variant="coverageVariant(item.data_coverage)"
                  size="sm"
                  class="flex-shrink-0"
                />
              </div>
              <p class="text-xs text-text-secondary mt-1">
                {{ item.category || 'Sin categoría' }} · {{ formatQuantity(item.consumed_quantity) }} {{ item.unit || 'und' }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-sm font-bold text-text-primary">{{ formatCurrency(item.estimated_consumed_cost) }}</span>
              <span class="text-xs text-text-secondary">{{ formatUnitCost(item.weighted_avg_cost_per_unit, item.unit) }}</span>
              <NuxtLink
                :to="ingredientMovementsPath(item.ingredient_id)"
                class="mt-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                aria-label="Ver movimientos del ingrediente"
              >
                Ver movimientos
              </NuxtLink>
            </div>
          </div>
        </template>

        <template #header-ingredient_name>
          <UiTableHeaderFilter
            v-model="ingredientFilter"
            title="Ingrediente"
            column-key="ingredient_name"
            sortable
            :sort-field="tableSortField"
            :sort-direction="tableSortDirection"
            filter-type="select"
            :options="ingredientHeaderOptions"
            all-label="Ingrediente"
            align="left"
            @sort="handleTableSort"
          />
        </template>

        <template #header-category>
          <UiTableHeaderFilter
            v-model="categoryFilter"
            title="Categoría"
            filter-type="select"
            :options="categoryHeaderOptions"
            all-label="Categoría"
            align="left"
          />
        </template>

        <template #header-consumed_quantity>
          <UiTableHeaderFilter
            title="Consumo"
            column-key="consumed_quantity"
            sortable
            :sort-field="tableSortField"
            :sort-direction="tableSortDirection"
            filter-type="none"
            align="right"
            @sort="handleTableSort"
          />
        </template>

        <template #header-estimated_consumed_cost>
          <UiTableHeaderFilter
            title="Costo estimado"
            column-key="estimated_consumed_cost"
            sortable
            :sort-field="tableSortField"
            :sort-direction="tableSortDirection"
            filter-type="none"
            align="right"
            @sort="handleTableSort"
          />
        </template>

        <template #cell-ingredient_name="{ item }">
          <div class="min-w-0">
            <span class="text-sm font-bold text-text-primary">{{ item.ingredient_name }}</span>
          </div>
        </template>

        <template #cell-category="{ value }">
          <span class="text-sm text-text-secondary">{{ value || 'Sin categoría' }}</span>
        </template>

        <template #cell-consumed_quantity="{ item }">
          <span class="text-sm font-bold tabular-nums text-text-primary">
            {{ formatQuantity(item.consumed_quantity) }} {{ item.unit || '' }}
          </span>
        </template>

        <template #cell-estimated_consumed_cost="{ value }">
          <span class="text-sm font-bold tabular-nums text-text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-weighted_avg_cost_per_unit="{ item }">
          <span class="text-sm tabular-nums text-text-primary">
            {{ formatUnitCost(item.weighted_avg_cost_per_unit, item.unit) }}
          </span>
        </template>

        <template #cell-latest_cost_per_unit="{ item }">
          <span class="text-sm tabular-nums text-text-secondary">
            {{ formatUnitCost(item.latest_cost_per_unit, item.unit) }}
          </span>
        </template>

        <template #cell-cost_trend="{ item }">
          <span
            class="text-sm font-semibold tabular-nums"
            :class="costTrendClass(item.cost_trend_pct)"
          >
            {{ formatCostTrend(item.cost_trend_pct) }}
          </span>
        </template>

        <template #cell-movement_count="{ value }">
          <span class="text-sm tabular-nums text-text-secondary">{{ formatQuantity(value, 0) }}</span>
        </template>

        <template #cell-data_coverage="{ value }">
          <UiStatusBadge
            :value="coverageLabel(value)"
            format="text"
            :variant="coverageVariant(value)"
            size="sm"
          />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center">
            <NuxtLink
              :to="ingredientMovementsPath(row.ingredient_id)"
              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface-secondary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
              title="Ver movimientos"
              aria-label="Ver movimientos del ingrediente"
              @click.stop
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5h6M9 9h6M9 13h6m-8 6h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </NuxtLink>
          </div>
        </template>
      </UiResponsiveDataView>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { es } from 'date-fns/locale'
import { formatDistanceToNow } from 'date-fns'
import MetricCard from '~/components/shared/MetricCard.vue'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import { filterSelectClass } from '~/composables/useFilterSelectClass'
import { useFormatters } from '~/composables/useFormatters'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

type IngredientAnalyticsRow = {
  ingredient_id: string
  ingredient_name: string
  category?: string | null
  unit?: string | null
  consumed_quantity: number
  purchase_quantity: number
  latest_cost_per_unit: number | null
  latest_cost_at?: string | null
  weighted_avg_cost_per_unit: number | null
  estimated_consumed_cost: number
  movement_count: number
  data_coverage: 'recorded_movements' | 'no_recorded_consumption' | string
}

type DisplayRow = IngredientAnalyticsRow & {
  cost_trend_pct: number | null
}

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const { formatCurrency } = useFormatters()
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

useHead({ title: 'Analítica de Ingredientes' })

const ingredientFilter = ref('')
const categoryFilter = ref('')
const sortOption = ref('estimated_consumed_cost_desc')
const lastUpdate = ref<Date>(new Date())

const sortOptions = [
  { value: 'estimated_consumed_cost_desc', label: 'Mayor costo estimado' },
  { value: 'consumed_quantity_desc', label: 'Mayor consumo' },
  { value: 'latest_cost_per_unit_desc', label: 'Mayor ultimo costo' },
  { value: 'weighted_avg_cost_per_unit_desc', label: 'Mayor costo promedio' },
  { value: 'ingredient_name_asc', label: 'Ingrediente A-Z' },
]

const SORT_TO_TABLE: Record<string, { field: string; direction: 'asc' | 'desc' }> = {
  estimated_consumed_cost_desc: { field: 'estimated_consumed_cost', direction: 'desc' },
  estimated_consumed_cost_asc: { field: 'estimated_consumed_cost', direction: 'asc' },
  consumed_quantity_desc: { field: 'consumed_quantity', direction: 'desc' },
  consumed_quantity_asc: { field: 'consumed_quantity', direction: 'asc' },
  ingredient_name_asc: { field: 'ingredient_name', direction: 'asc' },
  ingredient_name_desc: { field: 'ingredient_name', direction: 'desc' },
  latest_cost_per_unit_desc: { field: 'latest_cost_per_unit', direction: 'desc' },
  weighted_avg_cost_per_unit_desc: { field: 'weighted_avg_cost_per_unit', direction: 'desc' },
}

const TABLE_SORT_TO_API: Record<string, { asc: string; desc: string }> = {
  ingredient_name: { asc: 'ingredient_name_asc', desc: 'ingredient_name_desc' },
  consumed_quantity: { asc: 'consumed_quantity_asc', desc: 'consumed_quantity_desc' },
  estimated_consumed_cost: { asc: 'estimated_consumed_cost_asc', desc: 'estimated_consumed_cost_desc' },
}

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!dateRangeDates.value
    || !!ingredientFilter.value
    || !!categoryFilter.value
    || sortOption.value !== 'estimated_consumed_cost_desc',
)

const performSearch = () => applySearch()

function handleTableSort(event: string | { field: string; direction?: 'asc' | 'desc' }) {
  const field = typeof event === 'string' ? event : event.field
  const supportedSort = TABLE_SORT_TO_API[field]
  if (!supportedSort) return

  const direction =
    typeof event === 'object' && event.direction
      ? event.direction
      : tableSortField.value === field && tableSortDirection.value === 'asc'
        ? 'desc'
        : 'asc'

  sortOption.value = supportedSort[direction]
}

const { data: ingredientsData } = useQuery({
  key: () => ['analytics', 'ingredients-lookup', currentTenant.value?.id],
  query: () => $fetch('/api/suppliers/ingredients', { params: { limit: INGREDIENTS_FETCH_LIMIT } }),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})

const ingredients = computed(() => {
  const rows = (ingredientsData.value as any)?.data ?? []
  return rows
    .map((item: any) => ({ id: item.id, name: item.name, category: item.category }))
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
})

const categories = computed(() => {
  const values = new Set<string>()
  ingredients.value.forEach((ingredient: any) => {
    if (ingredient.category) values.add(ingredient.category)
  })
  rows.value.forEach((item) => {
    if (item.category) values.add(item.category)
  })
  return Array.from(values).sort()
})
const ingredientHeaderOptions = computed(() =>
  ingredients.value.map((ingredient: any) => ({ label: ingredient.name, value: ingredient.id })),
)
const categoryHeaderOptions = computed(() =>
  categories.value.map((category) => ({ label: category, value: category })),
)

const { data: analyticsData, error: fetchError, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['analytics', 'ingredients-summary', currentTenant.value?.id, {
    from: dateRange.value.from,
    to: dateRange.value.to,
    ingredient: ingredientFilter.value || null,
    category: categoryFilter.value || null,
    sort: sortOption.value,
  }],
  query: () => $fetch('/api/analytics/ingredients/summary', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      ingredient_id: ingredientFilter.value || undefined,
      category: categoryFilter.value || undefined,
      limit: 200,
      sort: sortOption.value,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const rows = computed<IngredientAnalyticsRow[]>(() => ((analyticsData.value as any)?.data?.items ?? []))
const period = computed(() => (analyticsData.value as any)?.data?.period ?? null)
const isLoading = computed(() => queryStatus.value === 'pending' && !analyticsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && analyticsData.value != null)
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))
const tableSortState = computed(() => SORT_TO_TABLE[sortOption.value] ?? SORT_TO_TABLE.consumed_quantity_desc)
const tableSortField = computed(() => tableSortState.value.field)
const tableSortDirection = computed(() => tableSortState.value.direction)

const displayRows = computed<DisplayRow[]>(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  return rows.value
    .filter((item) => !q || item.ingredient_name.toLowerCase().includes(q))
    .map((item) => ({
      ...item,
      cost_trend_pct: costTrendPct(item),
    }))
})

const summary = computed(() => {
  const totalIngredients = displayRows.value.length
  const estimatedCost = displayRows.value.reduce((sum, item) => sum + (Number(item.estimated_consumed_cost) || 0), 0)
  const movementCount = displayRows.value.reduce((sum, item) => sum + (Number(item.movement_count) || 0), 0)
  const recordedRows = displayRows.value.filter((item) => item.data_coverage === 'recorded_movements').length
  const costVariations = displayRows.value
    .map((item) => item.cost_trend_pct)
    .filter((value): value is number => value !== null)
    .map((value) => Math.abs(value))

  const periodLabel = period.value?.from && period.value?.to
    ? `${period.value.from} a ${period.value.to}`
    : 'Período actual'

  return {
    totalIngredients,
    estimatedCostLabel: formatCurrency(estimatedCost),
    movementCount,
    recordedRows,
    coveragePct: totalIngredients ? Math.round((recordedRows / totalIngredients) * 100) : 0,
    avgCostVariationPct: costVariations.length
      ? costVariations.reduce((sum, value) => sum + value, 0) / costVariations.length
      : 0,
    periodLabel,
  }
})

watch([dateRangeDates, ingredientFilter, categoryFilter, sortOption], () => {
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

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  ingredientFilter.value = ''
  categoryFilter.value = ''
  sortOption.value = 'estimated_consumed_cost_desc'
}

const ingredientTableColumns = [
  { key: 'ingredient_name', title: 'Ingrediente', sortable: false, format: 'text', align: 'left' },
  { key: 'category', title: 'Categoría', sortable: false, format: 'text', align: 'left' },
  { key: 'consumed_quantity', title: 'Consumo', sortable: false, format: 'text', align: 'right' },
  { key: 'estimated_consumed_cost', title: 'Costo estimado', sortable: false, format: 'text', align: 'right' },
  { key: 'weighted_avg_cost_per_unit', title: 'Costo prom.', sortable: false, format: 'text', align: 'right' },
  { key: 'latest_cost_per_unit', title: 'Último costo', sortable: false, format: 'text', align: 'right' },
  { key: 'cost_trend', title: 'Tendencia', sortable: false, format: 'text', align: 'right' },
  { key: 'movement_count', title: 'Mov.', sortable: false, format: 'text', align: 'right' },
  { key: 'data_coverage', title: 'Cobertura', sortable: false, format: 'text', align: 'center' },
  { key: 'actions', title: '', sortable: false, format: 'text', align: 'center' },
] as const

function ingredientMovementsPath(ingredientId: string): string {
  return `/abastecimiento/movimientos?ingredient_id=${encodeURIComponent(ingredientId)}`
}

function openIngredientMovements(row: DisplayRow): void {
  navigateTo(ingredientMovementsPath(row.ingredient_id))
}

function costTrendPct(item: IngredientAnalyticsRow): number | null {
  const latest = Number(item.latest_cost_per_unit)
  const average = Number(item.weighted_avg_cost_per_unit)
  if (!Number.isFinite(latest) || !Number.isFinite(average) || average <= 0) return null
  return ((latest - average) / average) * 100
}

function formatQuantity(value: number | string | null | undefined, maxFractionDigits = 2): string {
  return formatDomainQuantity(value, maxFractionDigits)
}

function formatUnitCost(value: number | null | undefined, unit: string | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return `${formatCurrency(value)}/${unit || 'und'}`
}

function formatCostTrend(value: number | null): string {
  if (value === null) return '-'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(1)}%`
}

function costTrendClass(value: number | null): string {
  if (value === null) return 'text-text-secondary'
  if (value > 10) return 'text-warning'
  if (value < -10) return 'text-success'
  return 'text-text-secondary'
}

function coverageLabel(value: string): string {
  return value === 'recorded_movements' ? 'Registrado' : 'Sin consumo'
}

function coverageVariant(value: string): 'success' | 'warning' {
  return value === 'recorded_movements' ? 'success' : 'warning'
}
</script>
