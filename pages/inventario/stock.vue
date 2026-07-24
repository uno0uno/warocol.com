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
      :current-page="currentPage"
      :total-pages="totalPages"
      :start-item="startItem"
      :end-item="endItem"
      :can-go-previous="canGoPrevious"
      :can-go-next="canGoNext"
      :has-active-filters="hasActiveFilters"
      :categories="categories"
      :units="units"
      :sort-field="sortField"
      :sort-direction="sortDirection"
      adjustment-path="/inventario/ajustes/crear"
      :copy="stockCopy"
      :status-options="stockStatusOptions"
      show-mobile-stock-limits
      @update:status-filter="updateStatusFilter"
      @search="performSearch"
      @clear="clearFilters"
      @sort="handleSort"
      @previous-page="previousPage"
      @next-page="nextPage"
      @go-to-page="goToPage"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

const { t } = useI18n()
useHead({ title: () => t('abastecimiento.head.stock') })

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

const sortField = ref('current_stock')
const sortDirection = ref<'asc' | 'desc'>('desc')

const stockCopy = computed(() => ({
  statsTotal: t('abastecimiento.stock.invStatsTotal'),
  searchPlaceholder: t('abastecimiento.stock.invSearchPlaceholder'),
  emptyMessage: t('abastecimiento.stock.invEmptyMessage'),
  ingredientColumn: t('abastecimiento.stock.invIngredientColumn'),
}))

const stockStatusOptions = computed(() => [
  { value: 'negative', label: t('abastecimiento.common.critico'), variant: 'destructive' },
  { value: 'zero', label: t('abastecimiento.common.sinStock'), variant: 'secondary' },
  { value: 'low', label: t('abastecimiento.common.bajo'), variant: 'warning' },
  { value: 'ok', label: t('abastecimiento.common.normal'), variant: 'success' },
])

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
const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, totalPages.value || 1))
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
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
