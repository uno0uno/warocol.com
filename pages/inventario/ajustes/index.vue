<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <div v-if="isRefreshing" class="flex justify-end">
        <UiLoadingDots size="10px" class="text-text-secondary" />
      </div>
      <!-- Stats Cards -->
      <UiStats>
        <UiStatsCard
          label="Total Ajustes"
          :value="adjustments.length"
          icon="adjustments-horizontal"
        />
        <UiStatsCard
          label="Ingredientes Ajustados"
          :value="uniqueIngredientsAdjusted"
          icon="beaker"
        />
        <UiStatsCard
          label="Stock Crítico"
          :value="stockStats.critical_count || 0"
          icon="exclamation-circle"
        />
        <UiStatsCard
          label="Stock Bajo"
          :value="stockStats.low_stock_count || 0"
          icon="exclamation"
        />
      </UiStats>

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        :search-fields="[]"
        search-placeholder="Buscar por ingrediente o motivo..."
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="ingredientFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por ingrediente"
          >
            <option value="">Ingrediente</option>
            <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
              {{ ingredient.name }}
            </option>
          </select>

          <select
            v-model="adjustmentTypeFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por tipo de ajuste"
          >
            <option value="">Tipo ajuste</option>
            <option value="positive">Incrementos</option>
            <option value="negative">Decrementos</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="adjustmentsTableColumns"
        :data="sortedAdjustments"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        title="Historial de Ajustes"
        empty-message="No hay ajustes registrados"
        empty-sub-message="Los ajustes se realizan desde la página de Stock de Inventario"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <UiCard class="hover:shadow-lg transition-shadow">
            <UiCardHeader>
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="text-base font-semibold text-text-primary">{{ item.ingredient_name }}</h3>
                  <p class="text-xs text-text-secondary">{{ formatDate(item.created_at) }}</p>
                </div>
                <UiStatusBadge
                  :value="item.quantity_change >= 0 ? 'Incremento' : 'Decremento'"
                  format="text"
                  :variant="item.quantity_change >= 0 ? 'success' : 'destructive'"
                  size="sm"
                />
              </div>
            </UiCardHeader>
            <UiCardContent class="space-y-3">
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <p class="text-xs text-text-secondary">Cantidad</p>
                  <p
                    class="text-lg font-bold"
                    :class="item.quantity_change >= 0 ? 'text-success' : 'text-destructive'"
                  >
                    {{ item.quantity_change >= 0 ? '+' : '' }}{{ formatNumber(item.quantity_change) }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">Stock Ant.</p>
                  <p class="text-sm text-text-primary">{{ formatNumber(item.previous_stock) }}</p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">Stock Nuevo</p>
                  <p class="text-sm font-bold text-text-primary">{{ formatNumber(item.new_stock) }}</p>
                </div>
              </div>
              <div v-if="item.reason" class="pt-2 border-t border-border">
                <p class="text-xs text-text-secondary">Motivo</p>
                <p class="text-sm text-text-primary">{{ item.reason }}</p>
              </div>
              <div v-if="item.created_by_name" class="text-xs text-text-secondary">
                Ajustado por: <span class="font-medium text-text-primary">{{ item.created_by_name }}</span>
              </div>
            </UiCardContent>
          </UiCard>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-created_at="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-ingredient_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-xs text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-adjustment_type="{ row }">
          <UiStatusBadge
            :value="row.quantity_change >= 0 ? 'Incremento' : 'Decremento'"
            format="text"
            :variant="row.quantity_change >= 0 ? 'success' : 'destructive'"
            size="sm"
          />
        </template>

        <template #cell-quantity_change="{ value }">
          <span
            class="text-sm font-bold"
            :class="value >= 0 ? 'text-success' : 'text-destructive'"
          >
            {{ value >= 0 ? '+' : '' }}{{ formatNumber(value) }}
          </span>
        </template>

        <template #cell-previous_stock="{ value }">
          <span class="text-sm text-text-secondary">{{ formatNumber(value) }}</span>
        </template>

        <template #cell-new_stock="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ formatNumber(value) }}</span>
        </template>

        <template #cell-reason="{ value }">
          <span v-if="value" class="text-sm text-text-primary">{{ value }}</span>
          <span v-else class="text-sm text-text-secondary">-</span>
        </template>

        <template #cell-created_by_name="{ value }">
          <span class="text-sm text-text-primary">{{ value || 'Sistema' }}</span>
        </template>
      </UiResponsiveDataView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'

useHead({ title: 'Ajustes de Inventario' })

const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()
const ingredientFilter = ref('')
const adjustmentTypeFilter = ref('')

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!dateRangeDates.value
    || !!ingredientFilter.value
    || !!adjustmentTypeFilter.value,
)

const performSearch = () => applySearch()

const sortField = ref('created_at')
const sortDirection = ref('desc')

// Load ingredients for filter
const { data: ingredientsData } = useQuery({
  key: () => ['inventory', 'ingredients-lookup', currentTenant.value?.id],
  query: () => $fetch('/api/suppliers/ingredients', { params: { limit: INGREDIENTS_FETCH_LIMIT } }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const ingredients = computed(() => {
  if (!(ingredientsData.value as any)?.data) return []
  return (ingredientsData.value as any).data.map((item: any) => ({
    id: item.id,
    name: item.name
  })).sort((a: any, b: any) => a.name.localeCompare(b.name))
})

const dateParts = computed(() => {
  if (!dateRange.value.from || !dateRange.value.to) return {}
  return { start_date: dateRange.value.from, end_date: dateRange.value.to }
})

const { data: adjustmentsData, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['inventory', 'adjustments', currentTenant.value?.id, {
    ingredient: ingredientFilter.value || null,
    from: dateRange.value.from,
    to: dateRange.value.to,
  }],
  query: () => $fetch('/api/inventory/movements', {
    params: {
      limit: 500,
      movement_type: 'adjustment',
      ingredient_id: ingredientFilter.value || undefined,
      ...dateParts.value,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !adjustmentsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && adjustmentsData.value != null)
const adjustments = computed(() => adjustmentsData.value?.data || [])

// Load stock data for suggestions
const { data: stockData } = useQuery({
  key: () => ['inventory', 'stock', currentTenant.value?.id],
  query: () => $fetch('/api/inventory/stock', {
    params: {
      limit: 250,
      status_filter: 'all'
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const stockStats = computed(() => stockData.value?.stats || {
  total_ingredients: 0,
  critical_count: 0,
  low_stock_count: 0,
  ok_count: 0,
  total_inventory_value: 0
})

// Suggested adjustments (items with critical or low stock)
const suggestedAdjustments = computed(() => {
  const stock = stockData.value?.data || []
  return stock.filter(item => item.status === 'critical' || item.status === 'low')
})

// Unique ingredients adjusted
const uniqueIngredientsAdjusted = computed(() => {
  const uniqueIds = new Set(adjustments.value.map(adj => adj.ingredient_id))
  return uniqueIds.size
})

const filteredAdjustments = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  return adjustments.value.filter((adjustment) => {
    const matchesSearch = !q
      || adjustment.ingredient_name.toLowerCase().includes(q)
      || (adjustment.reason && adjustment.reason.toLowerCase().includes(q))
    const matchesType = adjustmentTypeFilter.value === ''
      || (adjustmentTypeFilter.value === 'positive' && adjustment.quantity_change >= 0)
      || (adjustmentTypeFilter.value === 'negative' && adjustment.quantity_change < 0)
    return matchesSearch && matchesType
  })
})

// Sorted adjustments
const sortedAdjustments = computed(() => {
  if (!sortField.value) return filteredAdjustments.value

  const sorted = [...filteredAdjustments.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
    }

    const strA = String(aValue).toLowerCase()
    const strB = String(bValue).toLowerCase()
    return sortDirection.value === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
  })

  return sorted
})

// Handle sort
const handleSort = (field) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
}

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  ingredientFilter.value = ''
  adjustmentTypeFilter.value = ''
}

// Table columns configuration
const adjustmentsTableColumns = [
  {
    key: 'created_at',
    title: 'Fecha',
    sortable: true,
    format: 'date',
    align: 'left'
  },
  {
    key: 'ingredient_name',
    title: 'Ingrediente',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'unit',
    title: 'Unidad',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'adjustment_type',
    title: 'Tipo',
    sortable: false,
    format: 'badge',
    align: 'center'
  },
  {
    key: 'quantity_change',
    title: 'Cantidad',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'previous_stock',
    title: 'Stock Ant.',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'new_stock',
    title: 'Stock Nuevo',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'reason',
    title: 'Motivo',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'created_by_name',
    title: 'Usuario',
    sortable: true,
    format: 'text',
    align: 'left'
  }
]

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

const { formatDateTime: formatDate } = useFormatters()

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refetch)
})
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
