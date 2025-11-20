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
      <!-- Stats Cards -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-5">
        <SharedMetricCard title="Total de Órdenes" :value="stats.total" subtitle="Órdenes registradas" variant="primary"
          :show-icon="false" size="sm" class="md:size-default" />

        <SharedMetricCard title="Órdenes Pendientes" :value="stats.pendientes" subtitle="Esperando procesamiento"
          variant="primary" :show-icon="false" size="sm" class="md:size-default" />

        <SharedMetricCard title="Órdenes Recibidas" :value="stats.recibidas" subtitle="Completadas exitosamente"
          variant="primary" :show-icon="false" size="sm" class="md:size-default" />

        <SharedMetricCard title="Órdenes Vencidas" :value="stats.vencidas" subtitle="Fuera de tiempo" variant="primary"
          :show-icon="false" size="sm" class="md:size-default" />

        <SharedMetricCard title="Valor Total" :value="stats.valorTotal" format="currency" suffix="M"
          subtitle="Monto total órdenes" variant="primary" :show-icon="false" size="sm"
          class="md:size-default col-span-2 md:col-span-1" />
      </div>

      <!-- Filters and Search -->
      <!-- Mobile: Compact Search + Filter Button -->
      <div class="md:hidden bg-white rounded-lg shadow-sm border border-titan-200 p-3">
        <div class="flex gap-2">
          <div class="relative flex-1">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
            <input v-model="searchTerm" type="text" placeholder="Buscar..."
              class="w-full pl-9 pr-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" />
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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <div class="sm:col-span-2 lg:col-span-2">
            <div class="relative">
              <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
              <input v-model="searchTerm" type="text" placeholder="Buscar..."
                class="w-full pl-9 pr-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" />
            </div>
          </div>
          <select v-model="proveedorFilter"
            class="px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
            <option value="">Todos</option>
            <option v-for="proveedor in proveedoresUnicos" :key="proveedor" :value="proveedor">
              {{ proveedor }}
            </option>
          </select>
          <select v-model="statusFilter"
            class="px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
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
          <input v-model="dateRange" type="month"
            class="px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" />
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
              <option v-for="proveedor in proveedoresUnicos" :key="proveedor" :value="proveedor">
                {{ proveedor }}
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

          <!-- Date Range Filter -->
          <div>
            <label class="text-sm font-medium text-titan-700 mb-2 block">Mes</label>
            <input v-model="dateRange" type="month"
              class="w-full px-3 py-2 text-sm border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500" />
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
        :data="filteredOrdenes"
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
        <template #cell-numero="{ value, row }">
          <div>
            <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
            <div class="text-xs text-titan-600">{{ row.invoice_number || 'Sin factura' }}</div>
          </div>
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

        <template #cell-valorTotal="{ value, row }">
          <div>
            <div class="text-sm font-medium text-ebony-800">${{ value.toLocaleString() }}</div>
            <div class="text-xs text-titan-600">+${{ row.impuestos.toLocaleString() }} IVA</div>
          </div>
        </template>

        <template #cell-totalItems="{ value }">
          <UiStatusBadge :value="`${value} items`" format="text" variant="secondary" size="sm" />
        </template>

        <template #cell-estado="{ value }">
          <UiStatusBadge :value="getStatusText(value)" format="text" :variant="getStatusVariant(value)" size="sm" />
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
      <div class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
        <div class="flex-1 flex justify-between sm:hidden">
          <button
            class="relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
            Anterior
          </button>
          <button
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-titan-700">
              Mostrando <span class="font-medium">1</span> a <span class="font-medium">10</span> de{' '}
              <span class="font-medium">{{ filteredOrdenes.length }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50">
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <button
                class="relative inline-flex items-center px-4 py-2 border border-titan-300 bg-white text-sm font-medium text-titan-700 hover:bg-titan-50">
                1
              </button>
              <button
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50">
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
const searchTerm = ref('')
const proveedorFilter = ref('')
const statusFilter = ref('')
const dateRange = ref('')
const showCreateModal = ref(false)
const showFiltersModal = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)

// Active filters count
const activeFiltersCount = computed(() => {
  let count = 0
  if (proveedorFilter.value) count++
  if (statusFilter.value) count++
  if (dateRange.value) count++
  return count
})

// Clear all filters
const clearFilters = () => {
  proveedorFilter.value = ''
  statusFilter.value = ''
  dateRange.value = ''
}

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch data using useAsyncData for proper loading states (NO await to show loading)
const { data: purchasesData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `purchases-${currentTenant.value?.id || 'default'}`,
  () => {
    const params = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    };
    if (searchTerm.value) params.search = searchTerm.value;
    if (statusFilter.value) params.status = statusFilter.value;
    if (proveedorFilter.value) params.supplier_id = proveedorFilter.value;

    return $fetch('/api/suppliers/purchases', {
      query: params
    });
  },
  {
    server: false,
    watch: [currentTenant, currentPage, itemsPerPage, searchTerm, statusFilter, proveedorFilter],
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

// Stats
const stats = computed(() => {
  const all = ordenes.value
  const totalSum = all.reduce((sum, o) => sum + o.valorTotal, 0)
  return {
    total: all.length,
    pendientes: all.filter(o => o.estado === 'pending').length,
    recibidas: all.filter(o => o.estado === 'received').length,
    vencidas: all.filter(o => o.estado === 'overdue').length,
    valorTotal: totalSum / 1000000 // Convert to millions
  }
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
    title: 'Valor Total',
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

// Computed properties
const proveedoresUnicos = computed(() => {
  return [...new Set(ordenes.value.map(o => o.proveedor))].sort()
})

const filteredOrdenes = computed(() => {
  return ordenes.value.filter(orden => {
    const matchesSearch = !searchTerm.value ||
      orden.numero.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      orden.proveedor.toLowerCase().includes(searchTerm.value.toLowerCase())

    const matchesProveedor = !proveedorFilter.value || orden.proveedor === proveedorFilter.value
    const matchesStatus = !statusFilter.value || orden.estado === statusFilter.value

    return matchesSearch && matchesProveedor && matchesStatus
  })
})

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
function getStatusVariant(status) {
  switch (status) {
    case 'quotation':
      return 'info'
    case 'pending':
      return 'warning'
    case 'confirmed':
      return 'success'
    case 'preparing':
      return 'info'
    case 'shipped':
      return 'info'
    case 'received':
      return 'success'
    case 'verified':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'paid':
      return 'success'
    case 'cancelled':
      return 'destructive'
    default:
      return 'secondary'
  }
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
  console.log('Abrir menú de acciones para:', orden.numero)
}

// Funciones mantenidas para futura implementación
const editOrder = (orden) => {
  // Navegar a la página de editar usando path parameter
  navigateTo(`/abastecimiento/compra/${orden.id}`)
}

const receiveOrder = (orden) => {
  orden.estado = 'received'
  console.log('Orden recibida:', orden)
}

const downloadOrder = (orden) => {
  console.log('Descargar orden:', orden)
}

useHead({
  title: 'Órdenes de Compra - Abastecimiento'
})
</script>