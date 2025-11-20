<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-ebony-800 mb-2">Error al cargar los precios.</p>
        <p class="text-sm text-ebony-600">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Summary Cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
        <SharedMetricCard
          title="Total de Ingredientes"
          :value="summary.ingredientes"
          subtitle="Ingredientes configurados"
          variant="primary"
          :show-icon="false"
          size="sm"
          class="md:size-default"
        />

        <SharedMetricCard
          title="Categorías"
          :value="uniqueCategoriesCount"
          subtitle="Categorías de ingredientes"
          variant="primary"
          :show-icon="false"
          size="sm"
          class="md:size-default"
        />

        <SharedMetricCard
          title="Precio Promedio"
          :value="averagePrice"
          subtitle="Promedio de precios"
          variant="info"
          format="currency"
          :show-icon="false"
          size="sm"
          class="md:size-default col-span-2 md:col-span-1"
        />
      </div>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="preciosTableColumns"
        :data="ingredients"
        title="Lista de Precios"
        empty-message="No hay precios configurados"
        empty-sub-message="Los precios de ingredientes aparecerán aquí"
        variant="default"
      >
        <!-- Mobile Card -->
        <template #card="{ item }">
          <PricesPriceCard :ingredient="item" />
        </template>

        <!-- Desktop Header -->
        <template #header>
          <h3 class="text-base sm:text-lg font-bold text-text-primary">
            Lista de Precios de Ingredientes
          </h3>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-name="{ value, row }">
          <div class="flex items-center">
            <div class="ml-3">
              <div class="text-sm font-medium text-ebony-800">{{ value }}</div>
              <div class="text-sm text-titan-600">{{ row.category || 'Sin categoría' }}</div>
            </div>
          </div>
        </template>

        <template #cell-price="{ value }">
          <span class="text-sm font-medium text-ebony-800">${{ (value || 0).toLocaleString() }}</span>
        </template>

        <template #cell-unit="{ value }">
          <span class="text-sm text-ebony-800">{{ value }}</span>
        </template>
      </UiResponsiveDataView>

      <!-- Pagination -->
      <div class="bg-white px-4 py-3 flex items-center justify-between border border-titan-200 rounded-lg">
        <div class="flex-1 flex justify-between sm:hidden">
          <button @click="prevPage" :disabled="currentPage === 1" class="relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
            Anterior
          </button>
          <button @click="nextPage" :disabled="currentPage === totalPages" class="ml-3 relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium rounded-md text-titan-700 bg-white hover:bg-titan-50">
            Siguiente
          </button>
        </div>
        <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div>
            <p class="text-sm text-titan-700">
              Mostrando <span class="font-medium">{{ startIndex }}</span> a <span class="font-medium">{{ endIndex }}</span> de{' '}
              <span class="font-medium">{{ totalIngredients }}</span> resultados
            </p>
          </div>
          <div>
            <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
              <button @click="prevPage" :disabled="currentPage === 1" class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50">
                <ChevronLeftIcon class="h-5 w-5" />
              </button>
              <button v-for="page in totalPages" :key="page" @click="goToPage(page)"
                :class="[
                  'relative inline-flex items-center px-4 py-2 border border-titan-300 text-sm font-medium',
                  currentPage === page ? 'bg-crocus-50 border-crocus-500 text-crocus-600' : 'bg-white text-titan-700 hover:bg-titan-50'
                ]">
                {{ page }}
              </button>
              <button @click="nextPage" :disabled="currentPage === totalPages" class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-titan-300 bg-white text-sm font-medium text-titan-500 hover:bg-titan-50">
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
import { inject, onMounted } from 'vue'
import {
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/vue/24/outline'
import { ref, computed } from 'vue'

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Reactive state for API parameters
const currentPage = ref(1);
const itemsPerPage = ref(15);
const apiSearchTerm = ref('');
const apiCategory = ref(null);
const apiSupplierId = ref(null);

// useFetch for ingredients
const { data: ingredientsData, pending: isLoading, error: fetchError, refresh } = useFetch('/api/suppliers/ingredients', {
  server: false,
  immediate: true,
  watch: [currentTenant, currentPage, itemsPerPage, apiSearchTerm, apiCategory, apiSupplierId],
  query: computed(() => {
    const params = {
      page: currentPage.value,
      limit: itemsPerPage.value,
    };
    if (apiSearchTerm.value) params.search = apiSearchTerm.value;
    if (apiCategory.value) params.category = apiCategory.value;
    if (apiSupplierId.value) params.supplier_id = apiSupplierId.value;
    return params;
  }),
  default: () => ({ data: [], total: 0 }),
  transform: (response) => ({
    data: response.data || [],
    total: response.total || 0,
  }),
});

// Computed properties for data
const ingredients = computed(() => ingredientsData.value?.data || []);
const totalIngredients = computed(() => ingredientsData.value?.total || 0);

// Inject refresh handler setter from layout
const setRefreshHandler = inject('setRefreshHandler', () => {})

// Register refresh handler for mobile bottom nav and desktop header
onMounted(() => {
  setRefreshHandler(refresh)
})

// Summary data (can be computed from fetched data later)
const summary = ref({
  totalPrecios: totalIngredients,
  porVencer: 0, // This logic needs to be defined based on an expiration date
  ingredientes: totalIngredients
})

// DataTable configuration
const preciosTableColumns = [
  {
    key: 'name',
    title: 'Ingrediente',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'price',
    title: 'Precio',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'unit',
    title: 'Unidad',
    sortable: true,
    format: 'text',
    align: 'center'
  },
]

// Computed properties for summary cards
const uniqueCategoriesCount = computed(() => {
  const categories = new Set(ingredients.value.map(i => i.category).filter(Boolean));
  return categories.size;
});

const averagePrice = computed(() => {
  const itemsWithPrice = ingredients.value.filter(i => i.price > 0);
  if (itemsWithPrice.length === 0) return 0;
  const total = itemsWithPrice.reduce((sum, i) => sum + i.price, 0);
  return total / itemsWithPrice.length;
});

// Computed properties for pagination display
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1);
const endIndex = computed(() => Math.min(currentPage.value * itemsPerPage.value, totalIngredients.value));
const totalPages = computed(() => Math.ceil(totalIngredients.value / itemsPerPage.value));

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

useHead({
  title: 'Lista de Precios - Abastecimiento'
})
</script>
