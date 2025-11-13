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
    <div v-else>
    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-5">
      <SharedMetricCard
        title="Total de Órdenes"
        :value="stats.total"
        subtitle="Órdenes registradas"
        variant="primary"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Órdenes Pendientes"
        :value="stats.pendientes"
        subtitle="Esperando procesamiento"
        variant="primary"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Órdenes Recibidas"
        :value="stats.recibidas"
        subtitle="Completadas exitosamente"
        variant="primary"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Órdenes Vencidas"
        :value="stats.vencidas"
        subtitle="Fuera de tiempo"
        variant="primary"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Valor Total"
        :value="`$${stats.valorTotal}`"
        suffix="M"
        subtitle="Monto total órdenes"
        variant="primary"
        :show-icon="false"
      />
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow-sm border border-titan-200 p-6">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="lg:col-span-2">
          <div class="relative">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Buscar por número de orden o proveedor..."
              class="w-full pl-10 pr-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500"
            />
          </div>
        </div>
        <select v-model="proveedorFilter" 
          class="px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
          <option value="">Todos los proveedores</option>
          <option v-for="proveedor in proveedoresUnicos" :key="proveedor" :value="proveedor">
            {{ proveedor }}
          </option>
        </select>
        <select v-model="statusFilter" 
          class="px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="sent">Enviada</option>
          <option value="received">Recibida</option>
          <option value="invoiced">Facturada</option>
          <option value="overdue">Vencida</option>
        </select>
        <input
          v-model="dateRange"
          type="month"
          class="px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500"
        />
      </div>
    </div>

    <!-- Orders Table -->
    <UiDataTable
      :columns="ordenesTableColumns"
      :data="filteredOrdenes"
      variant="default"
    >
      <!-- Custom header with title and create button -->
      <template #header>
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-bold text-text-primary">
            Órdenes de Compra
          </h3>
          <NuxtLink 
            to="/abastecimiento/compra/crear" 
            class="btn-primary px-6 py-2 rounded-lg text-sm font-medium">
            + Nueva Orden
          </NuxtLink>
        </div>
      </template>
      <!-- Custom slots for special columns -->
      <template #cell-numero="{ value, row }">
        <div>
          <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
          <div class="text-xs text-titan-600">{{ row.invoice_number || 'Sin factura' }}</div>
        </div>
      </template>
      
      <template #cell-proveedor="{ value }">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-8 w-8">
            <div class="h-8 w-8 rounded-full bg-crocus-100 flex items-center justify-center">
              <span class="text-crocus-600 font-medium text-xs">
                {{ value.charAt(0).toUpperCase() }}
              </span>
            </div>
          </div>
          <div class="ml-3">
            <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
          </div>
        </div>
      </template>
      
      <template #cell-fecha="{ value }">
        <span class="text-sm text-ebony-800"">{{ formatDate(value) }}</span>
      </template>
      
      <template #cell-valorTotal="{ value, row }">
        <div>
          <div class="text-sm font-medium text-ebony-800">${{ value.toLocaleString() }}</div>
          <div class="text-xs text-titan-600">+${{ row.impuestos.toLocaleString() }} IVA</div>
        </div>
      </template>
      
      <template #cell-totalItems="{ value }">
        <UiStatusBadge
          :value="`${value} items`"
          format="text"
          variant="info"
          size="sm"
        />
      </template>
      
      <template #cell-estado="{ value }">
        <UiStatusBadge
          :value="getStatusText(value)"
          format="text"
          :variant="getStatusVariant(value)"
          size="sm"
        />
      </template>
      
      <template #cell-fechaEntrega="{ value }">
        <div class="text-sm text-ebony-800">
          <div v-if="value">{{ formatDate(value) }}</div>
          <div v-else class="text-ebony-800"">Sin programar</div>
        </div>
      </template>
      
      <template #cell-actions="{ row }">
        <div class="flex justify-center space-x-2">
          <button @click="editOrder(row)"
            class="text-crocus-600 hover:text-crocus-900 transition-colors"
            title="Editar orden">
            <PencilIcon class="h-4 w-4" />
          </button>
        </div>
      </template>
    </UiDataTable>

    <!-- Pagination -->
    <div class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
      <div class="flex-1 flex justify-between sm:hidden">
        <button class="relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
          Anterior
        </button>
        <button class="ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
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
            <button class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50">
              <ChevronLeftIcon class="h-5 w-5" />
            </button>
            <button class="relative inline-flex items-center px-4 py-2 border border-titan-300 bg-white text-sm font-medium text-titan-700 hover:bg-titan-50">
              1
            </button>
            <button class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50">
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
  EllipsisHorizontalIcon
} from '@heroicons/vue/24/outline'

// Reactive state
const searchTerm = ref('')
const proveedorFilter = ref('')
const statusFilter = ref('')
const dateRange = ref('')
const showCreateModal = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(10)

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
  proveedor: 'Proveedor', // TODO: Fetch supplier name
  fecha: purchase.purchase_date,
  fechaEntrega: purchase.delivery_date,
  valorTotal: parseFloat(purchase.total_amount || 0),
  impuestos: parseFloat(purchase.tax_amount || 0),
  totalItems: purchase.items?.length || 0,
  estado: purchase.status,
  invoice_number: purchase.invoice_number
})))

// Stats
const stats = computed(() => {
  const all = ordenes.value
  return {
    total: all.length,
    pendientes: all.filter(o => o.estado === 'pending').length,
    recibidas: all.filter(o => o.estado === 'received').length,
    vencidas: all.filter(o => o.estado === 'overdue').length,
    valorTotal: (all.reduce((sum, o) => sum + o.valorTotal, 0) / 1000000).toFixed(1)
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

// Helper function for status variants
function getStatusVariant(status) {
  switch (status) {
    case 'pending':
      return 'warning'
    case 'sent':
      return 'info'
    case 'received':
      return 'success'
    case 'invoiced':
      return 'secondary'
    case 'overdue':
      return 'destructive'
    default:
      return 'secondary'
  }
}

const getStatusText = (status) => {
  const texts = {
    pending: 'Pendiente',
    sent: 'Enviada',
    received: 'Recibida',
    invoiced: 'Facturada',
    overdue: 'Vencida'
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