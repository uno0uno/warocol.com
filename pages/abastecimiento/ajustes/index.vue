<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
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

      <!-- Filters Bar -->
      <SharedFiltersBar
        v-model:search="searchQuery"
        v-model:date-filter="dateFilter"
        search-label="Buscar"
        search-placeholder="Buscar por ingrediente o motivo..."
        show-date-filter
        @search="handleSearch"
        @clear-filters="clearFilters"
      >
        <template #additional-filters>
          <!-- Ingredient Filter -->
          <select
            v-model="ingredientFilter"
            class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer flex-shrink-0"
            @change="applyFilters"
          >
            <option value="">Todos los ingredientes</option>
            <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
              {{ ingredient.name }}
            </option>
          </select>

          <!-- Adjustment Type Filter -->
          <select
            v-model="adjustmentTypeFilter"
            class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer flex-shrink-0"
            @change="applyFilters"
          >
            <option value="">Todos los ajustes</option>
            <option value="positive">Incrementos</option>
            <option value="negative">Decrementos</option>
          </select>
        </template>
      </SharedFiltersBar>

      <!-- Responsive Data View -->
      <HealthSemaphore :is-unlocked="true" title="Historial de Ajustes">
      <UiResponsiveDataView
        :columns="adjustmentsTableColumns"
        :data="sortedAdjustments"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        empty-message="No hay ajustes registrados"
        empty-sub-message="Los ajustes se realizan desde la página de Stock de Inventario"
        variant="default"
        row-size="sm"
      >
        <!-- Mobile Card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.ingredient_name }}</span>
              <p class="text-xs text-text-secondary mt-0.5">{{ formatDate(item.created_at) }}</p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <p
                class="text-sm font-bold tabular-nums"
                :class="item.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-600'"
              >
                {{ item.quantity_change >= 0 ? '+' : '' }}{{ formatNumber(item.quantity_change) }}
              </p>
              <UiStatusBadge
                :value="item.quantity_change >= 0 ? 'Incremento' : 'Decremento'"
                format="text"
                :variant="item.quantity_change >= 0 ? 'success' : 'destructive'"
                size="sm"
              />
            </div>
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-created_at="{ value }">
          <span class="text-sm text-text-primary whitespace-nowrap">{{ formatDate(value) }}</span>
        </template>

        <template #cell-ingredient_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-xs text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-adjustment_type="{ row }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="row.quantity_change >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'"
          >
            {{ row.quantity_change >= 0 ? 'Incremento' : 'Decremento' }}
          </span>
        </template>

        <template #cell-quantity_change="{ value }">
          <span
            class="text-sm font-semibold"
            :class="value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
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

        <template #cell-created_by_name="{ value }">
          <span class="text-sm text-text-primary">{{ value || 'Sistema' }}</span>
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'

useHead({ title: 'Ajustes de Inventario' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// State
const searchQuery = ref('')
const ingredientFilter = ref('')
const adjustmentTypeFilter = ref('')
const dateFilter = ref('')

// Sorting state
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

// Compute date parts from filter string
const dateParts = computed(() => {
  if (!dateFilter.value) return {}
  if (dateFilter.value.includes(' to ')) {
    const [start, end] = dateFilter.value.split(' to ')
    return { start_date: start, end_date: end }
  }
  return { start_date: dateFilter.value, end_date: dateFilter.value }
})

// Load adjustments data from API
const { data: adjustmentsData, status: queryStatus, asyncStatus: adjustmentsAsyncStatus, refetch } = useQuery({
  key: () => ['inventory', 'adjustments', currentTenant.value?.id, {
    ingredient: ingredientFilter.value || null,
    date: dateFilter.value || null,
  }],
  query: () => $fetch('/api/inventory/movements', {
    params: {
      limit: 500,
      movement_type: 'adjustment',
      ingredient_id: ingredientFilter.value || undefined,
      ...dateParts.value,
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !adjustmentsData.value)
const isRefreshing = computed(() => adjustmentsAsyncStatus.value === 'loading' && adjustmentsData.value != null)
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
  return adjustments.value.filter(adjustment => {
    const matchesSearch = adjustment.ingredient_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         (adjustment.reason && adjustment.reason.toLowerCase().includes(searchQuery.value.toLowerCase()))

    // Filter by adjustment type (positive/negative)
    const matchesType = adjustmentTypeFilter.value === '' ||
                       (adjustmentTypeFilter.value === 'positive' && adjustment.quantity_change >= 0) ||
                       (adjustmentTypeFilter.value === 'negative' && adjustment.quantity_change < 0)

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

// Handle search
const handleSearch = () => {
  // Search is handled by computed filteredAdjustments
}

// Apply filters — reactive key triggers refetch automatically
const applyFilters = () => {}

// Clear filters
const clearFilters = () => {
  searchQuery.value = ''
  ingredientFilter.value = ''
  adjustmentTypeFilter.value = ''
  dateFilter.value = ''
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh(
  '/abastecimiento/ajustes',
  refetch,
  'abastecimiento-last-path',
  ['/abastecimiento/ajustes/']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
