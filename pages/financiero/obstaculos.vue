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
        <div class="text-sm text-ebony-600">{{ error.message || 'Failed to load obstacles analysis' }}</div>
        <button @click="$router.go(0)" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Retry
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="obstaclesData" class="flex flex-col gap-4">

      <!-- Obstacles Analysis Table using DataTable -->
      <UiDataTable
        title="Detailed Obstacles Analysis"
        :columns="obstaclesTableColumns"
        :data="obstaclesTableData"
        variant="default"
      >
        <!-- Custom slots for badges -->
        <template #cell-obstacle="{ value }">
          <span class="font-semibold text-sm">{{ value }}</span>
        </template>
        
        <template #cell-current_value="{ value }">
          <span class="text-text-primary font-medium">{{ value }}</span>
        </template>
        
        <template #cell-deviation="{ value, row }">
          <UiStatusBadge
            :value="value"
            format="text"
            :variant="getDeviationVariant(row.obstacle)"
            size="sm"
          />
        </template>
        
        <template #cell-business_impact="{ value }">
          <span class="text-text-primary font-medium">{{ value }}</span>
        </template>
        
        <template #cell-priority="{ value }">
          <UiStatusBadge
            :value="value"
            format="text"
            :variant="getPriorityVariant(value)"
            size="sm"
          />
        </template>
      </UiDataTable>

      <!-- Knowledge Resources -->
      <div v-if="recommendedResources.length > 0" class="bg-white rounded-xl p-6 border border-titan-300 shadow-sm mb-8">
      <h2 class="text-xl font-semibold text-ebony-800 mb-6">📚 Recommended Learning Resources</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div 
          v-for="resource in recommendedResources" 
          :key="resource.id"
          class="bg-white rounded-lg border border-titan-300 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        >
          <div class="h-32 flex items-center justify-center" :class="resource.bgColor">
            <div class="text-4xl text-white">{{ resource.icon }}</div>
          </div>
          <div class="p-4">
            <h3 class="font-bold text-ebony-800 text-sm mb-2">{{ resource.title }}</h3>
            <p class="text-xs text-ebony-600 mb-3">{{ resource.description }}</p>
            <div class="flex items-center justify-between">
              <span class="text-xs px-2 py-1 rounded-full" :class="resource.categoryClass">{{ resource.category }}</span>
              <span class="text-xs text-ebony-400">{{ resource.readTime }}</span>
            </div>
          </div>
        </div>

        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

// Layout configuration
definePageMeta({
  layout: 'dashboard'
})

// Meta tags
useHead({
  title: 'Business Obstacles Analysis - Financial',
  meta: [
    { name: 'description', content: 'Analyze operational obstacles that impact business performance' }
  ]
})

// Filter states
const selectedPeriod = ref('30')

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch data using useAsyncData for proper loading states
const { data: obstaclesApiData, pending: isLoading, error, refresh } = useAsyncData(`obstacles-analysis-${currentTenant.value?.id || 'default'}`, () => {
  console.log('🔍 Fetching obstacles analysis data for tenant:', currentTenant.value?.id)
  return $fetch('/api/finance/obstacles-analysis', {
    query: { 
      period: selectedPeriod.value
    }
  })
}, {
  server: false,
  watch: [currentTenant],
  default: () => ({ 
    data: {
      metrics: {},
      obstacles_summary: { health_score: 0, total_obstacles: 0 },
      insights: { critical_obstacles: [], warning_obstacles: [], recommendations: [] }
    }
  })
})

// Watch for errors
watch(error, (newError) => {
  if (newError) {
    console.error('Error loading obstacles data:', newError)
  }
}, { immediate: true })

// React to tenant changes
onTenantChange(async () => {
  console.log(`🔄 Tenant changed to: ${currentTenant.value?.name || 'Unknown'}, refreshing obstacles analysis data...`)
  await refresh()
})

// Computed properties
const obstaclesData = computed(() => obstaclesApiData.value?.data || null)
const metricsData = computed(() => obstaclesData.value?.metrics || {})

// DataTable configuration
const obstaclesTableColumns = [
  {
    key: 'obstacle',
    title: 'Obstacle',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'target',
    title: 'Target',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'current_value',
    title: 'Current Value',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'deviation',
    title: 'Deviation',
    sortable: true,
    format: 'text',
    align: 'center'
  },
  {
    key: 'business_impact',
    title: 'Business Impact',
    sortable: true,
    format: 'text',
    align: 'left'
  },
  {
    key: 'priority',
    title: 'Priority',
    sortable: true,
    format: 'text',
    align: 'center'
  }
]

// DataTable data
const obstaclesTableData = computed(() => {
  const obstacles = []
  
  // Payment Processing Issues
  const paymentRate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  obstacles.push({
    obstacle: 'Payment Processing',
    target: '≥95%',
    current_value: `${paymentRate.toFixed(1)}%`,
    deviation: getPaymentDeviation(),
    business_impact: 'Lost sales due to failed transactions',
    priority: getPaymentPriority()
  })
  
  // Inventory Management
  const inventoryRate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  obstacles.push({
    obstacle: 'Inventory Stock Levels',
    target: '≥90%',
    current_value: `${inventoryRate.toFixed(1)}%`,
    deviation: getInventoryDeviation(),
    business_impact: 'Stockouts affecting customer satisfaction',
    priority: getInventoryPriority()
  })
  
  // Order Success Rate
  const orderRate = parseFloat(metricsData.value.order_success_rate || 0)
  obstacles.push({
    obstacle: 'Order Fulfillment',
    target: '≥95%',
    current_value: `${orderRate.toFixed(1)}%`,
    deviation: getOrderDeviation(),
    business_impact: 'Customer cancellations and refunds',
    priority: getOrderPriority()
  })
  
  // Operational Efficiency
  const stuckOrders = parseInt(metricsData.value.stuck_orders_count || 0)
  obstacles.push({
    obstacle: 'Process Efficiency',
    target: '0 stuck orders',
    current_value: `${stuckOrders} orders`,
    deviation: getEfficiencyDeviation(),
    business_impact: 'Delayed deliveries and resource waste',
    priority: getEfficiencyPriority()
  })
  
  return obstacles
})

// Dynamic resource recommendations based on actual obstacles detected
const recommendedResources = computed(() => {
  const resources = []
  
  // Payment Processing Issues
  const paymentRate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  if (paymentRate < 95) {
    const priority = getPaymentPriority()
    
    if (priority === 'CRITICAL') {
      resources.push({
        id: 'payment-gateway-setup',
        title: 'Payment Gateway Recovery',
        description: 'Emergency fixes for critical payment failures and gateway configuration.',
        icon: '🚨',
        bgColor: 'bg-gradient-to-br from-red-400 to-red-600',
        category: 'Critical',
        categoryClass: 'bg-red-50 text-red-700',
        readTime: '3 min read'
      })
    }
    
    resources.push({
      id: 'payment-optimization',
      title: 'Payment Processing Optimization',
      description: 'Advanced strategies to reduce transaction failures and improve success rates.',
      icon: '💳',
      bgColor: 'bg-gradient-to-br from-crocus-400 to-crocus-600',
      category: 'Payments',
      categoryClass: 'bg-crocus-50 text-crocus-700',
      readTime: '4 min read'
    })
    
    resources.push({
      id: 'payment-fraud-prevention',
      title: 'Fraud Prevention Systems',
      description: 'Implement security measures to reduce false declines and improve approval rates.',
      icon: '🛡️',
      bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      category: 'Security',
      categoryClass: 'bg-blue-50 text-blue-700',
      readTime: '6 min read'
    })
  }
  
  // Inventory Management Issues
  const inventoryRate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  if (inventoryRate < 90) {
    const priority = getInventoryPriority()
    
    if (priority === 'CRITICAL') {
      resources.push({
        id: 'emergency-restocking',
        title: 'Emergency Restocking Strategy',
        description: 'Rapid inventory replenishment techniques for critical stock shortages.',
        icon: '📈',
        bgColor: 'bg-gradient-to-br from-orange-400 to-orange-600',
        category: 'Urgent',
        categoryClass: 'bg-orange-50 text-orange-700',
        readTime: '3 min read'
      })
    }
    
    resources.push({
      id: 'inventory-forecasting',
      title: 'Demand Forecasting',
      description: 'Predict inventory needs using historical data and seasonal patterns.',
      icon: '📊',
      bgColor: 'bg-gradient-to-br from-green-400 to-green-600',
      category: 'Analytics',
      categoryClass: 'bg-green-50 text-green-700',
      readTime: '8 min read'
    })
    
    resources.push({
      id: 'supplier-management',
      title: 'Supplier Relationship Management',
      description: 'Build reliable supplier networks and negotiate better terms for inventory.',
      icon: '🤝',
      bgColor: 'bg-gradient-to-br from-purple-400 to-purple-600',
      category: 'Partnerships',
      categoryClass: 'bg-purple-50 text-purple-700',
      readTime: '7 min read'
    })
    
    resources.push({
      id: 'abc-analysis',
      title: 'ABC Inventory Analysis',
      description: 'Classify inventory by importance and optimize stocking strategies.',
      icon: '📦',
      bgColor: 'bg-gradient-to-br from-crocus-300 to-crocus-500',
      category: 'Inventory',
      categoryClass: 'bg-titan-100 text-ebony-700',
      readTime: '5 min read'
    })
  }
  
  // Order Fulfillment Issues
  const orderRate = parseFloat(metricsData.value.order_success_rate || 0)
  if (orderRate < 95) {
    const priority = getOrderPriority()
    
    if (priority === 'CRITICAL') {
      resources.push({
        id: 'order-recovery',
        title: 'Order Recovery Protocols',
        description: 'Immediate actions to reduce cancellations and save failing orders.',
        icon: '🔄',
        bgColor: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
        category: 'Recovery',
        categoryClass: 'bg-yellow-50 text-yellow-700',
        readTime: '4 min read'
      })
    }
    
    resources.push({
      id: 'order-automation',
      title: 'Order Processing Automation',
      description: 'Automate order workflows to reduce errors and processing time.',
      icon: '🤖',
      bgColor: 'bg-gradient-to-br from-indigo-400 to-indigo-600',
      category: 'Automation',
      categoryClass: 'bg-indigo-50 text-indigo-700',
      readTime: '6 min read'
    })
    
    resources.push({
      id: 'customer-communication',
      title: 'Customer Communication',
      description: 'Proactive order updates and communication to prevent cancellations.',
      icon: '📞',
      bgColor: 'bg-gradient-to-br from-ebony-400 to-ebony-600',
      category: 'Service',
      categoryClass: 'bg-titan-100 text-ebony-700',
      readTime: '5 min read'
    })
  }
  
  // Operational Efficiency Issues
  const stuckOrders = parseInt(metricsData.value.stuck_orders_count || 0)
  const delayedOrders = parseInt(metricsData.value.delayed_orders_count || 0)
  
  if (stuckOrders > 0) {
    resources.push({
      id: 'workflow-optimization',
      title: 'Workflow Bottleneck Analysis',
      description: 'Identify and eliminate bottlenecks causing order processing delays.',
      icon: '🔍',
      bgColor: 'bg-gradient-to-br from-teal-400 to-teal-600',
      category: 'Analysis',
      categoryClass: 'bg-teal-50 text-teal-700',
      readTime: '7 min read'
    })
  }
  
  if (delayedOrders > 0) {
    resources.push({
      id: 'time-management',
      title: 'Operations Time Management',
      description: 'Techniques to reduce processing times and meet delivery commitments.',
      icon: '⏰',
      bgColor: 'bg-gradient-to-br from-pink-400 to-pink-600',
      category: 'Efficiency',
      categoryClass: 'bg-pink-50 text-pink-700',
      readTime: '5 min read'
    })
  }
  
  if (stuckOrders > 0 || delayedOrders > 0) {
    resources.push({
      id: 'lean-management',
      title: 'Lean Management Principles',
      description: 'Eliminate waste and improve operational efficiency with lean methodologies.',
      icon: '⚡',
      bgColor: 'bg-gradient-to-br from-titan-400 to-titan-600',
      category: 'Strategy',
      categoryClass: 'bg-titan-100 text-ebony-700',
      readTime: '8 min read'
    })
  }
  
  return resources.slice(0, 8) // Show more recommendations based on issues
})

const healthScoreColor = computed(() => {
  const score = obstaclesData.value?.obstacles_summary?.health_score || 0
  if (score >= 80) return 'text-green-600'
  if (score >= 60) return 'text-yellow-600'
  return 'text-red-600'
})

const healthScoreBarColor = computed(() => {
  const score = obstaclesData.value?.obstacles_summary?.health_score || 0
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
})

const paymentHealthColor = computed(() => {
  const rate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  if (rate >= 95) return 'text-green-600'
  if (rate >= 85) return 'text-yellow-600'
  return 'text-red-600'
})

const inventoryHealthColor = computed(() => {
  const rate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  if (rate >= 90) return 'text-green-600'
  if (rate >= 70) return 'text-yellow-600'
  return 'text-red-600'
})

const orderHealthColor = computed(() => {
  const rate = parseFloat(metricsData.value.order_success_rate || 0)
  if (rate >= 95) return 'text-green-600'
  if (rate >= 85) return 'text-yellow-600'
  return 'text-red-600'
})

// Helper functions for DataTable badges
function getDeviationVariant(obstacle) {
  switch (obstacle) {
    case 'Payment Processing':
      const paymentRate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
      return paymentRate < 95 ? 'destructive' : 'success'
    case 'Inventory Stock Levels':
      const inventoryRate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
      return inventoryRate < 90 ? 'destructive' : 'success'
    case 'Order Fulfillment':
      const orderRate = parseFloat(metricsData.value.order_success_rate || 0)
      return orderRate < 95 ? 'destructive' : 'success'
    case 'Process Efficiency':
      const stuck = parseInt(metricsData.value.stuck_orders_count || 0)
      return stuck > 0 ? 'destructive' : 'success'
    default:
      return 'secondary'
  }
}

function getPriorityVariant(priority) {
  switch (priority) {
    case 'CRITICAL':
      return 'destructive'
    case 'HIGH':
      return 'warning'
    case 'MEDIUM':
      return 'info'
    case 'LOW':
      return 'success'
    default:
      return 'secondary'
  }
}

// Methods
const refreshData = async () => {
  await refresh()
}

// Helper functions for calculations
const getPaymentDeviation = () => {
  const rate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  const deviation = 95 - rate
  return deviation > 0 ? `-${deviation.toFixed(1)}%` : `+${Math.abs(deviation).toFixed(1)}%`
}

const getPaymentPriority = () => {
  const rate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  if (rate < 85) return 'CRITICAL'
  if (rate < 95) return 'HIGH'
  return 'LOW'
}

const getInventoryDeviation = () => {
  const rate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  const deviation = 90 - rate
  return deviation > 0 ? `-${deviation.toFixed(1)}%` : `+${Math.abs(deviation).toFixed(1)}%`
}

const getInventoryPriority = () => {
  const rate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  if (rate < 70) return 'CRITICAL'
  if (rate < 90) return 'HIGH'
  return 'LOW'
}

const getOrderDeviation = () => {
  const rate = parseFloat(metricsData.value.order_success_rate || 0)
  const deviation = 95 - rate
  return deviation > 0 ? `-${deviation.toFixed(1)}%` : `+${Math.abs(deviation).toFixed(1)}%`
}

const getOrderPriority = () => {
  const rate = parseFloat(metricsData.value.order_success_rate || 0)
  if (rate < 85) return 'CRITICAL'
  if (rate < 95) return 'HIGH'
  return 'LOW'
}

const getEfficiencyDeviation = () => {
  const stuck = parseInt(metricsData.value.stuck_orders_count || 0)
  return stuck > 0 ? `+${stuck} orders` : 'Optimal'
}

const getEfficiencyPriority = () => {
  const stuck = parseInt(metricsData.value.stuck_orders_count || 0)
  const delayed = parseInt(metricsData.value.delayed_orders_count || 0)
  if (stuck > 2 || delayed > 5) return 'HIGH'
  if (stuck > 0 || delayed > 0) return 'MEDIUM'
  return 'LOW'
}

// Watch for period changes
watch(selectedPeriod, async () => {
  await refresh()
})
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