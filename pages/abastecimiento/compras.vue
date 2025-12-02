<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar las órdenes.</p>
        <p class="text-sm text-ebony-600">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">


      <!-- Filters and Search -->
      <!-- Mobile: Compact Search + Filter Button -->
      <div class="md:hidden bg-white rounded-lg shadow-sm border border-titan-200 p-3">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <UiSearchWithField
              v-model="localSearchTerm"
              v-model:fieldValue="apiSearchField"
              :fields="searchFields"
              placeholder="Buscar..."
              class="w-full"
              @search="performSearch"
            />
          </div>
          <button @click="showFiltersModal = true"
            class="px-4 py-2 bg-background border-2 border-border rounded-lg text-text-primary hover:bg-surface-secondary transition-colors flex items-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span class="text-sm font-medium">Filtros</span>
            <span v-if="activeFiltersCount > 0" class="px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">{{ activeFiltersCount }}</span>
          </button>
        </div>
      </div>

      <!-- Desktop: Full Filters -->
      <div class="hidden md:block bg-white rounded-lg shadow-sm border border-titan-200 p-4 sm:p-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Buscar</label>
            <UiSearchWithField
              v-model="localSearchTerm"
              v-model:fieldValue="apiSearchField"
              :fields="searchFields"
              placeholder="Buscar..."
              class="w-full"
              @search="performSearch"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Proveedor</label>
            <select v-model="proveedorFilter"
              class="w-full px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos los proveedores</option>
              <option v-for="proveedor in suppliers" :key="proveedor.id" :value="proveedor.id">
                {{ proveedor.name }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Estado</label>
            <select v-model="statusFilter"
              class="w-full px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos los estados</option>
              <option value="quotation">Cotización</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="preparing">En Preparación</option>
              <option value="shipped">Enviada</option>
              <option value="received">Recibida</option>
              <option value="verified">Verificada</option>
              <option value="invoiced">Facturada</option>
              <option value="paid">Pagada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-2">Período</label>
            <select v-model="dateFilter"
              class="w-full px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos</option>
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="last_week">Semana Pasada</option>
              <option value="15_days">Últimos 15 días</option>
              <option value="1_month">Último mes</option>
              <option value="3_months">Últimos 3 meses</option>
            </select>
          </div>
        </div>

        <!-- Clear filters button -->
        <div v-if="proveedorFilter || statusFilter || dateFilter" class="mt-4 flex justify-end">
          <button @click="clearFilters"
            class="text-sm text-text-secondary hover:text-text-primary transition-colors flex items-center space-x-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Limpiar filtros</span>
          </button>
        </div>
      </div>

      <!-- Filters Modal (Mobile) -->
      <UiBottomSheetModal v-model="showFiltersModal" title="Filtros" max-height="lg">
        <!-- Filters Content -->
        <div class="p-4 space-y-4">
          <!-- Proveedor Filter -->
          <div>
            <label class="text-sm font-medium text-titan-700 mb-2 block">Proveedor</label>
            <select v-model="proveedorFilter"
              class="w-full px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos los proveedores</option>
              <option v-for="proveedor in suppliers" :key="proveedor.id" :value="proveedor.id">
                {{ proveedor.name }}
              </option>
            </select>
          </div>

          <!-- Status Filter -->
          <div>
            <label class="text-sm font-medium text-titan-700 mb-2 block">Estado</label>
            <select v-model="statusFilter"
              class="w-full px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos los estados</option>
              <option value="quotation">Cotización</option>
              <option value="pending">Pendiente</option>
              <option value="confirmed">Confirmada</option>
              <option value="preparing">En Preparación</option>
              <option value="shipped">Enviada</option>
              <option value="received">Recibida</option>
              <option value="verified">Verificada</option>
              <option value="invoiced">Facturada</option>
              <option value="paid">Pagada</option>
              <option value="cancelled">Cancelada</option>
            </select>
          </div>

          <!-- Date Filter -->
          <div>
            <label class="text-sm font-medium text-titan-700 mb-2 block">Período</label>
            <select v-model="dateFilter"
              class="w-full px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
              <option value="">Todos</option>
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="last_week">Semana Pasada</option>
              <option value="15_days">Últimos 15 días</option>
              <option value="1_month">Último mes</option>
              <option value="3_months">Últimos 3 meses</option>
            </select>
          </div>
        </div>

        <!-- Footer Actions -->
        <template #footer>
          <div class="px-4 py-3 flex gap-3">
            <button @click="clearFilters"
              class="flex-1 px-4 py-2 border-2 border-titan-300 rounded-lg text-titan-700 hover:bg-titan-50 transition-colors text-sm font-medium">
              Limpiar
            </button>
            <button @click="showFiltersModal = false"
              class="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
              Aplicar
            </button>
          </div>
        </template>
      </UiBottomSheetModal>

      <!-- Responsive Data View (Mobile Cards + Desktop Table) -->
      <UiResponsiveDataView
        :columns="ordenesTableColumns"
        :data="sortedOrdenes"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        title="Órdenes de Compra"
        empty-message="No hay órdenes para mostrar"
        empty-sub-message="Crea una nueva orden para comenzar"
        variant="default"
      >
        <!-- Mobile Actions -->
        <template #mobileActions>
          <NuxtLink to="/abastecimiento/compra/crear"
            class="btn-primary w-full px-4 py-2 rounded-lg text-sm font-medium text-center">
            + Nuevo
          </NuxtLink>
        </template>

        <!-- Mobile Card Slot -->
        <template #card="{ item }">
          <PurchasesPurchaseOrderCard :order="item" @edit="editOrder" />
        </template>

        <!-- Desktop Header -->
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <h3 class="text-base sm:text-lg font-bold text-text-primary">
              Órdenes de Compra
            </h3>
            <NuxtLink to="/abastecimiento/compra/crear"
              class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
              <span class="hidden sm:inline">+ Nueva Orden</span>
              <span class="sm:hidden">+ Nuevo</span>
            </NuxtLink>
          </div>
        </template>

        <!-- Desktop Table Cell Customizations -->
        <template #cell-numero="{ value }">
          <span class="text-sm font-medium text-ebony-800">{{ value }}</span>
        </template>

        <template #cell-invoice_number="{ value }">
          <span class="text-sm text-text-secondary">{{ value || 'Sin factura' }}</span>
        </template>

        <template #cell-proveedor="{ value }">
          <div class="flex items-center">
            <div class="ml-3">
              <div class="text-sm font-bold text-ebony-800">{{ value }}</div>
            </div>
          </div>
        </template>

        <template #cell-fecha="{ value }">
          <span class="text-sm text-ebony-800">{{ formatDate(value) }}</span>
        </template>

        <template #cell-totalItems="{ value }">
          <UiStatusBadge :value="`${value} items`" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-estado="{ value }">
          <UiStatusBadge
            :value="getStatusText(value)"
            format="text"
            :class="['border-0', getStatusClass(value)]"
            size="sm"
          />
        </template>

        <template #cell-fechaEntrega="{ value }">
          <div class="text-sm text-ebony-800">
            <div v-if="value">{{ formatDate(value) }}</div>
            <div v-else class="text-ebony-800">Sin programar</div>
          </div>
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="editOrder(row)" class="text-crocus-600 hover:text-crocus-900 transition-colors"
              title="Editar orden">
              <PencilIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div v-if="purchasesData.total > itemsPerPage" class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
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
              Mostrando <span class="font-medium">{{ startItem }}</span> a <span class="font-medium">{{ endItem }}</span> de
              <span class="font-medium">{{ purchasesData.total }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                @click="previousPage"
                :disabled="!canGoPrevious"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 text-sm font-medium',
                  canGoPrevious ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-300 cursor-not-allowed'
                ]">
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <span class="relative inline-flex items-center px-4 py-2 border border-titan-300 bg-white text-sm font-medium text-titan-700">
                {{ currentPage }} / {{ totalPages }}
              </span>
              <button
                @click="nextPage"
                :disabled="!canGoNext"
                :class="[
                  'relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 text-sm font-medium',
                  canGoNext ? 'bg-white text-titan-500 hover:bg-titan-50' : 'bg-titan-50 text-titan-300 cursor-not-allowed'
                ]">
                <ChevronRightIcon class="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TruckIcon,
  DocumentCheckIcon,
  EllipsisHorizontalIcon,
  ArrowPathIcon
} from '@heroicons/vue/24/outline'

// Reactive state
const localSearchTerm = ref('')
const apiSearchTerm = ref('')
const apiSearchField = ref('purchase_number')
const proveedorFilter = ref('')
const statusFilter = ref('')
const dateFilter = ref('')
const showCreateModal = ref(false)
const showFiltersModal = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(20) // 20 filas por página

const searchFields = [
  { label: 'N° Orden', value: 'purchase_number' },
  { label: 'N° Factura', value: 'invoice_number' },
  { label: 'Proveedor', value: 'supplier_name' }
]

const performSearch = () => {
  apiSearchTerm.value = localSearchTerm.value
  currentPage.value = 1
  refresh()
}

// Sorting state
const sortField = ref('')
const sortDirection = ref('asc')

// Active filters count
const activeFiltersCount = computed(() => {
  let count = 0
  if (proveedorFilter.value) count++
  if (statusFilter.value) count++
  if (dateFilter.value) count++
  return count
})

// Clear all filters
const clearFilters = () => {
  proveedorFilter.value = ''
  statusFilter.value = ''
  dateFilter.value = ''
}

// Pagination
const totalPages = computed(() => {
  return Math.ceil((purchasesData.value?.total || 0) / itemsPerPage.value)
})

const canGoPrevious = computed(() => currentPage.value > 1)
const canGoNext = computed(() => currentPage.value < totalPages.value)

const goToPage = (page) => {
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
  return Math.min(currentPage.value * itemsPerPage.value, purchasesData.value?.total || 0)
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch suppliers
const { data: suppliersData } = useAsyncData(
  `suppliers-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/providers', {
    query: { limit: 250 }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

const suppliers = computed(() => suppliersData.value?.data || [])

// Fetch data using useAsyncData for proper loading states (NO await to show loading)
const { data: purchasesData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `purchases-${currentTenant.value?.id || 'default'}`,
  () => {
    const params = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    };
    if (apiSearchTerm.value) {
      params.search = apiSearchTerm.value;
      params.search_field = apiSearchField.value;
    }
    if (statusFilter.value) params.status = statusFilter.value;
    if (proveedorFilter.value) params.supplier_id = proveedorFilter.value;
    if (dateFilter.value) params.date_filter = dateFilter.value;

    return $fetch('/api/suppliers/purchases', {
      query: params
    });
  },
  {
    server: false,
    watch: [currentTenant, currentPage, itemsPerPage, statusFilter, proveedorFilter, dateFilter],
    default: () => ({ data: [], total: 0 }),
    transform: (response) => ({
      data: response.data || [],
      total: response.total || 0,
    })
  }
);

// Computed properties for data
const ordenes = computed(() => purchasesData.value.data.map(purchase => ({
  id: purchase.id,
  numero: purchase.purchase_number || `PO-${purchase.id.substring(0, 8)}`,
  proveedor: purchase.supplier_name || 'Sin proveedor',
  fecha: purchase.purchase_date,
  fechaEntrega: purchase.delivery_date,
  valorTotal: parseFloat(purchase.total_amount || 0),
  impuestos: parseFloat(purchase.tax_amount || 0),
  totalItems: purchase.items?.length || 0,
  estado: purchase.status,
  invoice_number: purchase.invoice_number
})))

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})



const actividadReciente = ref([
  {
    id: 1,
    tipo: 'received',
    icono: CheckCircleIcon,
    descripcion: 'Orden recibida completamente',
    tiempo: 'Hace 2 horas',
    usuario: 'Ana García',
    orden: 'PO-2025-001'
  },
  {
    id: 2,
    tipo: 'sent',
    icono: TruckIcon,
    descripcion: 'Orden enviada al proveedor',
    tiempo: 'Hace 4 horas',
    usuario: 'Carlos Ruiz',
    orden: 'PO-2025-005'
  },
  {
    id: 3,
    tipo: 'created',
    icono: DocumentTextIcon,
    descripcion: 'Nueva orden de compra creada',
    tiempo: 'Hace 6 horas',
    usuario: 'María López',
    orden: 'PO-2025-005'
  },
  {
    id: 4,
    tipo: 'invoiced',
    icono: DocumentCheckIcon,
    descripcion: 'Factura recibida y procesada',
    tiempo: 'Hace 1 día',
    usuario: 'Luis Pérez',
    orden: 'PO-2025-001'
  }
])

// DataTable configuration
const ordenesTableColumns = [
  {
    key: 'numero',
    title: 'Número',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'invoice_number',
    title: 'Factura',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'proveedor',
    title: 'Proveedor',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'fecha',
    title: 'Fecha',
    sortable: true,
    format: 'date',
    align: 'center'
  },
  {
    key: 'valorTotal',
    title: 'Subtotal',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'impuestos',
    title: 'IVA',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'totalItems',
    title: 'Items',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'estado',
    title: 'Estado',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'fechaEntrega',
    title: 'Entrega',
    sortable: true,
    format: 'date',
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

// Sorted orders
const sortedOrdenes = computed(() => {
  if (!sortField.value) return ordenes.value

  const sorted = [...ordenes.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    // Numeric comparison for numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
    }

    // Date comparison
    if (sortField.value === 'fecha' || sortField.value === 'fechaEntrega') {
      const dateA = new Date(aValue).getTime()
      const dateB = new Date(bValue).getTime()
      return sortDirection.value === 'asc' ? dateA - dateB : dateB - dateA
    }

    // String comparison
    const strA = String(aValue).toLowerCase()
    const strB = String(bValue).toLowerCase()
    if (sortDirection.value === 'asc') {
      return strA.localeCompare(strB)
    } else {
      return strB.localeCompare(strA)
    }
  })

  return sorted
})

// Handle sort
const handleSort = (field) => {
  if (sortField.value === field) {
    // Toggle direction
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New field, default to ascending
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// Helper functions
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateShort = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric'
  })
}

// Helper function for status variants
// Helper function for status classes (matching acciones.vue)
function getStatusClass(status) {
  const classes = {
    quotation: '!bg-yellow-500/10 !text-yellow-600',
    pending: '!bg-blue-500/10 !text-blue-600',
    confirmed: '!bg-teal-500/10 !text-teal-600',
    preparing: '!bg-purple-500/10 !text-purple-600',
    shipped: '!bg-cyan-500/10 !text-cyan-600',
    partially_received: '!bg-orange-500/10 !text-orange-600',
    received: '!bg-emerald-500/10 !text-emerald-600',
    verified: '!bg-green-600/10 !text-green-700',
    invoiced: '!bg-indigo-500/10 !text-indigo-600',
    paid: '!bg-green-600/10 !text-green-700',
    cancelled: '!bg-destructive/10 !text-destructive',
    overdue: '!bg-destructive/10 !text-destructive'
  }
  return classes[status] || 'bg-titan-200 text-titan-700'
}

const getStatusText = (status) => {
  const texts = {
    quotation: 'Cotización',
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    preparing: 'En Preparación',
    shipped: 'Enviada',
    received: 'Recibida',
    verified: 'Verificada',
    invoiced: 'Facturada',
    paid: 'Pagada',
    cancelled: 'Cancelada'
  }
  return texts[status] || 'Desconocido'
}

// Methods
const viewOrderDetails = (orden) => {
  // Navegar a página de detalles de la orden
  navigateTo(`/abastecimiento/compras/${orden.numero}`)
}

const openActionsMenu = (orden) => {
  // TODO: Implementar modal con acciones (editar, recibir, descargar, etc.)

}

// Funciones mantenidas para futura implementación
const editOrder = (orden) => {
  // Navegar a la página de editar usando path parameter
  navigateTo(`/abastecimiento/compra/${orden.id}`)
}

const receiveOrder = (orden) => {
  orden.estado = 'received'

}

const downloadOrder = (orden) => {

}

useHead({
  title: 'Órdenes de Compra - Abastecimiento'
})
</script>