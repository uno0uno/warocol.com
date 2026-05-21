<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
        <!-- Filters Bar -->
        <UiAdvancedFiltersBar
          v-model:search="localSearchTerm"
          v-model:search-field="apiSearchField"
          :search-fields="searchFields"
          search-placeholder="Buscar productos de reventa..."
          :show-date-range="false"
          :show-clear="hasActiveFilters"
          @search="performSearch"
          @clear="clearFilters"
        >
          <template #additional-filters>
            <select
              v-model="categoryFilter"
              class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
              aria-label="Filtrar por categoría"
            >
              <option value="">Categoría</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>

            <select
              v-model="statusFilter"
              class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
              aria-label="Filtrar por estado"
            >
              <option value="">Estado</option>
              <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <select
              v-model="sortFilter"
              class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
              aria-label="Ordenar productos"
            >
              <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <label
              class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
              :class="onlineOnly
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
            >
              <input v-model="onlineOnly" type="checkbox" class="sr-only" aria-label="Solo visibles online" />
              <span class="text-sm font-semibold">Online</span>
            </label>

            <label
              class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
              :class="marginNegativeOnly
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
            >
              <input v-model="marginNegativeOnly" type="checkbox" class="sr-only" aria-label="Solo margen negativo" />
              <span class="text-sm font-semibold">Margen negativo</span>
            </label>

            <label
              class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0"
              :class="costDriftOnly
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
            >
              <input v-model="costDriftOnly" type="checkbox" class="sr-only" aria-label="Solo desfase de costo" />
              <span class="text-sm font-semibold">Desfase costo</span>
            </label>
          </template>

          <template #trailing>
            <NuxtLink
              to="/menu/reventa/crear"
              class="flex h-10 px-3 items-center gap-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors whitespace-nowrap shrink-0"
              aria-label="Gestionar productos de reventa"
            >
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
              <span class="hidden sm:inline">Gestionar</span>
              <span class="sm:hidden">+</span>
            </NuxtLink>
          </template>
        </UiAdvancedFiltersBar>

        <HealthSemaphore :is-unlocked="true" title="Catálogo comercial de productos de reventa">
        <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
        <UiResponsiveDataView
          :columns="productosTableColumns"
          :data="displayedProducts"
          :row-class="getRowClass"
          :empty-message="emptyMessage"
          :empty-sub-message="emptySubMessage"
          variant="default"
          row-size="sm"
        >
          <!-- Mobile Card Slot -->
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary"
              :class="costDriftProductIds?.has(item.id)
                ? 'bg-status-warning-bg/40'
                : (index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30')"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-primary">{{ item.name }}</span>
                <p class="text-xs text-text-secondary mt-0.5">{{ item.category_name || 'Sin categoría' }} · {{ formatCurrency(item.price) }}</p>
                <p class="text-xs text-text-tertiary">
                  Real: {{ formatCostCell(item.costo_calculado) }}
                  · Mi costo: {{ formatCostCell(item.costo_percibido) }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <UiStatusBadge
                  v-if="marginRealPct(item) !== null"
                  :value="marginRealPct(item)!"
                  format="percentage"
                  :variant="(marginRealPct(item) ?? 0) >= 0 ? 'success' : 'secondary'"
                  size="sm"
                  title="Margen real"
                />
                <UiStatusBadge
                  v-if="marginOperativoPct(item) !== null"
                  :value="marginOperativoPct(item)!"
                  format="percentage"
                  variant="secondary"
                  size="sm"
                  title="Margen operativo"
                />
                <UiStatusBadge
                  :value="item.is_available ? 'Disponible' : 'No disponible'"
                  format="text"
                  :variant="item.is_available ? 'success' : 'default'"
                  size="sm"
                />
              </div>
            </div>
          </template>

          <!-- Desktop Table Cell Customizations -->
          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-text-primary">{{ value }}</span>
          </template>

          <template #cell-category_name="{ value }">
            <span class="text-sm text-text-secondary">{{ value || 'Sin categoria' }}</span>
          </template>

          <template #cell-price="{ value }">
            <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-costo_calculado="{ value }">
            <span class="text-sm text-text-primary">{{ formatCostCell(value) }}</span>
          </template>

          <template #cell-costo_percibido="{ value }">
            <span class="text-sm text-text-primary">{{ formatCostCell(value) }}</span>
          </template>

          <template #cell-margen_real="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="marginRealPct(row) !== null"
                :value="marginRealPct(row)!"
                format="percentage"
                :variant="(marginRealPct(row) ?? 0) >= 0 ? 'success' : 'secondary'"
                size="sm"
              />
              <span v-else class="text-sm text-text-secondary">—</span>
            </div>
          </template>

          <template #cell-margen_operativo="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="marginOperativoPct(row) !== null"
                :value="marginOperativoPct(row)!"
                format="percentage"
                :variant="(marginOperativoPct(row) ?? 0) >= 0 ? 'success' : 'secondary'"
                size="sm"
              />
              <span v-else class="text-sm text-text-secondary">—</span>
            </div>
          </template>

          <template #cell-is_available="{ value }">
            <div class="flex justify-center">
              <UiStatusBadge
                :value="value ? 'Disponible' : 'No disponible'"
                format="text"
                :variant="value ? 'success' : 'default'"
                size="sm"
              />
            </div>
          </template>

        </UiResponsiveDataView>

        <!-- Pagination -->
        <div v-if="productsData.total > itemsPerPage" class="mt-4 bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
          <div class="flex-1 flex justify-between sm:hidden">
            <button
              @click="previousPage"
              :disabled="!canGoPrevious"
              :class="[
                'relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md',
                canGoPrevious ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed'
              ]">
              Anterior
            </button>
            <button
              @click="nextPage"
              :disabled="!canGoNext"
              :class="[
                'ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md',
                canGoNext ? 'text-titan-700 bg-white hover:bg-titan-50' : 'text-titan-400 bg-titan-50 cursor-not-allowed'
              ]">
              Siguiente
            </button>
          </div>
          <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p class="text-sm text-titan-700">
                Mostrando
                <span class="font-medium">{{ startItem }}</span>
                a
                <span class="font-medium">{{ endItem }}</span>
                de
                <span class="font-medium">{{ productsData.total }}</span>
                productos
              </p>
            </div>
            <div>
              <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  @click="previousPage"
                  :disabled="!canGoPrevious"
                  :class="[
                    'relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 text-sm font-medium',
                    canGoPrevious ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-400 cursor-not-allowed'
                  ]">
                  <span class="sr-only">Anterior</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  @click="goToPage(page)"
                  :class="[
                    'relative inline-flex items-center px-4 py-2 border text-sm font-medium',
                    page === currentPage
                      ? 'z-10 bg-crocus-50 border-crocus-500 text-crocus-600'
                      : 'bg-white border-titan-300 text-titan-700 hover:bg-titan-50'
                  ]">
                  {{ page }}
                </button>
                <button
                  @click="nextPage"
                  :disabled="!canGoNext"
                  :class="[
                    'relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 text-sm font-medium',
                    canGoNext ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-400 cursor-not-allowed'
                  ]">
                  <span class="sr-only">Siguiente</span>
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
        </HealthSemaphore>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Productos de Reventa' })

// Filters — AdvancedFiltersBar + server-side API (#762)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const apiSearchField = ref('name')
const statusFilter = ref('')
const categoryFilter = ref('')
const sortFilter = ref('created_at_desc')
const onlineOnly = ref(false)
const marginNegativeOnly = ref(false)
const costDriftOnly = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(20)

const searchFields = [
  { label: 'Nombre', value: 'name' },
  { label: 'Descripción', value: 'description' },
]

const statusOptions = [
  { label: 'Disponible', value: 'true' },
  { label: 'No disponible', value: 'false' },
]

const sortOptions = [
  { label: 'Más recientes', value: 'created_at_desc' },
  { label: 'Más antiguos', value: 'created_at_asc' },
  { label: 'Nombre A-Z', value: 'name_asc' },
  { label: 'Nombre Z-A', value: 'name_desc' },
  { label: 'Precio menor', value: 'price_asc' },
  { label: 'Precio mayor', value: 'price_desc' },
  { label: 'Margen menor', value: 'margin_asc' },
  { label: 'Margen mayor', value: 'margin_desc' },
]

const performSearch = () => applySearch(() => { currentPage.value = 1 })

const clearFilters = () => {
  clearSearch()
  apiSearchField.value = 'name'
  statusFilter.value = ''
  categoryFilter.value = ''
  sortFilter.value = 'created_at_desc'
  onlineOnly.value = false
  marginNegativeOnly.value = false
  costDriftOnly.value = false
  currentPage.value = 1
}

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!statusFilter.value
    || !!categoryFilter.value
    || sortFilter.value !== 'created_at_desc'
    || onlineOnly.value
    || marginNegativeOnly.value
    || costDriftOnly.value,
)

const emptyMessage = computed(() =>
  hasActiveFilters.value
    ? 'Ningún producto de reventa coincide con los filtros'
    : 'No hay productos de reventa registrados',
)

const emptySubMessage = computed(() =>
  hasActiveFilters.value
    ? 'Prueba ajustar o limpiar los filtros'
    : 'Crea un nuevo producto de reventa para comenzar',
)

// Pagination
const totalPages = computed(() => {
  return Math.ceil((productsData.value?.total || 0) / itemsPerPage.value)
})

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const previousPage = () => {
  if (canGoPrevious.value) {
    currentPage.value--
  }
}

const nextPage = () => {
  if (canGoNext.value) {
    currentPage.value++
  }
}

const startItem = computed(() => {
  return (currentPage.value - 1) * itemsPerPage.value + 1
})

const endItem = computed(() => {
  return Math.min(currentPage.value * itemsPerPage.value, productsData.value?.total || 0)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  const pages = []

  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    if (current <= 4) {
      for (let i = 1; i <= 5; i++) {
        pages.push(i)
      }
      pages.push(total)
    } else if (current >= total - 3) {
      pages.push(1)
      for (let i = total - 4; i <= total; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i)
      }
      pages.push(total)
    }
  }

  return pages
})

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Fetch categories (static per tenant)
const { data: categoriesData } = useQuery({
  key: () => ['menu', 'categories', currentTenant.value?.id],
  query: () => $fetch('/api/menu/categories'),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const categories = computed(() => (categoriesData.value as any)?.data || [])

// Fetch products — ONLY resale (is_resale always true)
const { data: productsData, error: fetchError, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['menu', 'products-resale', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: appliedSearch.value || null,
    searchField: apiSearchField.value,
    status: statusFilter.value || null,
    category: categoryFilter.value || null,
    onlineOnly: onlineOnly.value,
    marginNegativeOnly: marginNegativeOnly.value,
    sort: sortFilter.value,
  }],
  query: () => {
    const params: Record<string, string | number | boolean> = {
      page: currentPage.value,
      limit: itemsPerPage.value,
      is_resale: true,
      sort: sortFilter.value,
    }
    if (appliedSearch.value) {
      params.search = appliedSearch.value
      params.search_field = apiSearchField.value
    }
    if (statusFilter.value) {
      params.is_available = statusFilter.value === 'true'
    }
    if (categoryFilter.value) {
      params.category_id = categoryFilter.value
    }
    if (onlineOnly.value) {
      params.is_available_online = true
    }
    if (marginNegativeOnly.value) {
      params.margin_negative = true
    }
    return $fetch('/api/menu/products', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !productsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && productsData.value != null)

// Reset page on tenant or filter change
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })
watch(
  [statusFilter, categoryFilter, sortFilter, onlineOnly, marginNegativeOnly, appliedSearch],
  () => { currentPage.value = 1 },
)
// Client-only drift filter — refetch not required
watch(costDriftOnly, () => { currentPage.value = 1 })

const products = computed(() => productsData.value?.data || [])

const formatCurrency = (value: number) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

const {
  marginRealPct,
  marginOperativoPct,
  hasCostDrift,
  formatCostCell: formatCostCellValue,
} = useProductMargins()

const formatCostCell = (value: unknown) => formatCostCellValue(value, formatCurrency)

const displayedProducts = computed(() => {
  if (!costDriftOnly.value) return products.value
  return products.value.filter((p: any) => hasCostDrift(p))
})

const costDriftProductIds = computed(() => {
  const ids = new Set<string>()
  for (const p of displayedProducts.value) {
    if (hasCostDrift(p)) ids.add(p.id)
  }
  return ids
})

const getRowClass = (row: any): string | undefined => {
  if (costDriftProductIds.value.has(row.id)) return 'bg-status-warning-bg/40'
  return undefined
}

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh('/menu/reventa', refetch)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

// Table columns configuration
const productosTableColumns = [
  {
    key: 'name',
    title: 'Producto',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'category_name',
    title: 'Categoria',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'price',
    title: 'Precio',
    sortable: false,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'costo_calculado',
    title: 'Costo real',
    sortable: false,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'costo_percibido',
    title: 'Mi costo',
    sortable: false,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'margen_real',
    title: 'Margen real',
    sortable: false,
    format: 'text',
    align: 'center'
  },
  {
    key: 'margen_operativo',
    title: 'Margen op.',
    sortable: false,
    format: 'text',
    align: 'center'
  },
  {
    key: 'is_available',
    title: 'Estado',
    sortable: false,
    format: 'boolean',
    align: 'center'
  }
]

</script>

<style scoped>
.page-layout {
  @apply w-full;
}
</style>
