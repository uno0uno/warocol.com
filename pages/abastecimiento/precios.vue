<template>
  <div class="page-layout">

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      <SharedMetricCard
        title="Total de Precios"
        :value="summary.totalPrecios"
        subtitle="Precios configurados"
        variant="primary"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Precios Activos"
        :value="summary.activos"
        subtitle="Vigentes actualmente"
        variant="primary"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Por Vencer"
        :value="summary.porVencer"
        subtitle="Próximos a expirar"
        variant="primary"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Ingredientes con Precios"
        :value="summary.ingredientes"
        subtitle="Productos configurados"
        variant="primary"
        :show-icon="false"
      />
    </div>

    <!-- Price Comparison (when enabled) -->
    <div v-if="showComparison" class="bg-white rounded-lg shadow-sm border border-titan-200 p-6">
      <h3 class="text-lg font-semibold text-ebony-800 mb-4">Comparación de Precios</h3>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div v-for="item in topComparisons" :key="item.ingrediente" 
          class="border border-titan-200 rounded-lg p-4">
          <h4 class="font-medium text-ebony-800 mb-3">{{ item.ingrediente }}</h4>
          <div class="space-y-2">
            <div v-for="precio in item.precios" :key="precio.proveedor"
              :class="[
                'flex justify-between items-center p-2 rounded text-sm',
                precio.esMenor ? 'bg-green-50 border border-green-200' : 'bg-titan-50'
              ]">
              <span class="font-medium">{{ precio.proveedor }}</span>
              <span :class="precio.esMenor ? 'text-green-700 font-semibold' : 'text-titan-700'">
                ${{ precio.precio }}/{{ precio.unidad }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Prices Table -->
    <UiDataTable
      title="Lista de Precios"
      :columns="preciosTableColumns"
      :data="filteredPrecios"
      variant="default"
    >
      <!-- Custom slots for special columns -->
      <template #cell-ingrediente="{ value }">
        <div class="flex items-center">
          <div class="ml-3">
            <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
          </div>
        </div>
      </template>
      
      <template #cell-proveedor="{ value }">
        <span class="text-sm text-ebony-800">{{ value }}</span>
      </template>
      
      <template #cell-precio="{ value }">
        <span class="text-sm font-medium text-ebony-800">${{ value.toLocaleString() }}</span>
      </template>
      
      <template #cell-unidad="{ value }">
        <span class="text-sm text-ebony-800">{{ value }}</span>
      </template>
      
      <template #cell-vigencia="{ row }">
        <div class="text-sm text-ebony-800">
          <div >{{ row.vigenciaInicio }}</div>
        </div>
      </template>
      
      <template #cell-estado="{ value }">
        <UiStatusBadge
          :value="getEstadoText(value)"
          format="text"
          :variant="getEstadoVariant(value)"
          size="sm"
        />
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
            Mostrando <span class="font-medium">1</span> a <span class="font-medium">15</span> de{' '}
            <span class="font-medium">{{ filteredPrecios.length }}</span> resultados
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
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ScaleIcon,
  ArrowUpTrayIcon,
  DocumentDuplicateIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

// Reactive state
const searchTerm = ref('')
const proveedorFilter = ref('')
const statusFilter = ref('')
const showComparison = ref(false)
const showCreateModal = ref(false)
const showImportModal = ref(false)

// Summary data
const summary = ref({
  totalPrecios: 728,
  activos: 692,
  porVencer: 28,
  ingredientes: 52
})

// Mock data para precios
const precios = ref([
  {
    id: 1,
    ingrediente: 'Jalapeños',
    proveedor: 'Abastos',
    precio: 8,
    unidad: 'gr',
    vigenciaInicio: '2025-11-05',
    vigenciaFin: null,
    estado: 'active'
  },
  {
    id: 2,
    ingrediente: 'Oregano',
    proveedor: 'Abastos',
    precio: 40,
    unidad: 'gr',
    vigenciaInicio: '2025-11-05',
    vigenciaFin: null,
    estado: 'active'
  },
  {
    id: 3,
    ingrediente: 'Coca-Cola 1.5L',
    proveedor: 'COCA COLA FEMSA',
    precio: 5417,
    unidad: 'und',
    vigenciaInicio: '2025-11-05',
    vigenciaFin: '2025-12-05',
    estado: 'expiring'
  },
  {
    id: 4,
    ingrediente: 'Queso Chedar',
    proveedor: 'Calypso del Caribe',
    precio: 500,
    unidad: 'und',
    vigenciaInicio: '2025-11-05',
    vigenciaFin: null,
    estado: 'active'
  },
  {
    id: 5,
    ingrediente: 'Papas Fritas',
    proveedor: 'Calypso del Caribe',
    precio: 8.3,
    unidad: 'gr',
    vigenciaInicio: '2025-11-05',
    vigenciaFin: null,
    estado: 'active'
  },
  {
    id: 6,
    ingrediente: 'Humo Liquido',
    proveedor: 'CIMPAC',
    precio: 20,
    unidad: 'ml',
    vigenciaInicio: '2025-10-01',
    vigenciaFin: '2025-11-10',
    estado: 'expiring'
  }
])

// DataTable configuration
const preciosTableColumns = [
  {
    key: 'ingrediente',
    title: 'Ingrediente',
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
    key: 'precio',
    title: 'Precio',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'unidad',
    title: 'Unidad',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'vigencia',
    title: 'Vigencia',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'estado',
    title: 'Estado',
    sortable: true,
    format: 'text',
    align: 'center'
  },
]

// Helper functions for status badges
function getEstadoText(estado) {
  switch (estado) {
    case 'active':
      return 'Activo'
    case 'expiring':
      return 'Por vencer'
    default:
      return 'Vencido'
  }
}

function getEstadoVariant(estado) {
  switch (estado) {
    case 'active':
      return 'success'
    case 'expiring':
      return 'warning'
    default:
      return 'destructive'
  }
}

// Computed properties
const proveedoresUnicos = computed(() => {
  return [...new Set(precios.value.map(p => p.proveedor))].sort()
})

const filteredPrecios = computed(() => {
  return precios.value.filter(precio => {
    const matchesSearch = !searchTerm.value || 
      precio.ingrediente.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      precio.proveedor.toLowerCase().includes(searchTerm.value.toLowerCase())
    
    const matchesProveedor = !proveedorFilter.value || precio.proveedor === proveedorFilter.value
    const matchesStatus = !statusFilter.value || precio.estado === statusFilter.value
    
    return matchesSearch && matchesProveedor && matchesStatus
  })
})

const topComparisons = computed(() => {
  // Agrupar precios por ingrediente para comparación
  const grouped = {}
  precios.value.forEach(precio => {
    if (!grouped[precio.ingrediente]) {
      grouped[precio.ingrediente] = []
    }
    grouped[precio.ingrediente].push(precio)
  })
  
  // Tomar los primeros 3 ingredientes que tienen múltiples proveedores
  const comparisons = Object.entries(grouped)
    .filter(([_, precios]) => precios.length > 1)
    .slice(0, 3)
    .map(([ingrediente, precios]) => {
      const sortedPrecios = precios.sort((a, b) => a.precio - b.precio)
      return {
        ingrediente,
        precios: sortedPrecios.map((p, idx) => ({
          proveedor: p.proveedor,
          precio: p.precio.toLocaleString(),
          unidad: p.unidad,
          esMenor: idx === 0
        }))
      }
    })
  
  return comparisons
})


useHead({
  title: 'Lista de Precios - Abastecimiento'
})
</script>