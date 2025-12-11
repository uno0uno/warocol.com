<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Filters Bar -->
      <SharedFiltersBar
        v-model:search="searchQuery"
        v-model:date-filter="dateFilter"
        search-label="Buscar"
        search-placeholder="Buscar por ingrediente o referencia..."
        show-date-filter
        @search="handleSearch"
        @clear-filters="clearFilters"
      >
        <template #additional-filters>
          <!-- Ingredient Filter -->
          <select
            v-model="ingredientFilter"
            class="px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            @change="applyFilters"
          >
            <option value="">Todos los ingredientes</option>
            <option v-for="ingredient in ingredients" :key="ingredient.id" :value="ingredient.id">
              {{ ingredient.name }}
            </option>
          </select>

          <!-- Movement Type Filter -->
          <select
            v-model="movementTypeFilter"
            class="px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
            @change="applyFilters"
          >
            <option value="">Todos los tipos</option>
            <option value="purchase">Compras</option>
            <option value="consumption">Consumo</option>
            <option value="adjustment">Ajustes</option>
            <option value="loss">Pérdidas</option>
          </select>
        </template>
      </SharedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="movementsTableColumns"
        :data="sortedMovements"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        title="Movimientos de Inventario"
        empty-message="No hay movimientos registrados"
        empty-sub-message="Los movimientos aparecerán cuando se registren compras o ventas"
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
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getMovementTypeColor(item.movement_type)"
                >
                  {{ getMovementTypeLabel(item.movement_type) }}
                </span>
              </div>
            </UiCardHeader>
            <UiCardContent class="space-y-3">
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <p class="text-xs text-text-secondary">Cantidad</p>
                  <p
                    class="text-lg font-bold"
                    :class="item.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'"
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
              <div v-if="item.reference_number" class="pt-2 border-t border-border">
                <p class="text-xs text-text-secondary">Referencia</p>
                <p class="text-sm font-medium text-primary">{{ item.reference_number }}</p>
              </div>
            </UiCardContent>
          </UiCard>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-created_at="{ value }">
          <span class="text-sm text-text-primary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-ingredient_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-xs text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-movement_type="{ value }">
          <span
            class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            :class="getMovementTypeColor(value)"
          >
            {{ getMovementTypeLabel(value) }}
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
import { ref, computed, inject, onMounted, watch } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// State
const searchQuery = ref('')
const ingredientFilter = ref('')
const movementTypeFilter = ref('')
const dateFilter = ref('')

// Sorting state
const sortField = ref('')
const sortDirection = ref('desc')

// Load ingredients for filter
const { data: ingredientsData } = useAsyncData(
  `ingredients-list-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/ingredients', {
    params: {
      limit: 250
    }
  }),
  {
    server: false,
    watch: [currentTenant]
  }
)

const ingredients = computed(() => {
  if (!ingredientsData.value?.data) return []
  return ingredientsData.value.data.map(item => ({
    id: item.id,
    name: item.name
  })).sort((a, b) => a.name.localeCompare(b.name))
})

// Compute filter parameters for API
const apiParams = computed(() => {
  const params: any = {
    limit: 500,
    movement_type: movementTypeFilter.value || undefined,
    ingredient_id: ingredientFilter.value || undefined
  }

  // Parse date filter (format: "YYYY-MM-DD to YYYY-MM-DD" or "YYYY-MM-DD")
  if (dateFilter.value) {
    if (dateFilter.value.includes(' to ')) {
      const [start, end] = dateFilter.value.split(' to ')
      params.start_date = start
      params.end_date = end
    } else {
      params.start_date = dateFilter.value
      params.end_date = dateFilter.value
    }
  }

  return params
})

// Load movements data from API
const { data: movementsData, pending: isLoading, refresh } = useAsyncData(
  `inventory-movements-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/inventory/movements', {
    params: apiParams.value
  }),
  {
    server: false,
    watch: [currentTenant]
  }
)

// Watch filters and refresh data
watch([ingredientFilter, movementTypeFilter, dateFilter], () => {
  refresh()
})

// Refresh on tenant change
onTenantChange(async () => {
  await refresh()
})

const movements = computed(() => movementsData.value?.data || [])

const filteredMovements = computed(() => {
  return movements.value.filter(movement => {
    const matchesSearch = movement.ingredient_name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                         (movement.reference_number && movement.reference_number.toLowerCase().includes(searchQuery.value.toLowerCase()))
    return matchesSearch
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

// Handle search
const handleSearch = () => {
  // Search is handled by computed filteredMovements
}

// Apply filters
const applyFilters = () => {
  refresh()
}

// Clear filters
const clearFilters = () => {
  searchQuery.value = ''
  ingredientFilter.value = ''
  movementTypeFilter.value = ''
  dateFilter.value = ''
  refresh()
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

const getMovementTypeColor = (type: string) => {
  const colors = {
    'purchase': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'consumption': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    'adjustment': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    'loss': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'transfer': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
    'return': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

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
    day: 'numeric'
  }).format(date)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

// Set refresh handler for layout
const setRefreshHandler = inject('setRefreshHandler', () => {})
onMounted(() => {
  setRefreshHandler(refresh)
})
</script>
