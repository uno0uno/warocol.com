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
            class="px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas las categorías</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>

          <!-- Status Filter -->
          <select
            v-model="statusFilter"
            class="px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">Todos los estados</option>
            <option value="critical">Crítico</option>
            <option value="low">Bajo</option>
            <option value="ok">Normal</option>
          </select>

          <!-- Unit Filter -->
          <select
            v-model="unitFilter"
            class="px-4 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas las unidades</option>
            <option v-for="unit in units" :key="unit" :value="unit">
              {{ unit }}
            </option>
          </select>
        </template>
      </SharedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="stockTableColumns"
        :data="filteredInventory"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        title="Stock de Inventario"
        empty-message="No hay ingredientes en inventario"
        empty-sub-message="Comienza recibiendo compras en Abastecimiento"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <UiCard class="hover:shadow-lg transition-shadow">
            <UiCardHeader>
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-base font-semibold text-text-primary">{{ item.ingredient_name }}</h3>
                  <p class="text-sm text-text-secondary">{{ item.unit }}</p>
                </div>
                <UiStatusBadge
                  :label="getStatusLabel(item.status)"
                  :variant="getStockVariant(item.status)"
                />
              </div>
            </UiCardHeader>
            <UiCardContent class="space-y-3">
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <p class="text-xs text-text-secondary">Actual</p>
                  <p class="text-lg font-bold text-text-primary">{{ formatNumber(item.current_stock) }}</p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">Mín</p>
                  <p class="text-sm text-text-primary">{{ formatNumber(item.minimum_stock) }}</p>
                </div>
                <div>
                  <p class="text-xs text-text-secondary">Máx</p>
                  <p class="text-sm text-text-primary">{{ item.maximum_stock ? formatNumber(item.maximum_stock) : '-' }}</p>
                </div>
              </div>
              <div v-if="item.maximum_stock" class="w-full bg-surface-secondary rounded-full h-2">
                <div
                  class="h-2 rounded-full"
                  :class="{
                    'bg-destructive': item.status === 'critical',
                    'bg-warning': item.status === 'low',
                    'bg-success': item.status === 'ok'
                  }"
                  :style="{ width: `${getStockPercentage(item.current_stock, item.minimum_stock, item.maximum_stock)}%` }"
                />
              </div>
              <div class="flex justify-between pt-2 border-t border-border">
                <span class="text-sm text-text-secondary">Valor total:</span>
                <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(item.total_value) }}</span>
              </div>
              <button
                @click="navigateTo(`/inventario/ajustes/crear?ingredientId=${item.ingredient_id}`)"
                title="Ajustar stock"
                class="w-full mt-2 px-3 py-2 border border-border rounded-md hover:bg-surface-secondary transition-colors flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Ajustar Stock
              </button>
            </UiCardContent>
          </UiCard>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-ingredient_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-current_stock="{ value }">
          <span class="text-sm font-semibold text-text-primary">{{ formatNumber(value) }}</span>
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
          <span class="text-sm text-text-primary">{{ value ? formatCurrency(value) : '-' }}</span>
        </template>

        <template #cell-total_value="{ value }">
          <span class="text-sm font-medium text-text-primary">{{ formatCurrency(value) }}</span>
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
              @click="navigateTo(`/inventario/ajustes/crear?ingredientId=${row.ingredient_id}`)"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Stock' })

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// State
const searchQuery = ref('')
const categoryFilter = ref('')
const statusFilter = ref('all')
const unitFilter = ref('')

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc')

// Load inventory data from API
const { data: inventoryData, pending: isLoading, refresh } = useAsyncData(
  `inventory-stock-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/inventory/stock', {
    params: {
      limit: 250,
      search: searchQuery.value || undefined,
      status_filter: statusFilter.value,
      sort_field: 'current_stock',
      sort_direction: 'desc'
    }
  }),
  {
    server: false,
    watch: [currentTenant]
  }
)

// Refresh on tenant change
onTenantChange(async () => {
  await refresh()
})

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
const setRefreshHandler = inject('setRefreshHandler', () => {})
onMounted(() => {
  setRefreshHandler(refresh)
})
</script>
