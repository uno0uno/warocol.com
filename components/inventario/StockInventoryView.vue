<template>
  <div class="flex flex-col gap-3 md:gap-4">
    <UiStats>
      <UiStatsCard
        :label="copy.statsTotal"
        :value="stats.total_ingredients"
        icon="beaker"
      />
      <UiStatsCard
        :label="t('abastecimiento.common.stockBajo')"
        :value="stats.low_stock_count"
        icon="exclamation"
      />
      <UiStatsCard
        :label="t('abastecimiento.common.stockCritico')"
        :value="stats.critical_count"
        icon="exclamation-circle"
      />
      <UiStatsCard
        :label="t('abastecimiento.common.valorTotal')"
        :value="formatCurrency(stats.total_inventory_value)"
        icon="currency-dollar"
      />
    </UiStats>

    <UiAdvancedFiltersBar
      :search="search"
      :search-fields="[]"
      :search-placeholder="copy.searchPlaceholder"
      :show-date-range="false"
      :show-clear="hasActiveFilters"
      @update:search="$emit('update:search', $event)"
      @search="$emit('search')"
      @clear="$emit('clear')"
    >
      <template #additional-filters>
        <select
          :value="categoryFilter"
          :class="[filterSelectClass, 'md:hidden']"
          :aria-label="t('abastecimiento.stock.filterCategoryAria')"
          @change="$emit('update:categoryFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t('abastecimiento.common.categoria') }}</option>
          <option v-for="category in categories" :key="category" :value="category">
            {{ category }}
          </option>
        </select>

        <select
          :value="statusFilter"
          :class="[filterSelectClass, 'md:hidden']"
          :aria-label="t('abastecimiento.stock.filterStatusAria')"
          @change="$emit('update:statusFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option value="all">{{ t('abastecimiento.common.estado') }}</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>

        <select
          :value="unitFilter"
          :class="[filterSelectClass, 'md:hidden']"
          :aria-label="t('abastecimiento.stock.filterUnitAria')"
          @change="$emit('update:unitFilter', ($event.target as HTMLSelectElement).value)"
        >
          <option value="">{{ t('abastecimiento.common.unidad') }}</option>
          <option v-for="unit in units" :key="unit" :value="unit">
            {{ unit }}
          </option>
        </select>

        <slot name="filter-actions" />
      </template>
    </UiAdvancedFiltersBar>

    <UiResponsiveDataView
      row-size="sm"
      :columns="stockTableColumns"
      :data="inventory"
      :sort-field="sortField"
      :sort-direction="sortDirection"
      :empty-message="copy.emptyMessage"
      :empty-sub-message="t('abastecimiento.stock.emptySub')"
      variant="default"
      @sort="$emit('sort', $event)"
    >
        <template #header-unit>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.unidad')"
            filter-type="select"
            :model-value="unitFilter"
            :options="unitHeaderOptions"
            :all-label="t('abastecimiento.common.todas')"
            @update:model-value="$emit('update:unitFilter', typeof $event === 'string' ? $event : '')"
          />
        </template>

        <template #header-category>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.categoria')"
            filter-type="select"
            :model-value="categoryFilter"
            :options="categoryHeaderOptions"
            :all-label="t('abastecimiento.common.todas')"
            @update:model-value="$emit('update:categoryFilter', typeof $event === 'string' ? $event : '')"
          />
        </template>

        <template #header-status>
          <UiTableHeaderFilter
            :title="t('abastecimiento.common.estado')"
            column-key="status"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :model-value="headerStatusFilter"
            :options="stockStatusHeaderOptions"
            :all-label="t('abastecimiento.common.todos')"
            align="center"
            @sort="$emit('sort', $event)"
            @update:model-value="updateHeaderStatusFilter"
          />
        </template>

        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <span class="text-sm font-bold text-text-primary">{{ item.ingredient_name }}</span>
              <p class="text-xs text-text-secondary mt-0.5">
                {{ mobileSubtitle(item) }}
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <div class="flex flex-col items-end gap-1.5">
                <span
                  class="text-sm font-bold tabular-nums"
                  :class="highlightNegativeStock && item.current_stock < 0 ? 'text-destructive' : 'text-text-primary'"
                >
                  {{ formatNumber(item.current_stock) }}
                </span>
                <UiStatusBadge
                  :value="getStatusLabel(item.status)"
                  :variant="getStockVariant(item.status)"
                  size="sm"
                  format="text"
                />
              </div>
              <button
                type="button"
                :title="t('abastecimiento.stock.adjustAction')"
                class="w-7 h-7 flex items-center justify-center rounded bg-surface-secondary border border-border text-text-secondary hover:text-primary transition-colors"
                @click.stop="navigateToAdjustment(item.ingredient_id)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            </div>
          </div>
        </template>

        <template #cell-ingredient_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-category="{ value }">
          <span class="text-sm text-text-secondary">{{ value || '-' }}</span>
        </template>

        <template #cell-current_stock="{ value }">
          <span
            class="text-sm font-bold tabular-nums"
            :class="highlightNegativeStock && value < 0 ? 'text-destructive' : 'text-text-primary'"
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
                'bg-destructive': getStockVariant(row.status) === 'destructive',
                'bg-warning': getStockVariant(row.status) === 'warning',
                'bg-success': getStockVariant(row.status) === 'success'
              }"
              :style="{ width: `${Math.min(getStockPercentage(row.current_stock, row.maximum_stock), 100)}%` }"
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

        <template #cell-status="{ value }">
          <UiStatusBadge
            :value="getStatusLabel(value)"
            :variant="getStockVariant(value)"
            size="sm"
            format="text"
          />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center gap-1">
            <button
              v-if="movementsPath"
              type="button"
              :title="t('abastecimiento.stock.viewMovements')"
              :aria-label="t('abastecimiento.stock.viewMovements')"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-text-secondary hover:text-primary"
              @click="navigateTo(`${movementsPath}?ingredient_id=${row.ingredient_id}`)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </button>
            <button
              type="button"
              :title="t('abastecimiento.stock.adjustAction')"
              :aria-label="t('abastecimiento.stock.adjustAction')"
              class="p-1.5 rounded-md hover:bg-surface-secondary transition-colors text-primary"
              @click="navigateToAdjustment(row.ingredient_id)"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </template>
    </UiResponsiveDataView>

    <div
      v-if="total > itemsPerPage"
      class="mt-4 bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg"
    >
      <p class="text-sm text-titan-700">
        {{ t('common.pagination.showingRange', { start: startItem, end: endItem, total }) }}
      </p>
      <div class="flex gap-2">
        <button
          type="button"
          :disabled="!canGoPrevious"
          class="px-4 py-2 border border-titan-300 text-sm rounded-md disabled:opacity-50"
          @click="$emit('previous-page')"
        >
          {{ t('common.previous') }}
        </button>
        <button
          type="button"
          :disabled="!canGoNext"
          class="px-4 py-2 border border-titan-300 text-sm rounded-md disabled:opacity-50"
          @click="$emit('next-page')"
        >
          {{ t('common.next') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDomainQuantity } from '~/utils/domainNumberFormat'

const { t, locale } = useI18n({ useScope: 'global' })

interface StockStats {
  total_ingredients: number
  critical_count: number
  low_stock_count: number
  total_inventory_value: number
}

interface StockStatusOption {
  value: string
  label: string
  variant: string
}

interface StockCopy {
  statsTotal: string
  searchPlaceholder: string
  emptyMessage: string
  ingredientColumn: string
}

interface StockItem {
  ingredient_id: string
  ingredient_name: string
  unit: string
  category?: string
  current_stock: number
  minimum_stock: number
  maximum_stock?: number | null
  unit_cost?: number | null
  total_value: number
  status: string
}

const props = withDefaults(defineProps<{
  stats: StockStats
  inventory: StockItem[]
  total: number
  itemsPerPage: number
  startItem: number
  endItem: number
  canGoPrevious: boolean
  canGoNext: boolean
  search: string
  hasActiveFilters: boolean
  categories: string[]
  units: string[]
  categoryFilter: string
  statusFilter: string
  unitFilter: string
  sortField: string
  sortDirection: 'asc' | 'desc'
  adjustmentPath: string
  movementsPath?: string
  copy: StockCopy
  statusOptions: StockStatusOption[]
  showMobileStockLimits?: boolean
  highlightNegativeStock?: boolean
}>(), {
  movementsPath: '',
  showMobileStockLimits: false,
  highlightNegativeStock: false,
})

const emit = defineEmits<{
  'update:search': [value: string]
  'update:categoryFilter': [value: string]
  'update:statusFilter': [value: string]
  'update:unitFilter': [value: string]
  search: []
  clear: []
  sort: [field: string]
  'previous-page': []
  'next-page': []
}>()

const filterSelectClass = 'h-10 min-h-[44px] px-3 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 flex-shrink-0'

const categoryHeaderOptions = computed(() =>
  props.categories.map(category => ({
    label: category,
    value: category,
  })),
)

const unitHeaderOptions = computed(() =>
  props.units.map(unit => ({
    label: unit,
    value: unit,
  })),
)

const stockStatusHeaderOptions = computed(() =>
  props.statusOptions.map(option => ({
    label: option.label,
    value: option.value,
  })),
)

const headerStatusFilter = computed(() => props.statusFilter === 'all' ? '' : props.statusFilter)

const updateHeaderStatusFilter = (value: string | boolean) => {
  emit('update:statusFilter', typeof value === 'string' && value ? value : 'all')
}

const stockTableColumns = computed(() => [
  {
    key: 'ingredient_name',
    title: props.copy.ingredientColumn,
    sortable: true,
    format: 'text',
    align: 'left',
  },
  {
    key: 'unit',
    title: t('abastecimiento.common.unidad'),
    sortable: false,
    format: 'text',
    align: 'left',
  },
  {
    key: 'category',
    title: t('abastecimiento.common.categoria'),
    sortable: false,
    format: 'text',
    align: 'left',
  },
  {
    key: 'current_stock',
    title: t('abastecimiento.common.stockActual'),
    sortable: true,
    format: 'number',
    align: 'right',
  },
  {
    key: 'minimum_stock',
    title: t('abastecimiento.common.stockMin'),
    sortable: true,
    format: 'number',
    align: 'right',
  },
  {
    key: 'maximum_stock',
    title: t('abastecimiento.common.stockMax'),
    sortable: true,
    format: 'number',
    align: 'right',
  },
  {
    key: 'stock_percentage',
    title: t('abastecimiento.common.pctStock'),
    sortable: false,
    format: 'custom',
    align: 'center',
  },
  {
    key: 'unit_cost',
    title: t('abastecimiento.common.costoUnit'),
    sortable: true,
    format: 'currency',
    align: 'right',
  },
  {
    key: 'total_value',
    title: t('abastecimiento.common.valorTotal'),
    sortable: true,
    format: 'currency',
    align: 'right',
  },
  {
    key: 'status',
    title: t('abastecimiento.common.estado'),
    sortable: true,
    format: 'badge',
    align: 'center',
  },
  {
    key: 'actions',
    title: t('abastecimiento.common.acciones'),
    sortable: false,
    format: 'custom',
    align: 'center',
  },
])

const getStockPercentage = (current: number, max: number) => {
  if (!max || max === 0) return 0
  return Math.round((current / max) * 100)
}

const getStatusOption = (status: string) =>
  props.statusOptions.find(option => option.value === status)

const getStockVariant = (status: string) =>
  getStatusOption(status)?.variant || 'default'

const getStatusLabel = (status: string) =>
  getStatusOption(status)?.label || status

const mobileSubtitle = (item: StockItem) => {
  if (!props.showMobileStockLimits) return item.unit

  const maxLabel = item.maximum_stock
    ? ` · ${t('abastecimiento.stock.maxShort')} ${formatNumber(item.maximum_stock)}`
    : ''
  return `${item.unit} · ${t('abastecimiento.stock.minShort')} ${formatNumber(item.minimum_stock)}${maxLabel}`
}

const navigateToAdjustment = (ingredientId: string) => {
  navigateTo(`${props.adjustmentPath}?ingredientId=${ingredientId}`)
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat(toNumberLocaleTag(locale.value), {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const formatNumber = (value: number) => {
  return formatDomainQuantity(value)
}
</script>
