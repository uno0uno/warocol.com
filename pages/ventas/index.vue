<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { es } from 'date-fns/locale'
import { format as fnsFormat } from 'date-fns'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
// @ts-ignore
import HealthSemaphore from '~/components/analytics/HealthSemaphore.vue'

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Ventas' })

// Tenant reactivity
const { currentTenant } = useTenantReactive()

// Export modal state
const showExportModal = ref(false)
const exportResult = ref<{ success: boolean; message: string; email?: string; count?: number } | null>(null)

// State
const localSearchTerm = ref('')
const apiSearchField = ref('order_number')
const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')
const paymentMethodFilter = ref<string | null>(null)
const statusFilter = ref<string | null>('completed')
const dateRangeDates = ref<Date[] | null>(null)

// Preset ranges for the date picker shortcuts
const presetDates = ref([
  { label: 'Hoy', value: [new Date(), new Date()] },
  {
    label: 'Ayer',
    value: (() => {
      const d = new Date(); d.setDate(d.getDate() - 1); return [d, d]
    })()
  },
  { label: 'Última semana', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d })(), new Date()] },
  { label: 'Últimos 15 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 15); return d })(), new Date()] },
  { label: 'Último mes', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })(), new Date()] },
  { label: 'Últimos 90 días', value: [(() => { const d = new Date(); d.setDate(d.getDate() - 90); return d })(), new Date()] },
])

// Format function for the date picker display
const formatDateRange = (dates: Date[]) => {
  if (!dates || !dates[0]) return ''
  const from = fnsFormat(dates[0], 'dd/MM/yyyy', { locale: es })
  if (!dates[1]) return from
  const to = fnsFormat(dates[1], 'dd/MM/yyyy', { locale: es })
  return `${from} - ${to}`
}

// Computed date range for API params (YYYY-MM-DD format)
const dateRange = computed(() => {
  if (!dateRangeDates.value || dateRangeDates.value.length < 2) return { from: null, to: null }
  const [from, to] = dateRangeDates.value
  if (!from || !to) return { from: null, to: null }
  return {
    from: fnsFormat(from, 'yyyy-MM-dd'),
    to: fnsFormat(to, 'yyyy-MM-dd')
  }
})

// Pagination state
const PAGE_SIZE = 25
const currentPage = ref(1)

// Applied search — only updated on button click (prevents live-search key churn)
const appliedSearch = ref('')

// Metrics removed based on request



// Load orders from API
const { data: ordersData, status: queryStatus, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['orders', currentTenant.value?.id, {
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    search: appliedSearch.value || null,
    searchField: apiSearchField.value,
    paymentMethod: paymentMethodFilter.value,
    status: statusFilter.value,
    sortField: sortField.value,
    sortDirection: sortDirection.value,
    dateFrom: dateRange.value.from,
    dateTo: dateRange.value.to,
  }],
  query: () => $fetch('/api/orders', {
    params: {
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
      search: appliedSearch.value || undefined,
      search_field: apiSearchField.value || undefined,
      payment_method: paymentMethodFilter.value || undefined,
      status: statusFilter.value || undefined,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})
const isLoading = computed(() => !ordersData.value && !fetchError.value)
const isRefreshing = computed(() => asyncStatus.value === 'loading' && ordersData.value != null)

// Reset page on tenant change — key change triggers automatic refetch
watch(() => currentTenant.value?.id, () => {
  currentPage.value = 1
})

// Reset page when date range changes (only when both dates selected or cleared)
watch(dateRangeDates, (val) => {
  if (!val || (val.length === 2 && val[0] && val[1])) {
    currentPage.value = 1
  }
})

// Pagination computed (after ordersData is declared)
const ordersTotalPages = computed(() => {
  const total = ordersData.value?.pagination?.total ?? 0
  return Math.max(1, Math.ceil(total / PAGE_SIZE))
})
const ordersTotal = computed(() => ordersData.value?.pagination?.total ?? 0)

const goToPage = (page: number) => {
  currentPage.value = Math.max(1, Math.min(page, ordersTotalPages.value))
}

// Metrics computed


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

// Bulk selection
const selectedIds = ref<string[]>([])
const bulkStatus = ref('')
const bulkPaymentMethod = ref('')
const isBulkUpdating = ref(false)

// Customer identification for completed orders
const showCustomerModal = ref(false)
const pendingCustomerId = ref<string | null>(null)

const allPageSelected = computed(() => {
  const ids = orders.value.map((o: any) => o.id)
  return ids.length > 0 && ids.every((id: string) => selectedIds.value.includes(id))
})

const toggleSelect = (id: string) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) {
    selectedIds.value = selectedIds.value.filter((_, i) => i !== idx)
  } else {
    selectedIds.value = [...selectedIds.value, id]
  }
}

const toggleSelectAll = () => {
  if (allPageSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = orders.value.map((o: any) => o.id)
  }
}

const clearSelection = () => {
  selectedIds.value = []
  bulkStatus.value = ''
  bulkPaymentMethod.value = ''
}

const bulkUpdateStatus = () => {
  if (!bulkStatus.value || selectedIds.value.length === 0) return
  if (bulkStatus.value === 'completed') {
    // Ask for customer before applying
    pendingCustomerId.value = null
    showCustomerModal.value = true
  } else {
    executeBulkUpdate(null)
  }
}

const onCustomerIdentified = (customer: { id: string; name: string | null; phone_number: string | null }) => {
  showCustomerModal.value = false
  executeBulkUpdate(customer.id)
}

const executeBulkUpdate = async (customerId: string | null) => {
  isBulkUpdating.value = true
  try {
    const res = await $fetch('/api/orders/bulk-status', {
      method: 'PATCH',
      body: {
        order_ids: Array.from(selectedIds.value),
        status: bulkStatus.value,
        payment_method: bulkPaymentMethod.value || undefined,
        customer_id: customerId || undefined,
      },
    }) as any
    clearSelection()
    await refetch()
    useToast().success(res.message || 'Estado actualizado', { title: 'Listo' })
  } catch (error: any) {
    useToast().error(error.data?.message || 'Error al actualizar', { title: 'Error' })
  } finally {
    isBulkUpdating.value = false
  }
}

// Clear selection when page/filters change
watch([currentPage, statusFilter, paymentMethodFilter, appliedSearch, dateRange], clearSelection)

// Table columns configuration
const ordersTableColumns: Column[] = [
  { key: 'select', title: '', sortable: false, width: '44px', class: '!px-0', align: 'center' as const },
  { key: 'order_number', title: 'Nº Orden', sortable: true },
  { key: 'order_date', title: 'Fecha', sortable: true },
  { key: 'customer_name', title: 'Cliente', sortable: true },
  { key: 'customer_phone', title: 'Teléfono', sortable: false },
  { key: 'items_count', title: 'Items', sortable: false },
  { key: 'source', title: 'Origen', sortable: false },
  { key: 'payment_method', title: 'Método Pago', sortable: true },
  { key: 'total_amount', title: 'Total', sortable: true },
  { key: 'status', title: 'Estado', sortable: false }
]

// Methods
const performSearch = () => {
  currentPage.value = 1
  appliedSearch.value = localSearchTerm.value
}

const clearFilters = () => {
  localSearchTerm.value = ''
  appliedSearch.value = ''
  apiSearchField.value = 'order_number'
  paymentMethodFilter.value = null
  statusFilter.value = 'completed'
  dateRangeDates.value = null
  sortField.value = 'order_date'
  sortDirection.value = 'desc'
  currentPage.value = 1
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
  currentPage.value = 1
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


const statusPills = [
  { label: 'Todas', value: null },
  { label: 'Completadas', value: 'completed' },
  { label: 'Canceladas', value: 'cancelled' },
  { label: 'Pendientes', value: 'pending' },
]

const formatDateCompact = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  const isYesterday = date.toDateString() === yesterday.toDateString()

  if (isToday) return new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(date)
  if (isYesterday) return 'Ayer ' + new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit' }).format(date)
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

const viewOrderDetails = (order: any) => {
  navigateTo(`/ventas/${order.id}`)
}

// Set refresh handler for layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()
onMounted(() => { setRefreshHandler(refetch) })
registerProgressiveLoading(isRefreshing)
onUnmounted(() => { clearRefreshHandler(refetch) })
</script>

<template>
  <div class="page-layout">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[400px]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Error State -->
    <CommonsTheErrorState v-else-if="fetchError" />

    <!-- Main Content -->
    <div v-else class="flex flex-col gap-3 md:gap-4">
      <!-- Filters Bar -->
      <div class="flex items-center gap-2 w-full overflow-x-auto scrollbar-hide">
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
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option value="order_number">Nº Orden</option>
          <option value="customer_name">Cliente</option>
          <option value="customer_phone">Teléfono</option>
        </select>

        <!-- Date Range Picker -->
        <VueDatePicker
          v-model="dateRangeDates"
          range
          :preset-dates="presetDates"
          :enable-time-picker="false"
          :locale="es"
          placeholder="Rango de fechas"
          auto-apply
          :teleport="true"
          :max-date="new Date()"
          :format="formatDateRange"
          input-class-name="dp-custom-input"
          menu-class-name="dp-custom-menu"
          calendar-cell-class-name="dp-custom-cell"
        />

        <!-- Payment Method Filter -->
        <select
          v-model="paymentMethodFilter"
          @change="() => { currentPage.value = 1 }"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option :value="null">Método pago</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="digital">Digital</option>
        </select>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          @change="() => { currentPage.value = 1 }"
          class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
        >
          <option :value="null">Estado</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="pending">Pendientes</option>
        </select>

        <!-- Clear Filters Button -->
        <button
          v-if="localSearchTerm || dateRangeDates || paymentMethodFilter || (statusFilter && statusFilter !== 'completed')"
          @click="clearFilters"
          class="h-10 px-3 rounded-lg border-2 border-border bg-background text-sm text-text-secondary hover:text-text-primary hover:border-primary transition-colors"
          aria-label="Limpiar filtros"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Export Button (Desktop only) -->
        <button
          @click="exportOrders"
          :disabled="isExporting"
          class="hidden md:flex h-10 px-3 items-center gap-2 rounded-lg border-2 border-border bg-background text-text-secondary text-sm font-medium hover:text-text-primary hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :aria-label="isExporting ? 'Exportando ventas...' : 'Exportar ventas a correo'"
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

        <!-- Nueva Venta Button (Desktop only) -->
        <NuxtLink
          to="/ventas/crear"
          class="hidden md:flex h-10 px-3 items-center gap-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors whitespace-nowrap shrink-0"
          aria-label="Registrar venta manual"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Manual</span>
        </NuxtLink>
      </div>

      <!-- Bulk Action Bar -->
      <div
        v-if="selectedIds.length > 0"
        class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
      >
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-sm font-semibold text-text-primary">{{ selectedIds.length }} seleccionada(s)</span>
            <button type="button" @click="clearSelection" class="text-xs text-text-secondary hover:text-text-primary underline">deseleccionar</button>
          </div>

          <div class="flex-1" />

          <select
            v-model="bulkStatus"
            class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          >
            <option value="">Cambiar estado...</option>
            <option value="completed">Completada</option>
            <option value="pending">Pendiente</option>
            <option value="cancelled">Cancelada</option>
          </select>

          <select
            v-if="bulkStatus === 'completed'"
            v-model="bulkPaymentMethod"
            class="py-2 pl-3 pr-8 rounded-lg border-2 border-border bg-background text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer flex-shrink-0"
          >
            <option value="">Método de pago...</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="digital">Digital</option>
          </select>

          <button
            @click="bulkUpdateStatus"
            :disabled="!bulkStatus || isBulkUpdating || (bulkStatus === 'completed' && !bulkPaymentMethod)"
            class="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <UiLoadingDots v-if="isBulkUpdating" size="12px" />
            <span v-else>Aplicar</span>
          </button>

          <button @click="clearSelection" class="h-9 px-3 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors">
            Cancelar
          </button>
        </div>

      <!-- Responsive Data View -->
      <HealthSemaphore :is-unlocked="true" title="Historial de Ventas">
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
        row-size="sm"
      >
        <!-- Mobile Card: zebra stripes + UiStatusBadge -->
        <template #card="{ item, index }">
          <div
            v-if="item"
            @click="viewOrderDetails(item)"
            class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-surface-secondary"
            :class="index % 2 === 0 ? 'bg-surface' : 'bg-surface-secondary/30'"
          >
            <!-- Left: order info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-sm font-bold text-text-primary">#{{ item.order_number }}</span>
                <span class="text-xs text-text-secondary">{{ formatDateCompact(item.order_date) }}</span>
              </div>
              <p class="text-xs text-text-secondary mt-0.5 truncate">
                {{ item.customer_name }} · {{ item.items_count }} items · {{ getPaymentMethodLabel(item.payment_method) }} · {{ item.source === 'mesa' ? 'Mesa' : 'POS' }}
              </p>
            </div>

            <!-- Right: monto + badge -->
            <div class="flex flex-col items-end gap-1.5 flex-shrink-0">
              <p class="text-sm font-bold text-primary tabular-nums">{{ formatCurrency(item.total_amount) }}</p>
              <UiStatusBadge
                :value="getStatusLabel(item.status)"
                format="text"
                :variant="item.status === 'completed' ? 'success' : item.status === 'cancelled' ? 'destructive' : 'warning'"
                size="sm"
              />
            </div>
          </div>
        </template>


        <!-- Checkbox header: select all -->
        <template #header-select>
          <div class="flex items-center justify-center">
            <label class="cursor-pointer">
              <input
                type="checkbox"
                class="sr-only peer"
                :checked="allPageSelected"
                @change="toggleSelectAll"
              />
              <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
                <svg v-if="allPageSelected" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
            </label>
          </div>
        </template>

        <!-- Checkbox column -->
        <template #cell-select="{ row }">
          <label @click.stop class="flex items-center justify-center cursor-pointer">
            <input
              type="checkbox"
              class="sr-only peer"
              :checked="row && selectedIds.includes(row.id)"
              @change.stop="() => row && toggleSelect(row.id)"
            />
            <span class="w-5 h-5 rounded-[5px] border-2 border-border bg-background peer-checked:bg-primary peer-checked:border-primary transition-colors flex items-center justify-center text-white">
              <svg v-if="row && selectedIds.includes(row.id)" viewBox="0 0 10 8" fill="none" class="w-2.5 h-2">
                <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </label>
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

        <template #cell-source="{ value }">
          <span
            class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            :class="value === 'mesa' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
          >
            {{ value === 'mesa' ? 'Mesa' : 'POS' }}
          </span>
        </template>

        <template #cell-payment_method="{ value }">
          <UiStatusBadge
            :value="value ? getPaymentMethodLabel(value) : 'Sin registrar'"
            format="text"
            :variant="value === 'cash' ? 'success' : value === 'card' ? 'info' : value === 'digital' ? 'primary' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-total_amount="{ value }">
          <span class="text-sm font-bold text-primary">{{ formatCurrency(value) }}</span>
        </template>

        <template #cell-status="{ value }">
          <UiStatusBadge
            :value="getStatusLabel(value)"
            format="text"
            :variant="value === 'completed' ? 'success' : value === 'cancelled' ? 'destructive' : 'warning'"
            size="sm"
          />
        </template>
      </UiResponsiveDataView>
      </HealthSemaphore>

      <!-- Pagination -->
      <div v-if="ordersTotal > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Primera página"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página anterior"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
          <button
            :disabled="currentPage >= ordersTotalPages"
            @click="goToPage(currentPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Página siguiente"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= ordersTotalPages"
            @click="goToPage(ordersTotalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Última página"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
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

    <!-- Customer identification modal (shown when completing orders) -->
    <Teleport to="body">
      <PosCustomerIdentificationModal
        v-model="showCustomerModal"
        @customer-identified="onCustomerIdentified"
      />
    </Teleport>
  </div>
</template>

<style>
.dp-custom-input {
  height: 40px !important;
  border: 2px solid hsl(var(--border)) !important;
  border-radius: 0.5rem !important;
  background: hsl(var(--background)) !important;
  font-size: 0.875rem !important;
  color: hsl(var(--foreground)) !important;
  padding-left: 0.75rem !important;
  padding-right: 0.75rem !important;
  min-width: 150px;
}
.dp-custom-input:focus {
  outline: none !important;
  border-color: hsl(var(--primary)) !important;
  box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2) !important;
}
.dp-custom-input::placeholder {
  color: hsl(var(--muted-foreground)) !important;
}
.dp__theme_light {
  --dp-primary-color: hsl(var(--primary));
  --dp-primary-text-color: hsl(var(--primary-foreground));
  --dp-background-color: hsl(var(--card));
  --dp-text-color: hsl(var(--foreground));
  --dp-border-color: hsl(var(--border));
  --dp-menu-border-color: hsl(var(--border));
  --dp-hover-color: hsl(var(--accent));
  --dp-hover-text-color: hsl(var(--foreground));
  --dp-secondary-color: hsl(var(--muted));
  --dp-border-color-hover: hsl(var(--primary));
}
.dp-custom-menu {
  border-radius: 0.75rem !important;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
}

.bulk-bar-enter-active,
.bulk-bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.bulk-bar-enter-from,
.bulk-bar-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
