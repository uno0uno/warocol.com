<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import MetricCard from '~/components/shared/MetricCard.vue'

useHead({ title: 'Productos - Ventas' })

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()

const lastUpdate = ref<Date>(new Date())

// Filters — AdvancedFiltersBar (#763)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

const categoryFilter = ref<string | null>(null)
const sortFilter = ref<'qty_desc' | 'revenue_desc' | 'name_asc'>('qty_desc')
const channelFilter = ref<'pos' | 'mesa' | 'online' | null>(null)

const performSearch = () => applySearch()

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
}

const emptyMessage = computed(() =>
  hasActiveFilters.value
    ? 'Ningún producto coincide con los filtros'
    : 'No hay ventas en este período',
)

const emptySubMessage = computed(() =>
  hasActiveFilters.value
    ? 'Prueba ajustar o limpiar los filtros'
    : 'Selecciona un rango de fechas o ajusta los filtros',
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

const { data: productsData, asyncStatus, error, refetch } = useQuery({
  key: () => ['ventas', 'productos', currentTenant.value?.id, {
    from: dateRange.value.from,
    to: dateRange.value.to,
    category_id: categoryFilter.value,
    sort: sortFilter.value,
    search: appliedSearch.value || null,
    channel: channelFilter.value,
  }],
  query: () => $fetch<{ success: boolean; data: ProductRow[]; totals: { quantity_sold: number; total_revenue: number } }>('/api/orders/products-sold', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      category_id: categoryFilter.value || undefined,
      sort: sortFilter.value,
      search: appliedSearch.value || undefined,
      channel: channelFilter.value || undefined,
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

// Derive category list from unfiltered response (cache when no category filter)
const cachedCategories = ref<Array<{ id: string; name: string }>>([])
watch(productsData, (data) => {
  if (data && !categoryFilter.value) {
    const cats = new Map<string, string>()
    for (const p of data.data) {
      if (p.category_id && p.category_name) cats.set(p.category_id, p.category_name)
    }
    cachedCategories.value = Array.from(cats, ([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }
})

// ── Table columns ────────────────────────────────────────────────────────
const tableColumns = [
  { key: 'product_name', title: 'Producto', sortable: false },
  { key: 'category_name', title: 'Categoría', sortable: false },
  { key: 'quantity_sold', title: 'Vendidos', sortable: false },
  { key: 'total_revenue', title: 'Ingresos', sortable: false },
]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value || 0)

// ── Layout actions ───────────────────────────────────────────────────────
const lastUpdateText = computed(() => formatDistanceToNow(lastUpdate.value, { addSuffix: true, locale: es }))

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
          title="Unidades vendidas"
          :value="totals.quantity_sold"
          format="number"
          variant="primary"
        />
        <MetricCard
          title="Ingresos totales"
          :value="totals.total_revenue"
          format="currency"
          variant="primary"
        />
      </div>

      <!-- Filters bar -->
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:date-range="dateRangeDates"
        search-placeholder="Buscar producto..."
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
            aria-label="Filtrar por categoría"
            :class="filterSelectClass"
          >
            <option :value="null">Categoría</option>
            <option v-for="cat in cachedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>

          <select
            v-model="sortFilter"
            aria-label="Ordenar por"
            :class="filterSelectClass"
          >
            <option value="qty_desc">Más vendidos</option>
            <option value="revenue_desc">Más ingresos</option>
            <option value="name_asc">Nombre A–Z</option>
          </select>

          <select
            v-model="channelFilter"
            aria-label="Filtrar por canal"
            :class="filterSelectClass"
          >
            <option :value="null">Canal</option>
            <option value="pos">POS</option>
            <option value="mesa">Mesa</option>
            <option value="online">Online</option>
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
        variant="default"
      >
        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-text-primary">{{ item.product_name }}</p>
              <p class="text-xs text-text-secondary mt-0.5">{{ item.category_name ?? 'Sin categoría' }}</p>
            </div>
            <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(item.total_revenue) }}</span>
              <span class="text-xs text-text-secondary">{{ item.quantity_sold }} uds.</span>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-product_name="{ value }">
          <span class="text-sm font-bold text-text-primary">{{ value }}</span>
        </template>

        <template #cell-category_name="{ value }">
          <span class="text-sm text-text-secondary">{{ value ?? 'Sin categoría' }}</span>
        </template>

        <template #cell-quantity_sold="{ value }">
          <span class="text-sm font-medium text-text-primary tabular-nums">{{ value }}</span>
        </template>

        <template #cell-total_revenue="{ value }">
          <span class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(value) }}</span>
        </template>
      </UiResponsiveDataView>

      <!-- Totals row -->
      <div
        v-if="products.length > 0 && !isRefreshing"
        class="flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-xl text-sm font-semibold"
      >
        <span class="text-text-secondary">Total ({{ products.length }} producto{{ products.length !== 1 ? 's' : '' }})</span>
        <div class="flex items-center gap-6">
          <span class="text-text-primary">{{ totals.quantity_sold }} uds.</span>
          <span class="text-primary">{{ formatCurrency(totals.total_revenue) }}</span>
        </div>
      </div>

    </template>
  </div>
</template>
