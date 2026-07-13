<template>
  <div class="page-layout">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <div v-else class="flex flex-col gap-3 md:gap-4">
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        :search-placeholder="WAREHOUSE_COPY.movementsSearchPlaceholder"
        :search-fields="[]"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <UiIngredientFilterSearch v-model="ingredientFilter" />

          <select
            v-model="movementTypeFilter"
            :class="[filterSelectClass, 'md:hidden']"
            :aria-label="t('abastecimiento.movimientos.filterTypeAria')"
          >
            <option value="">{{ t('abastecimiento.movimientos.typeFilter') }}</option>
            <option value="purchase">{{ t('abastecimiento.common.compras') }}</option>
            <option value="consumption">{{ t('abastecimiento.common.consumo') }}</option>
            <option value="adjustment">{{ t('abastecimiento.common.ajustes') }}</option>
            <option value="return">{{ t('abastecimiento.common.devoluciones') }}</option>
            <option value="loss">{{ t('abastecimiento.common.perdidas') }}</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <UiResponsiveDataView
        row-size="sm"
        :columns="movementsTableColumns"
        :data="sortedMovements"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        :empty-message="t('abastecimiento.movimientos.empty')"
        :empty-sub-message="t('abastecimiento.movimientos.emptySub')"
        variant="default"
      >
        <template #header-movement_type>
          <UiTableHeaderFilter
            :title="t('abastecimiento.movimientos.typeFilter')"
            column-key="movement_type"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :model-value="movementTypeFilter"
            :options="movementTypeOptions"
            :all-label="t('abastecimiento.common.todos')"
            align="center"
            @sort="handleSort"
            @update:model-value="movementTypeFilter = typeof $event === 'string' ? $event : ''"
          />
        </template>

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
          <span
            class="text-sm font-medium tabular-nums"
            :class="value < 0 ? 'text-destructive' : 'text-text-primary'"
          >
            {{ formatNumber(value) }}
          </span>
        </template>

        <template #cell-reference_number="{ value }">
          <span v-if="value" class="text-sm text-primary font-medium">{{ value }}</span>
          <span v-else class="text-sm text-text-secondary">{{ t('abastecimiento.movimientos.noReference') }}</span>
        </template>

        <template #cell-created_by_name="{ value }">
          <span class="text-sm text-text-primary">{{ value || t('abastecimiento.movimientos.system') }}</span>
        </template>
      </UiResponsiveDataView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { formatDomainQuantity } from '~/utils/domainNumberFormat'
const { t, locale } = useI18n({ useScope: 'global' })
const WAREHOUSE_COPY = useWarehouseCopy()

useHead({ title: () => t('abastecimiento.head.movimientos') })

const route = useRoute()
const { currentTenant } = useTenantReactive()

const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()
const ingredientFilter = ref('')
const movementTypeFilter = ref('')

const movementTypeOptions = computed(() => [
  { value: 'purchase', label: t('abastecimiento.common.compras') },
  { value: 'consumption', label: t('abastecimiento.common.consumo') },
  { value: 'adjustment', label: t('abastecimiento.common.ajustes') },
  { value: 'return', label: t('abastecimiento.common.devoluciones') },
  { value: 'loss', label: t('abastecimiento.common.perdidas') },
])

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!dateRangeDates.value
    || !!ingredientFilter.value
    || !!movementTypeFilter.value,
)

const performSearch = () => applySearch()

const sortField = ref('')
const sortDirection = ref<'asc' | 'desc'>('desc')

const dateParts = computed(() => {
  if (!dateRange.value.from || !dateRange.value.to) return {}
  return { start_date: dateRange.value.from, end_date: dateRange.value.to }
})

const { data: movementsData, asyncStatus: queryAsyncStatus, refetch } = useQuery({
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

const movements = computed(() => movementsData.value?.data || [])

const filteredMovements = computed(() => {
  const q = appliedSearch.value.toLowerCase()
  if (!q) return movements.value
  return movements.value.filter((movement) => {
    return movement.ingredient_name.toLowerCase().includes(q)
      || (movement.reference_number && movement.reference_number.toLowerCase().includes(q))
  })
})

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

const handleSort = (field: string) => {
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
  movementTypeFilter.value = ''
}

const movementsTableColumns = computed(() => [
  { key: 'created_at', title: t('abastecimiento.common.fecha'), sortable: true, format: 'date', align: 'left' },
  { key: 'ingredient_name', title: WAREHOUSE_COPY.warehouseItemColumn, sortable: true, format: 'text', align: 'left' },
  { key: 'unit', title: t('abastecimiento.common.unidad'), sortable: false, format: 'text', align: 'left' },
  { key: 'movement_type', title: t('abastecimiento.common.tipo'), sortable: true, format: 'badge', align: 'center' },
  { key: 'quantity_change', title: t('abastecimiento.common.cantidad'), sortable: true, format: 'number', align: 'right' },
  { key: 'previous_stock', title: t('abastecimiento.common.stockAnt'), sortable: true, format: 'number', align: 'right' },
  { key: 'new_stock', title: t('abastecimiento.common.stockNuevo'), sortable: true, format: 'number', align: 'right' },
  { key: 'reference_number', title: t('abastecimiento.common.referencia'), sortable: true, format: 'text', align: 'left' },
  { key: 'created_by_name', title: t('abastecimiento.common.usuario'), sortable: true, format: 'text', align: 'left' },
])

const getMovementTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    purchase: t('abastecimiento.common.compra'),
    consumption: t('abastecimiento.common.consumo'),
    adjustment: t('abastecimiento.common.ajuste'),
    loss: t('abastecimiento.common.perdidas'),
    transfer: t('abastecimiento.common.transferencia'),
    return: t('abastecimiento.common.devoluciones'),
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
  return formatDomainQuantity(value, 6, normalizeUiLocale(locale.value))
}

const { formatDate } = useFormatters()

const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => {
  const ingredientId = route.query.ingredient_id
  if (typeof ingredientId === 'string' && ingredientId) {
    ingredientFilter.value = ingredientId
  }
  setRefreshHandler(refetch)
})
useMenuReturnRefresh(
  '/abastecimiento/movimientos',
  refetch,
  'abastecimiento-last-path',
  ['/abastecimiento/stock', '/abastecimiento/movimientos']
)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})
</script>
