<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <InventarioStockInventoryView
      v-else
      v-model:search="localSearchTerm"
      :category-filter="categoryFilter"
      :unit-filter="unitFilter"
      :status-filter="statusFilter"
      :stats="stats"
      :inventory="inventory"
      :total="inventoryData?.total ?? 0"
      :current-page="currentPage"
      :total-pages="totalPages"
      :start-item="startItem"
      :end-item="endItem"
      :can-go-previous="canGoPrevious"
      :can-go-next="canGoNext"
      :page-size="itemsPerPage"
      :has-active-filters="hasActiveFilters"
      :categories="categories"
      :units="units"
      :sort-field="sortField"
      :sort-direction="sortDirection"
      movements-path="/abastecimiento/movimientos"
      :copy="stockCopy"
      :status-options="stockStatusOptions"
      highlight-negative-stock
      @update:category-filter="updateCategoryFilter"
      @update:status-filter="updateStatusFilter"
      @update:unit-filter="updateUnitFilter"
      @search="performSearch"
      @clear="clearFilters"
      @sort="handleSort"
      @previous-page="previousPage"
      @next-page="nextPage"
      @adjust="openAdjustment"
    />

    <AbastecimientoStockAdjustmentPanel
      v-model="adjustmentOpen"
      :preselect="adjustmentPreselect"
      @saved="refetch"
    />

    <UiConfirmActionModal
      v-model="quotaLimitModalOpen"
      :title="t('billing.upgrade.quotaBlocked')"
      :message="quotaLimitModalMessage"
      :confirm-label="t('nav.miPlan')"
      :cancel-label="t('billing.close')"
      @confirm="goToBillingFromQuotaLimitModal"
      @cancel="closeQuotaLimitModal"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useOperationalQuotaGate } from '~/composables/useOperationalQuotaGate'
import type { StockAdjustmentPreselect } from '@/components/abastecimiento/StockAdjustmentPanel.vue'

const { t } = useI18n()
const WAREHOUSE_COPY = useWarehouseCopy()
useHead({ title: () => t('abastecimiento.head.stock') })

// Plan quota gate: Ajustar stays clickable; Mi Plan modal at stock_adjustments_per_period cap (#1819)
const {
  quotaLimitModalOpen,
  quotaLimitModalMessage,
  closeQuotaLimitModal,
  goToBillingFromQuotaLimitModal,
  handleCreateClick,
  ensureBillingOverview,
} = useOperationalQuotaGate('stock_adjustments_per_period')

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const categoryFilter = ref('')
const statusFilter = ref('all')
const unitFilter = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)

const adjustmentOpen = ref(false)
const adjustmentPreselect = ref<StockAdjustmentPreselect | null>(null)

const openAdjustment = (item: {
  ingredient_id: string
  ingredient_name: string
  unit: string
  minimum_stock: number
  maximum_stock?: number | null
}) => {
  void handleCreateClick(() => {
    adjustmentPreselect.value = {
      id: item.ingredient_id,
      name: item.ingredient_name,
      unit: item.unit,
      minimum_stock: item.minimum_stock,
      maximum_stock: item.maximum_stock ?? null,
    }
    adjustmentOpen.value = true
  })
}

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
  statsTotal: WAREHOUSE_COPY.stockStatsTotal,
  searchPlaceholder: WAREHOUSE_COPY.stockSearchPlaceholder,
  emptyMessage: WAREHOUSE_COPY.stockEmptyMessage,
  ingredientColumn: WAREHOUSE_COPY.warehouseItemColumn,
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
    category: categoryFilter.value || null,
    unit: unitFilter.value || null,
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
    if (categoryFilter.value) params.category = categoryFilter.value
    if (unitFilter.value) params.unit = unitFilter.value
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

const categories = computed(() => inventoryData.value?.filter_options?.categories || [])
const units = computed(() => inventoryData.value?.filter_options?.units || [])

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

const updateCategoryFilter = (value: string) => {
  categoryFilter.value = value
  currentPage.value = 1
}

const updateUnitFilter = (value: string) => {
  unitFilter.value = value
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
  ensureBillingOverview()
})
useMenuReturnRefresh(
  '/abastecimiento/stock',
  refetch,
  'abastecimiento-last-path',
  ['/abastecimiento/stock/', '/abastecimiento/movimientos']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
