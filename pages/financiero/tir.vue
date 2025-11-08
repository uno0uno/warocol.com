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
      <!-- Metrics Cards using new MetricCard component -->
      <div class="grid grid-cols-4 gap-5 mb-8">
        <!-- TIR Actual -->
        <SharedMetricCard
          variant="primary"
          title="TIR Actual (12 meses)"
          :value="tirApiData.current.tir_actual"
          format="percentage"
          :precision="2"
          subtitle="Anualizado desde inicio"
        />

        <!-- Recuperación Inversión -->
        <SharedMetricCard
          variant="primary"
          title="Investment Recovery"
          :value="tirApiData.current.recovery_months"
          format="decimal"
          :precision="2"
          unit="months"
          subtitle="Estimated time"
        />

        <!-- TIR Proyectada -->
        <SharedMetricCard
          variant="secondary"
          title="TIR Proyectada (12 meses)"
          :value="tirApiData.current.tir_projected"
          format="percentage"
          :precision="2"
          subtitle="Proyección futura"
        />

        <!-- Recuperación Proyectada -->
        <SharedMetricCard
          variant="secondary"
          title="Projected Recovery"
          :value="(tirApiData.current.recovery_months * 0.92)"
          format="decimal"
          :precision="2"
          unit="months"
          subtitle="With current projection"
        />
      </div><!-- End Metrics Cards Grid -->



    <!-- Unified TIR Table using DataTable component -->
    <UiDataTable
      title="Análisis TIR - Actual vs Proyectada"
      :columns="tirTableColumns"
      :data="sortedActualData"
      :sort-field="sortField"
      :sort-direction="sortDirection"
      :show-footer="!!tirApiData.tables.totals"
      :totals-data="totalsData"
      variant="default"
      @sort="sortTable"
    >
      <!-- Custom slots for TIR values with StatusBadge -->
      <template #cell-tir_actual="{ value, row }">
        <UiStatusBadge
          :value="value || row.tir"
          format="percentage"
          :auto-color="true"
          size="sm"
        />
      </template>
      
      <template #cell-tir_projected="{ value, row }">
        <UiStatusBadge
          :value="value || getProjectedData(row.month)?.tir || 0"
          format="percentage"
          :auto-color="true"
          size="sm"
        />
      </template>
      
      <!-- Custom totals with StatusBadge -->
      <template #total-tir_actual="{ value }">
        <UiStatusBadge
          :value="value"
          format="percentage"
          :auto-color="true"
          size="sm"
          :precision="2"
        />
      </template>
      
      <template #total-tir_projected="{ value }">
        <UiStatusBadge
          :value="value"
          format="percentage"
          :auto-color="true"
          size="sm"
          :precision="2"
        />
      </template>
    </UiDataTable>

    
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

// Fetch data using useAsyncData for proper loading states (NO await to show loading)
const { data: tirApiData, pending: isLoading, error: fetchError, refresh } = useAsyncData(`tir-metrics-${currentTenant.value?.id || 'default'}`, () => {
  console.log('🔍 Fetching TIR data for tenant:', currentTenant.value?.id)
  return $fetch('/api/finance/tir-metrics', {
    query: { limit: 12 }
  })
}, {
  server: false,
  watch: [currentTenant],
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

// Tenant change is handled by useAsyncData watch: [currentTenant]

// Table columns definition for DataTable
const tirTableColumns = [
  {
    key: 'month',
    title: 'Month',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'investment',
    title: 'Initial Investment',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'monthlyRevenue',
    title: 'Current Revenue',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'projected_revenue',
    title: 'Projected Revenue',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'costs',
    title: 'Operational Costs',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'monthly_product_costs',
    title: 'Product Costs',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'products_sold_count',
    title: 'Units Sold',
    sortable: true,
    format: 'number',
    align: 'right'
  },
  {
    key: 'projected_costs',
    title: 'Projected Costs',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'profit',
    title: 'Current Profit',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'projected_return',
    title: 'Projected Profit',
    sortable: true,
    format: 'currency',
    align: 'right'
  },
  {
    key: 'tir_actual',
    title: 'TIR Actual',
    sortable: true,
    format: 'percentage',
    align: 'center'
  },
  {
    key: 'tir_projected',
    title: 'TIR Proyectada',
    sortable: true,
    format: 'percentage',
    align: 'center'
  }
]

// Totals data for footer
const totalsData = computed(() => {
  if (!tirApiData.value.tables.totals) return null
  
  return {
    month: 'Total',
    investment: tirApiData.value.tables.totals.actual.total_investment,
    monthlyRevenue: tirApiData.value.tables.totals.actual.total_revenue,
    projected_revenue: tirApiData.value.tables.totals.projected.total_revenue,
    costs: tirApiData.value.tables.totals.actual.total_costs,
    monthly_product_costs: tirApiData.value.tables.totals.actual.total_product_costs,
    products_sold_count: tirApiData.value.tables.totals.actual.total_products_sold,
    projected_costs: tirApiData.value.tables.totals.projected.total_costs,
    profit: tirApiData.value.tables.totals.actual.total_profit || tirApiData.value.tables.totals.actual.total_return,
    projected_return: tirApiData.value.tables.totals.projected.total_profit || tirApiData.value.tables.totals.projected.total_return,
    tir_actual: tirApiData.value.tables.totals.actual.tir_average,
    tir_projected: tirApiData.value.tables.totals.projected.tir_average
  }
})

// Enhanced data with proper field mapping
const enhancedData = computed(() => {
  return tirApiData.value.tables.actual.map(month => ({
    ...month,
    profit: month.profit || month.return || 0,
    tir_actual: month.tir,
    tir_projected: getProjectedData(month.month)?.tir || 0,
    projected_revenue: getProjectedData(month.month)?.monthlyRevenue || 0,
    projected_costs: getProjectedData(month.month)?.costs || 0,
    projected_return: getProjectedData(month.month)?.profit || getProjectedData(month.month)?.return || 0
  }))
})

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
  if (!sortField.value) return enhancedData.value

  return [...enhancedData.value].sort((a, b) => {
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