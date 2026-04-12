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
          label="Total Ingredientes"
          :value="stats.total_ingredients"
          icon="beaker"
        />
        <UiStatsCard
          label="Stock Bajo"
          :value="stats.low_stock_count"
          icon="exclamation"
        />
        <UiStatsCard
          label="Stock Crítico"
          :value="stats.critical_count"
          icon="exclamation-circle"
        />
        <UiStatsCard
          label="Valor Total"
          :value="formatCurrency(stats.total_inventory_value)"
          icon="currency-dollar"
        />
      </UiStats>

      <!-- Filters Bar -->
      <SharedFiltersBar
        v-model:search="searchQuery"
        search-label="Buscar"
        search-placeholder="Buscar ingredientes..."
        @search="() => {}"
        @clear-filters="clearFilters"
      >
        <template #additional-filters>
          <!-- Category Filter -->
          <select
            v-model="categoryFilter"
            class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer flex-shrink-0"
          >
            <option value="">Todas las categorías</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="statusFilter"
            class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer flex-shrink-0"
          >
            <option value="all">Todos los estados</option>
            <option value="critical">Crítico</option>
            <option value="low">Bajo</option>
            <option value="ok">Normal</option>
          </select>

          <!-- Unit Filter -->
          <select
            v-model="unitFilter"
            class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent cursor-pointer flex-shrink-0"
          >
            <option value="">Todas las unidades</option>
            <option v-for="unit in units" :key="unit" :value="unit">
              {{ unit }}
            </option>
          </select>
        </template>
      </SharedFiltersBar>

      <!-- Responsive Data View -->
      <HealthSemaphore :is-unlocked="true" title="Stock de Inventario">
      <UiResponsiveDataView
        :columns="stockTableColumns"
        :data="filteredInventory"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        empty-message="No hay ingredientes en inventario"
        empty-sub-message="Comienza recibiendo compras en Abastecimiento"
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
              <p class="text-xs text-text-secondary mt-0.5">{{ item.unit }}</p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <div class="flex flex-col items-end gap-1.5">
                <p class="text-sm font-bold tabular-nums text-text-primary">{{ formatNumber(item.current_stock) }}</p>
                <UiStatusBadge
                  :value="getStatusLabel(item.status)"
                  :variant="getStockVariant(item.status)"
                  size="sm"
                  format="text"
                />
              </div>
              <button
                @click.stop="navigateTo(`/abastecimiento/ajustes/crear?ingredientId=${item.ingredient_id}`)"
                title="Ajustar stock"
                class="w-7 h-7 flex items-center justify-center rounded bg-surface-secondary border border-border text-text-secondary hover:text-primary transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-ingredient_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-current_stock="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ formatNumber(value) }}</span>
        </template>

        <template #cell-minimum_stock="{ value }">
          <span class="text-sm text-text-primary">{{ formatNumber(value) }}</span>
        </template>

        <template #cell-maximum_stock="{ value }">
          <span class="text-sm text-text-primary">{{ value ? formatNumber(value) : '-' }}</span>
        </template>

        <template #cell-stock_percentage="{ row }">
          <div v-if="row.maximum_stock" class="w-full bg-surface-secondary rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="{
                'bg-destructive': row.status === 'critical',
                'bg-warning': row.status === 'low',
                'bg-success': row.status === 'ok'
              }"
              :style="{ width: `${Math.min(getStockPercentage(row.current_stock, row.minimum_stock, row.maximum_stock), 100)}%` }"
            />
          </div>
          <span v-else class="text-xs text-text-secondary">-</span>
        </template>

        <template #cell-unit_cost="{ value }">
          <span class="text-sm font-bold text-primary">{{ value ? formatCurrency(value) : '-' }}</span>
        </template>

        <template #cell-total_value="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-status="{ value, row }">
          <UiStatusBadge
            :label="getStatusLabel(value)"
            :variant="getStockVariant(value)"
          />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center">
            <button
              @click="navigateTo(`/abastecimiento/ajustes/crear?ingredientId=${row.ingredient_id}`)"
              title="Ajustar stock"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'

useHead({ title: 'Stock' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// State
const searchQuery = ref('')
const categoryFilter = ref('')
const statusFilter = ref('all')
const unitFilter = ref('')

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc')

// Load inventory data from API
const { data: inventoryData, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['inventory', 'stock', currentTenant.value?.id],
  query: () => $fetch('/api/inventory/stock', {
    params: {
      limit: 250,
      sort_field: 'current_stock',
      sort_direction: 'desc'
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !inventoryData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && inventoryData.value != null)

const inventory = computed(() => inventoryData.value?.data || [])
const stats = computed(() => inventoryData.value?.stats || {
  total_ingredients: 0,
  critical_count: 0,
  low_stock_count: 0,
  ok_count: 0,
  total_inventory_value: 0
})

// Get unique categories from inventory
const categories = computed(() => {
  const cats = new Set<string>()
  inventory.value.forEach(item => {
    if (item.category) {
      cats.add(item.category)
    }
  })
  return Array.from(cats).sort()
})

// Get unique units from inventory
const units = computed(() => {
  const unitsSet = new Set<string>()
  inventory.value.forEach(item => {
    if (item.unit) {
      unitsSet.add(item.unit)
    }
  })
  return Array.from(unitsSet).sort()
})

const filteredInventory = computed(() => {
  return inventory.value.filter(item => {
    const matchesSearch = item.ingredient_name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesStatus = statusFilter.value === 'all' || item.status === statusFilter.value
    const matchesCategory = !categoryFilter.value || item.category === categoryFilter.value
    const matchesUnit = !unitFilter.value || item.unit === unitFilter.value
    return matchesSearch && matchesStatus && matchesCategory && matchesUnit
  })
})

// Sorted inventory
const sortedInventory = computed(() => {
  if (!sortField.value) return filteredInventory.value

  const sorted = [...filteredInventory.value].sort((a, b) => {
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
    sortDirection.value = 'asc'
  }
}

// Clear filters
const clearFilters = () => {
  searchQuery.value = ''
  categoryFilter.value = ''
  statusFilter.value = 'all'
  unitFilter.value = ''
}

// Table columns configuration
const stockTableColumns = [
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
    key: 'current_stock',
    title: 'Stock Actual',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'minimum_stock',
    title: 'Stock Mín',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'maximum_stock',
    title: 'Stock Máx',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'stock_percentage',
    title: '% Stock',
    sortable: false,
    format: 'custom',
    align: 'center'
  },
  {
    key: 'unit_cost',
    title: 'Costo Unit.',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'total_value',
    title: 'Valor Total',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'status',
    title: 'Estado',
    sortable: true,
    format: 'badge',
    align: 'center'
  },
  {
    key: 'actions',
    title: 'Acciones',
    sortable: false,
    format: 'custom',
    align: 'center'
  }
]

const getStockPercentage = (current: number, min: number, max: number) => {
  if (!max || max === 0) return 0
  return Math.round((current / max) * 100)
}

const getStockVariant = (status: string) => {
  const variants = {
    critical: 'destructive',
    low: 'warning',
    ok: 'success'
  }
  return variants[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels = {
    critical: 'Crítico',
    low: 'Bajo',
    ok: 'Normal'
  }
  return labels[status] || status
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh(
  '/abastecimiento/stock',
  refetch,
  'abastecimiento-last-path',
  ['/abastecimiento/stock/', '/abastecimiento/ajustes/']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
