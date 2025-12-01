<template>
  <div class="page-layout">
    <!-- Loading State (only show if no data yet) -->
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
    <div v-else class="flex flex-col gap-3 md:gap-4">

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        <SharedMetricCard title="Proveedores Activos" :value="stats.activos" subtitle="Estado operativo"
          variant="primary" :show-icon="false" />

        <SharedMetricCard title="Proveedores Inactivos" :value="stats.inactivos" subtitle="Pausados o desactivados"
          variant="primary" :show-icon="false" />

        <SharedMetricCard title="Promedio de Pago" :value="stats.promedioPago" suffix="d"
          subtitle="Días promedio de términos" variant="info" :show-icon="false" />

        <SharedMetricCard title="Con Entregas Programadas" :value="stats.conEntregas"
          subtitle="Proveedores con entregas" variant="primary" :show-icon="false" />
      </div>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="proveedoresTableColumns"
        :data="suppliers"
        title="Proveedores"
        empty-message="No hay proveedores registrados"
        empty-sub-message="Crea un nuevo proveedor para comenzar"
        variant="default"
      >
        <!-- Mobile Actions -->
        <template #mobileActions>
          <div class="flex flex-col gap-2">
            <div class="relative">
              <input type="text" v-model="apiSearchTerm" placeholder="Buscar..."
                class="w-full pl-9 pr-3 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm" />
              <MagnifyingGlassIcon
                class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
            </div>
            <NuxtLink to="/abastecimiento/proveedor/crear"
              class="btn-primary px-4 py-2 rounded-lg text-sm font-medium text-center">
              + Nuevo
            </NuxtLink>
          </div>
        </template>

        <!-- Mobile Card -->
        <template #card="{ item }">
          <SuppliersSupplierCard :supplier="item" @edit="editProveedor" @copy-link="copyPortalLink" />
        </template>

        <!-- Desktop Header -->
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <h3 class="text-base sm:text-lg font-bold text-text-primary">
              Proveedores
            </h3>
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
              <div class="relative flex-1 sm:flex-initial">
                <input type="text" v-model="apiSearchTerm" placeholder="Buscar..."
                  class="w-full pl-9 pr-3 py-2 border border-titan-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-crocus-500 focus:border-transparent text-sm" />
                <MagnifyingGlassIcon
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-titan-400" />
              </div>
              <NuxtLink to="/abastecimiento/proveedor/crear"
                class="btn-primary px-4 sm:px-6 py-2 rounded-lg text-sm font-medium text-center whitespace-nowrap">
                <span class="hidden sm:inline">+ Nuevo Proveedor</span>
                <span class="sm:hidden">+ Nuevo</span>
              </NuxtLink>
            </div>
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-name="{ value }">
          <span class="text-sm font-bold text-ebony-800">{{ value }}</span>
        </template>

        <template #cell-tax_id="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-email="{ value }">
          <span class="text-sm text-text-primary">{{ value || 'No especificado' }}</span>
        </template>

        <template #cell-phone="{ value }">
          <span class="text-sm text-text-secondary">{{ value || 'No especificado' }}</span>
        </template>

        <template #cell-is_active="{ value }">
          <UiStatusBadge :value="value ? 'Activo' : 'Inactivo'" format="text"
            :variant="value ? 'success' : 'destructive'" size="sm" />
        </template>

        <template #cell-actions="{ row }">
          <div class="flex justify-center space-x-2">
            <button @click="copyPortalLink(row)" class="text-blue-600 hover:text-blue-900 transition-colors"
              title="Copiar enlace del portal">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </button>
            <button @click="editProveedor(row)" class="text-crocus-600 hover:text-crocus-900 transition-colors"
              title="Editar proveedor">
              <PencilIcon class="h-4 w-4" />
            </button>
          </div>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
        <div class="flex-1 flex justify-between sm:hidden">
          <button @click="prevPage" :disabled="currentPage === 1"
            class="relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
            Anterior
          </button>
          <button @click="nextPage" :disabled="currentPage === totalPages"
            class="ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-titan-700">
              Mostrando <span class="font-medium">{{ startIndex }}</span> a <span class="font-medium">{{ endIndex
                }}</span>
              de{' '}
              <span class="font-medium">{{ totalSuppliers }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button @click="prevPage" :disabled="currentPage === 1"
                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50">
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <button v-for="page in totalPages" :key="page" @click="goToPage(page)" :class="[
                'relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium',
                currentPage === page ? 'bg-crocus-50 border-crocus-500 text-crocus-600' : 'bg-white text-titan-700 hover:bg-titan-50'
              ]">
                {{ page }}
              </button>
              <button @click="nextPage" :disabled="currentPage === totalPages"
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

import { ref, computed, watch, inject, onMounted } from 'vue'

definePageMeta({
  layout: 'dashboard'
})

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Reactive state for API parameters

const currentPage = ref(1);

const itemsPerPage = ref(10);

const apiSearchTerm = ref('');

const apiIsActive = ref(null);

const apiPaymentTerms = ref(null);



// Fetch data using useAsyncData for proper loading states (NO await to show loading)
const { data: suppliersData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `suppliers-${currentTenant.value?.id || 'default'}`,
  () => {
    const params = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    };
    if (apiSearchTerm.value) params.search = apiSearchTerm.value;
    if (apiIsActive.value !== null) params.is_active = apiIsActive.value;
    if (apiPaymentTerms.value) params.payment_terms = apiPaymentTerms.value;

    return $fetch('/api/suppliers/providers', {
      query: params
    });
  },
  {
    server: false,
    watch: [currentTenant, currentPage, itemsPerPage, apiSearchTerm, apiIsActive, apiPaymentTerms],
    default: () => ({ data: [], total: 0, stats: null }),
    transform: (response) => ({
      data: response.data || [],
      total: response.total || 0,
      stats: response.stats || null
    })
  }
);

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})

// Computed properties for data and pagination
const suppliers = computed(() => suppliersData.value.data);
const totalSuppliers = computed(() => suppliersData.value.total);

// Stats from API response
const stats = computed(() => {
  const apiStats = suppliersData.value.stats

  if (!apiStats) {
    return {
      activos: 0,
      inactivos: 0,
      promedioPago: 0,
      conEntregas: 0
    }
  }

  return {
    activos: apiStats.activos || 0,
    inactivos: apiStats.inactivos || 0,
    promedioPago: apiStats.promedio_pago || 0,
    conEntregas: apiStats.con_entregas || 0
  }
})

// Manual refresh on tenant change to ensure data loading
onTenantChange(async () => {
  await refresh()
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
    key: 'tax_id',
    title: 'NIT',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'email',
    title: 'Email',
    sortable: false,
    format: 'text',
    align: 'left'
  },
  {
    key: 'phone',
    title: 'Teléfono',
    sortable: false,
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

const copyPortalLink = async (proveedor) => {
  try {
    const baseUrl = window.location.origin
    const portalUrl = `${baseUrl}/proveedor/${proveedor.access_token}`

    // Try modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(portalUrl)
    } else {
      // Fallback for non-HTTPS contexts
      const textArea = document.createElement('textarea')
      textArea.value = portalUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }


  } catch (error) {

  }
}

// The toggleStatus function might need to be updated to call the API

const toggleStatus = (proveedor) => {

  proveedor.is_active = !proveedor.is_active



}



useHead({

  title: 'Proveedores - Abastecimiento'

})

</script>
