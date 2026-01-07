<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'

definePageMeta({
  layout: 'dashboard',
  ssr: false
})

useHead({ title: 'Ventas' })

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Export modal state
const showExportModal = ref(false)
const exportResult = ref<{ success: boolean; message: string; email?: string; count?: number } | null>(null)

// State
const localSearchTerm = ref('')
const apiSearchField = ref('order_number')
const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')
const paymentMethodFilter = ref<string | null>(null)
const statusFilter = ref<string | null>(null)
const dateRangeFilter = ref<string | null>(null)

// Computed date range based on filter selection
const dateRange = computed(() => {
  if (!dateRangeFilter.value) return { from: null, to: null }

  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const todayStr = today.toISOString().split('T')[0]

  let fromDate = new Date()
  fromDate.setHours(0, 0, 0, 0)

  switch (dateRangeFilter.value) {
    case 'today':
      break
    case 'yesterday':
      fromDate.setDate(fromDate.getDate() - 1)
      today.setDate(today.getDate() - 1)
      break
    case 'week':
      fromDate.setDate(fromDate.getDate() - 7)
      break
    case '15days':
      fromDate.setDate(fromDate.getDate() - 15)
      break
    case 'month':
      fromDate.setDate(fromDate.getDate() - 30)
      break
    case '90days':
      fromDate.setDate(fromDate.getDate() - 90)
      break
    default:
      return { from: null, to: null }
  }

  return {
    from: fromDate.toISOString().split('T')[0],
    to: dateRangeFilter.value === 'yesterday' ? fromDate.toISOString().split('T')[0] : todayStr
  }
})

// Load metrics from API
const { data: metricsData, pending: metricsLoading, refresh: refreshMetrics } = useAsyncData(
  `orders-metrics-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/orders/metrics', {
    params: {
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined
    }
  }),
  {
    server: false,
    watch: [currentTenant]
  }
)

// Load orders from API
const { data: ordersData, pending: isLoading, error: fetchError, refresh } = useAsyncData(
  `orders-list-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/orders', {
    params: {
      limit: 250,
      search: localSearchTerm.value || undefined,
      search_field: apiSearchField.value || undefined,
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined
    }
  }),
  {
    server: false,
    watch: [currentTenant]
  }
)

// Refresh on tenant change
onTenantChange(async () => {
  await Promise.all([refresh(), refreshMetrics()])
})

// Metrics computed
const metrics = computed(() => metricsData.value?.data || null)

// Computed - Transform data to flatten customer object
const orders = computed(() => {
  if (!ordersData.value?.data) return []

  return ordersData.value.data.map((order: any) => ({
    ...order,
    customer_name: order.customer?.name || 'Sin nombre',
    customer_phone: order.customer?.phone || 'N/A'
  }))
})

// Search fields for the filter bar
const searchFields = [
  { label: 'Nº Orden', value: 'order_number' },
  { label: 'Cliente', value: 'customer_name' },
  { label: 'Teléfono', value: 'customer_phone' }
]

// Table columns configuration
const ordersTableColumns: Column[] = [
  { key: 'order_number', title: 'Nº Orden', sortable: true },
  { key: 'order_date', title: 'Fecha', sortable: true },
  { key: 'customer_name', title: 'Cliente', sortable: true },
  { key: 'customer_phone', title: 'Teléfono', sortable: false },
  { key: 'items_count', title: 'Items', sortable: false },
  { key: 'payment_method', title: 'Método Pago', sortable: true },
  { key: 'total_amount', title: 'Total', sortable: true },
  { key: 'status', title: 'Estado', sortable: false }
]

// Methods
const performSearch = () => {
  refresh()
}

const clearFilters = () => {
  localSearchTerm.value = ''
  apiSearchField.value = 'order_number'
  paymentMethodFilter.value = null
  statusFilter.value = null
  dateRangeFilter.value = null
  sortField.value = 'order_date'
  sortDirection.value = 'desc'
  Promise.all([refresh(), refreshMetrics()])
}

// Export functionality
const isExporting = ref(false)
const exportOrders = async () => {
  if (isExporting.value) return

  try {
    isExporting.value = true
    const response = await $fetch('/api/orders/export', {
      method: 'POST',
      params: {
        search: localSearchTerm.value || undefined,
        search_field: apiSearchField.value || undefined,
        payment_method: paymentMethodFilter.value || undefined,
        status: statusFilter.value || undefined,
        sort_field: sortField.value,
        sort_direction: sortDirection.value,
        date_from: dateRange.value.from || undefined,
        date_to: dateRange.value.to || undefined
      }
    }) as { success: boolean; message: string; data?: { email: string; orders_count: number } }

    exportResult.value = {
      success: true,
      message: response.message,
      email: response.data?.email,
      count: response.data?.orders_count
    }
    showExportModal.value = true
  } catch (error: any) {
    exportResult.value = {
      success: false,
      message: error.data?.message || error.message || 'Error al exportar'
    }
    showExportModal.value = true
  } finally {
    isExporting.value = false
  }
}

const handleSort = ({ field, direction }: { field: string; direction: 'asc' | 'desc' }) => {
  sortField.value = field
  sortDirection.value = direction
  refresh()
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    'cash': 'Efectivo',
    'card': 'Tarjeta',
    'digital': 'Digital'
  }
  return labels[method] || method
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'completed': 'Completada',
    'cancelled': 'Cancelada',
    'pending': 'Pendiente'
  }
  return labels[status] || status
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

const viewOrderDetails = (order: any) => {
  navigateTo(`/ventas/${order.id}`)
}

// Set refresh handler for layout
const setRefreshHandler = inject('setRefreshHandler', () => {})
onMounted(async () => {
  setRefreshHandler(async () => {
    await Promise.all([refresh(), refreshMetrics()])
  })
  // Refresh metrics on mount to ensure they load when navigating back
  await refreshMetrics()
})
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading || metricsLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <div v-else-if="fetchError" class="flex items-center justify-center min-h-[400px]">
      <div class="text-center">
        <p class="text-xl font-semibold text-text-primary mb-2">Error al cargar las ventas.</p>
        <p class="text-sm text-text-secondary">{{ fetchError.message }}</p>
        <button @click="refresh" class="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          Reintentar
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Metrics Cards -->
      <div v-if="metrics" class="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <SharedMetricCard
          title="Total Ventas"
          :value="metrics.total_sales"
          format="currency"
          variant="primary"
          size="sm"
        />
        <SharedMetricCard
          title="Ticket Promedio"
          :value="metrics.avg_ticket"
          format="currency"
          variant="primary"
          size="sm"
        />
        <SharedMetricCard
          title="Ordenes Completadas"
          :value="metrics.completed_orders"
          format="number"
          variant="primary"
          size="sm"
        />
        <SharedMetricCard
          title="Ordenes Canceladas"
          :value="metrics.cancelled_orders"
          format="number"
          variant="primary"
          size="sm"
        />
      </div>

      <!-- Filters Bar -->
      <div class="flex flex-wrap items-center gap-2 w-full">
        <!-- Search Input -->
        <div class="relative flex-1 min-w-[200px]">
          <button
            @click="performSearch"
            class="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-primary transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
          <input
            v-model="localSearchTerm"
            @keydown.enter="performSearch"
            placeholder="Buscar ventas..."
            class="w-full h-10 pl-9 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <!-- Search Field Select -->
        <select
          v-model="apiSearchField"
          class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[120px]"
        >
          <option value="order_number">Nº Orden</option>
          <option value="customer_name">Cliente</option>
          <option value="customer_phone">Teléfono</option>
        </select>

        <!-- Date Range Filter -->
        <select
          v-model="dateRangeFilter"
          @change="performSearch(); refreshMetrics()"
          class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[140px]"
        >
          <option :value="null">Todo el tiempo</option>
          <option value="today">Hoy</option>
          <option value="yesterday">Ayer</option>
          <option value="week">Última semana</option>
          <option value="15days">Últimos 15 días</option>
          <option value="month">Último mes</option>
          <option value="90days">Últimos 90 días</option>
        </select>

        <!-- Payment Method Filter -->
        <select
          v-model="paymentMethodFilter"
          @change="performSearch"
          class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[130px]"
        >
          <option :value="null">Método pago</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="digital">Digital</option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          @change="performSearch"
          class="h-10 pl-3 pr-3 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer min-w-[120px]"
        >
          <option :value="null">Estado</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="pending">Pendientes</option>
        </select>

        <!-- Clear Filters Button -->
        <button
          v-if="localSearchTerm || dateRangeFilter || paymentMethodFilter || statusFilter"
          @click="clearFilters"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          title="Limpiar filtros"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Export Button (Desktop only) -->
        <button
          @click="exportOrders"
          :disabled="isExporting"
          class="hidden md:flex h-10 px-4 items-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Exportar ventas a correo"
        >
          <svg v-if="!isExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isExporting ? 'Enviando...' : 'Exportar' }}</span>
        </button>
      </div>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        :columns="ordersTableColumns"
        :data="orders"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        @sort="handleSort"
        @row-click="viewOrderDetails"
        empty-message="No hay ventas registradas"
        empty-sub-message="Las ventas completadas aparecerán aquí"
        variant="default"
      >
        <!-- Mobile Actions -->
        <template #mobileActions>
          <div class="flex flex-col gap-2">
            <UiSearchWithField
              v-model="localSearchTerm"
              v-model:fieldValue="apiSearchField"
              :fields="searchFields"
              placeholder="Buscar..."
              class="w-full"
              @search="performSearch"
            />
            <div class="flex gap-2">
              <select
                v-model="paymentMethodFilter"
                @change="performSearch"
                class="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm"
              >
                <option :value="null">Método de pago</option>
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="digital">Digital</option>
              </select>
              <select
                v-model="statusFilter"
                @change="performSearch"
                class="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-text-primary text-sm"
              >
                <option :value="null">Estado</option>
                <option value="completed">Completadas</option>
                <option value="cancelled">Canceladas</option>
              </select>
            </div>
          </div>
        </template>

        <!-- Mobile Card -->
        <template #card="{ item }">
          <div
            v-if="item"
            @click="viewOrderDetails(item)"
            class="bg-surface border border-border rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div class="flex justify-between items-start mb-3">
              <div>
                <p class="text-lg font-bold text-text-primary">Orden #{{ item.order_number }}</p>
                <p class="text-sm text-text-secondary">{{ formatDate(item.order_date) }}</p>
              </div>
              <span :class="['px-2 py-1 rounded-full text-xs font-medium', getStatusColor(item.status)]">
                {{ getStatusLabel(item.status) }}
              </span>
            </div>

            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="text-2xl">👤</span>
                <div class="flex-1">
                  <p class="text-sm font-medium text-text-primary">{{ item.customer_name }}</p>
                  <p class="text-xs text-text-secondary">{{ item.customer_phone }}</p>
                </div>
              </div>

              <div class="flex justify-between items-center pt-2 border-t border-border">
                <div class="flex items-center gap-2 text-sm text-text-secondary">
                  <span>{{ item.items_count }} items</span>
                  <span>•</span>
                  <span>{{ getPaymentMethodLabel(item.payment_method) }}</span>
                </div>
                <p class="text-lg font-bold text-primary">{{ formatCurrency(item.total_amount) }}</p>
              </div>
            </div>
          </div>
        </template>

        <!-- Desktop Header -->
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
            <!-- Empty header -->
          </div>
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-order_number="{ value }">
          <span class="text-sm font-bold text-text-primary">#{{ value }}</span>
        </template>

        <template #cell-order_date="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-customer_name="{ item }">
          <div v-if="item">
            <p class="text-sm font-medium text-text-primary">{{ item.customer_name }}</p>
            <p class="text-xs text-text-secondary">{{ item.customer_phone }}</p>
          </div>
        </template>

        <template #cell-customer_phone="{ item }">
          <span v-if="item" class="text-sm text-text-secondary">{{ item.customer_phone }}</span>
        </template>

        <template #cell-items_count="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-payment_method="{ value }">
          <span class="text-sm text-text-primary">{{ getPaymentMethodLabel(value) }}</span>
        </template>

        <template #cell-total_amount="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-status="{ value }">
          <span :class="['px-2 py-1 rounded-full text-xs font-medium inline-block', getStatusColor(value)]">
            {{ getStatusLabel(value) }}
          </span>
        </template>
      </UiResponsiveDataView>
    </div>

    <!-- Export Result Modal -->
    <Teleport to="body">
      <div
        v-if="showExportModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50" @click="showExportModal = false"></div>

        <!-- Modal -->
        <div class="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
          <!-- Icon -->
          <div class="flex justify-center mb-4">
            <div
              :class="[
                'w-16 h-16 rounded-full flex items-center justify-center',
                exportResult?.success ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
              ]"
            >
              <svg
                v-if="exportResult?.success"
                class="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg
                v-else
                class="w-8 h-8 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-xl font-bold text-text-primary text-center mb-4">
            {{ exportResult?.success ? 'Reporte Enviado' : 'Error al Exportar' }}
          </h3>

          <!-- Success Details -->
          <div v-if="exportResult?.success" class="bg-surface-secondary rounded-lg p-4 mb-6 space-y-3">
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span class="text-sm text-text-primary">{{ exportResult.email }}</span>
            </div>
            <div v-if="exportResult?.count" class="flex items-center gap-3">
              <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-sm text-text-primary">{{ exportResult.count }} ventas</span>
            </div>
          </div>

          <!-- Error Message -->
          <p v-else class="text-text-secondary text-center mb-6">
            {{ exportResult?.message }}
          </p>

          <!-- Accept Button -->
          <button
            @click="showExportModal = false"
            class="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Aceptar
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
