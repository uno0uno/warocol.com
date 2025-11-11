<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar los proveedores.</p>
        <p class="text-sm text-ebony-600">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else>
      <!-- Stats Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-5">
        <SharedMetricCard
          title="Proveedores Activos"
          :value="stats.activos"
          subtitle="Estado operativo"
          variant="primary"
          :show-icon="false"
        />
        
        <SharedMetricCard
          title="Proveedores Inactivos"
          :value="stats.inactivos"
          subtitle="Pausados o desactivados"
          variant="primary"
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
          variant="primary"
          :show-icon="false"
        />
      </div>

      <!-- Suppliers Table -->
      <UiDataTable
        :columns="proveedoresTableColumns"
        :data="suppliers"
        variant="default"
      >
        <!-- Custom header with title and create button -->
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-bold text-text-primary">
              Proveedores
            </h3>
            <div class="flex items-center space-x-4">
              <div class="relative">
                <input
                  type="text"
                  v-model="apiSearchTerm"
                  placeholder="Buscar proveedor..."
                  class="pl-10 pr-4 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm"
                />
                <MagnifyingGlassIcon class="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-titan-400" />
              </div>
              <NuxtLink 
                to="/abastecimiento/proveedor/crear" 
                class="btn-primary px-6 py-2 rounded-lg text-sm font-medium">
                + Nuevo Proveedor
              </NuxtLink>
            </div>
          </div>
        </template>
        <!-- Custom slots for special columns -->
              <template #cell-name="{ value, row }">
                <div class="flex items-center">
                  <div class="ml-4">
                    <div class="text-sm font-bold text-ebony-800">{{ value }}</div>
                    <div class="text-sm text-titan-600">{{ row.tax_id }}</div>
                  </div>
                </div>
              </template>        
        <template #cell-contact="{ row }">
          <div>
            <div class="text-sm text-ebony-800">{{ row.email || 'No especificado' }}</div>
            <div class="text-sm text-titan-600">{{ row.phone || 'No especificado' }}</div>
          </div>
        </template>
        
        <template #cell-payment_terms="{ value }">
          <span class="text-sm text-ebony-800">{{ value || 'Contado' }}</span>
        </template>
        
        <template #cell-is_active="{ value }">
          <UiStatusBadge
            :value="value ? 'Activo' : 'Inactivo'"
            format="text"
            :variant="value ? 'success' : 'destructive'"
            size="sm"
          />
        </template>
        
        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="editProveedor(row)"
              class="text-crocus-600 hover:text-crocus-900 transition-colors"
              title="Editar proveedor">
              <PencilIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </UiDataTable>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
        <div class="flex-1 flex justify-between sm:hidden">
          <button 
            @click="prevPage" 
            :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50"
          >
            Anterior
          </button>
          <button 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50"
          >
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-titan-700">
              Mostrando <span class="font-medium">{{ startIndex }}</span> a <span class="font-medium">{{ endIndex }}</span> de{' '}
              <span class="font-medium">{{ totalSuppliers }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button 
                @click="prevPage" 
                :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50"
              >
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <button 
                v-for="page in totalPages" 
                :key="page" 
                @click="goToPage(page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium',
                  currentPage === page ? 'bg-crocus-50 border-crocus-500 text-crocus-600' : 'bg-white text-titan-700 hover:bg-titan-50'
                ]"
              >
                {{ page }}
              </button>
              <button 
                @click="nextPage" 
                :disabled="currentPage === totalPages"
                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50"
              >
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

import { ref, computed, watch } from 'vue'

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Reactive state for API parameters

const currentPage = ref(1);

const itemsPerPage = ref(10);

const apiSearchTerm = ref('');

const apiIsActive = ref(null);

const apiPaymentTerms = ref(null);



// useAsyncData for fetching suppliers

const { data: suppliersData, pending: isLoading, error: fetchError, refresh } = useAsyncData(

  `suppliers-${currentTenant.value?.id || 'default'}`,

  () => {
    console.log('🔍 Fetching suppliers data for tenant:', currentTenant.value?.id)

    const params = {

      page: currentPage.value,

      limit: itemsPerPage.value,

    };

    if (apiSearchTerm.value) params.search = apiSearchTerm.value;

    if (apiIsActive.value !== null) params.is_active = apiIsActive.value;

    if (apiPaymentTerms.value) params.payment_terms = apiPaymentTerms.value;



    return $fetch('/api/suppliers', { params });

  },

  {

    server: false, // Fetch on client side

    watch: [currentTenant, currentPage, itemsPerPage, apiSearchTerm, apiIsActive, apiPaymentTerms],

    default: () => ({ data: [], total: 0 }),

    transform: (response) => ({

      data: response.data || [],

      total: response.total || 0,

    }),

  }

);



// Computed properties for data and pagination

const suppliers = computed(() => suppliersData.value.data);

const totalSuppliers = computed(() => suppliersData.value.total);



// Stats (mock data for now, can be fetched from API later if needed)

const stats = ref({

  activos: 25,

  inactivos: 3,

  promedioPago: 30,

  conEntregas: 18

})



// DataTable configuration

const proveedoresTableColumns = [

  {

    key: 'name',

    title: 'Proveedor',

    sortable: true,

    format: 'text',

    align: 'left'

  },

  {

    key: 'contact',

    title: 'Contacto',

    sortable: false,

    format: 'text',

    align: 'left'

  },

  {

    key: 'payment_terms',

    title: 'Términos de Pago',

    sortable: true,

    format: 'text',

    align: 'left'

  },

  {

    key: 'is_active',

    title: 'Estado',

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



// Computed properties for pagination display

const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1);

const endIndex = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalSuppliers.value));

const totalPages = computed(() => Math.ceil(totalSuppliers.value / itemsPerPage.value));



// Pagination methods

const goToPage = (page) => {

  if (page >= 1 && page <= totalPages.value) {

    currentPage.value = page;

  }

};



const nextPage = () => {

  if (currentPage.value < totalPages.value) {

    currentPage.value++;

  }

};



const prevPage = () => {

  if (currentPage.value > 1) {

    currentPage.value--;

  }

};



// Methods

const editProveedor = (proveedor) => {

  // Navegar a la página de editar usando path parameter

  navigateTo(`/abastecimiento/proveedor/${proveedor.id}`)

}



// The toggleStatus function might need to be updated to call the API

const toggleStatus = (proveedor) => {

  proveedor.is_active = !proveedor.is_active

  console.log('Estado cambiado para:', proveedor.name)

}



useHead({

  title: 'Proveedores - Abastecimiento'

})

</script>






