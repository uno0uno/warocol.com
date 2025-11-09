<template>
  <div class="space-y-6">
    <!-- Header with actions -->
    <div class="flex justify-between items-center">
      <div>
        <h2 class="text-2xl font-bold text-ebony-800">Control de Inventario</h2>
        <p class="text-titan-600 mt-2">Monitorea el stock de ingredientes en tiempo real</p>
      </div>
      <div class="flex space-x-3">
        <button @click="showAdjustmentModal = true"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
          <AdjustmentsHorizontalIcon class="h-4 w-4 mr-2" />
          Ajustar Stock
        </button>
        <button @click="showMovementModal = true"
          class="inline-flex items-center px-4 py-2 bg-crocus-600 text-white text-sm font-medium rounded-lg hover:bg-crocus-700 transition-colors">
          <ArrowRightLeftIcon class="h-4 w-4 mr-2" />
          Registrar Movimiento
        </button>
      </div>
    </div>

    <!-- Alert Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      <SharedMetricCard
        title="Stock Normal"
        :value="summary.stockNormal"
        subtitle="Niveles óptimos"
        variant="success"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Stock Bajo"
        :value="summary.stockBajo"
        subtitle="Requiere reposición"
        variant="warning"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Stock Agotado"
        :value="summary.agotado"
        subtitle="Sin existencias"
        variant="danger"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Productos por Vencer"
        :value="summary.porVencer"
        subtitle="Próximos a caducar"
        variant="info"
        :show-icon="false"
      />
    </div>

    <!-- Quick Alerts -->
    <div v-if="alertas.length > 0" class="bg-red-50 border border-red-200 rounded-lg p-6">
      <h3 class="text-lg font-semibold text-red-800 mb-4 flex items-center">
        <ExclamationTriangleIcon class="h-5 w-5 mr-2" />
        Alertas Críticas de Stock
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div v-for="alerta in alertas" :key="alerta.id"
          class="bg-white border border-red-300 rounded-lg p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-ebony-800">{{ alerta.ingrediente }}</p>
              <p class="text-sm text-titan-600">Stock actual: {{ alerta.stockActual }}{{ alerta.unidad }}</p>
              <p class="text-sm text-red-600">Mínimo: {{ alerta.stockMinimo }}{{ alerta.unidad }}</p>
            </div>
            <span :class="[
              'px-2 py-1 rounded-full text-xs font-medium',
              alerta.tipo === 'critico' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
            ]">
              {{ alerta.tipo === 'critico' ? 'Crítico' : 'Bajo' }}
            </span>
          </div>
          <button @click="createOrderForIngredient(alerta)"
            class="mt-3 w-full text-center px-3 py-1 bg-crocus-600 text-white text-xs rounded hover:bg-crocus-700 transition-colors">
            Crear Orden de Compra
          </button>
        </div>
      </div>
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
              placeholder="Buscar ingredientes..."
              class="w-full pl-10 pr-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500"
            />
          </div>
        </div>
        <select v-model="categoryFilter" 
          class="px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
          <option value="">Todas las categorías</option>
          <option value="proteinas">Proteínas</option>
          <option value="vegetales">Vegetales</option>
          <option value="lacteos">Lácteos</option>
          <option value="condimentos">Condimentos</option>
        </select>
        <select v-model="statusFilter" 
          class="px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
          <option value="">Todos los estados</option>
          <option value="normal">Stock Normal</option>
          <option value="low">Stock Bajo</option>
          <option value="critical">Crítico</option>
          <option value="out">Agotado</option>
        </select>
        <button @click="showOnlyAlerts = !showOnlyAlerts"
          :class="[
            'px-4 py-2 border rounded-lg transition-colors text-sm font-medium',
            showOnlyAlerts 
              ? 'bg-red-600 border-red-600 text-white' 
              : 'border-titan-300 text-titan-700 hover:bg-titan-50'
          ]">
          Solo Alertas
        </button>
      </div>
    </div>

    <!-- Inventory Table -->
    <UiDataTable
      title="Inventario de Ingredientes"
      :columns="inventarioTableColumns"
      :data="filteredInventario"
      variant="default"
    >
      <!-- Custom slots for special columns -->
      <template #cell-nombre="{ value, row }">
        <div class="flex items-center">
          <div class="flex-shrink-0 h-8 w-8">
            <div :class="[
              'h-8 w-8 rounded-lg flex items-center justify-center',
              getIngredientColor(row.categoria)
            ]">
              <span class="text-xs font-medium">
                {{ value.charAt(0).toUpperCase() }}
              </span>
            </div>
          </div>
          <div class="ml-3">
            <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
            <div class="text-xs text-titan-600">{{ row.categoria }}</div>
          </div>
        </div>
      </template>
      
      <template #cell-stockActual="{ value, row }">
        <span class="text-sm font-medium text-ebony-800">
          {{ value.toLocaleString() }}{{ row.unidad }}
        </span>
      </template>
      
      <template #cell-stockMinimo="{ value, row }">
        <span class="text-sm text-titan-600">
          {{ value.toLocaleString() }}{{ row.unidad }}
        </span>
      </template>
      
      <template #cell-ultimoMovimiento="{ row }">
        <div class="text-sm text-titan-600">
          <div>{{ row.ultimoMovimiento.tipo }}</div>
          <div>{{ formatDate(row.ultimoMovimiento.fecha) }}</div>
        </div>
      </template>
      
      <template #cell-costoPromedio="{ value, row }">
        <div>
          <div class="text-sm font-medium text-ebony-800">
            ${{ value.toLocaleString() }}
          </div>
          <div class="text-xs text-titan-600">por {{ row.unidad }}</div>
        </div>
      </template>
      
      <template #cell-estado="{ value }">
        <UiStatusBadge
          :value="getStatusText(value)"
          format="text"
          :variant="getStatusVariant(value)"
          size="sm"
        />
      </template>
      
      <template #cell-actions="{ row }">
        <div class="flex justify-center space-x-2">
          <button @click="viewMovements(row)"
            class="text-blue-600 hover:text-blue-900 transition-colors">
            <ClockIcon class="h-4 w-4" />
          </button>
          <button @click="adjustStock(row)"
            class="text-crocus-600 hover:text-crocus-900 transition-colors">
            <AdjustmentsHorizontalIcon class="h-4 w-4" />
          </button>
          <button v-if="row.estado === 'low' || row.estado === 'critical'" 
            @click="createOrderForItem(row)"
            class="text-green-600 hover:text-green-900 transition-colors">
            <ShoppingCartIcon class="h-4 w-4" />
          </button>
        </div>
      </template>
    </UiDataTable>

    <!-- Recent Movements -->
    <div class="bg-white rounded-lg shadow-sm border border-titan-200 p-6">
      <h3 class="text-lg font-semibold text-ebony-800 mb-4">Movimientos Recientes</h3>
      <div class="space-y-4">
        <div v-for="movimiento in movimientosRecientes" :key="movimiento.id"
          class="flex items-center space-x-4 pb-4 border-b border-titan-200 last:border-b-0 last:pb-0">
          <div class="flex-shrink-0">
            <div :class="[
              'p-2 rounded-lg',
              movimiento.tipo === 'entrada' ? 'bg-green-100' : 
              movimiento.tipo === 'salida' ? 'bg-red-100' : 'bg-blue-100'
            ]">
              <component :is="movimiento.icono" :class="[
                'h-5 w-5',
                movimiento.tipo === 'entrada' ? 'text-green-600' : 
                movimiento.tipo === 'salida' ? 'text-red-600' : 'text-blue-600'
              ]" />
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-ebony-800">{{ movimiento.descripcion }}</p>
            <p class="text-xs text-titan-600">
              {{ movimiento.ingrediente }} • {{ movimiento.cantidad }}{{ movimiento.unidad }}
            </p>
          </div>
          <div class="text-sm text-titan-600">
            <div>{{ formatDate(movimiento.fecha) }}</div>
            <div class="text-xs">{{ movimiento.usuario }}</div>
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
            Mostrando <span class="font-medium">1</span> a <span class="font-medium">15</span> de{' '}
            <span class="font-medium">{{ filteredInventario.length }}</span> resultados
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
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  AdjustmentsHorizontalIcon,
  ArrowRightLeftIcon,
  ShoppingCartIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  MinusIcon,
  CogIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/vue/24/outline'

// Reactive state
const searchTerm = ref('')
const categoryFilter = ref('')
const statusFilter = ref('')
const showOnlyAlerts = ref(false)
const showAdjustmentModal = ref(false)
const showMovementModal = ref(false)

// Summary data
const summary = ref({
  stockNormal: 38,
  stockBajo: 8,
  agotado: 3,
  porVencer: 5
})

// Mock data para alertas críticas
const alertas = ref([
  { 
    id: 1, 
    ingrediente: 'Harina de Trigo', 
    stockActual: 2, 
    stockMinimo: 10, 
    unidad: 'kg',
    tipo: 'critico' 
  },
  { 
    id: 2, 
    ingrediente: 'Aceite de Oliva', 
    stockActual: 0.5, 
    stockMinimo: 2, 
    unidad: 'L',
    tipo: 'critico' 
  },
  { 
    id: 3, 
    ingrediente: 'Tomates Cherry', 
    stockActual: 3, 
    stockMinimo: 5, 
    unidad: 'kg',
    tipo: 'bajo' 
  }
])

// Mock data para inventario
const inventario = ref([
  {
    id: 1,
    nombre: 'Harina de Trigo',
    categoria: 'proteinas',
    stockActual: 2,
    stockMinimo: 10,
    unidad: 'kg',
    costoPromedio: 3500,
    estado: 'critical',
    ultimoMovimiento: { tipo: 'Salida', fecha: '2025-11-06' }
  },
  {
    id: 2,
    nombre: 'Aceite de Oliva',
    categoria: 'condimentos',
    stockActual: 0.5,
    stockMinimo: 2,
    unidad: 'L',
    costoPromedio: 15000,
    estado: 'critical',
    ultimoMovimiento: { tipo: 'Salida', fecha: '2025-11-05' }
  },
  {
    id: 3,
    nombre: 'Queso Mozzarella',
    categoria: 'lacteos',
    stockActual: 15,
    stockMinimo: 5,
    unidad: 'kg',
    costoPromedio: 12000,
    estado: 'normal',
    ultimoMovimiento: { tipo: 'Entrada', fecha: '2025-11-04' }
  },
  {
    id: 4,
    nombre: 'Tomates Cherry',
    categoria: 'vegetales',
    stockActual: 3,
    stockMinimo: 5,
    unidad: 'kg',
    costoPromedio: 8500,
    estado: 'low',
    ultimoMovimiento: { tipo: 'Salida', fecha: '2025-11-06' }
  },
  {
    id: 5,
    nombre: 'Jamón Serrano',
    categoria: 'proteinas',
    stockActual: 8,
    stockMinimo: 3,
    unidad: 'kg',
    costoPromedio: 25000,
    estado: 'normal',
    ultimoMovimiento: { tipo: 'Entrada', fecha: '2025-11-03' }
  }
])

const movimientosRecientes = ref([
  {
    id: 1,
    tipo: 'salida',
    icono: MinusIcon,
    descripcion: 'Consumo de producción',
    ingrediente: 'Harina de Trigo',
    cantidad: 5,
    unidad: 'kg',
    fecha: '2025-11-06',
    usuario: 'Chef Mario'
  },
  {
    id: 2,
    tipo: 'entrada',
    icono: PlusIcon,
    descripcion: 'Recepción de compra PO-2025-001',
    ingrediente: 'Queso Mozzarella',
    cantidad: 10,
    unidad: 'kg',
    fecha: '2025-11-04',
    usuario: 'Ana García'
  },
  {
    id: 3,
    tipo: 'ajuste',
    icono: CogIcon,
    descripcion: 'Ajuste de inventario',
    ingrediente: 'Aceite de Oliva',
    cantidad: -0.5,
    unidad: 'L',
    fecha: '2025-11-03',
    usuario: 'Luis Pérez'
  }
])

// DataTable configuration
const inventarioTableColumns = [
  {
    key: 'nombre',
    title: 'Ingrediente',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'stockActual',
    title: 'Stock Actual',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'stockMinimo',
    title: 'Stock Mínimo',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'ultimoMovimiento',
    title: 'Último Movimiento',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'costoPromedio',
    title: 'Costo Promedio',
    sortable: true,
    format: 'currency',
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
    key: 'actions',
    title: 'Acciones',
    sortable: false,
    format: 'text',
    align: 'center'
  }
]

// Computed properties
const filteredInventario = computed(() => {
  return inventario.value.filter(item => {
    const matchesSearch = !searchTerm.value || 
      item.nombre.toLowerCase().includes(searchTerm.value.toLowerCase())
    
    const matchesCategory = !categoryFilter.value || item.categoria === categoryFilter.value
    const matchesStatus = !statusFilter.value || item.estado === statusFilter.value
    const matchesAlerts = !showOnlyAlerts.value || 
      (item.estado === 'low' || item.estado === 'critical' || item.estado === 'out')
    
    return matchesSearch && matchesCategory && matchesStatus && matchesAlerts
  })
})

// Helper functions
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { 
    month: 'short', 
    day: 'numeric' 
  })
}

// Helper function for status variants
function getStatusVariant(status) {
  switch (status) {
    case 'normal':
      return 'success'
    case 'low':
      return 'warning'
    case 'critical':
      return 'destructive'
    case 'out':
      return 'secondary'
    default:
      return 'secondary'
  }
}

const getStatusText = (status) => {
  const texts = {
    normal: 'Normal',
    low: 'Stock Bajo',
    critical: 'Crítico',
    out: 'Agotado'
  }
  return texts[status] || 'Desconocido'
}

const getIngredientColor = (categoria) => {
  const colors = {
    proteinas: 'bg-red-100 text-red-600',
    vegetales: 'bg-green-100 text-green-600',
    lacteos: 'bg-blue-100 text-blue-600',
    condimentos: 'bg-yellow-100 text-yellow-600'
  }
  return colors[categoria] || 'bg-gray-100 text-gray-600'
}

// Methods
const viewMovements = (item) => {
  console.log('Ver movimientos de:', item.nombre)
}

const adjustStock = (item) => {
  console.log('Ajustar stock de:', item.nombre)
  showAdjustmentModal.value = true
}

const createOrderForItem = (item) => {
  console.log('Crear orden para:', item.nombre)
  // Redireccionar a crear orden con este ingrediente pre-seleccionado
}

const createOrderForIngredient = (alerta) => {
  console.log('Crear orden para ingrediente crítico:', alerta.ingrediente)
}

useHead({
  title: 'Inventario - Abastecimiento'
})
</script>