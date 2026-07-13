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
          :label="t('abastecimiento.ajustes.totalAdjustments')"
          :value="adjustmentsTotal"
          icon="adjustments-horizontal"
        />
        <UiStatsCard
          :label="WAREHOUSE_COPY.adjustmentsStatsLabel"
          :value="uniqueIngredientsAdjusted"
          icon="beaker"
        />
        <UiStatsCard
          :label="t('abastecimiento.ajustes.criticalStock')"
          :value="stockStats.critical_count || 0"
          icon="exclamation-circle"
        />
        <UiStatsCard
          :label="t('abastecimiento.ajustes.lowStock')"
          :value="stockStats.low_stock_count || 0"
          icon="exclamation"
        />
      </UiStats>

      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        :search-fields="[]"
        :search-placeholder="WAREHOUSE_COPY.adjustmentsSearchPlaceholder"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <UiIngredientFilterSearch v-model="ingredientFilter" />

          <select
            v-model="adjustmentTypeFilter"
            :class="[filterSelectClass, 'md:hidden']"
            :aria-label="t('abastecimiento.ajustes.filterTypeAria')"
          >
            <option value="">{{ t('abastecimiento.ajustes.typeFilter') }}</option>
            <option value="positive">{{ t('abastecimiento.ajustes.positive') }}</option>
            <option value="negative">{{ t('abastecimiento.ajustes.negative') }}</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="adjustmentsTableColumns"
        :data="sortedAdjustments"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        :empty-message="t('abastecimiento.ajustes.empty')"
        :empty-sub-message="t('abastecimiento.ajustes.emptySubAbs')"
        variant="default"
        row-size="sm"
      >
        <template #header-adjustment_type>
          <UiTableHeaderFilter
            :title="t('abastecimiento.ajustes.typeFilter')"
            filter-type="select"
            :model-value="adjustmentTypeFilter"
            :options="adjustmentTypeOptions"
            :all-label="t('abastecimiento.common.todos')"
            align="center"
            @update:model-value="adjustmentTypeFilter = typeof $event === 'string' ? $event : ''"
          />
        </template>

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
                :class="item.quantity_change >= 0 ? 'text-success' : 'text-destructive'"
              >
                {{ item.quantity_change >= 0 ? '+' : '' }}{{ formatNumber(item.quantity_change) }}
              </p>
              <UiStatusBadge
                :value="item.quantity_change >= 0 ? t('abastecimiento.ajustes.positive') : t('abastecimiento.ajustes.negative')"
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
          <UiStatusBadge
            :value="row.quantity_change >= 0 ? t('abastecimiento.ajustes.positive') : t('abastecimiento.ajustes.negative')"
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

        <template #cell-created_by_name="{ value }">
          <span class="text-sm text-text-primary">{{ value || t('abastecimiento.ajustes.system') }}</span>
        </template>
      </UiResponsiveDataView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
const { t, locale } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()

useHead({ title: () => t('abastecimiento.head.historialAjustes') })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()
const ingredientFilter = ref('')
const adjustmentTypeFilter = ref('')

const adjustmentTypeOptions = computed(() => [
  { value: 'positive', label: t('abastecimiento.common.incrementos') },
  { value: 'negative', label: t('abastecimiento.common.decrementos') },
])

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

const dateParts = computed(() => {
  if (!dateRange.value.from || !dateRange.value.to) return {}
  return { start_date: dateRange.value.from, end_date: dateRange.value.to }
})

const { data: adjustmentsData, asyncStatus: adjustmentsAsyncStatus, refetch } = useQuery({
  key: () => ['inventory', 'adjustments', currentTenant.value?.id ?? null, {
    ingredient: ingredientFilter.value || null,
    direction: adjustmentTypeFilter.value || null,
    from: dateRange.value.from,
    to: dateRange.value.to,
  }],
  query: () => $fetch('/api/inventory/movements', {
    params: {
      limit: 500,
      movement_type: 'adjustment',
      quantity_direction: adjustmentTypeFilter.value || undefined,
      ingredient_id: ingredientFilter.value || undefined,
      ...dateParts.value,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !adjustmentsData.value)
const isRefreshing = computed(() => adjustmentsAsyncStatus.value === 'loading' && adjustmentsData.value != null)
const adjustments = computed(() => adjustmentsData.value?.data || [])
const adjustmentsTotal = computed(() => (adjustmentsData.value as any)?.total ?? adjustments.value.length)

// Load stock data for suggestions
const { data: stockData } = useQuery({
  key: () => ['inventory', 'stock', currentTenant.value?.id ?? null],
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
  return stock.filter(item => item.status === 'negative' || item.status === 'low')
})

// Unique ingredients adjusted
const uniqueIngredientsAdjusted = computed(() => {
  const uniqueIds = new Set(adjustments.value.map(adj => adj.ingredient_id))
  return uniqueIds.size
})

const filteredAdjustments = computed(() => {
  const q = appliedSearch.value.trim().toLowerCase()
  return adjustments.value.filter((adjustment) => {
    return !q
      || adjustment.ingredient_name.toLowerCase().includes(q)
      || (adjustment.reason && adjustment.reason.toLowerCase().includes(q))
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
const adjustmentsTableColumns = computed(() => [
  {
    key: 'created_at',
    title: t('abastecimiento.common.fecha'),
    sortable: true,
    format: 'date',
    align: 'left'
  },
  {
    key: 'ingredient_name',
    title: WAREHOUSE_COPY.warehouseItemColumn,
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'unit',
    title: t('abastecimiento.common.unidad'),
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'adjustment_type',
    title: t('abastecimiento.common.tipo'),
    sortable: false,
    format: 'badge',
    align: 'center'
  },
  {
    key: 'quantity_change',
    title: t('abastecimiento.common.cantidad'),
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'previous_stock',
    title: t('abastecimiento.common.stockAnt'),
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'new_stock',
    title: t('abastecimiento.common.stockNuevo'),
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'created_by_name',
    title: t('abastecimiento.common.usuario'),
    sortable: true,
    format: 'text',
    align: 'left'
  }
])

const formatNumber = (value: number) => {
  return new Intl.NumberFormat(toNumberLocaleTag(locale.value), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

const { formatDateTime: formatDate } = useFormatters()

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
