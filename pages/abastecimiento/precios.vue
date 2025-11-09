<template>
  <div class="space-y-6">

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
        variant="success"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Por Vencer"
        :value="summary.porVencer"
        subtitle="Próximos a expirar"
        variant="warning"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Ingredientes con Precios"
        :value="summary.ingredientes"
        subtitle="Productos configurados"
        variant="info"
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
              placeholder="Buscar ingredientes o proveedores..."
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
          <option value="active">Activos</option>
          <option value="expired">Vencidos</option>
          <option value="expiring">Por vencer</option>
        </select>
        <button @click="showComparison = !showComparison"
          :class="[
            'px-4 py-2 border rounded-lg transition-colors text-sm font-medium',
            showComparison 
              ? 'bg-crocus-600 border-crocus-600 text-white' 
              : 'border-titan-300 text-titan-700 hover:bg-titan-50'
          ]">
          {{ showComparison ? 'Ocultar' : 'Comparar' }}
        </button>
      </div>
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
    <div class="bg-white rounded-lg shadow-sm border border-titan-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-titan-200">
          <thead class="bg-titan-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Ingrediente
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Precio
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Unidad
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Vigencia
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Estado
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-titan-200">
            <tr v-for="precio in filteredPrecios" :key="precio.id" class="hover:bg-titan-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-8 w-8">
                    <div class="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <span class="text-blue-600 font-medium text-xs">
                        {{ precio.ingrediente.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-3">
                    <div class="text-sm font-medium text-ebony-800">{{ precio.ingrediente }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-ebony-800">
                {{ precio.proveedor }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-ebony-800">${{ precio.precio.toLocaleString() }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-titan-600">
                {{ precio.unidad }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-titan-600">
                <div>{{ precio.vigenciaInicio }}</div>
                <div v-if="precio.vigenciaFin">{{ precio.vigenciaFin }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  precio.estado === 'active' ? 'bg-green-100 text-green-800' :
                  precio.estado === 'expiring' ? 'bg-orange-100 text-orange-800' :
                  'bg-red-100 text-red-800'
                ]">
                  {{ precio.estado === 'active' ? 'Activo' : 
                     precio.estado === 'expiring' ? 'Por vencer' : 'Vencido' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex space-x-2">
                  <button @click="editPrecio(precio)"
                    class="text-crocus-600 hover:text-crocus-900 transition-colors">
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button @click="duplicatePrecio(precio)"
                    class="text-blue-600 hover:text-blue-900 transition-colors">
                    <DocumentDuplicateIcon class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
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
  PencilIcon,
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

// Methods
const editPrecio = (precio) => {
  console.log('Editar precio:', precio)
}

const duplicatePrecio = (precio) => {
  console.log('Duplicar precio:', precio)
}

useHead({
  title: 'Lista de Precios - Abastecimiento'
})
</script>