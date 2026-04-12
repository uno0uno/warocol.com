<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat, formatDistanceToNow } from 'date-fns'
import MetricCard from '~/components/shared/MetricCard.vue'

useHead({ title: 'Productos - Ventas' })

const { setRefreshHandler, clearRefreshHandler, setLastUpdateText, registerProgressiveLoading } = useLayoutActions()
const { currentTenant } = useTenantReactive()

const lastUpdate = ref<Date>(new Date())

// ── Filters ─────────────────────────────────────────────────────────────
const dateRangeDates = ref<Date[] | null>(null)
const categoryFilter = ref<string | null>(null)
const sortFilter = ref<'qty_desc' | 'revenue_desc' | 'name_asc'>('qty_desc')

const presetDates = ref([
  { label: 'Hoy',           value: [new Date(), new Date()] },
  { label: 'Ayer',          value: (() => { const d = new Date(); d.setDate(d.getDate() - 1); return [d, d] })() },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Últimos 15 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()] },
  { label: 'Último mes',    value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
])

const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  return `${from} - ${fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })}`
}

const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return { from: fnsFormat(from, 'yyyy-MM-dd'), to: fnsFormat(to, 'yyyy-MM-dd') }
})

const hasFilters = computed(() => !!(dateRangeDates.value || categoryFilter.value || sortFilter.value !== 'qty_desc'))

const clearFilters = () => {
  dateRangeDates.value = null
  categoryFilter.value = null
  sortFilter.value = 'qty_desc'
}

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
  }],
  query: () => $fetch<{ success: boolean; data: ProductRow[]; totals: { quantity_sold: number; total_revenue: number } }>('/api/orders/products-sold', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      category_id: categoryFilter.value || undefined,
      sort: sortFilter.value,
    }
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

// Derive category list from unfiltered response (cache it so it persists when filter is active)
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
  { key: 'product_name',  title: 'Producto',   sortable: false },
  { key: 'category_name', title: 'Categoría',  sortable: false },
  { key: 'quantity_sold', title: 'Vendidos',   sortable: false },
  { key: 'total_revenue', title: 'Ingresos',   sortable: false },
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
      <ClientOnly>
        <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
          <!-- Date picker -->
          <VueDatePicker
            v-model="dateRangeDates"
            range
            :preset-dates="presetDates"
            :enable-time-picker="false"
            :locale="es"
            placeholder="Rango de fechas"
            auto-apply
            :teleport="true"
            :max-date="new Date()"
            :format="formatDateRange"
            input-class-name="dp-custom-input"
            menu-class-name="dp-custom-menu"
            calendar-cell-class-name="dp-custom-cell"
          />

          <!-- Category filter -->
          <select
            v-if="cachedCategories.length > 0"
            v-model="categoryFilter"
            aria-label="Filtrar por categoría"
            class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          >
            <option :value="null">Categoría</option>
            <option v-for="cat in cachedCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>

          <!-- Sort -->
          <select
            v-model="sortFilter"
            aria-label="Ordenar por"
            class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          >
            <option value="qty_desc">Más vendidos</option>
            <option value="revenue_desc">Más ingresos</option>
            <option value="name_asc">Nombre A–Z</option>
          </select>

          <!-- Clear -->
          <button
            v-if="hasFilters"
            @click="clearFilters"
            class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors flex-shrink-0"
            aria-label="Limpiar filtros"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </ClientOnly>

      <!-- Table loading (filter change, no cached data yet) -->
      <div v-if="isRefreshing && products.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <!-- Table -->
      <UiResponsiveDataView
        row-size="sm"
        v-else
        :columns="tableColumns"
        :data="products"
        empty-message="No hay ventas en este período"
        empty-sub-message="Selecciona un rango de fechas o ajusta los filtros"
        variant="default"
      >
        <!-- Mobile card -->
        <template #card="{ item, index }">
          <div
            class="flex items-center gap-3 py-3 px-3 border-b border-border"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-text-primary">{{ item.product_name }}</p>
              <p class="text-xs text-text-secondary mt-0.5">{{ item.category_name ?? 'Sin categoría' }}</p>
            </div>
            <div class="flex flex-col items-end gap-0.5 flex-shrink-0">
              <span class="text-sm font-bold text-text-primary">{{ formatCurrency(item.total_revenue) }}</span>
              <span class="text-xs text-text-secondary">{{ item.quantity_sold }} uds.</span>
            </div>
          </div>
        </template>

        <!-- Desktop cells -->
        <template #cell-product_name="{ value }">
          <span class="text-sm font-semibold text-text-primary">{{ value }}</span>
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

<style>
.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 200px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder { color: hsl(var(--muted-foreground)) !important; }
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}
</style>
