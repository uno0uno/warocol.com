<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <InventarioStockInventoryView
      v-else
      v-model:search="localSearchTerm"
      v-model:category-filter="categoryFilter"
      v-model:unit-filter="unitFilter"
      :status-filter="statusFilter"
      :stats="stats"
      :inventory="displayInventory"
      :total="inventoryData?.total ?? 0"
      :items-per-page="itemsPerPage"
      :start-item="startItem"
      :end-item="endItem"
      :can-go-previous="canGoPrevious"
      :can-go-next="canGoNext"
      :has-active-filters="hasActiveFilters"
      :categories="categories"
      :units="units"
      :sort-field="sortField"
      :sort-direction="sortDirection"
      adjustment-path="/abastecimiento/ajustes/crear"
      movements-path="/abastecimiento/movimientos"
      :copy="stockCopy"
      :status-options="stockStatusOptions"
      highlight-negative-stock
      @update:status-filter="updateStatusFilter"
      @search="performSearch"
      @clear="clearFilters"
      @sort="handleSort"
      @previous-page="previousPage"
      @next-page="nextPage"
    >
      <template #filter-actions>
        <button
          type="button"
          title="Ajustar stock"
          class="min-h-[44px] h-10 px-3 inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors flex-shrink-0"
          @click="showAdjustmentPanel = true"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span class="hidden sm:inline">Ajustar stock</span>
        </button>
      </template>
    </InventarioStockInventoryView>

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
const sortDirection = ref<'asc' | 'desc'>('desc')

const stockCopy = {
  statsTotal: WAREHOUSE_COPY.stockStatsTotal,
  searchPlaceholder: WAREHOUSE_COPY.stockSearchPlaceholder,
  emptyMessage: WAREHOUSE_COPY.stockEmptyMessage,
  ingredientColumn: WAREHOUSE_COPY.warehouseItemColumn,
}

const stockStatusOptions = [
  { value: 'negative', label: 'Crítico', variant: 'destructive' },
  { value: 'low', label: 'Bajo', variant: 'warning' },
  { value: 'ok', label: 'Normal', variant: 'success' },
]

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

const updateStatusFilter = (value: string) => {
  statusFilter.value = value
  currentPage.value = 1
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
