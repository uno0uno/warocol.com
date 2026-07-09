<template>
  <div class="flex flex-col gap-3 md:gap-4 pb-20">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <CommonsTheErrorState v-else-if="fetchError" />

    <template v-else>
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
            :class="filterSelectClassFor(ingredientFilter)"
            aria-label="Filtrar por ingrediente"
          >
            <option value="">Ingrediente</option>
            <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
              {{ ingredient.name }}
            </option>
          </select>

          <select
            v-model="categoryFilter"
            :class="filterSelectClassFor(categoryFilter)"
            aria-label="Filtrar por categoria"
          >
            <option value="">Categoria</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>

          <select
            v-model="sortOption"
            :class="filterSelectClassFor(sortOption, { active: true })"
            aria-label="Ordenar ingredientes"
          >
            <option v-for="option in sortOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <section class="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <MetricCard
          title="Ingredientes"
          :value="summary.totalIngredients"
          format="number"
          variant="primary"
          size="sm"
          :subtitle="summary.periodLabel"
        />
        <MetricCard
          title="Costo estimado"
          :value="summary.estimatedCostLabel"
          format="text"
          variant="warning"
          size="sm"
          :subtitle="`${summary.movementCount} movimientos`"
        />
        <MetricCard
          title="Con consumo"
          :value="summary.recordedRows"
          format="number"
          variant="success"
          size="sm"
          :subtitle="`${summary.coveragePct}% con movimientos`"
        />
        <MetricCard
          title="Variacion costo"
          :value="summary.avgCostVariationPct"
          format="percentage"
          :precision="1"
          :variant="summary.avgCostVariationPct > 10 ? 'warning' : 'info'"
          size="sm"
          subtitle="Ultimo vs promedio base"
        />
      </section>

      <UiResponsiveDataView
        row-size="sm"
        :columns="ingredientTableColumns"
        :data="displayRows"
        item-key="ingredient_id"
        empty-message="No hay consumo de ingredientes"
        empty-sub-message="No se encontraron movimientos de consumo o compras para el periodo seleccionado"
        variant="default"
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
                {{ item.category || 'Sin categoria' }} · {{ formatQuantity(item.consumed_quantity) }} {{ item.unit || 'und' }}
              </p>
            </div>
            <div class="flex flex-col items-end gap-1 flex-shrink-0">
              <span class="text-sm font-bold text-text-primary">{{ formatCurrency(item.estimated_consumed_cost) }}</span>
              <span class="text-xs text-text-secondary">{{ formatUnitCost(item.weighted_avg_cost_per_unit, item.unit) }}</span>
            </div>
          </div>
        </template>

        <template #cell-ingredient_name="{ item }">
          <div class="min-w-0">
            <span class="text-sm font-bold text-text-primary">{{ item.ingredient_name }}</span>
            <p class="text-xs text-text-secondary">{{ item.category || 'Sin categoria' }}</p>
          </div>
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
import { filterSelectClassFor } from '~/composables/useFilterSelectClass'
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

useHead({ title: 'Analitica de Ingredientes' })

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
    : 'Periodo actual'

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
  { key: 'consumed_quantity', title: 'Consumo', sortable: false, format: 'text', align: 'right' },
  { key: 'estimated_consumed_cost', title: 'Costo estimado', sortable: false, format: 'text', align: 'right' },
  { key: 'weighted_avg_cost_per_unit', title: 'Costo prom.', sortable: false, format: 'text', align: 'right' },
  { key: 'latest_cost_per_unit', title: 'Ultimo costo', sortable: false, format: 'text', align: 'right' },
  { key: 'cost_trend', title: 'Tendencia', sortable: false, format: 'text', align: 'right' },
  { key: 'movement_count', title: 'Mov.', sortable: false, format: 'text', align: 'right' },
  { key: 'data_coverage', title: 'Cobertura', sortable: false, format: 'text', align: 'center' },
] as const

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
