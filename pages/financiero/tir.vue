<template>
  <div class="bg-titan-50 min-h-full">
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
      <!-- Metrics Cards -->
      <div class="grid grid-cols-4 gap-5 mb-8">
        <!-- TIR Actual -->
        <div class="bg-white border border-crocus-500 rounded-xl px-8 py-4 shadow-sm">
        <div class="mb-2">
          <div class="text-base text-ebony-800 font-medium tracking-wide">TIR Actual (12 meses)</div>
        </div>
        <div class="flex items-end justify-between mb-2">
          <div class="text-4xl font-bold text-crocus-600">{{ tirApiData.current.tir_actual.toFixed(2) }}%</div>
        </div>
        <div class="text-xs text-ebony-600 mb-2">Anualizado desde inicio</div>
        </div>

        <!-- Recuperación Inversión -->
        <div class="bg-white border border-crocus-500 rounded-xl px-8 py-4 shadow-sm">
        <div class="mb-2">
          <div class="text-base text-ebony-800 font-medium tracking-wide">Investment Recovery</div>
        </div>
        <div class="flex items-end justify-between mb-0">
          <div class="text-4xl font-bold text-crocus-600">{{ tirApiData.current.recovery_months.toFixed(2) }}</div>
        </div>
        <div class="text-base text-ebony-600 -mt-2 mb-2">months</div>
        <div class="text-xs text-ebony-600 mb-2">Estimated time</div>
        </div>

        <!-- TIR Proyectada -->
        <div class="bg-white border border-titan-500 rounded-xl px-8 py-4 shadow-sm">
        <div class="mb-2">
          <div class="text-base text-ebony-800 font-medium tracking-wide">TIR Proyectada (12 meses)</div>
        </div>
        <div class="flex items-end justify-between mb-2">
          <div class="text-4xl font-bold text-ebony-800">{{ tirApiData.current.tir_projected.toFixed(2) }}%</div>
        </div>
        <div class="text-xs text-ebony-600 mb-2">Proyección futura</div>
        </div>

        <!-- Recuperación Proyectada -->
        <div class="bg-white border border-titan-500 rounded-xl px-8 py-4 shadow-sm">
        <div class="mb-2">
          <div class="text-base text-ebony-800 font-medium tracking-wide">Projected Recovery</div>
        </div>
        <div class="flex items-end justify-between mb-0">
          <div class="text-4xl font-bold text-ebony-800">{{ (tirApiData.current.recovery_months * 0.92).toFixed(2) }}</div>
        </div>
        <div class="text-base text-ebony-600 -mt-2 mb-2">months</div>
        <div class="text-xs text-ebony-600 mb-2">With current projection</div>
        </div>
      </div><!-- End Metrics Cards Grid -->



    <!-- Unified TIR Table -->
    <div class="bg-white border border-titan-300 rounded-xl p-6 shadow-sm">
      <h3 class="text-lg font-bold text-ebony-800 mb-4">Análisis TIR - Actual vs Proyectada</h3>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="bg-titan-100 border-b border-titan-200">
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('month')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Month 
                  <component :is="getSortIconComponent('month')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('investment')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Initial Investment 
                  <component :is="getSortIconComponent('investment')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('monthly_revenue')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Current Revenue 
                  <component :is="getSortIconComponent('monthly_revenue')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('projected_revenue')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Projected Revenue 
                  <component :is="getSortIconComponent('projected_revenue')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('costs')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Operational Costs 
                  <component :is="getSortIconComponent('costs')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('product_costs')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Product Costs 
                  <component :is="getSortIconComponent('product_costs')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('products_sold')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Units Sold 
                  <component :is="getSortIconComponent('products_sold')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('projected_costs')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Projected Costs 
                  <component :is="getSortIconComponent('projected_costs')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('return')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Current Profit 
                  <component :is="getSortIconComponent('return')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('projected_return')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  Projected Profit 
                  <component :is="getSortIconComponent('projected_return')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('tir_actual')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  TIR Actual 
                  <component :is="getSortIconComponent('tir_actual')" class="w-3 h-3" />
                </button>
              </th>
              <th class="text-left py-3 px-2">
                <button 
                  @click="sortTable('tir_projected')"
                  class="text-sm text-ebony-800 font-bold flex items-center gap-1"
                >
                  TIR Proyectada 
                  <component :is="getSortIconComponent('tir_projected')" class="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="month in sortedActualData" :key="month.month" class="border-b border-titan-100 hover:bg-gray-200 transition-colors duration-200">
              <td class="py-4 px-2 text-sm text-ebony-800 font-medium">{{ month.month }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (month.investment || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (month.monthlyRevenue || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-600">{{ (getProjectedData(month.month)?.monthlyRevenue || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (month.costs || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (month.monthly_product_costs || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (month.products_sold_count || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (getProjectedData(month.month)?.costs || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (month.profit || month.return || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm text-ebony-800">{{ (getProjectedData(month.month)?.profit || getProjectedData(month.month)?.return || 0).toLocaleString() }}</td>
              <td class="py-4 px-2 text-sm font-semibold" :class="month.tir >= 0 ? 'text-green-600' : 'text-red-600'">{{ month.tir }}%</td>
              <td class="py-4 px-2 text-sm font-semibold" :class="(getProjectedData(month.month)?.tir || 0) >= 0 ? 'text-green-600' : 'text-red-600'">{{ getProjectedData(month.month)?.tir || 0 }}%</td>
            </tr>
            
            <!-- Fila de totales -->
            <tr v-if="tirApiData.tables.totals" class="bg-titan-100 border-t-2 border-titan-300 font-semibold">
              <td class="py-4 px-2 text-sm text-ebony-800 font-medium">
                <span class="font-bold">total</span>
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.actual.total_investment || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.actual.total_revenue || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-600">
                {{ (tirApiData.tables.totals?.projected.total_revenue || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.actual.total_costs || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.actual.total_product_costs || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.actual.total_products_sold || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.projected.total_costs || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.actual.total_profit || tirApiData.tables.totals?.actual.total_return || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm text-ebony-800">
                {{ (tirApiData.tables.totals?.projected.total_profit || tirApiData.tables.totals?.projected.total_return || 0).toLocaleString() }}
              </td>
              <td class="py-4 px-2 text-sm font-semibold" :class="(tirApiData.tables.totals?.actual.tir_average || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ tirApiData.tables.totals?.actual.tir_average?.toFixed(2) || '0.00' }}%
              </td>
              <td class="py-4 px-2 text-sm font-semibold" :class="(tirApiData.tables.totals?.projected.tir_average || 0) >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ tirApiData.tables.totals?.projected.tir_average?.toFixed(2) || '0.00' }}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    
    </div><!-- End Main Content -->
  </div>
</template>

<script setup>
import { 
  StarIcon,
  ArrowPathIcon,
  CogIcon,
  ChartBarIcon,
  FireIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
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
  title: 'TIR - Análisis Financiero',
  meta: [
    { name: 'description', content: 'Dashboard de Análisis TIR - Tasa Interna de Retorno para Warocol' }
  ]
})


// State
const error = ref(null)

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Data will be accessed directly from tirApiData

// Sorting state - Default: chronological order by month
const sortField = ref('month')
const sortDirection = ref('asc') // 'asc' | 'desc'

// Fetch data using useAsyncData for proper loading states (without await to show loading)
const { data: tirApiData, pending: isLoading, error: fetchError, refresh } = useAsyncData(`tir-metrics-${currentTenant.value?.id || 'default'}`, () => {
  console.log('🔍 Fetching TIR data for tenant:', currentTenant.value?.id)
  return $fetch('/api/finance/tir-metrics', {
    query: { limit: 12 }
  })
}, {
  server: false,
  client: true,
  lazy: true,
  dedupe: 'defer',
  default: () => ({ 
    current: {
      tir_actual: 0,
      tir_projected: 0,
      tir_target: 0,
      recovery_months: 0,
      total_revenue: 0,
      gross_profit: 0
    },
    tables: {
      actual: [],
      projected: [],
      totals: null
    }
  }),
  transform: (response) => {
    if (response?.success && response.data) {
      
      // Return transformed data structure
      return {
        current: response.data.current || {
          tir_actual: 0,
          tir_projected: 0,
          tir_target: 0,
          recovery_months: 0,
          total_revenue: 0,
          gross_profit: 0
        },
        tables: {
          actual: response.data.tables?.actual || [],
          projected: response.data.tables?.projected || [],
          totals: response.data.tables?.totals || null
        }
      }
    }
    
    // Return default structure if no success
    return {
      current: {
        tir_actual: 0,
        tir_projected: 0,
        tir_target: 0,
        recovery_months: 0,
        total_revenue: 0,
        gross_profit: 0
      },
      tables: {
        actual: [],
        projected: [],
        totals: null
      }
    }
  }
})

// Watch for errors and update error state
watch(fetchError, (newError) => {
  if (newError) {
    error.value = 'Error loading financial data'
  } else {
    error.value = null
  }
})

// Tenant change is already handled by useAsyncData key reactivity
// No need for manual refresh as the key includes currentTenant.value?.id


// Function to refresh data
async function fetchTirData(limit = 12) {
  await refresh()
}

// Sorting functions
function sortTable(field) {
  if (sortField.value === field) {
    // Toggle direction if same field
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New field, default to ascending
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

function getSortIconComponent(field) {
  if (sortField.value !== field) return ChevronUpDownIcon
  return sortDirection.value === 'asc' ? ChevronUpIcon : ChevronDownIcon
}

function getProjectedData(monthName) {
  return tirApiData.value.tables.projected.find(p => p.month === monthName)
}

// Computed sorted data
const sortedActualData = computed(() => {
  if (!sortField.value) return tirApiData.value.tables.actual

  return [...tirApiData.value.tables.actual].sort((a, b) => {
    let aValue, bValue

    switch (sortField.value) {
      case 'month':
        // Convert month names to dates for chronological sorting
        const monthMap = {
          'january': 1, 'february': 2, 'march': 3, 'april': 4, 'may': 5, 'june': 6,
          'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
          'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
        }
        aValue = monthMap[a.month.toLowerCase()] || 0
        bValue = monthMap[b.month.toLowerCase()] || 0
        break
      case 'tir_actual':
        aValue = parseFloat(a.tir || 0)
        bValue = parseFloat(b.tir || 0)
        break
      case 'tir_projected':
        const projectedA = tirApiData.value.tables.projected.find(p => p.month === a.month)
        const projectedB = tirApiData.value.tables.projected.find(p => p.month === b.month)
        aValue = parseFloat(projectedA?.tir || 0)
        bValue = parseFloat(projectedB?.tir || 0)
        break
      case 'investment':
        aValue = parseFloat(a.investment || 0)
        bValue = parseFloat(b.investment || 0)
        break
      case 'monthly_revenue':
        aValue = parseFloat(a.monthlyRevenue || 0)
        bValue = parseFloat(b.monthlyRevenue || 0)
        break
      case 'projected_revenue':
        const projRevA = tirApiData.value.tables.projected.find(p => p.month === a.month)
        const projRevB = tirApiData.value.tables.projected.find(p => p.month === b.month)
        aValue = parseFloat(projRevA?.monthlyRevenue || 0)
        bValue = parseFloat(projRevB?.monthlyRevenue || 0)
        break
      case 'costs':
        aValue = parseFloat(a.costs || 0)
        bValue = parseFloat(b.costs || 0)
        break
      case 'projected_costs':
        const projCostA = tirApiData.value.tables.projected.find(p => p.month === a.month)
        const projCostB = tirApiData.value.tables.projected.find(p => p.month === b.month)
        aValue = parseFloat(projCostA?.costs || 0)
        bValue = parseFloat(projCostB?.costs || 0)
        break
      case 'return':
        aValue = parseFloat(a.profit || a.return || 0)
        bValue = parseFloat(b.profit || b.return || 0)
        break
      case 'projected_return':
        const projRetA = tirApiData.value.tables.projected.find(p => p.month === a.month)
        const projRetB = tirApiData.value.tables.projected.find(p => p.month === b.month)
        aValue = parseFloat(projRetA?.profit || projRetA?.return || 0)
        bValue = parseFloat(projRetB?.profit || projRetB?.return || 0)
        break
      default:
        return 0
    }

    if (sortDirection.value === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })
})

</script>

<style scoped>
.w-15 {
  width: 3.75rem;
  height: 3.75rem;
}
</style>