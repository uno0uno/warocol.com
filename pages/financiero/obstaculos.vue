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
        <div class="text-sm text-ebony-600">{{ error.message || 'Failed to load obstacles analysis' }}</div>
        <button @click="$router.go(0)" class="mt-4 px-4 py-2 bg-crocus-500 text-white rounded-lg hover:bg-crocus-600">
          Retry
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else-if="obstaclesData">

      <!-- Obstacles Analysis Table -->
      <div class="bg-white rounded-xl p-6 border border-titan-300 shadow-sm mb-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-ebony-800">Detailed Obstacles Analysis</h2>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="border-b border-titan-200">
                <th class="text-left py-3 px-2 text-sm text-ebony-400 font-medium">Obstacle</th>
                <th class="text-left py-3 px-2 text-sm text-ebony-400 font-medium">Current Value</th>
                <th class="text-left py-3 px-2 text-sm text-ebony-400 font-medium">Optimal Range</th>
                <th class="text-left py-3 px-2 text-sm text-ebony-400 font-medium">Deviation</th>
                <th class="text-left py-3 px-2 text-sm text-ebony-400 font-medium">Business Impact</th>
                <th class="text-left py-3 px-2 text-sm text-ebony-400 font-medium">Priority</th>
              </tr>
            </thead>
            <tbody>
              <!-- Payment Processing Obstacle -->
              <tr class="border-b border-titan-100 hover:bg-titan-25 transition-colors">
                <td class="py-4 px-2">
                  <span class="font-semibold text-sm text-ebony-800">Payment Processing</span>
                </td>
                <td class="py-4 px-2 text-sm text-ebony-800">{{ (100 - parseFloat(metricsData.payment_failure_rate || 0)).toFixed(1) }}% success</td>
                <td class="py-4 px-2 text-sm text-ebony-600">≥95%</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getPaymentDeviationBadge()">
                    {{ getPaymentDeviation() }}
                  </span>
                </td>
                <td class="py-4 px-2 text-sm font-semibold text-ebony-600">${{ metricsData.lost_revenue_payments?.toLocaleString() || 0 }} lost</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getPaymentPriorityBadge()">
                    {{ getPaymentPriority() }}
                  </span>
                </td>
              </tr>

              <!-- Inventory Management Obstacle -->
              <tr class="border-b border-titan-100 hover:bg-titan-25 transition-colors">
                <td class="py-4 px-2">
                  <span class="font-semibold text-sm text-ebony-800">Inventory Management</span>
                </td>
                <td class="py-4 px-2 text-sm text-ebony-800">{{ (100 - parseFloat(metricsData.stock_risk_percentage || 0)).toFixed(1) }}% healthy</td>
                <td class="py-4 px-2 text-sm text-ebony-600">≥90%</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getInventoryDeviationBadge()">
                    {{ getInventoryDeviation() }}
                  </span>
                </td>
                <td class="py-4 px-2 text-sm font-semibold text-ebony-600">{{ metricsData.out_of_stock_count || 0 }} out of stock</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getInventoryPriorityBadge()">
                    {{ getInventoryPriority() }}
                  </span>
                </td>
              </tr>

              <!-- Order Fulfillment Obstacle -->
              <tr class="border-b border-titan-100 hover:bg-titan-25 transition-colors">
                <td class="py-4 px-2">
                  <span class="font-semibold text-sm text-ebony-800">Order Fulfillment</span>
                </td>
                <td class="py-4 px-2 text-sm text-ebony-800">{{ parseFloat(metricsData.order_success_rate || 0).toFixed(1) }}% success</td>
                <td class="py-4 px-2 text-sm text-ebony-600">≥95%</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getOrderDeviationBadge()">
                    {{ getOrderDeviation() }}
                  </span>
                </td>
                <td class="py-4 px-2 text-sm font-semibold text-ebony-600">{{ metricsData.cancelled_orders_count || 0 }} cancelled</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getOrderPriorityBadge()">
                    {{ getOrderPriority() }}
                  </span>
                </td>
              </tr>

              <!-- Operational Efficiency Obstacle -->
              <tr class="border-b border-titan-100 hover:bg-titan-25 transition-colors">
                <td class="py-4 px-2">
                  <span class="font-semibold text-sm text-ebony-800">Operational Efficiency</span>
                </td>
                <td class="py-4 px-2 text-sm text-ebony-800">{{ metricsData.stuck_orders_count || 0 }} stuck orders</td>
                <td class="py-4 px-2 text-sm text-ebony-600">0 stuck</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getEfficiencyDeviationBadge()">
                    {{ getEfficiencyDeviation() }}
                  </span>
                </td>
                <td class="py-4 px-2 text-sm font-semibold text-ebony-600">{{ metricsData.delayed_orders_count || 0 }} delayed</td>
                <td class="py-4 px-2">
                  <span class="px-2 py-1 rounded-full text-xs font-bold" :class="getEfficiencyPriorityBadge()">
                    {{ getEfficiencyPriority() }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
const { data: obstaclesApiData, pending: isLoading, error, refresh } = useAsyncData('obstacles-analysis', () => $fetch('/api/finance/obstacles-analysis', {
  query: { 
    period: selectedPeriod.value
  }
}), {
  server: false,
  client: true,
  default: () => ({ 
    data: {
      metrics: {},
      obstacles_summary: { health_score: 0, total_obstacles: 0 },
      insights: { critical_obstacles: [], warning_obstacles: [], recommendations: [] }
    }
  })
})

// React to tenant changes
onTenantChange(async () => {
  console.log(`🔄 Tenant changed to: ${currentTenant.value?.name || 'Unknown'}, refreshing obstacles analysis data...`)
  await refresh()
})

// Computed properties
const obstaclesData = computed(() => obstaclesApiData.value?.data || null)
const metricsData = computed(() => obstaclesData.value?.metrics || {})

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

// Methods
const refreshData = async () => {
  await refresh()
}

// Helper functions for table calculations
const getPaymentDeviation = () => {
  const rate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  const deviation = 95 - rate
  return deviation > 0 ? `-${deviation.toFixed(1)}%` : `+${Math.abs(deviation).toFixed(1)}%`
}

const getPaymentDeviationBadge = () => {
  const rate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  return rate < 95 ? 'bg-titan-100 text-ebony-700' : 'bg-crocus-100 text-crocus-700'
}

const getPaymentPriority = () => {
  const rate = 100 - parseFloat(metricsData.value.payment_failure_rate || 0)
  if (rate < 85) return 'CRITICAL'
  if (rate < 95) return 'HIGH'
  return 'LOW'
}

const getPaymentPriorityBadge = () => {
  const priority = getPaymentPriority()
  if (priority === 'CRITICAL') return 'bg-titan-100 text-ebony-700'
  if (priority === 'HIGH') return 'bg-crocus-100 text-crocus-700'
  return 'bg-crocus-100 text-crocus-700'
}

const getInventoryDeviation = () => {
  const rate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  const deviation = 90 - rate
  return deviation > 0 ? `-${deviation.toFixed(1)}%` : `+${Math.abs(deviation).toFixed(1)}%`
}

const getInventoryDeviationBadge = () => {
  const rate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  return rate < 90 ? 'bg-titan-100 text-ebony-700' : 'bg-crocus-100 text-crocus-700'
}

const getInventoryPriority = () => {
  const rate = 100 - parseFloat(metricsData.value.stock_risk_percentage || 0)
  if (rate < 70) return 'CRITICAL'
  if (rate < 90) return 'HIGH'
  return 'LOW'
}

const getInventoryPriorityBadge = () => {
  const priority = getInventoryPriority()
  if (priority === 'CRITICAL') return 'bg-titan-100 text-ebony-700'
  if (priority === 'HIGH') return 'bg-crocus-100 text-crocus-700'
  return 'bg-crocus-100 text-crocus-700'
}

const getOrderDeviation = () => {
  const rate = parseFloat(metricsData.value.order_success_rate || 0)
  const deviation = 95 - rate
  return deviation > 0 ? `-${deviation.toFixed(1)}%` : `+${Math.abs(deviation).toFixed(1)}%`
}

const getOrderDeviationBadge = () => {
  const rate = parseFloat(metricsData.value.order_success_rate || 0)
  return rate < 95 ? 'bg-titan-100 text-ebony-700' : 'bg-crocus-100 text-crocus-700'
}

const getOrderPriority = () => {
  const rate = parseFloat(metricsData.value.order_success_rate || 0)
  if (rate < 85) return 'CRITICAL'
  if (rate < 95) return 'HIGH'
  return 'LOW'
}

const getOrderPriorityBadge = () => {
  const priority = getOrderPriority()
  if (priority === 'CRITICAL') return 'bg-titan-100 text-ebony-700'
  if (priority === 'HIGH') return 'bg-crocus-100 text-crocus-700'
  return 'bg-crocus-100 text-crocus-700'
}

const getEfficiencyDeviation = () => {
  const stuck = parseInt(metricsData.value.stuck_orders_count || 0)
  return stuck > 0 ? `+${stuck} orders` : 'Optimal'
}

const getEfficiencyDeviationBadge = () => {
  const stuck = parseInt(metricsData.value.stuck_orders_count || 0)
  return stuck > 0 ? 'bg-titan-100 text-ebony-700' : 'bg-crocus-100 text-crocus-700'
}

const getEfficiencyPriority = () => {
  const stuck = parseInt(metricsData.value.stuck_orders_count || 0)
  const delayed = parseInt(metricsData.value.delayed_orders_count || 0)
  if (stuck > 2 || delayed > 5) return 'HIGH'
  if (stuck > 0 || delayed > 0) return 'MEDIUM'
  return 'LOW'
}

const getEfficiencyPriorityBadge = () => {
  const priority = getEfficiencyPriority()
  if (priority === 'HIGH') return 'bg-titan-100 text-ebony-700'
  if (priority === 'MEDIUM') return 'bg-crocus-100 text-crocus-700'
  return 'bg-crocus-100 text-crocus-700'
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