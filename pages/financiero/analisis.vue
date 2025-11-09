<template>
  <div class="min-h-full animate-page-enter">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <div class="text-xl font-semibold text-ebony-800 mb-2">Error loading data</div>
        <div class="text-sm text-ebony-600">{{ error }}</div>
        <button @click="$router.go(0)" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Retry
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-4">
      <!-- Products Analysis Metrics using MetricCard -->
      <div class="grid grid-cols-3 gap-5">
        <!-- Mejor Margen -->
        <SharedMetricCard
          variant="primary"
          title="Best Margin"
          :value="parseFloat(metricsData.best_margin?.percentage) || 0"
          format="percentage"
          :precision="1"
          :subtitle="metricsData.best_margin?.product_name || 'N/A'"
        />

        <!-- Productos Activos -->
        <SharedMetricCard
          variant="primary"
          title="Active Products"
          :value="metricsData.active_products || 0"
          format="number"
          :subtitle="`Total products: ${filteredProducts.length}`"
        />

        <!-- Low Performance -->
        <SharedMetricCard
          variant="primary"
          title="Low Performance"
          :value="metricsData.low_performance_count || 0"
          format="number"
          subtitle="Products need optimization"
        />
      </div>



    <!-- Products Analysis Table using DataTable -->
    <UiDataTable
      title="Detailed Product Analysis"
      :columns="analysisTableColumns"
      :data="sortedProducts"
      :sort-field="sortField"
      :sort-direction="sortDirection"
      variant="default"
      @sort="sortTable"
    >
      <!-- Custom slots for special columns -->
      <template #cell-name="{ value }">
        <span class="font-semibold text-sm">{{ value }}</span>
      </template>
      
      <template #cell-margin="{ value }">
        <UiStatusBadge
          :value="value"
          format="percentage"
          :auto-color="true"
          size="sm"
          :threshold="{ success: 60, warning: 50 }"
        />
      </template>
      
      <template #cell-sales="{ value }">
        {{ value }} units
      </template>
      
      <template #cell-cost="{ value }">
        <span class="text-text-primary font-medium">
          {{ value.toLocaleString('es-CO') }}
        </span>
      </template>
      
      <template #cell-profit="{ value }">
        <span class="text-text-primary font-medium">
          {{ value.toLocaleString('es-CO') }}
        </span>
      </template>
      
      <template #cell-tirImpact="{ value }">
        <UiStatusBadge
          :value="value"
          format="percentage"
          :auto-color="true"
          size="sm"
          :precision="1"
        />
      </template>
      
      <template #cell-classification="{ value }">
        <UiStatusBadge
          :value="value"
          format="text"
          :variant="getClassificationVariant(value)"
          size="sm"
        />
      </template>
    </UiDataTable>


    </div><!-- End Main Content -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { 
  StarIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon
} from '@heroicons/vue/24/outline'

// Layout configuration
definePageMeta({
  layout: 'dashboard'
})

// Meta tags
useHead({
  title: 'Product Analysis - Financial',
  meta: [
    { name: 'description', content: 'Detailed product profitability analysis for Warocol' }
  ]
})

// Chart ref
const productsChart = ref()

// State
const error = ref(null)

// Filter states
const selectedCategory = ref('')
const minMargin = ref('')
const period = ref('365')
const sortBy = ref('impact') // Default to TIR Impact

// Table sorting states
const sortField = ref('tirImpact') // Default to TIR Impact - renamed for DataTable  
const sortDirection = ref('desc') // Best TIR first - renamed for DataTable

// Table columns definition for DataTable
const analysisTableColumns = [
  {
    key: 'name',
    title: 'Product',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'category',
    title: 'Category',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'margin',
    title: 'Margin %',
    sortable: true,
    format: 'percentage',
    align: 'center'
  },
  {
    key: 'sales',
    title: 'Sales/Month',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'cost',
    title: 'Total Cost',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'profit',
    title: 'Profit',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'tirImpact',
    title: 'TIR Impact',
    sortable: true,
    format: 'percentage',
    align: 'center'
  },
  {
    key: 'classification',
    title: 'Classification',
    sortable: true,
    format: 'text',
    align: 'center'
  }
]

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch data using useAsyncData for proper loading states (without await to show loading)
const { data: analysisApiData, pending: isLoading, error: fetchError, refresh } = useAsyncData(`products-analysis-${currentTenant.value?.id || 'default'}`, () => {
  console.log('🔍 Fetching products analysis data for tenant:', currentTenant.value?.id)
  return $fetch('/api/finance/products-analysis', {
    query: { 
      period: period.value,
      category: selectedCategory.value || undefined,
      min_margin: minMargin.value || undefined,
      sort_by: sortBy.value
    }
  })
}, {
  server: false,
  watch: [currentTenant],
  default: () => ({ 
    categories: [],
    metrics: {
      best_margin: { percentage: 0, product_name: 'N/A' },
      active_products: 0,
      low_performance_count: 0,
      total_revenue: 0,
      total_profit: 0
    },
    insights: {
      star_products: { count: 0, revenue_percentage: 0, top_product: 'N/A' },
      optimization_needed: { count: 0, lowest_margin_product: null },
      low_performance: { count: 0, potential_tir_improvement: 0 }
    },
    products: []
  }),
  transform: (response) => {
    console.log('🔍 Transform recibió respuesta:', response)
    if (response?.success && response?.data) {
      console.log('✅ Product analysis data received, products count:', response.data.products?.length)
      return response.data
    }
    console.log('❌ Product analysis response invalid, usando datos por defecto')
    return {
      metrics: {
        best_margin: { percentage: 0, product_name: 'N/A' },
        active_products: 0,
        low_performance_count: 0,
        total_revenue: 0,
        total_profit: 0
      },
      insights: {
        star_products: { count: 0, revenue_percentage: 0, top_product: 'N/A' },
        optimization_needed: { count: 0, lowest_margin_product: null },
        low_performance: { count: 0, potential_tir_improvement: 0 }
      },
      products: []
    }
  }
})

// React to tenant changes
onTenantChange(async () => {
  console.log(`🔄 Tenant changed to: ${currentTenant.value?.name || 'Unknown'}, refreshing product analysis data...`)
  await refresh()
})

// Watch for errors and update error state
watch(fetchError, (newError) => {
  if (newError) {
    error.value = 'Error loading product analysis data'
    console.error('❌ Error fetching product analysis:', newError)
  } else {
    error.value = null
  }
})

// Watch for loading state changes
watch(isLoading, (newLoadingState) => {
  console.log('🔄 Analysis Loading state changed:', newLoadingState)
}, { immediate: true })

// Watch for errors and update error state
watch(fetchError, (newError) => {
  if (newError) {
    error.value = 'Error loading analysis data'
    console.error('❌ Analysis API Error:', newError)
  } else {
    error.value = null
  }
}, { immediate: true })

// Extract data from useAsyncData response
const products = computed(() => analysisApiData.value?.products || [])
const metricsData = computed(() => analysisApiData.value?.metrics || {})
const insightsData = computed(() => analysisApiData.value?.insights || {})
const availableCategories = computed(() => analysisApiData.value?.categories || [])

// Watch for filter changes
watch([selectedCategory, minMargin, period, sortBy], async () => {
  await refresh()
}, { deep: true })

// Computed sorted products for DataTable
const sortedProducts = computed(() => {
  const productsList = products.value || []
  
  // Sort products based on table sorting
  return [...productsList].sort((a, b) => {
    let aValue, bValue

    switch (sortField.value) {
      case 'name':
        aValue = a.name?.toLowerCase() || ''
        bValue = b.name?.toLowerCase() || ''
        return sortDirection.value === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      
      case 'category':
        aValue = a.category?.toLowerCase() || ''
        bValue = b.category?.toLowerCase() || ''
        return sortDirection.value === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      
      case 'margin':
        aValue = parseFloat(a.margin || 0)
        bValue = parseFloat(b.margin || 0)
        break
      
      case 'sales':
        aValue = parseFloat(a.sales || 0)
        bValue = parseFloat(b.sales || 0)
        break
      
      case 'cost':
        aValue = parseFloat(a.cost || 0)
        bValue = parseFloat(b.cost || 0)
        break
      
      case 'profit':
        aValue = parseFloat(a.profit || 0)
        bValue = parseFloat(b.profit || 0)
        break
      
      case 'tirImpact':
        aValue = parseFloat(a.tirImpact || 0)
        bValue = parseFloat(b.tirImpact || 0)
        break
      
      case 'classification':
        aValue = a.classification?.toLowerCase() || ''
        bValue = b.classification?.toLowerCase() || ''
        return sortDirection.value === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      
      default:
        return 0
    }

    // For numeric values
    if (sortDirection.value === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })
})

// Keep filteredProducts for backwards compatibility
const filteredProducts = computed(() => sortedProducts.value)

// Helper functions
function getStatusColor(margin) {
  if (margin >= 70) return 'bg-crocus-500'
  if (margin >= 60) return 'bg-crocus-500'
  if (margin >= 50) return 'bg-titan-500'
  return 'bg-titan-500'
}

function getMarginBadgeClass(margin) {
  if (margin >= 70) return 'bg-crocus-100 text-crocus-700'
  if (margin >= 60) return 'bg-crocus-100 text-crocus-700'
  if (margin >= 50) return 'bg-titan-100 text-ebony-700'
  return 'bg-titan-100 text-ebony-700'
}

function getClassificationBadge(classification) {
  switch (classification) {
    case 'Estrella':
    case 'Star':
      return 'bg-crocus-100 text-crocus-700'
    case 'Potencial':
    case 'Potential':
      return 'bg-crocus-100 text-crocus-700'
    case 'Problemático':
    case 'Problematic':
      return 'bg-titan-100 text-ebony-700'
    case 'Bajo Rendimiento':
    case 'Low Performance':
      return 'bg-titan-100 text-ebony-700'
    default:
      return 'bg-titan-100 text-ebony-700'
  }
}

// Helper function for classification variants
function getClassificationVariant(classification) {
  switch (classification) {
    case 'Estrella':
    case 'Star':
      return 'success'
    case 'Potencial':
    case 'Potential':
      return 'info'
    case 'Problemático':
    case 'Problematic':
      return 'warning'
    case 'Bajo Rendimiento':
    case 'Low Performance':
      return 'destructive'
    default:
      return 'secondary'
  }
}

// Table sorting functions
function sortTable(field) {
  if (sortField.value === field) {
    // Toggle direction if same field
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New field, default to desc for TIR Impact (best first), asc for others
    sortField.value = field
    sortDirection.value = field === 'tirImpact' ? 'desc' : 'asc'
  }
}

function getSortIconComponent(field) {
  if (sortField.value !== field) return ChevronUpDownIcon
  return sortDirection.value === 'asc' ? ChevronUpIcon : ChevronDownIcon
}

// Initialize chart when component mounts (data is handled by useAsyncData)
onMounted(() => {
  if (process.client) {
    // Wait for data to load, then initialize chart
    setTimeout(() => {
      initializeChart()
    }, 1000)
  }
})

async function initializeChart() {
  try {
    const { Chart, registerables } = await import('chart.js')
    Chart.register(...registerables)

    if (productsChart.value) {
      new Chart(productsChart.value, {
        type: 'scatter',
        data: {
          datasets: [{
            label: 'Products by Margin vs Sales',
            data: products.value.map(product => ({
              x: product.sales,
              y: product.margin,
              product: product.name
            })),
            backgroundColor: products.value.map(product => {
              if (product.margin >= 70) return 'rgba(34, 197, 94, 0.7)'
              if (product.margin >= 60) return 'rgba(234, 179, 8, 0.7)'
              if (product.margin >= 50) return 'rgba(249, 115, 22, 0.7)'
              return 'rgba(239, 68, 68, 0.7)'
            }),
            borderColor: products.value.map(product => {
              if (product.margin >= 70) return 'rgb(34, 197, 94)'
              if (product.margin >= 60) return 'rgb(234, 179, 8)'
              if (product.margin >= 50) return 'rgb(249, 115, 22)'
              return 'rgb(239, 68, 68)'
            }),
            pointRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                title: function(context) {
                  return context[0].raw.product
                },
                label: function(context) {
                  return [
                    `Sales: ${context.parsed.x} units/month`,
                    `Margin: ${context.parsed.y}%`
                  ]
                }
              }
            }
          },
          scales: {
            x: {
              title: {
                display: true,
                text: 'Sales per month (units)'
              },
              grid: { color: 'hsl(220, 11%, 90%)' }
            },
            y: {
              title: {
                display: true,
                text: 'Margin (%)'
              },
              grid: { color: 'hsl(220, 11%, 90%)' },
              min: 0,
              max: 100
            }
          }
        }
      })
    }
  } catch (error) {
    console.error('Error initializing chart:', error)
  }
}
</script>

<style scoped>
.animate-page-enter {
  animation: pageEnter 0.5s ease-out;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>