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
        <!-- Cost Warning Banner -->
        <div
          v-if="costIssueCount > 0 && !bannerDismissed"
          role="alert"
          class="flex items-center gap-2 px-3 py-2 bg-status-critical-bg border border-border rounded-lg"
        >
          <svg class="w-4 h-4 text-status-critical-text flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.962-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p class="flex-1 min-w-0 text-sm flex flex-wrap items-baseline gap-x-1">
            <span class="font-bold text-status-critical-text">{{ costIssueCount }} producto{{ costIssueCount !== 1 ? 's' : '' }}</span>
            <span class="text-text-secondary">con costo mayor al precio de venta — posibles compras mal registradas.</span>
            <NuxtLink
              to="/abastecimiento/calidad-datos"
              class="font-semibold text-status-critical-text hover:underline whitespace-nowrap"
            >
              Ver Calidad de Datos →
            </NuxtLink>
          </p>
          <button
            class="flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors text-text-tertiary hover:text-text-primary"
            aria-label="Cerrar aviso"
            @click="bannerDismissed = true"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filters Bar -->
        <SharedFiltersBar
          v-model:search="localSearchTerm"
          v-model:search-field="apiSearchField"
          v-model:status-filter="statusFilter"
          :search-fields="searchFields"
          :status-options="statusOptions"
          :categories="categories"
          v-model:category-filter="categoryFilter"
          status-label="Estado"
          status-placeholder="Todos los estados"
          show-status-filter
          show-category-filter
          @search="performSearch"
          @clear-filters="clearFilters"
        />

        <HealthSemaphore :is-unlocked="true" title="Catálogo y rentabilidad de productos">
          <template #header-actions>
            <NuxtLink to="/menu/productos/crear"
              class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
              <span class="hidden sm:inline">+ Nuevo Producto</span>
              <span class="sm:hidden">+ Nuevo</span>
            </NuxtLink>
          </template>
        <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
        <UiResponsiveDataView
          :columns="productosTableColumns"
          :data="sortedProducts"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          :row-class="getRowClass"
          @sort="handleSort"
          title="Catálogo de Productos"
          empty-message="No hay productos registrados"
          empty-sub-message="Crea un nuevo producto para comenzar"
          variant="default"
          row-size="sm"
        >

          <!-- Mobile Card Slot -->
          <template #card="{ item, index }">
            <div
              class="flex items-center gap-3 py-3 px-3 border-b border-border transition-colors hover:bg-surface-secondary cursor-pointer"
              :class="[
                costIssueProductIds?.has(item.id) ? 'bg-status-critical-bg' : (index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30')
              ]"
              @click="editProduct(item)"
            >
              <div class="flex-1 min-w-0">
                <span class="text-sm font-bold text-text-primary">{{ toTitleCase(item.name) }}</span>
                <p class="text-xs text-text-secondary mt-0.5">{{ item.category_name || 'Sin categoría' }} · {{ formatCurrency(item.price) }}</p>
              </div>
              <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
                <UiStatusBadge
                  v-if="getMarginValue(item) !== null"
                  :value="getMarginValue(item)"
                  format="percentage"
                  :variant="(getMarginValue(item) ?? 0) >= 0 ? 'success' : 'secondary'"
                  size="sm"
                />
                <UiStatusBadge
                  :value="item.is_available ? 'Disponible' : 'No disponible'"
                  format="text"
                  :variant="item.is_available ? 'success' : 'secondary'"
                  size="sm"
                />
              </div>
            </div>
          </template>


          <!-- Desktop Table Cell Customizations -->
          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-text-primary">{{ toTitleCase(value) }}</span>
          </template>

          <template #cell-category_name="{ value }">
            <span class="text-sm text-text-secondary">{{ value || 'Sin categoría' }}</span>
          </template>

          <template #cell-price="{ value }">
            <span class="text-sm font-semibold text-text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-costo_calculado="{ value }">
            <span class="text-sm text-text-primary">{{ formatCurrency(value) }}</span>
          </template>

          <template #cell-margen="{ row }">
            <div class="flex justify-end">
              <UiStatusBadge
                v-if="getMarginValue(row) !== null"
                :value="getMarginValue(row)!"
                format="percentage"
                :variant="getMarginValue(row)! >= 0 ? 'success' : 'secondary'"
                size="sm"
              />
              <span v-else class="text-sm text-text-secondary">—</span>
            </div>
          </template>

          <!-- REMOVED: cell-controla_stock - ALL products now control inventory automatically -->

          <template #cell-is_available="{ value }">
            <div class="flex justify-center">
              <UiStatusBadge
                :value="value ? 'Disponible' : 'No disponible'"
                format="text"
                :variant="value ? 'success' : 'secondary'"
                size="sm"
              />
            </div>
          </template>

          <template #cell-is_available_online="{ row }">
            <div class="flex justify-center">
              <button
                @click="toggleOnlineAvailability(row)"
                role="switch"
                :aria-checked="row.is_available_online"
                :disabled="togglingIds.has(row.id)"
                :aria-label="row.is_available_online ? `Deshabilitar ${row.name} para domicilios` : `Habilitar ${row.name} para domicilios`"
                :title="row.is_available_online ? 'Deshabilitar para domicilios' : 'Habilitar para domicilios'"
                class="relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
                :class="[
                  row.is_available_online ? 'bg-success' : 'bg-titan-300',
                  togglingIds.has(row.id) ? 'cursor-wait opacity-70' : 'cursor-pointer'
                ]"
              >
                <svg
                  v-if="togglingIds.has(row.id)"
                  class="animate-spin h-3.5 w-3.5 text-white"
                  :class="row.is_available_online ? 'translate-x-4' : 'translate-x-0.5'"
                  fill="none" viewBox="0 0 24 24"
                >
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span
                  v-else
                  class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                  :class="row.is_available_online ? 'translate-x-4' : 'translate-x-0.5'"
                />
              </button>
            </div>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex justify-center space-x-2">
              <button
                @click="editProduct(row)"
                class="text-primary hover:text-primary/70 transition-colors"
                :aria-label="`Editar ${row.name}`"
                title="Editar producto"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
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
                      ? 'z-10 bg-primary/10 border-primary text-primary'
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
import { onUnmounted } from 'vue'
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'
import { useMenuReturnRefresh } from '@/composables/useMenuReturnRefresh'
import { useTenantReactive } from '@/composables/useTenantReactive'
import { useToast } from '@/composables/useToast'

definePageMeta({
  // layout: 'dashboard' - Inherited from parent menu.vue
})

useHead({ title: 'Productos' })

const router = useRouter()

// Reactive state
const localSearchTerm = ref('')
const apiSearchTerm = ref('')
const apiSearchField = ref('name')
const statusFilter = ref('')
const categoryFilter = ref('')
const currentPage = ref(1)
const itemsPerPage = ref(20)

const searchFields = [
  { label: 'Nombre', value: 'name' },
  { label: 'Descripción', value: 'description' }
]

const statusOptions = [
  { label: 'Disponible', value: 'true' },
  { label: 'No disponible', value: 'false' }
]

const performSearch = () => {
  apiSearchTerm.value = localSearchTerm.value
  currentPage.value = 1
}

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc')

// Clear all filters
const clearFilters = () => {
  localSearchTerm.value = ''
  apiSearchTerm.value = ''
  statusFilter.value = ''
  categoryFilter.value = ''
  currentPage.value = 1
}

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

// Fetch products
const { data: productsData, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['menu', 'products', currentTenant.value?.id, {
    page: currentPage.value,
    limit: itemsPerPage.value,
    search: apiSearchTerm.value || null,
    searchField: apiSearchField.value,
    status: statusFilter.value || null,
    category: categoryFilter.value || null,
  }],
  query: () => {
    const params: any = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    }
    if (apiSearchTerm.value) {
      params.search = apiSearchTerm.value
      params.search_field = apiSearchField.value
    }
    if (statusFilter.value) {
      params.is_available = statusFilter.value === 'true'
    }
    if (categoryFilter.value) {
      params.category_id = categoryFilter.value
    }
    return $fetch('/api/menu/products', { params })
  },
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const isLoading = computed(() => !productsData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && productsData.value != null)

// Reset page on tenant change — key change triggers automatic refetch
watch(() => currentTenant.value?.id, () => { currentPage.value = 1 })

// Computed properties for data
const products = computed(() => productsData.value?.data || [])

// Cost issue detection — products where costo_calculado > price
const costIssueProductIds = computed(() => {
  const ids = new Set<string>()
  for (const p of products.value) {
    if (p.costo_calculado != null && Number(p.costo_calculado) > Number(p.price)) {
      ids.add(p.id)
    }
  }
  return ids
})

const costIssueCount = computed(() => costIssueProductIds.value.size)

const bannerDismissed = ref(false)

const getRowClass = (row: any): string | undefined => {
  if (costIssueProductIds.value.has(row.id)) return 'bg-status-critical-bg'
  return undefined
}

// Sorting
const sortedProducts = computed(() => {
  if (!sortField.value) return products.value

  return [...products.value].sort((a: any, b: any) => {
    let aVal = a[sortField.value]
    let bVal = b[sortField.value]

    // Handle null values
    if (aVal === null) return 1
    if (bVal === null) return -1

    // Handle numeric values
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection.value === 'asc' ? aVal - bVal : bVal - aVal
    }

    // Handle string values
    aVal = String(aVal).toLowerCase()
    bVal = String(bVal).toLowerCase()

    if (sortDirection.value === 'asc') {
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    } else {
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
    }
  })
})

const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refetch)
})
useMenuReturnRefresh('/menu/productos', refetch)
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

// Table columns configuration
// REMOVED: controla_stock column - ALL products now control inventory automatically
const productosTableColumns = [
  {
    key: 'name',
    title: 'Producto',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'category_name',
    title: 'Categoría',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'price',
    title: 'Precio',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'costo_calculado',
    title: 'Costo',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'margen',
    title: 'Margen',
    sortable: false,
    format: 'text',
    align: 'center'
  },
  {
    key: 'is_available',
    title: 'Estado',
    sortable: true,
    format: 'boolean',
    align: 'center'
  },
  {
    key: 'is_available_online',
    title: 'Online',
    sortable: true,
    format: 'boolean',
    align: 'center'
  },
  {
    key: 'actions',
    title: 'Acciones',
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

// Format currency
const formatCurrency = (value: number) => {
  if (!value) return '$0'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

// Calculate and format margin
const formatMargin = (product: any) => {
  const price = Number(product.price) || 0
  const cost = Number(product.costo_calculado) || 0
  if (price <= 0 || cost <= 0) return '—'
  const margin = ((price - cost) / cost) * 100
  if (!isFinite(margin)) return '—'
  return `${margin.toFixed(1)}%`
}

// Raw margin value for badge autoColor (null = no data)
const getMarginValue = (product: any): number | null => {
  const price = Number(product.price) || 0
  const cost = Number(product.costo_calculado) || 0
  if (price <= 0 || cost <= 0) return null
  const margin = ((price - cost) / cost) * 100
  return isFinite(margin) ? margin : null
}

// Display product names in Title Case (DB stores them as ALL CAPS)
const toTitleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

// Inline toggle for online availability
const toast = useToast()
const togglingIds = ref<Set<string>>(new Set())

const toggleOnlineAvailability = async (product: any) => {
  if (togglingIds.value.has(product.id)) return
  togglingIds.value = new Set([...togglingIds.value, product.id])

  const newValue = !product.is_available_online
  product.is_available_online = newValue
  try {
    await $fetch(`/api/menu/products/${product.id}`, {
      method: 'PUT',
      body: { is_available_online: newValue }
    })
    toast.success(
      newValue ? `${product.name} ahora aparece en domicilios` : `${product.name} ocultado del menú online`,
      { duration: 3000 }
    )
  } catch (e) {
    product.is_available_online = !newValue
    toast.error('Error al actualizar. Intenta de nuevo.')
  } finally {
    togglingIds.value = new Set([...togglingIds.value].filter(id => id !== product.id))
  }
}

// Navigation
const editProduct = (product: any) => {
  router.push(`/menu/productos/${product.id}`)
}

</script>

<style scoped>
.page-layout {
  @apply w-full;
}
</style>
