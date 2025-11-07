<template>
  <div class="bg-titan-50 min-h-full animate-page-enter">
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
    <div v-else>
      <!-- Products Analysis Metrics -->
      <div class="grid grid-cols-3 gap-5 mb-8">
        <!-- Mejor Margen -->
        <div class="bg-white border border-titan-300 rounded-xl px-8 py-4 shadow-sm">
          <div class="mb-2">
            <div class="text-base text-ebony-400 font-medium tracking-wide">Best Margin</div>
          </div>
          <div class="flex items-end justify-between mb-2">
            <div class="text-4xl font-bold text-ebony-800">{{ (parseFloat(metricsData.best_margin?.percentage) || 0).toFixed(1) }}%</div>
          </div>
          <div class="text-xs text-ebony-400 mb-2">{{ metricsData.best_margin?.product_name || 'N/A' }}</div>
        </div>

        <!-- Productos Activos -->
        <div class="bg-white border border-titan-300 rounded-xl px-8 py-4 shadow-sm">
          <div class="mb-2">
            <div class="text-base text-ebony-400 font-medium tracking-wide">Active Products</div>
          </div>
          <div class="flex items-end justify-between mb-2">
            <div class="text-4xl font-bold text-ebony-800">{{ metricsData.active_products || 0 }}</div>
          </div>
          <div class="text-xs text-ebony-400 mb-2">Total products: {{ filteredProducts.length }}</div>
        </div>

        <!-- Low Performance -->
        <div class="bg-white border border-titan-300 rounded-xl px-8 py-4 shadow-sm">
          <div class="mb-2">
            <div class="text-base text-ebony-400 font-medium tracking-wide">Low Performance</div>
          </div>
          <div class="flex items-end justify-between mb-2">
            <div class="text-4xl font-bold text-ebony-800">{{ metricsData.low_performance_count || 0 }}</div>
          </div>
          <div class="text-xs text-ebony-400 mb-2">Products need optimization</div>
        </div>
      </div>


    <!-- Filter Controls -->
    <div class="bg-white rounded-xl p-6 border border-titan-300 shadow-sm mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-ebony-800">Analysis Filters</h2>
        <button class="px-3 py-1 bg-crocus-500 text-white text-xs rounded-lg">Export Analysis</button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-ebony-600 mb-1">Category</label>
          <select v-model="selectedCategory" class="w-full p-2 border border-titan-300 rounded-lg text-sm text-ebony-800 bg-white">
            <option value="">All categories</option>
            <option v-for="category in availableCategories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-ebony-600 mb-1">Minimum Margin</label>
          <select v-model="minMargin" class="w-full p-2 border border-titan-300 rounded-lg text-sm text-ebony-800 bg-white">
            <option value="">No filter</option>
            <option value="50">50%+</option>
            <option value="60">60%+</option>
            <option value="70">70%+</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-ebony-600 mb-1">Period</label>
          <select v-model="period" class="w-full p-2 border border-titan-300 rounded-lg text-sm text-ebony-800 bg-white">
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="180">Last 6 months</option>
            <option value="365">Full year (Current)</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-ebony-600 mb-1">Sort by</label>
          <select v-model="sortBy" class="w-full p-2 border border-titan-300 rounded-lg text-sm text-ebony-800 bg-white">
            <option value="margin">Margin %</option>
            <option value="sales">Sales</option>
            <option value="profit">Profit</option>
            <option value="impact">TIR Impact</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Products Analysis Table -->
    <div class="bg-white rounded-xl p-6 border border-titan-300 shadow-sm mb-8">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-ebony-800">Detailed Product Analysis</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-titan-200">
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('name')"
                  class="text-sm text-ebony-400 font-medium hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  Product 
                  <component :is="getSortIconComponent('name')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('category')"
                  class="text-sm text-ebony-400 font-medium hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  Category 
                  <component :is="getSortIconComponent('category')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('margin')"
                  class="text-sm text-ebony-400 font-medium hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  Margin % 
                  <component :is="getSortIconComponent('margin')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('sales')"
                  class="text-sm text-ebony-400 font-medium hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  Sales/Month 
                  <component :is="getSortIconComponent('sales')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('cost')"
                  class="text-sm text-ebony-400 font-medium hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  Total Cost 
                  <component :is="getSortIconComponent('cost')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('profit')"
                  class="text-sm text-ebony-400 font-medium hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  Profit 
                  <component :is="getSortIconComponent('profit')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('tirImpact')"
                  class="text-sm text-ebony-400 font-bold hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  TIR Impact 
                  <component :is="getSortIconComponent('tirImpact')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('classification')"
                  class="text-sm text-ebony-400 font-medium hover:text-ebony-600 flex items-center gap-1 transition-colors"
                >
                  Classification 
                  <component :is="getSortIconComponent('classification')" class="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(product, index) in filteredProducts" :key="index" class="border-b border-titan-100 hover:bg-titan-25 transition-colors">
              <td class="py-4 px-2">
                <span class="font-semibold text-sm text-ebony-800">{{ product.name }}</span>
              </td>
              <td class="py-4 px-2 text-sm text-ebony-600">{{ product.category }}</td>
              <td class="py-4 px-2">
                <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getMarginBadgeClass(product.margin)">
                  {{ product.margin }}%
                </span>
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ product.sales }} units</td>
              <td class="py-4 px-2 text-sm text-ebony-800">${{ product.cost.toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm font-semibold" :class="product.profit >= 0 ? 'text-crocus-600' : 'text-ebony-600'">
                ${{ product.profit.toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm font-semibold" :class="product.tirImpact >= 0 ? 'text-crocus-600' : 'text-ebony-600'">
                {{ product.tirImpact > 0 ? '+' : '' }}{{ product.tirImpact }}%
              </td>
              <td class="py-4 px-2">
                <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getClassificationBadge(product.classification)">
                  {{ product.classification }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Insights and Recommendations -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <div class="bg-crocus-50/30 rounded-xl p-6 border border-titan-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-crocus-50 rounded-lg flex items-center justify-center">
            <StarIcon class="w-5 h-5 text-crocus-600" />
          </div>
          <h3 class="font-bold text-ebony-800">Star Products</h3>
        </div>
        <p class="text-sm text-ebony-600 mb-4">
          <strong>{{ insightsData.star_products?.count || 0 }} products</strong> generate {{ insightsData.star_products?.revenue_percentage || 0 }}% of total profit. 
          <span v-if="insightsData.star_products?.top_product !== 'N/A'">{{ insightsData.star_products?.top_product }} leads.</span>
        </p>
        <div class="text-xs text-ebony-600">
          <strong>Recommendation:</strong> Promote these products and increase their visibility in the menu.
        </div>
      </div>

      <div class="bg-yellow-50/30 rounded-xl p-6 border border-titan-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
            <ExclamationTriangleIcon class="w-5 h-5 text-yellow-600" />
          </div>
          <h3 class="font-bold text-ebony-800">Need Optimization</h3>
        </div>
        <p class="text-sm text-ebony-600 mb-4">
          <strong>{{ insightsData.optimization_needed?.count || 0 }} products</strong> have margin <60%. 
          <span v-if="insightsData.optimization_needed?.lowest_margin_product">
            {{ insightsData.optimization_needed.lowest_margin_product.name }} only generates {{ (parseFloat(insightsData.optimization_needed.lowest_margin_product.estimated_margin) || 0).toFixed(1) }}% margin.
          </span>
        </p>
        <div class="text-xs text-ebony-600">
          <strong>Solution:</strong> Reformulate ingredients or adjust prices to reach 60% minimum.
        </div>
      </div>

      <div class="bg-red-50/30 rounded-xl p-6 border border-titan-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
            <ChartBarIcon class="w-5 h-5 text-red-600" />
          </div>
          <h3 class="font-bold text-ebony-800">Low Performance</h3>
        </div>
        <p class="text-sm text-ebony-600 mb-4">
          <strong>{{ insightsData.low_performance?.count || 0 }} products</strong> have negative impact on TIR. Consider removing them from the menu.
        </p>
        <div class="text-xs text-ebony-600">
          <strong>Impact:</strong> Removing them could improve TIR by +{{ (parseFloat(insightsData.low_performance?.potential_tir_improvement) || 0).toFixed(1) }}%.
        </div>
      </div>
    </div>

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
const tableSortField = ref('tirImpact') // Default to TIR Impact
const tableSortDirection = ref('desc') // Best TIR first

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch data using useAsyncData for proper loading states (without await to show loading)
const { data: analysisApiData, pending: isLoading, error: fetchError, refresh } = useAsyncData('products-analysis', () => $fetch('/api/finance/products-analysis', {
  query: { 
    period: period.value,
    category: selectedCategory.value || undefined,
    min_margin: minMargin.value || undefined,
    sort_by: sortBy.value
  }
}), {
  server: false,
  client: true,
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

// Extract data from useAsyncData response
const products = computed(() => analysisApiData.value?.products || [])
const metricsData = computed(() => analysisApiData.value?.metrics || {})
const insightsData = computed(() => analysisApiData.value?.insights || {})
const availableCategories = computed(() => analysisApiData.value?.categories || [])

// Watch for filter changes
watch([selectedCategory, minMargin, period, sortBy], async () => {
  await refresh()
}, { deep: true })

// Computed filtered and sorted products
const filteredProducts = computed(() => {
  const productsList = products.value || []
  
  // Sort products based on table sorting
  return [...productsList].sort((a, b) => {
    let aValue, bValue

    switch (tableSortField.value) {
      case 'name':
        aValue = a.name?.toLowerCase() || ''
        bValue = b.name?.toLowerCase() || ''
        return tableSortDirection.value === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      
      case 'category':
        aValue = a.category?.toLowerCase() || ''
        bValue = b.category?.toLowerCase() || ''
        return tableSortDirection.value === 'asc' 
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
        return tableSortDirection.value === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      
      default:
        return 0
    }

    // For numeric values
    if (tableSortDirection.value === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })
})

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

// Table sorting functions
function sortTable(field) {
  if (tableSortField.value === field) {
    // Toggle direction if same field
    tableSortDirection.value = tableSortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New field, default to desc for TIR Impact (best first), asc for others
    tableSortField.value = field
    tableSortDirection.value = field === 'tirImpact' ? 'desc' : 'asc'
  }
}

function getSortIconComponent(field) {
  if (tableSortField.value !== field) return ChevronUpDownIcon
  return tableSortDirection.value === 'asc' ? ChevronUpIcon : ChevronDownIcon
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