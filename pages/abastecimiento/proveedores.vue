<template>
  <div class="space-y-6">

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
      <SharedMetricCard
        title="Proveedores Activos"
        :value="stats.activos"
        subtitle="Estado operativo"
        variant="success"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Proveedores Inactivos"
        :value="stats.inactivos"
        subtitle="Pausados o desactivados"
        variant="danger"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Promedio de Pago"
        :value="stats.promedioPago"
        suffix="d"
        subtitle="Días promedio de términos"
        variant="info"
        :show-icon="false"
      />
      
      <SharedMetricCard
        title="Con Entregas Programadas"
        :value="stats.conEntregas"
        subtitle="Proveedores con entregas"
        variant="secondary"
        :show-icon="false"
      />
    </div>

    <!-- Filters and Search -->
    <div class="bg-white rounded-lg shadow-sm border border-titan-200 p-6">
      <div class="flex flex-col sm:flex-row gap-4">
        <div class="flex-1">
          <div class="relative">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
            <input
              v-model="searchTerm"
              type="text"
              placeholder="Buscar proveedores..."
              class="w-full pl-10 pr-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500"
            />
          </div>
        </div>
        <select v-model="statusFilter" 
          class="px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
        <select v-model="categoryFilter" 
          class="px-4 py-2 border border-titan-300 rounded-lg focus:ring-2 focus:ring-crocus-500 focus:border-crocus-500">
          <option value="">Todas las categorías</option>
          <option value="alimentos">Alimentos</option>
          <option value="bebidas">Bebidas</option>
          <option value="empaques">Empaques</option>
          <option value="limpieza">Limpieza</option>
        </select>
      </div>
    </div>

    <!-- Suppliers Table -->
    <div class="bg-white rounded-lg shadow-sm border border-titan-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-titan-200">
          <thead class="bg-titan-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Proveedor
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Contacto
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Términos de Pago
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-titan-500 uppercase tracking-wider">
                Productos
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
            <tr v-for="proveedor in filteredProveedores" :key="proveedor.id" class="hover:bg-titan-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10">
                    <div class="h-10 w-10 rounded-full bg-crocus-100 flex items-center justify-center">
                      <span class="text-crocus-600 font-medium text-sm">
                        {{ proveedor.name.charAt(0).toUpperCase() }}
                      </span>
                    </div>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-ebony-800">{{ proveedor.name }}</div>
                    <div class="text-sm text-titan-600">{{ proveedor.tax_id }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-ebony-800">{{ proveedor.email || 'No especificado' }}</div>
                <div class="text-sm text-titan-600">{{ proveedor.phone || 'No especificado' }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-ebony-800">
                {{ proveedor.payment_terms || 'Contado' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {{ proveedor.productos_count }} productos
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span :class="[
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  proveedor.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                ]">
                  {{ proveedor.is_active ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex space-x-2">
                  <button @click="editProveedor(proveedor)"
                    class="text-crocus-600 hover:text-crocus-900 transition-colors">
                    <PencilIcon class="h-4 w-4" />
                  </button>
                  <button @click="toggleStatus(proveedor)"
                    :class="[
                      'transition-colors',
                      proveedor.is_active 
                        ? 'text-red-600 hover:text-red-900' 
                        : 'text-green-600 hover:text-green-900'
                    ]">
                    <component :is="proveedor.is_active ? EyeSlashIcon : EyeIcon" class="h-4 w-4" />
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
            Mostrando <span class="font-medium">1</span> a <span class="font-medium">10</span> de{' '}
            <span class="font-medium">{{ filteredProveedores.length }}</span> resultados
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
  XCircleIcon,
  CurrencyDollarIcon,
  TruckIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'

// Reactive state
const searchTerm = ref('')
const statusFilter = ref('')
const categoryFilter = ref('')
const showCreateModal = ref(false)

// Stats
const stats = ref({
  activos: 25,
  inactivos: 3,
  promedioPago: 30,
  conEntregas: 18
})

// Mock data para proveedores
const proveedores = ref([
  {
    id: 1,
    name: 'Frutas del Valle',
    tax_id: '900123456-7',
    email: 'contacto@frutasdelvalle.com',
    phone: '+57 300 123 4567',
    payment_terms: '30 días',
    is_active: true,
    productos_count: 15,
    categoria: 'alimentos'
  },
  {
    id: 2,
    name: 'COCA COLA FEMSA',
    tax_id: '800987654-3',
    email: 'ventas@cocacolafemsa.com',
    phone: '+57 310 987 6543',
    payment_terms: '45 días',
    is_active: true,
    productos_count: 8,
    categoria: 'bebidas'
  },
  {
    id: 3,
    name: 'Calypso del Caribe',
    tax_id: '700555666-9',
    email: 'info@calypso.com.co',
    phone: '+57 320 555 6666',
    payment_terms: '15 días',
    is_active: true,
    productos_count: 12,
    categoria: 'alimentos'
  },
  {
    id: 4,
    name: 'Desechables Pradera',
    tax_id: '600444333-2',
    email: null,
    phone: null,
    payment_terms: 'Contado',
    is_active: false,
    productos_count: 6,
    categoria: 'empaques'
  },
  {
    id: 5,
    name: 'Abastos San Martín',
    tax_id: '500222111-8',
    email: 'gerencia@abastossanmartin.com',
    phone: '+57 315 222 1111',
    payment_terms: '60 días',
    is_active: true,
    productos_count: 22,
    categoria: 'alimentos'
  }
])

// Computed para filtrar proveedores
const filteredProveedores = computed(() => {
  return proveedores.value.filter(proveedor => {
    const matchesSearch = !searchTerm.value || 
      proveedor.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
      proveedor.tax_id.includes(searchTerm.value)
    
    const matchesStatus = !statusFilter.value || 
      (statusFilter.value === 'active' && proveedor.is_active) ||
      (statusFilter.value === 'inactive' && !proveedor.is_active)
    
    const matchesCategory = !categoryFilter.value || 
      proveedor.categoria === categoryFilter.value
    
    return matchesSearch && matchesStatus && matchesCategory
  })
})

// Methods
const editProveedor = (proveedor) => {
  console.log('Editar proveedor:', proveedor)
  // Aquí iría la lógica para abrir modal de edición
}

const toggleStatus = (proveedor) => {
  proveedor.is_active = !proveedor.is_active
  console.log('Estado cambiado para:', proveedor.name)
}

useHead({
  title: 'Proveedores - Abastecimiento'
})
</script>