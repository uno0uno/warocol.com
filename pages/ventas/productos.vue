<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import MetricCard from '~/components/shared/MetricCard.vue'

useHead({ title: () => t('ventas.head.productos') })

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()
const { formatCurrency, formatRelativeDate } = useFormatters()

const lastUpdate = ref<Date>(new Date())

// Filters — AdvancedFiltersBar (#763)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

const categoryFilter = ref<string | null>(null)
const sortFilter = ref<'qty_desc' | 'revenue_desc' | 'name_asc'>('qty_desc')
const channelFilter = ref<'pos' | 'mesa' | 'online' | null>(null)

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!dateRangeDates.value
    || !!categoryFilter.value
    || sortFilter.value !== 'qty_desc'
    || !!channelFilter.value,
)

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  categoryFilter.value = null
  sortFilter.value = 'qty_desc'
  channelFilter.value = null
  currentPage.value = 1
}

const emptyMessage = computed(() =>
  hasActiveFilters.value
    ? t('ventas.productos.emptyFilter')
    : t('ventas.productos.emptyPeriod'),
)

const emptySubMessage = computed(() =>
  hasActiveFilters.value
    ? t('ventas.productos.emptyFilterHint')
    : t('ventas.productos.emptySub'),
)

// ── Data ─────────────────────────────────────────────────────────────────
type ProductRow = {
  product_id: string
  product_name: string
  category_id: string | null
  category_name: string | null
  quantity_sold: number
  total_revenue: number
}

const PAGE_SIZE = 25
const currentPage = ref(1)

const { data: productsData, asyncStatus, error, refetch } = useQuery({
  key: () => ['ventas', 'productos', currentTenant.value?.id, {
    from: dateRange.value.from,
    to: dateRange.value.to,
    category_id: categoryFilter.value,
    sort: sortFilter.value,
    search: appliedSearch.value || null,
    channel: channelFilter.value,
    page: currentPage.value,
    limit: PAGE_SIZE,
  }],
  query: () => $fetch<{
    success: boolean
    data: ProductRow[]
    totals: { quantity_sold: number; total_revenue: number }
    pagination?: { total: number; limit: number; offset: number }
    categories?: Array<{ id: string; name: string }>
  }>('/api/orders/products-sold', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      category_id: categoryFilter.value || undefined,
      sort: sortFilter.value,
      search: appliedSearch.value || undefined,
      channel: channelFilter.value || undefined,
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
    },
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const hasEverLoaded = ref(false)
watch(productsData, (v) => { if (v) hasEverLoaded.value = true })
const isLoading = computed(() => !hasEverLoaded.value && asyncStatus.value === 'loading')
const isRefreshing = computed(() => hasEverLoaded.value && asyncStatus.value === 'loading')

const products = computed(() => productsData.value?.data ?? [])
const totals = computed(() => productsData.value?.totals ?? { quantity_sold: 0, total_revenue: 0 })
const productsTotal = computed(() => productsData.value?.pagination?.total ?? products.value.length)
const productsTotalPages = computed(() => Math.max(1, Math.ceil(productsTotal.value / PAGE_SIZE)))

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, productsTotalPages.value))
}

watch([appliedSearch, dateRangeDates, categoryFilter, sortFilter, channelFilter], () => {
  currentPage.value = 1
})

watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })

const performSearch = () => applySearch(() => { currentPage.value = 1 })

// Categories from API (full filter set, ignores page / optional category chip)
const cachedCategories = ref<Array<{ id: string; name: string }>>([])
watch(productsData, (data) => {
  if (data?.categories?.length) {
    cachedCategories.value = [...data.categories].sort((a, b) => a.name.localeCompare(b.name))
  }
})

const categoryHeaderOptions = computed(() =>
  cachedCategories.value.map(category => ({ label: category.name, value: category.id })),
)

const categoryHeaderFilter = computed({
  get: () => categoryFilter.value ?? '',
  set: (value: string | boolean) => {
    categoryFilter.value = typeof value === 'string' && value ? value : null
  },
})

const TABLE_SORT_TO_API: Record<string, 'qty_desc' | 'revenue_desc' | 'name_asc'> = {
  product_name: 'name_asc',
  quantity_sold: 'qty_desc',
  total_revenue: 'revenue_desc',
}

const API_SORT_TO_TABLE: Record<'qty_desc' | 'revenue_desc' | 'name_asc', { field: string; direction: 'asc' | 'desc' }> = {
  qty_desc: { field: 'quantity_sold', direction: 'desc' },
  revenue_desc: { field: 'total_revenue', direction: 'desc' },
  name_asc: { field: 'product_name', direction: 'asc' },
}

const tableSortField = computed(() => API_SORT_TO_TABLE[sortFilter.value].field)
const tableSortDirection = computed(() => API_SORT_TO_TABLE[sortFilter.value].direction)
const ingredientAnalyticsLink = computed(() => ({
  path: '/analitica/articulos-de-bodega',
  query: dateRange.value.from && dateRange.value.to
    ? { date_from: dateRange.value.from, date_to: dateRange.value.to }
    : {},
}))

function handleTableSort(field: string) {
  const nextSort = TABLE_SORT_TO_API[field]
  if (!nextSort) return
  sortFilter.value = nextSort
}

// ── Table columns ────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'product_name', title: t('ventas.common.producto'), sortable: true },
  { key: 'category_name', title: t('ventas.productos.category'), sortable: false },
  { key: 'quantity_sold', title: t('ventas.productos.sold'), sortable: true },
  { key: 'total_revenue', title: t('ventas.productos.revenue'), sortable: true },
]

// ── Layout actions ───────────────────────────────────────────────────────
const lastUpdateText = computed(() => formatRelativeDate(lastUpdate.value.toISOString()))

const handleRefresh = async () => {
  await refetch()
  lastUpdate.value = new Date()
}

watch(lastUpdate, () => { if (setLastUpdateText) setLastUpdateText(lastUpdateText.value) })

onMounted(() => {
  if (setRefreshHandler) setRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(lastUpdateText.value)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  if (clearRefreshHandler) clearRefreshHandler(handleRefresh)
  if (setLastUpdateText) setLastUpdateText(undefined)
})
</script>

<template>
  <div class="flex flex-col gap-3 md:gap-4 pb-20">

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error -->
    <CommonsTheErrorState v-else-if="error" />

    <!-- Content -->
    <template v-else>

      <!-- Summary cards -->
      <div class="grid grid-cols-2 gap-3 md:gap-4">
        <MetricCard
          :title="t('ventas.productos.unitsSold')"
          :value="totals.quantity_sold"
          format="number"
          variant="primary"
        />
        <MetricCard
          :title="t('ventas.productos.revenueTotal')"
          :value="totals.total_revenue"
          format="currency"
          variant="primary"
        />
      </div>

      <NuxtLink
        :to="ingredientAnalyticsLink"
        class="flex flex-col gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm transition-colors hover:border-primary hover:bg-surface-secondary sm:flex-row sm:items-center sm:justify-between"
        :aria-label="t('ventas.productos.ingredientsLinkAria')"
      >
        <span>
          <span class="font-semibold text-text-primary">{{ t('ventas.productos.soldTitle') }}</span>
          <span class="text-text-secondary">{{ t('ventas.productos.ingredientsInsight') }}</span>
        </span>
        <span class="font-semibold text-primary whitespace-nowrap">{{ t('ventas.productos.viewIngredients') }}</span>
      </NuxtLink>

      <!-- Filters bar -->
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        :search-placeholder="t('ventas.productos.searchPlaceholder')"
        :search-fields="[]"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-if="cachedCategories.length > 0"
            v-model="categoryFilter"
            :aria-label="t('ventas.productos.filterCategory')"
            :class="[filterSelectClass, 'md:hidden']"
          >
            <option :value="null">{{ t('ventas.productos.category') }}</option>
            <option v-for="cat in cachedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>

          <select
            v-model="sortFilter"
            :aria-label="t('ventas.productos.sortBy')"
            :class="[filterSelectClass, 'md:hidden']"
          >
            <option value="qty_desc">{{ t('ventas.productos.sortQtyDesc') }}</option>
            <option value="revenue_desc">{{ t('ventas.productos.sortRevenueDesc') }}</option>
            <option value="name_asc">{{ t('ventas.productos.sortNameAsc') }}</option>
          </select>

          <select
            v-model="channelFilter"
            :aria-label="t('ventas.productos.filterChannel')"
            :class="filterSelectClass"
          >
            <option :value="null">{{ t('ventas.productos.channel') }}</option>
            <option value="pos">{{ t('ventas.common.pos') }}</option>
            <option value="mesa">{{ t('ventas.productos.tableChannel') }}</option>
            <option value="online">{{ t('ventas.productos.onlineChannel') }}</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Table loading (filter change, no cached data yet) -->
      <div v-if="isRefreshing && products.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <!-- Table -->
      <UiResponsiveDataView
        v-else
        row-size="sm"
        :columns="tableColumns"
        :data="products"
        :empty-message="emptyMessage"
        :empty-sub-message="emptySubMessage"
        :sort-field="tableSortField"
        :sort-direction="tableSortDirection"
        variant="default"
        @sort="handleTableSort"
      >
        <template #header-product_name>
          <UiTableHeaderFilter
            :title="t('ventas.common.producto')"
            column-key="product_name"
            sortable
            :sort-field="tableSortField"
            :sort-direction="tableSortDirection"
            filter-type="none"
            align="left"
            @sort="handleTableSort"
          />
        </template>

        <template #header-category_name>
          <UiTableHeaderFilter
            v-model="categoryHeaderFilter"
            :title="t('ventas.productos.category')"
            filter-type="select"
            :options="categoryHeaderOptions"
            :all-label="t('ventas.productos.category')"
            align="left"
          />
        </template>

        <template #header-quantity_sold>
          <UiTableHeaderFilter
            :title="t('ventas.productos.sold')"
            column-key="quantity_sold"
            sortable
            :sort-field="tableSortField"
            :sort-direction="tableSortDirection"
            filter-type="none"
            align="right"
            @sort="handleTableSort"
          />
        </template>

        <template #header-total_revenue>
          <UiTableHeaderFilter
            :title="t('ventas.productos.revenue')"
            column-key="total_revenue"
            sortable
            :sort-field="tableSortField"
            :sort-direction="tableSortDirection"
            filter-type="none"
            align="right"
            @sort="handleTableSort"
          />
        </template>

        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-text-primary">{{ item.product_name }}</p>
              <p class="text-xs text-text-secondary mt-0.5">{{ item.category_name ?? t('ventas.common.sinCategoria') }}</p>
            </div>
            <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(item.total_revenue) }}</span>
              <span class="text-xs text-text-secondary">{{ item.quantity_sold }} {{ t('ventas.productos.unitsAbbr') }}</span>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-product_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-category_name="{ value }">
          <span class="text-sm text-text-secondary">{{ value ?? t('ventas.common.sinCategoria') }}</span>
        </template>

        <template #cell-quantity_sold="{ value }">
          <span class="text-sm font-medium text-text-primary tabular-nums">{{ value }}</span>
        </template>

        <template #cell-total_revenue="{ value }">
          <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(value) }}</span>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination (match ventas/ordenes) -->
      <div v-if="productsTotal > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.primeraPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaAnterior')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
          <button
            :disabled="currentPage >= productsTotalPages"
            @click="goToPage(currentPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaSiguiente')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= productsTotalPages"
            @click="goToPage(productsTotalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.ultimaPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

    </template>
  </div>
</template>
