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
        @row-click="openIngredientDetail"
      >
        <template #card="{ item, index }">
          <button
            type="button"
            class="w-full flex items-start gap-3 py-3 px-3 border-b border-border text-left transition-colors hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-ring"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
            @click="openIngredientDetail(item)"
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
              <span class="text-xs font-semibold text-primary">Ver detalle</span>
            </div>
          </button>
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

      <Teleport to="body">
        <div
          v-if="detailOpen"
          class="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-overlay-backdrop/50 p-0 md:p-4"
          @click.self="closeIngredientDetail"
        >
          <section class="w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-t-lg md:rounded-lg bg-surface shadow-xl border border-border">
            <header class="flex items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-5">
              <div class="min-w-0">
                <p class="text-xs font-semibold uppercase text-text-secondary">Detalle de ingrediente</p>
                <h2 class="text-lg font-bold text-text-primary truncate">
                  {{ selectedIngredient?.ingredient_name || detailIngredient?.name || 'Ingrediente' }}
                </h2>
                <p class="text-xs text-text-secondary">
                  {{ selectedIngredient?.category || detailIngredient?.category || 'Sin categoria' }} ·
                  {{ detailPeriodLabel }}
                </p>
              </div>
              <button
                type="button"
                class="min-h-[40px] min-w-[40px] rounded-md border border-border text-text-secondary hover:bg-surface-secondary"
                aria-label="Cerrar detalle"
                @click="closeIngredientDetail"
              >
                x
              </button>
            </header>

            <div class="max-h-[calc(92vh-76px)] overflow-y-auto p-4 md:p-5">
              <div v-if="detailLoading" class="flex items-center justify-center py-12">
                <CommonsTheCustomLoader size="medium" />
              </div>

              <div v-else-if="detailError" class="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                No se pudo cargar el detalle del ingrediente.
              </div>

              <div v-else class="space-y-4">
                <section class="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div class="rounded-md border border-border bg-surface-secondary/40 p-3">
                    <p class="text-xs text-text-secondary">Stock actual</p>
                    <p class="mt-1 text-base font-bold text-text-primary">
                      {{ formatQuantity(detailStock?.current_stock) }} {{ detailIngredientUnit }}
                    </p>
                  </div>
                  <div class="rounded-md border border-border bg-surface-secondary/40 p-3">
                    <p class="text-xs text-text-secondary">Minimo</p>
                    <p class="mt-1 text-base font-bold text-text-primary">
                      {{ formatQuantity(detailStock?.minimum_stock) }} {{ detailIngredientUnit }}
                    </p>
                  </div>
                  <div class="rounded-md border border-border bg-surface-secondary/40 p-3">
                    <p class="text-xs text-text-secondary">Ultimo costo</p>
                    <p class="mt-1 text-base font-bold text-text-primary">
                      {{ formatUnitCost(selectedIngredient?.latest_cost_per_unit ?? null, detailIngredientUnit) }}
                    </p>
                  </div>
                  <div class="rounded-md border border-border bg-surface-secondary/40 p-3">
                    <p class="text-xs text-text-secondary">Ubicacion</p>
                    <p class="mt-1 text-base font-bold text-text-primary truncate">
                      {{ detailStock?.location || '-' }}
                    </p>
                  </div>
                </section>

                <section class="rounded-md border border-border">
                  <div class="border-b border-border px-3 py-2">
                    <h3 class="text-sm font-bold text-text-primary">Historial de compras</h3>
                  </div>
                  <div v-if="detailPurchases.length" class="divide-y divide-border">
                    <div v-for="purchase in detailPurchases" :key="purchase.purchase_item_id" class="grid gap-2 px-3 py-3 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-text-primary truncate">{{ purchase.purchase_number || 'Compra' }}</p>
                        <p class="text-xs text-text-secondary">{{ formatDateTime(purchase.received_at || purchase.purchase_date) }}</p>
                      </div>
                      <p class="text-sm text-text-secondary">
                        {{ formatQuantity(purchase.purchase_quantity ?? purchase.base_quantity) }}
                        {{ purchase.purchase_unit || purchase.base_unit || detailIngredientUnit }}
                      </p>
                      <p class="text-sm font-semibold text-text-primary">
                        {{ formatUnitCost(purchase.unit_cost, purchase.base_unit || detailIngredientUnit) }}
                      </p>
                      <p class="text-sm font-semibold text-text-primary md:text-right">
                        {{ formatCurrency(purchase.total_cost ?? 0) }}
                      </p>
                    </div>
                  </div>
                  <p v-else class="px-3 py-4 text-sm text-text-secondary">No hay compras registradas en el periodo.</p>
                </section>

                <section class="rounded-md border border-border">
                  <div class="border-b border-border px-3 py-2">
                    <h3 class="text-sm font-bold text-text-primary">Movimientos de stock</h3>
                  </div>
                  <div v-if="detailStockMovements.length" class="divide-y divide-border">
                    <div v-for="movement in detailStockMovements" :key="movement.id" class="grid gap-2 px-3 py-3 md:grid-cols-[1fr_1fr_1fr_1.4fr]">
                      <div>
                        <p class="text-sm font-semibold text-text-primary">{{ movementTypeLabel(movement.movement_type) }}</p>
                        <p class="text-xs text-text-secondary">{{ formatDateTime(movement.created_at) }}</p>
                      </div>
                      <p class="text-sm font-semibold" :class="Number(movement.quantity_change) < 0 ? 'text-destructive' : 'text-success'">
                        {{ signedQuantity(movement.quantity_change, movement.unit || detailIngredientUnit) }}
                      </p>
                      <p class="text-sm text-text-secondary">
                        {{ formatQuantity(movement.previous_stock) }} -> {{ formatQuantity(movement.new_stock) }}
                      </p>
                      <p class="text-sm text-text-secondary">
                        {{ movement.reason || movement.notes || movement.reference_table || '-' }}
                      </p>
                    </div>
                  </div>
                  <p v-else class="px-3 py-4 text-sm text-text-secondary">No hay movimientos registrados en el periodo.</p>
                </section>

                <section class="rounded-md border border-border">
                  <div class="border-b border-border px-3 py-2">
                    <h3 class="text-sm font-bold text-text-primary">Productos y recetas relacionadas</h3>
                  </div>
                  <div v-if="detailRelatedProducts.length" class="divide-y divide-border">
                    <div v-for="product in detailRelatedProducts" :key="`${product.product_id}-${product.relation_type}-${product.quantity}`" class="grid gap-2 px-3 py-3 md:grid-cols-[1.4fr_1fr_1fr]">
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-text-primary truncate">{{ product.product_name }}</p>
                        <p class="text-xs text-text-secondary">{{ relationLabel(product.relation_type) }}</p>
                      </div>
                      <p class="text-sm text-text-secondary">
                        {{ formatQuantity(product.quantity) }} {{ product.unit || detailIngredientUnit }}
                      </p>
                      <p class="text-sm font-semibold text-text-primary md:text-right">
                        {{ formatContribution(product.quantity) }}
                      </p>
                    </div>
                  </div>
                  <p v-else class="px-3 py-4 text-sm text-text-secondary">No hay productos o recetas asociados.</p>
                </section>
              </div>
            </div>
          </section>
        </div>
      </Teleport>
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

type IngredientHistoryPurchase = {
  purchase_item_id: string
  purchase_id: string
  purchase_number?: string | null
  purchase_date?: string | null
  base_quantity: number
  base_unit?: string | null
  purchase_quantity?: number | null
  purchase_unit?: string | null
  unit_cost?: number | null
  total_cost?: number | null
  received_at?: string | null
}

type IngredientStockMovement = {
  id: string
  movement_type: string
  quantity_change: number
  consumed_quantity?: number
  unit?: string | null
  previous_stock?: number | null
  new_stock?: number | null
  cost_per_unit?: number | null
  reference_table?: string | null
  reason?: string | null
  notes?: string | null
  created_at?: string | null
}

type RelatedProduct = {
  product_id: string
  product_name: string
  relation_type: string
  quantity?: number | null
  unit?: string | null
}

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const { formatCurrency, formatDateTime } = useFormatters()
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

useHead({ title: 'Analitica de Ingredientes' })

const ingredientFilter = ref('')
const categoryFilter = ref('')
const sortOption = ref('estimated_consumed_cost_desc')
const lastUpdate = ref<Date>(new Date())
const detailOpen = ref(false)
const selectedIngredient = ref<DisplayRow | null>(null)

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

const selectedIngredientId = computed(() => selectedIngredient.value?.ingredient_id || null)

const {
  data: ingredientDetailData,
  error: detailError,
  status: detailStatus,
} = useQuery({
  key: () => ['analytics', 'ingredient-history', currentTenant.value?.id, selectedIngredientId.value, {
    from: dateRange.value.from,
    to: dateRange.value.to,
  }],
  query: () => $fetch(`/api/analytics/ingredients/${selectedIngredientId.value}/history`, {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      limit: 100,
    },
  }),
  enabled: () => !!currentTenant.value && detailOpen.value && !!selectedIngredientId.value,
  staleTime: 30_000,
})

const rows = computed<IngredientAnalyticsRow[]>(() => ((analyticsData.value as any)?.data?.items ?? []))
const period = computed(() => (analyticsData.value as any)?.data?.period ?? null)
const isLoading = computed(() => queryStatus.value === 'pending' && !analyticsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && analyticsData.value != null)
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))
const detailData = computed(() => (ingredientDetailData.value as any)?.data ?? null)
const detailLoading = computed(() => detailStatus.value === 'pending' && detailOpen.value)
const detailIngredient = computed(() => detailData.value?.ingredient ?? null)
const detailStock = computed(() => detailData.value?.stock ?? null)
const detailPurchases = computed<IngredientHistoryPurchase[]>(() => detailData.value?.purchases ?? [])
const detailStockMovements = computed<IngredientStockMovement[]>(() => {
  return detailData.value?.stock_movements ?? detailData.value?.consumption_movements ?? []
})
const detailRelatedProducts = computed<RelatedProduct[]>(() => detailData.value?.related_products ?? [])
const detailIngredientUnit = computed(() => selectedIngredient.value?.unit || detailIngredient.value?.unit || 'und')
const detailPeriodLabel = computed(() => {
  const detailPeriod = detailData.value?.period
  if (detailPeriod?.from && detailPeriod?.to) return `${detailPeriod.from} a ${detailPeriod.to}`
  return summary.value.periodLabel
})

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

const openIngredientDetail = (row: DisplayRow) => {
  selectedIngredient.value = row
  detailOpen.value = true
}

const closeIngredientDetail = () => {
  detailOpen.value = false
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

function signedQuantity(value: number | string | null | undefined, unit: string | null | undefined): string {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return `0 ${unit || 'und'}`
  const sign = numericValue > 0 ? '+' : ''
  return `${sign}${formatQuantity(numericValue)} ${unit || 'und'}`
}

function movementTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    purchase: 'Compra',
    consumption: 'Consumo',
    adjustment: 'Ajuste',
    loss: 'Perdida',
    transfer: 'Transferencia',
    return: 'Devolucion',
  }
  return labels[value] || value || 'Movimiento'
}

function relationLabel(value: string): string {
  if (value === 'direct_recipe') return 'Receta directa'
  if (value === 'base_recipe') return 'Receta base'
  return value || 'Relacion'
}

function formatContribution(quantity: number | null | undefined): string {
  const qty = Number(quantity)
  const unitCost = Number(selectedIngredient.value?.weighted_avg_cost_per_unit ?? selectedIngredient.value?.latest_cost_per_unit)
  if (!Number.isFinite(qty) || !Number.isFinite(unitCost) || unitCost <= 0) return '-'
  return formatCurrency(qty * unitCost)
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
