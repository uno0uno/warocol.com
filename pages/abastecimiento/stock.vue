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
          :label="WAREHOUSE_COPY.stockStatsTotal"
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

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        :search-fields="[]"
        :search-placeholder="WAREHOUSE_COPY.stockSearchPlaceholder"
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="categoryFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por categoría"
          >
            <option value="">Categoría</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>

          <select
            v-model="statusFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por estado"
            @change="currentPage = 1"
          >
            <option value="all">Estado</option>
            <option value="negative">Crítico</option>
            <option value="low">Bajo</option>
            <option value="ok">Normal</option>
          </select>

          <select
            v-model="unitFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por unidad"
          >
            <option value="">Unidad</option>
            <option v-for="unit in units" :key="unit" :value="unit">
              {{ unit }}
            </option>
          </select>

          <button
            type="button"
            title="Ajustar stock"
            @click="showAdjustmentPanel = true"
            class="min-h-[44px] h-10 px-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors flex-shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span class="hidden sm:inline">Ajustar stock</span>
          </button>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <HealthSemaphore :is-unlocked="true" title="Stock de Inventario">
      <UiResponsiveDataView
        :columns="stockTableColumns"
        :data="displayInventory"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        :empty-message="WAREHOUSE_COPY.stockEmptyMessage"
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
                <p
                  class="text-sm font-bold tabular-nums"
                  :class="item.current_stock < 0 ? 'text-destructive' : 'text-text-primary'"
                >
                  {{ formatNumber(item.current_stock) }}
                </p>
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
          <span
            class="text-sm font-bold tabular-nums"
            :class="value < 0 ? 'text-destructive' : 'text-text-primary'"
          >
            {{ formatNumber(value) }}
          </span>
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
                'bg-destructive': row.status === 'negative',
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
          <div class="flex justify-center gap-1">
            <button
              @click="navigateTo(`/abastecimiento/movimientos?ingredient_id=${row.ingredient_id}`)"
              title="Ver movimientos"
              aria-label="Ver movimientos"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            <button
              @click="navigateTo(`/abastecimiento/ajustes/crear?ingredientId=${row.ingredient_id}`)"
              title="Ajustar stock"
              aria-label="Ajustar stock"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-primary"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

      <div
        v-if="(inventoryData?.total ?? 0) > itemsPerPage"
        class="mt-4 bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg"
      >
        <p class="text-sm text-titan-700">
          Mostrando <span class="font-medium">{{ startItem }}</span> a
          <span class="font-medium">{{ endItem }}</span> de
          <span class="font-medium">{{ inventoryData?.total ?? 0 }}</span>
        </p>
        <div class="flex gap-2">
          <button
            type="button"
            :disabled="!canGoPrevious"
            class="px-4 py-2 border border-titan-300 text-sm rounded-md disabled:opacity-50"
            @click="previousPage"
          >
            Anterior
          </button>
          <button
            type="button"
            :disabled="!canGoNext"
            class="px-4 py-2 border border-titan-300 text-sm rounded-md disabled:opacity-50"
            @click="nextPage"
          >
            Siguiente
          </button>
        </div>
      </div>
      </HealthSemaphore>
    </div>

    <!-- warocol.com#608 — Stock adjustment slide-over -->
    <AbastecimientoStockAdjustmentPanel
      v-model="showAdjustmentPanel"
      @saved="onAdjustmentSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useQueryCache } from '@pinia/colada'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { WAREHOUSE_COPY } from '~/constants/warehouseCopy'

useHead({ title: 'Stock' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const categoryFilter = ref('')
const statusFilter = ref('all')
const unitFilter = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(50)

const currentOffset = computed(() => (currentPage.value - 1) * itemsPerPage.value)

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || statusFilter.value !== 'all'
    || !!categoryFilter.value
    || !!unitFilter.value,
)

const performSearch = () => applySearch(() => { currentPage.value = 1 })

watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })

// warocol.com#608 — stock adjustment slide-over
const showAdjustmentPanel = ref(false)
const toast = useToast()
const cache = useQueryCache()
const onAdjustmentSaved = () => {
  // Invalidate the inventory query so the table reflects the new stock.
  cache.invalidateQueries({ key: ['inventory'] })
  toast.success('Ajuste registrado', { title: 'Stock actualizado' })
}

const sortField = ref('current_stock')
const sortDirection = ref('desc')

const { data: inventoryData, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['inventory', 'stock', currentTenant.value?.id, {
    search: appliedSearch.value || null,
    status: statusFilter.value,
    sort_field: sortField.value,
    sort_direction: sortDirection.value,
    page: currentPage.value,
    limit: itemsPerPage.value,
  }],
  query: () => {
    const params: Record<string, string | number> = {
      limit: itemsPerPage.value,
      offset: currentOffset.value,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
      status_filter: statusFilter.value,
    }
    if (appliedSearch.value) params.search = appliedSearch.value
    return $fetch('/api/inventory/stock', { params })
  },
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

/** Category/unit: no API params — filters current page only. */
const displayInventory = computed(() =>
  inventory.value.filter((item) => {
    const matchesCategory = !categoryFilter.value || item.category === categoryFilter.value
    const matchesUnit = !unitFilter.value || item.unit === unitFilter.value
    return matchesCategory && matchesUnit
  }),
)

const totalPages = computed(() =>
  Math.ceil((inventoryData.value?.total ?? 0) / itemsPerPage.value),
)
const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)
const startItem = computed(() =>
  inventoryData.value?.total ? (currentPage.value - 1) * itemsPerPage.value + 1 : 0,
)
const endItem = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, inventoryData.value?.total ?? 0),
)

const previousPage = () => {
  if (canGoPrevious.value) currentPage.value--
}
const nextPage = () => {
  if (canGoNext.value) currentPage.value++
}

const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
  currentPage.value = 1
}

const clearFilters = () => {
  clearSearch()
  categoryFilter.value = ''
  statusFilter.value = 'all'
  unitFilter.value = ''
  currentPage.value = 1
}

// Table columns configuration
const stockTableColumns = [
  {
    key: 'ingredient_name',
    title: WAREHOUSE_COPY.warehouseItemColumn,
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
  const variants: Record<string, string> = {
    negative: 'destructive',
    low: 'warning',
    ok: 'success',
  }
  return variants[status] || 'default'
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    negative: 'Crítico',
    low: 'Bajo',
    ok: 'Normal',
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
  ['/abastecimiento/stock/', '/abastecimiento/ajustes/', '/abastecimiento/movimientos']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
