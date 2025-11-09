<template>
  <div class="space-y-6">

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-5">
      <SharedMetricCard
        title="Total de Órdenes"
        :value="stats.total"
        subtitle="Órdenes registradas"
        variant="info"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Órdenes Pendientes"
        :value="stats.pendientes"
        subtitle="Esperando procesamiento"
        variant="warning"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Órdenes Recibidas"
        :value="stats.recibidas"
        subtitle="Completadas exitosamente"
        variant="success"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Órdenes Vencidas"
        :value="stats.vencidas"
        subtitle="Fuera de tiempo"
        variant="danger"
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
    <div class="bg-white rounded-lg shadow-sm border border-titan-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-titan-200">
          <thead class="bg-titan-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Número
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Fecha
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Valor Total
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Items
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Entrega
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-titan-200">
            <tr v-for="orden in filteredOrdenes" :key="orden.id" class="hover:bg-titan-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-ebony-800">{{ orden.numero }}</div>
                <div class="text-xs text-titan-600">{{ orden.invoice_number || 'Sin factura' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-8 w-8">
                    <div class="h-8 w-8 rounded-full bg-crocus-100 flex items-center justify-center">
                      <span class="text-crocus-600 font-medium text-xs">
                        {{ orden.proveedor.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-ebony-800">{{ orden.proveedor }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-titan-600">
                {{ formatDate(orden.fecha) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-ebony-800">${{ orden.valorTotal.toLocaleString() }}</div>
                <div class="text-xs text-titan-600">+${{ orden.impuestos.toLocaleString() }} IVA</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ orden.totalItems }} items
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  getStatusColor(orden.estado)
                ]">
                  {{ getStatusText(orden.estado) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-titan-600">
                <div v-if="orden.fechaEntrega">{{ formatDate(orden.fechaEntrega) }}</div>
                <div v-else class="text-titan-400">Sin programar</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex space-x-2">
                  <button @click="viewOrder(orden)"
                    class="text-blue-600 hover:text-blue-900 transition-colors">
                    <EyeIcon class="h-4 w-4" />
                  </button>
                  <button @click="editOrder(orden)"
                    class="text-crocus-600 hover:text-crocus-900 transition-colors"
                    :disabled="orden.estado === 'received' || orden.estado === 'invoiced'">
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button v-if="orden.estado === 'sent'" @click="receiveOrder(orden)"
                    class="text-green-600 hover:text-green-900 transition-colors">
                    <CheckIcon class="h-4 w-4" />
                  </button>
                  <button @click="downloadOrder(orden)"
                    class="text-purple-600 hover:text-purple-900 transition-colors">
                    <ArrowDownTrayIcon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="bg-white rounded-lg shadow-sm border border-titan-200 p-6">
      <h3 class="text-lg font-semibold text-ebony-800 mb-4">Actividad Reciente</h3>
      <div class="space-y-4">
        <div v-for="actividad in actividadReciente" :key="actividad.id"
          class="flex items-center space-x-4 pb-4 border-b border-titan-200 last:border-b-0 last:pb-0">
          <div class="flex-shrink-0">
            <div :class="[
              'p-2 rounded-lg',
              actividad.tipo === 'created' ? 'bg-blue-100' : 
              actividad.tipo === 'sent' ? 'bg-orange-100' :
              actividad.tipo === 'received' ? 'bg-green-100' : 'bg-purple-100'
            ]">
              <component :is="actividad.icono" :class="[
                'h-5 w-5',
                actividad.tipo === 'created' ? 'text-blue-600' : 
                actividad.tipo === 'sent' ? 'text-orange-600' :
                actividad.tipo === 'received' ? 'text-green-600' : 'text-purple-600'
              ]" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ebony-800">{{ actividad.descripcion }}</p>
            <p class="text-xs text-titan-600">{{ actividad.tiempo }} • {{ actividad.usuario }}</p>
          </div>
          <div class="text-sm font-medium text-titan-600">
            {{ actividad.orden }}
          </div>
        </div>
      </div>
    </div>

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
  DocumentCheckIcon
} from '@heroicons/vue/24/outline'

// Reactive state
const searchTerm = ref('')
const proveedorFilter = ref('')
const statusFilter = ref('')
const dateRange = ref('')
const showCreateModal = ref(false)

// Stats
const stats = ref({
  total: 47,
  pendientes: 5,
  recibidas: 38,
  vencidas: 2,
  valorTotal: 24.6
})

// Mock data para órdenes
const ordenes = ref([
  {
    id: 1,
    numero: 'PO-2025-001',
    proveedor: 'Frutas del Valle',
    fecha: '2025-11-01',
    fechaEntrega: '2025-11-08',
    valorTotal: 1250000,
    impuestos: 237500,
    totalItems: 8,
    estado: 'received',
    invoice_number: 'FV-001234'
  },
  {
    id: 2,
    numero: 'PO-2025-002',
    proveedor: 'COCA COLA FEMSA',
    fecha: '2025-11-03',
    fechaEntrega: '2025-11-10',
    valorTotal: 3200000,
    impuestos: 608000,
    totalItems: 15,
    estado: 'sent',
    invoice_number: null
  },
  {
    id: 3,
    numero: 'PO-2025-003',
    proveedor: 'Calypso del Caribe',
    fecha: '2025-11-05',
    fechaEntrega: null,
    valorTotal: 890000,
    impuestos: 169100,
    totalItems: 6,
    estado: 'pending',
    invoice_number: null
  },
  {
    id: 4,
    numero: 'PO-2025-004',
    proveedor: 'Abastos San Martín',
    fecha: '2025-10-28',
    fechaEntrega: '2025-11-05',
    valorTotal: 750000,
    impuestos: 142500,
    totalItems: 12,
    estado: 'overdue',
    invoice_number: null
  },
  {
    id: 5,
    numero: 'PO-2025-005',
    proveedor: 'Desechables Pradera',
    fecha: '2025-11-06',
    fechaEntrega: '2025-11-13',
    valorTotal: 420000,
    impuestos: 79800,
    totalItems: 4,
    estado: 'sent',
    invoice_number: null
  }
])

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

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    sent: 'bg-blue-100 text-blue-800',
    received: 'bg-green-100 text-green-800',
    invoiced: 'bg-purple-100 text-purple-800',
    overdue: 'bg-red-100 text-red-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
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
const viewOrder = (orden) => {
  console.log('Ver orden:', orden)
}

const editOrder = (orden) => {
  console.log('Editar orden:', orden)
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
</script>s