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
      />

      <!-- Mobile-only movement type filter (desktop uses table header filter) -->
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

      <UiResponsiveDataView
        row-size="sm"
        :columns="movementsTableColumns"
        :data="movements"
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

      <!-- Pagination (same pattern as abastecimiento/compras-directas) -->
      <div
        v-if="movementsTotal > itemsPerPage"
        class="bg-surface px-4 py-3 flex items-center justify-between border border-border rounded-lg"
      >
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            type="button"
            :disabled="!canGoPrevious"
            :class="[
              'relative inline-flex items-center px-4 py-2 border border-action-outline-border text-sm font-medium rounded-md',
              canGoPrevious
                ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg'
                : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed',
            ]"
            @click="previousPage"
          >
            {{ t('abastecimiento.comprasDirectas.previous') }}
          </button>
          <button
            type="button"
            :disabled="!canGoNext"
            :class="[
              'relative inline-flex items-center px-4 py-2 border border-action-outline-border text-sm font-medium rounded-md',
              canGoNext
                ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg'
                : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed',
            ]"
            @click="nextPage"
          >
            {{ t('abastecimiento.comprasDirectas.next') }}
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-text-secondary">
              {{ t('common.pagination.showingRange', { start: startItem, end: endItem, total: movementsTotal }) }}
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                type="button"
                :disabled="!canGoPrevious"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-s-md border border-action-outline-border text-sm font-medium',
                  canGoPrevious
                    ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg'
                    : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed',
                ]"
                :aria-label="t('abastecimiento.comprasDirectas.previous')"
                @click="previousPage"
              >
                <ChevronLeftIcon class="h-5 w-5" aria-hidden="true" />
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-action-outline-border bg-action-outline-bg text-sm font-medium text-action-outline-text">
                {{ currentPage }} / {{ movementsTotalPages }}
              </span>
              <button
                type="button"
                :disabled="!canGoNext"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-e-md border border-action-outline-border text-sm font-medium',
                  canGoNext
                    ? 'text-action-outline-text bg-action-outline-bg hover:bg-action-outline-hover-bg'
                    : 'text-action-outline-disabled-text bg-action-outline-disabled-bg cursor-not-allowed',
                ]"
                :aria-label="t('abastecimiento.comprasDirectas.next')"
                @click="nextPage"
              >
                <ChevronRightIcon class="h-5 w-5" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
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
const itemsPerPage = ref(20)
const currentPage = ref(1)

const filterSelectClass = 'h-10 min-h-[44px] px-3 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 flex-shrink-0'

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

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const sortField = ref('created_at')
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
    search: appliedSearch.value || null,
    sort_field: sortField.value,
    sort_direction: sortDirection.value,
    page: currentPage.value,
    limit: itemsPerPage.value,
  }],
  query: () => {
    const params: Record<string, string | number> = {
      limit: itemsPerPage.value,
      offset: (currentPage.value - 1) * itemsPerPage.value,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
      ...dateParts.value,
    }
    if (movementTypeFilter.value) params.movement_type = movementTypeFilter.value
    if (ingredientFilter.value) params.ingredient_id = ingredientFilter.value
    if (appliedSearch.value) params.search = appliedSearch.value
    return $fetch('/api/inventory/movements', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !movementsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && movementsData.value != null)

const movements = computed(() => movementsData.value?.data || [])
const movementsTotal = computed(() => movementsData.value?.total ?? 0)
const movementsTotalPages = computed(() =>
  Math.ceil(movementsTotal.value / itemsPerPage.value),
)
const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < movementsTotalPages.value)
const startItem = computed(() =>
  movementsTotal.value ? (currentPage.value - 1) * itemsPerPage.value + 1 : 0,
)
const endItem = computed(() =>
  Math.min(currentPage.value * itemsPerPage.value, movementsTotal.value),
)

const previousPage = () => {
  if (canGoPrevious.value) currentPage.value--
}
const nextPage = () => {
  if (canGoNext.value) currentPage.value++
}

watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch(dateRangeDates, () => { currentPage.value = 1 })
watch(movementTypeFilter, () => { currentPage.value = 1 })
watch(ingredientFilter, () => { currentPage.value = 1 })

const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'desc'
  }
  currentPage.value = 1
}

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  ingredientFilter.value = ''
  movementTypeFilter.value = ''
  currentPage.value = 1
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
