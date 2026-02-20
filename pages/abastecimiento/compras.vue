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


      <!-- Filters Bar -->
      <SharedFiltersBar
        v-model:search="localSearchTerm"
        v-model:search-field="apiSearchField"
        v-model:supplier-filter="proveedorFilter"
        v-model:status-filter="statusFilter"
        v-model:date-filter="dateFilter"
        :search-fields="searchFields"
        :suppliers="suppliers"
        :status-options="purchaseStatusOptions"
        status-label="Estado"
        status-placeholder="Todos los estados"
        show-supplier-filter
        show-status-filter
        show-date-filter
        @search="performSearch"
        @clear-filters="clearFilters"
      />

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

        <template #cell-valorTotal="{ value }">
          <span class="text-sm font-medium text-ebony-800">{{ (value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
        </template>

        <template #cell-impuestos="{ value }">
          <span class="text-sm font-medium text-ebony-800">{{ (value || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</span>
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

<script setup lang="ts">
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
const currentPage = ref(1)
const itemsPerPage = ref(20) // 20 filas por página

const searchFields = [
  { label: 'N° Orden', value: 'purchase_number' },
  { label: 'N° Factura', value: 'invoice_number' },
  { label: 'Proveedor', value: 'supplier_name' }
]

const purchaseStatusOptions = [
  { label: 'Cotización', value: 'quotation' },
  { label: 'Pendiente', value: 'pending' },
  { label: 'Confirmada', value: 'confirmed' },
  { label: 'En Preparación', value: 'preparing' },
  { label: 'Enviada', value: 'shipped' },
  { label: 'Recibida', value: 'received' },
  { label: 'Verificada', value: 'verified' },
  { label: 'Facturada', value: 'invoiced' },
  { label: 'Pagada', value: 'paid' },
  { label: 'Cancelada', value: 'cancelled' }
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
const ordenes = computed(() => {
  if (!purchasesData.value?.data) return []
  return purchasesData.value.data.map(purchase => ({
    id: purchase.id,
    numero: purchase.purchase_number || `PO-${purchase.id.substring(0, 8)}`,
    proveedor: purchase.supplier_name || 'Sin proveedor',
    fecha: purchase.purchase_date,
    fechaEntrega: purchase.estimated_delivery_date || purchase.delivery_date,
    valorTotal: parseFloat(purchase.total_amount || 0),
    impuestos: parseFloat(purchase.tax_amount || 0),
    totalItems: purchase.items?.length || 0,
    estado: purchase.status,
    invoice_number: purchase.invoice_number
  }))
})

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
    month: '2-digit',
    day: '2-digit'
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