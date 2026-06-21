<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Filters Bar -->
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        search-placeholder="Buscar por ingrediente o referencia..."
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
            :class="filterSelectClass"
            aria-label="Filtrar por ingrediente"
          >
            <option value="">Ingrediente</option>
            <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
              {{ ingredient.name }}
            </option>
          </select>

          <select
            v-model="movementTypeFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por tipo de movimiento"
          >
            <option value="">Tipo</option>
            <option value="purchase">Compras</option>
            <option value="consumption">Consumo</option>
            <option value="adjustment">Ajustes</option>
            <option value="loss">Pérdidas</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        row-size="sm"
        :columns="movementsTableColumns"
        :data="sortedMovements"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        empty-message="No hay movimientos registrados"
        empty-sub-message="Los movimientos aparecerán cuando se registren compras o ventas"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.ingredient_name }}</span>
              <p class="text-xs text-text-secondary mt-0.5">{{ formatDate(item.created_at) }}{{ item.reference_number ? ` · ${item.reference_number}` : '' }}</p>
            </div>
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span
                class="text-sm font-bold tabular-nums"
                :class="item.quantity_change >= 0 ? 'text-success' : 'text-destructive'"
              >
                {{ item.quantity_change >= 0 ? '+' : '' }}{{ formatNumber(item.quantity_change) }}
              </span>
              <UiStatusBadge
                :value="getMovementTypeLabel(item.movement_type)"
                format="text"
                :variant="getMovementTypeVariant(item.movement_type)"
                size="sm"
              />
            </div>
          </div>
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

        <template #cell-movement_type="{ value }">
          <UiStatusBadge
            :value="getMovementTypeLabel(value)"
            format="text"
            :variant="getMovementTypeVariant(value)"
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

        <template #cell-reference_number="{ value }">
          <span v-if="value" class="text-sm text-primary font-medium">{{ value }}</span>
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
import { INGREDIENTS_FETCH_LIMIT } from '@/composables/useMenuIngredients'
import { useFormatters } from '~/composables/useFormatters'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

useHead({ title: 'Movimientos de Inventario' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Filters — AdvancedFiltersBar (#765)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()
const ingredientFilter = ref('')
const movementTypeFilter = ref('')

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!dateRangeDates.value
    || !!ingredientFilter.value
    || !!movementTypeFilter.value,
)

const performSearch = () => applySearch()

// Sorting state
const sortField = ref('')
const sortDirection = ref('desc')

// Load ingredients for filter (static per tenant)
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

// Load movements data from API — reactive to tenant + filters
const { data: movementsData, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['inventory', 'movements', currentTenant.value?.id, {
    type: movementTypeFilter.value || null,
    ingredient: ingredientFilter.value || null,
    from: dateRange.value.from,
    to: dateRange.value.to,
  }],
  query: () => $fetch('/api/inventory/movements', {
    params: {
      limit: 500,
      movement_type: movementTypeFilter.value || undefined,
      ingredient_id: ingredientFilter.value || undefined,
      ...dateParts.value,
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !movementsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && movementsData.value != null)
// Key change on filter update triggers automatic refetch — no manual watch needed

const movements = computed(() => movementsData.value?.data || [])

const filteredMovements = computed(() => {
  const q = appliedSearch.value.toLowerCase()
  if (!q) return movements.value
  return movements.value.filter((movement) => {
    return movement.ingredient_name.toLowerCase().includes(q)
      || (movement.reference_number && movement.reference_number.toLowerCase().includes(q))
  })
})

// Sorted movements
const sortedMovements = computed(() => {
  if (!sortField.value) return filteredMovements.value

  const sorted = [...filteredMovements.value].sort((a, b) => {
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
    sortDirection.value = 'desc' // Default to descending for movements (newest first)
  }
}

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  ingredientFilter.value = ''
  movementTypeFilter.value = ''
}

// Table columns configuration
const movementsTableColumns = [
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
    key: 'movement_type',
    title: 'Tipo',
    sortable: true,
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
    key: 'reference_number',
    title: 'Referencia',
    sortable: true,
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

const getMovementTypeLabel = (type: string) => {
  const labels = {
    'purchase': 'Compra',
    'consumption': 'Consumo',
    'adjustment': 'Ajuste',
    'loss': 'Pérdida',
    'transfer': 'Transferencia',
    'return': 'Devolución'
  }
  return labels[type] || type
}

const getMovementTypeVariant = (type: string) => {
  const variants: Record<string, string> = {
    purchase: 'success',
    consumption: 'info',
    adjustment: 'warning',
    loss: 'destructive',
    transfer: 'secondary',
    return: 'secondary',
  }
  return variants[type] || 'default'
}

const formatNumber = (value: number) => {
  return formatDomainQuantity(value, 6)
}

const { formatDate } = useFormatters()

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refetch)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
