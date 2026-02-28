<template>
  <div>
    <!-- Loading State (solo en carga inicial sin datos) -->
    <div v-if="isLoading && !products.length" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError && !products.length" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar los productos.</p>
        <p class="text-sm text-ebony-600">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="page-layout">
      <div class="flex flex-col gap-3 md:gap-4">
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

        <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
        <UiResponsiveDataView
          :columns="productosTableColumns"
          :data="sortedProducts"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          @sort="handleSort"
          title="Catálogo de Productos"
          empty-message="No hay productos registrados"
          empty-sub-message="Crea un nuevo producto para comenzar"
          variant="default"
        >
          <!-- Mobile Actions -->
          <template #mobileActions>
            <NuxtLink to="/menu/productos/crear"
              class="btn-primary w-full px-4 py-2 rounded-lg text-sm font-medium text-center">
              + Nuevo Producto
            </NuxtLink>
          </template>

          <!-- Mobile Card Slot -->
          <template #card="{ item }">
            <div class="bg-surface border border-border rounded-lg p-4">
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <h4 class="font-semibold text-text-primary mb-1">{{ item.name }}</h4>
                  <p class="text-xs text-text-secondary">{{ item.category_name || 'Sin categoría' }}</p>
                </div>
                <UiStatusBadge
                  :value="item.is_available ? 'Disponible' : 'No disponible'"
                  format="text"
                  :variant="item.is_available ? 'success' : 'default'"
                  size="sm"
                />
              </div>

              <div class="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <p class="text-text-secondary text-xs">Precio</p>
                  <p class="font-semibold text-text-primary">{{ formatCurrency(item.price) }}</p>
                </div>
                <div>
                  <p class="text-text-secondary text-xs">Costo</p>
                  <p class="font-semibold text-text-primary">{{ formatCurrency(item.costo_calculado) }}</p>
                </div>
                <div>
                  <p class="text-text-secondary text-xs">Margen</p>
                  <p class="font-semibold text-crocus-600">{{ formatMargin(item) }}</p>
                </div>
                <div>
                  <p class="text-text-secondary text-xs">Ingredientes</p>
                  <p class="font-semibold text-text-primary">{{ item.ingredients?.length || 0 }}</p>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 pt-2 border-t border-border">
                <!-- REMOVED: Control Stock badge - ALL products now control inventory automatically -->
                <UiStatusBadge
                  v-if="item.is_combo"
                  value="Combo"
                  format="text"
                  variant="info"
                  size="sm"
                />
                <button
                  @click="toggleOnlineAvailability(item)"
                  role="switch"
                  :aria-checked="item.is_available_online"
                  :aria-label="item.is_available_online ? `Deshabilitar ${item.name} para domicilios` : `Habilitar ${item.name} para domicilios`"
                  :title="item.is_available_online ? 'Deshabilitar para domicilios' : 'Habilitar para domicilios'"
                  class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:ring-offset-1"
                  :class="item.is_available_online ? 'bg-success' : 'bg-titan-300'"
                >
                  <span
                    class="inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out"
                    :class="item.is_available_online ? 'translate-x-4' : 'translate-x-0.5'"
                  />
                </button>
              </div>

              <div class="flex gap-2 mt-3">
                <button
                  @click="editProduct(item)"
                  class="flex-1 px-3 py-2 border border-border rounded-lg text-sm font-medium text-text-primary hover:bg-surface-secondary transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          </template>

          <!-- Desktop Header -->
          <template #header>
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
              <h3 class="text-base sm:text-lg font-bold text-text-primary">
                Catálogo de Productos
              </h3>
              <NuxtLink to="/menu/productos/crear"
                class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
                <span class="hidden sm:inline">+ Nuevo Producto</span>
                <span class="sm:hidden">+ Nuevo</span>
              </NuxtLink>
            </div>
          </template>

          <!-- Desktop Table Cell Customizations -->
          <template #cell-name="{ value }">
            <span class="text-sm font-medium text-ebony-800">{{ value }}</span>
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
            <span class="text-sm font-semibold text-crocus-600">{{ formatMargin(row) }}</span>
          </template>

          <!-- REMOVED: cell-controla_stock - ALL products now control inventory automatically -->

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

          <template #cell-is_available_online="{ row }">
            <div class="flex justify-center">
              <button
                @click="toggleOnlineAvailability(row)"
                role="switch"
                :aria-checked="row.is_available_online"
                :aria-label="row.is_available_online ? `Deshabilitar ${row.name} para domicilios` : `Habilitar ${row.name} para domicilios`"
                :title="row.is_available_online ? 'Deshabilitar para domicilios' : 'Habilitar para domicilios'"
                class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:ring-offset-1"
                :class="row.is_available_online ? 'bg-success' : 'bg-titan-300'"
              >
                <span
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
                class="text-crocus-600 hover:text-crocus-900 transition-colors"
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
        <div v-if="productsData.total > itemsPerPage" class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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
  refresh()
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
  refresh()
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
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch categories
const { data: categoriesData } = useAsyncData(
  `categories-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/menu/categories'),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

const categories = computed(() => categoriesData.value?.data || [])

// Fetch products using useAsyncData
const { data: productsData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `products-${currentTenant.value?.id || 'default'}`,
  () => {
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

    return $fetch('/api/menu/products', {
      query: params
    })
  },
  {
    server: false,
    lazy: true,
    watch: [currentTenant, currentPage, itemsPerPage, statusFilter, categoryFilter],
    default: () => ({ data: [], total: 0 }),
    transform: (response: any) => ({
      data: response.data || [],
      total: response.total || 0,
    }),
  }
)

// Computed properties for data
const products = computed(() => productsData.value?.data || [])

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
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
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

// Inline toggle for online availability
const toast = useToast()

const toggleOnlineAvailability = async (product: any) => {
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
