<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useFormatters } from '~/composables/useFormatters'
import { usePaymentSelectValue } from '~/composables/usePaymentSelectValue'
import type { Column } from '~/components/ui/ResponsiveDataView.vue'
import { mergePosPaymentGroupsFromApi, type ApiPaymentGroup } from '~/utils/paymentDefaults'
import { ventasPaymentStatusIsUnpaid } from '~/utils/wompiCollections'

useHead({ title: () => t('ventas.head.ordenes') })

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const { singular: tableSingular } = useTableLabel()

// Payment groups for filter and bulk-update dropdowns
const { data: paymentGroupsData } = useQuery({
  key: () => ['payments', 'pos-methods', currentTenant.value?.id],
  query: () => $fetch<{ success: boolean; data: ApiPaymentGroup[] }>('/api/pos/payment-methods'),
  enabled: () => !!currentTenant.value,
  staleTime: 300_000,
})
const paymentGroups = computed(() => mergePosPaymentGroupsFromApi(paymentGroupsData.value?.data ?? []))
const { resolveLabel } = usePaymentLabel(paymentGroups)

// Export modal state
const showExportModal = ref(false)
const exportResult = ref<{ success: boolean; message: string; email?: string; count?: number } | null>(null)

// Filters — shared composables (AdvancedFiltersBar)
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
const { dateRangeDates, presetDates, formatDateRange, dateRange, clearDateRange } = useDateRangePresets()

const orderSearchFields = [
  { label: t('ventas.ordenes.colOrder'), value: 'order_number' },
  { label: t('ventas.common.cliente'), value: 'customer_name' },
  { label: t('ventas.common.telefono'), value: 'customer_phone' },
]

const apiSearchField = ref('order_number')
const sortField = ref('order_date')
const sortDirection = ref<'asc' | 'desc'>('desc')
// Encoded value: null | "g:${slug}" for group | "m:${id}" for specific method
const paymentFilter = ref<string | null>(null)
const paymentGroupFilter = computed(() =>
  paymentFilter.value?.startsWith('g:') ? paymentFilter.value.slice(2) : null
)
const paymentMethodIdFilter = computed(() =>
  paymentFilter.value?.startsWith('m:') ? paymentFilter.value.slice(2) : null
)
const statusFilter = ref<string | null>('completed')
const deliveryOnly = ref<boolean>(false)

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!dateRangeDates.value
    || !!paymentFilter.value
    || (statusFilter.value != null && statusFilter.value !== 'completed')
    || deliveryOnly.value,
)

// Pagination state
const PAGE_SIZE = 25
const currentPage = ref(1)

// Metrics removed based on request



// Load orders from API
const { data: ordersData, status: queryStatus, asyncStatus, error: fetchError, refetch } = useQuery({
  key: () => ['orders', currentTenant.value?.id, {
    limit: PAGE_SIZE,
    offset: (currentPage.value - 1) * PAGE_SIZE,
    search: appliedSearch.value || null,
    searchField: apiSearchField.value,
    paymentMethod: paymentGroupFilter.value,
    paymentMethodId: paymentMethodIdFilter.value,
    status: statusFilter.value,
    sortField: sortField.value,
    sortDirection: sortDirection.value,
    dateFrom: dateRange.value.from,
    dateTo: dateRange.value.to,
    deliveryOnly: deliveryOnly.value,
  }],
  query: () => $fetch('/api/orders', {
    params: {
      limit: PAGE_SIZE,
      offset: (currentPage.value - 1) * PAGE_SIZE,
      search: appliedSearch.value || undefined,
      search_field: apiSearchField.value || undefined,
      payment_method: paymentGroupFilter.value || undefined,
      payment_method_id: paymentMethodIdFilter.value || undefined,
      status: statusFilter.value || undefined,
      sort_field: sortField.value,
      sort_direction: sortDirection.value,
      date_from: dateRange.value.from || undefined,
      date_to: dateRange.value.to || undefined,
      delivery_only: deliveryOnly.value || undefined,
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

watch([paymentFilter, statusFilter, deliveryOnly], () => {
  currentPage.value = 1
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
    customer_name: order.customer?.name || t('ventas.common.sinNombre'),
    customer_phone: order.customer?.phone || 'N/A'
  }))
})

const getInvoiceLabel = (order: any) => {
  if (!order?.invoice_number) return t('ventas.ordenes.sinFactura')
  return order.invoice_prefix ? `${order.invoice_prefix}-${order.invoice_number}` : String(order.invoice_number)
}

// Search fields for the filter bar
const searchFields = [
  { label: t('ventas.ordenes.colOrder'), value: 'order_number' },
  { label: t('ventas.common.cliente'), value: 'customer_name' },
  { label: t('ventas.common.telefono'), value: 'customer_phone' }
]

// Bulk selection
const selectedIds = ref<string[]>([])
const bulkStatus = ref('')
const bulkPaymentForm = ref({
  payment_method: '',
  payment_method_id: null as string | null,
})
const {
  paymentSelectValue: bulkPaymentSelectValue,
  hasPaymentSelected: hasBulkPaymentSelected,
} = usePaymentSelectValue(bulkPaymentForm, paymentGroups)
const isBulkUpdating = ref(false)

// Customer identification for completed orders
const showCustomerModal = ref(false)
const pendingCustomerId = ref<string | null>(null)

const allPageSelected = computed(() => {
  const ids = orders.value.map((o: any) => o.id)
  return ids.length > 0 && ids.every((id: string) => selectedIds.value.includes(id))
})

const bulkSelectionHasCompleted = computed(() =>
  orders.value.some((o: any) => selectedIds.value.includes(o.id) && o.status === 'completed'),
)

watch(bulkSelectionHasCompleted, (hasCompleted) => {
  if (hasCompleted && bulkStatus.value === 'pending') bulkStatus.value = ''
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
  bulkPaymentForm.value.payment_method = ''
  bulkPaymentForm.value.payment_method_id = null
}

const orderRowClass = (row: { id: string }, index: number) => {
  if (selectedIds.value.includes(row.id)) return 'bg-primary/10'
  return index % 2 === 0 ? 'bg-data-table-row-bg' : 'bg-data-table-row-alt-bg'
}

const getRowClass = (row: { id: string }) => {
  if (selectedIds.value.includes(row.id)) return 'bg-primary/10'
  return ''
}

const bulkUpdateStatus = () => {
  if (!bulkStatus.value || selectedIds.value.length === 0) return
  if (bulkStatus.value === 'completed' && !hasBulkPaymentSelected.value) return
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
        payment_method: bulkPaymentForm.value.payment_method || undefined,
        payment_method_id: bulkPaymentForm.value.payment_method_id || undefined,
        customer_id: customerId || undefined,
      },
    }) as any
    clearSelection()
    await refetch()
    useToast().success(res.message || t('ventas.ordenes.statusUpdated'), { title: t('ventas.common.listo') })
  } catch (error: any) {
    useToast().error(error.data?.message || t('ventas.ordenes.updateError'), { title: t('ventas.common.error') })
  } finally {
    isBulkUpdating.value = false
  }
}

// Clear selection when page/filters change
watch([currentPage, statusFilter, paymentFilter, appliedSearch, dateRange, deliveryOnly], clearSelection)

// Show discount column only when at least one order in the current page has a discount
const hasAnyDiscount = computed(() => orders.value.some((o: any) => o.discount_amount > 0))

// Table columns configuration
const ordersTableColumns = computed<Column[]>(() => [
  { key: 'select', title: '', sortable: false, width: '44px', class: '!px-0', align: 'center' as const },
  { key: 'order_number', title: t('ventas.ordenes.colOrder'), sortable: true },
  { key: 'order_date', title: t('ventas.common.fecha'), sortable: true },
  { key: 'invoice', title: t('ventas.common.factura'), sortable: false },
  { key: 'items_count', title: t('ventas.ordenes.colItems'), sortable: false },
  { key: 'source', title: t('ventas.ordenes.colSource'), sortable: false },
  { key: 'payment_method', title: t('ventas.common.metodoPagoShort'), sortable: true },
  { key: 'payment_status', title: t('ventas.ordenes.colPaymentStatus'), sortable: false },
  ...(hasAnyDiscount.value ? [{ key: 'discount_amount', title: t('ventas.common.descuentoManual'), sortable: true }] : []),
  { key: 'total_amount', title: t('ventas.common.total'), sortable: true },
  { key: 'status', title: t('ventas.common.estado'), sortable: false }
])

// Methods
const performSearch = () => applySearch(() => { currentPage.value = 1 })

const clearFilters = () => {
  clearSearch()
  clearDateRange()
  apiSearchField.value = 'order_number'
  paymentFilter.value = null
  statusFilter.value = 'completed'
  deliveryOnly.value = false
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
        search: appliedSearch.value || undefined,
        search_field: apiSearchField.value || undefined,
        payment_method: paymentGroupFilter.value || undefined,
        payment_method_id: paymentMethodIdFilter.value || undefined,
        status: statusFilter.value || undefined,
        sort_field: sortField.value,
        sort_direction: sortDirection.value,
        date_from: dateRange.value.from || undefined,
        date_to: dateRange.value.to || undefined,
        delivery_only: deliveryOnly.value || undefined,
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
      message: error.data?.message || error.message || t('ventas.ordenes.exportError')
    }
    showExportModal.value = true
  } finally {
    isExporting.value = false
  }
}

const handleSort = (event: string | { field: string; direction?: 'asc' | 'desc' }) => {
  const field = typeof event === 'string' ? event : event.field
  if (!field) return
  const direction =
    typeof event === 'object' && event.direction
      ? event.direction
      : sortField.value === field && sortDirection.value === 'asc'
        ? 'desc'
        : 'asc'

  sortField.value = field
  sortDirection.value = direction
  currentPage.value = 1
}

const { formatDateTime: formatDate, formatCurrency } = useFormatters()

const getPaymentStatusLabel = (status: string | null | undefined) => {
  if (ventasPaymentStatusIsUnpaid(status)) return t('ventas.common.pendiente')
  const labels: Record<string, string> = {
    'paid': t('ventas.common.pagado'),
    'credit': t('ventas.common.credito'),
    'partial': t('ventas.common.parcial')
  }
  return labels[status] ?? status
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    'completed': t('ventas.common.completada'),
    'cancelled': t('ventas.common.cancelada'),
    'pending': t('ventas.common.pendientes')
  }
  return labels[status] || status
}


const statusPills = computed(() => [
  { label: t('ventas.common.todas'), value: null },
  { label: t('ventas.common.completadas'), value: 'completed' },
  { label: t('ventas.common.canceladas'), value: 'cancelled' },
  { label: t('ventas.common.pendientes'), value: 'pending' },
])

const statusHeaderOptions = computed(() => [
  { label: t('ventas.common.completadas'), value: 'completed' },
  { label: t('ventas.common.canceladas'), value: 'cancelled' },
  { label: t('ventas.common.pendientes'), value: 'pending' },
])

const paymentHeaderOptions = computed(() => {
  const options: { label: string; value: string }[] = []
  for (const group of paymentGroups.value) {
    options.push({ label: group.name, value: `g:${group.slug}` })
    for (const method of group.methods ?? []) {
      options.push({ label: method.name, value: `m:${method.id}` })
    }
  }
  return options
})

const statusHeaderFilter = computed({
  get: () => statusFilter.value ?? '',
  set: (value: string | boolean) => {
    statusFilter.value = typeof value === 'string' && value ? value : null
    currentPage.value = 1
  },
})

const paymentHeaderFilter = computed({
  get: () => paymentFilter.value ?? '',
  set: (value: string | boolean) => {
    paymentFilter.value = typeof value === 'string' && value ? value : null
    currentPage.value = 1
  },
})

const { formatDateTime: formatDateCompact } = useFormatters()

const getOrderSourceLabel = (order: any) => {
  if (order?.is_delivery) return t('ventas.common.domicilio')
  if (order?.source === 'barra') return t('ventas.common.barra')
  if (order?.source === 'mesa') return tableSingular.value
  return t('ventas.common.pos')
}

const viewOrderDetails = (order: any) => {
  navigateTo(`/ventas/${order.id}`)
}

// ── Monthly accounting period lock (#362) ─────────────────────────────────
const { isOrderLocked, fetchPeriodStatus, closedPeriods } = useClosedPeriods()

// When orders load, pre-fetch period status for each distinct year-month present
watch(orders, async (list) => {
  const seen = new Set<string>()
  for (const o of list) {
    const d = o.order_date
    if (!d) continue
    const dt = new Date(d)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    if (!seen.has(key)) {
      seen.add(key)
      fetchPeriodStatus(dt.getFullYear(), dt.getMonth() + 1)
    }
  }
}, { immediate: true })

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
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:search-field="apiSearchField"
        v-model:date-range="dateRangeDates"
        :search-fields="orderSearchFields"
        :search-placeholder="t('ventas.ordenes.searchPlaceholder')"
        :preset-dates="presetDates"
        :format-date-range="formatDateRange"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
        <!-- Payment Method Filter -->
        <select
          v-model="paymentFilter"
          @change="() => { currentPage.value = 1 }"
          :class="[filterSelectClass, 'md:hidden']"
        >
          <option :value="null">{{ t('ventas.common.metodoPagoShort') }}</option>
          <template v-for="group in paymentGroups">
            <optgroup v-if="group.methods?.length" :key="`g-${group.slug}`" :label="group.name">
              <option :value="`g:${group.slug}`">{{ t('ventas.ordenes.allInGroup', { name: group.name }) }}</option>
              <option v-for="m in group.methods" :key="m.id" :value="`m:${m.id}`">{{ m.name }}</option>
            </optgroup>
            <option v-else :key="group.slug" :value="`g:${group.slug}`">{{ group.name }}</option>
          </template>
        </select>

        <!-- Status Filter -->
        <select
          v-model="statusFilter"
          @change="() => { currentPage.value = 1 }"
          :class="[filterSelectClass, 'md:hidden']"
        >
          <option :value="null">{{ t('ventas.ordenes.filterEstado') }}</option>
          <option value="completed">{{ t('ventas.common.completadas') }}</option>
          <option value="cancelled">{{ t('ventas.common.canceladas') }}</option>
          <option value="pending">{{ t('ventas.common.pendientes') }}</option>
        </select>

        <!-- Delivery-only filter chip -->
        <label
          class="flex items-center gap-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border-2 transition-colors flex-shrink-0 md:hidden"
          :class="deliveryOnly
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'border-border bg-background text-text-secondary hover:text-text-primary hover:border-emerald-400'"
        >
          <input
            v-model="deliveryOnly"
            type="checkbox"
            class="sr-only"
            :aria-label="t('ventas.ordenes.deliveryOnlyAria')"
            @change="() => { currentPage.value = 1 }"
          />
          <span class="text-sm font-semibold">{{ t('ventas.ordenes.deliveryOnly') }}</span>
        </label>
        </template>

        <template #trailing>
        <!-- Export Button (Desktop only) -->
        <button
          @click="exportOrders"
          :disabled="isExporting"
          class="hidden md:flex h-10 px-3 items-center gap-2 rounded-lg border-2 border-border bg-background text-text-secondary text-sm font-medium hover:text-text-primary hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :aria-label="isExporting ? t('ventas.ordenes.exporting') : t('ventas.ordenes.exportAria')"
        >
          <svg v-if="!isExporting" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ isExporting ? t('ventas.ordenes.sending') : t('ventas.ordenes.export') }}</span>
        </button>

        <!-- Nueva Venta Button (Desktop only) -->
        <NuxtLink
          to="/ventas/crear"
          class="hidden md:flex h-10 px-3 items-center gap-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/10 transition-colors whitespace-nowrap shrink-0"
          :aria-label="t('ventas.ordenes.newManual')"
        >
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{{ t('ventas.ordenes.manual') }}</span>
        </NuxtLink>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Bulk Action Bar -->
      <div
        v-if="selectedIds.length > 0"
        class="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border-2 border-primary/30 bg-primary/5"
      >
          <div class="flex items-center gap-2 flex-shrink-0">
            <span class="text-sm font-semibold text-text-primary">{{ t('ventas.ordenes.selectedCount', { count: selectedIds.length }) }}</span>
            <button type="button" @click="clearSelection" class="text-xs text-text-secondary hover:text-text-primary underline">{{ t('ventas.ordenes.deselect') }}</button>
          </div>

          <div class="flex-1" />

          <select
            v-model="bulkStatus"
            :class="filterSelectClass"
          >
            <option value="">{{ t('ventas.ordenes.changeStatus') }}</option>
            <option value="completed">{{ t('ventas.common.completada') }}</option>
            <option v-if="!bulkSelectionHasCompleted" value="pending">{{ t('ventas.common.pendiente') }}</option>
            <option value="cancelled">{{ t('ventas.common.cancelada') }}</option>
          </select>

          <select
            v-if="bulkStatus === 'completed'"
            v-model="bulkPaymentSelectValue"
            :class="filterSelectClass"
          >
            <option value="">{{ t('ventas.ordenes.paymentMethodPlaceholder') }}</option>
            <template v-for="group in paymentGroups" :key="group.id">
              <option :value="`${group.slug}:`">{{ group.name }}</option>
              <optgroup v-if="group.methods?.length" :label="group.name">
                <option v-for="m in group.methods" :key="m.id" :value="`${group.slug}:${m.id}`">
                  {{ group.name }} · {{ m.name }}
                </option>
              </optgroup>
            </template>
          </select>

          <button
            @click="bulkUpdateStatus"
            :disabled="!bulkStatus || isBulkUpdating || (bulkStatus === 'completed' && !hasBulkPaymentSelected)"
            class="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <UiLoadingDots v-if="isBulkUpdating" size="12px" />
            <span v-else>{{ t('ventas.common.aplicar') }}</span>
          </button>

          <button @click="clearSelection" class="h-9 px-3 rounded-lg border border-border text-sm text-text-secondary hover:text-text-primary transition-colors">
            {{ t('ventas.common.cancelar') }}
          </button>
        </div>

      <!-- Table loading (filter change, no cached data yet) -->
      <div v-if="isRefreshing && orders.length === 0" class="flex items-center justify-center min-h-[200px]">
        <CommonsTheCustomLoader size="medium" />
      </div>

      <!-- Responsive Data View -->
      <UiResponsiveDataView
        v-else
        :columns="ordersTableColumns"
        :data="orders"
        :sort-field="sortField"
        :sort-direction="sortDirection"
        :row-class="getRowClass"
        @sort="handleSort"
        @row-click="viewOrderDetails"
        :empty-message="t('ventas.ordenes.emptyTitle')"
        :empty-sub-message="t('ventas.ordenes.emptySub')"
        variant="default"
        row-size="sm"
      >
        <!-- Mobile Card: zebra stripes + UiStatusBadge -->
        <template #card="{ item, index }">
          <div
            v-if="item"
            @click="viewOrderDetails(item)"
            class="flex items-center gap-3 py-3 px-3 border-b border-border cursor-pointer transition-colors hover:bg-data-table-row-hover-bg"
            :class="orderRowClass(item, index)"
          >
            <!-- Left: order info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-baseline gap-2">
                <span class="text-sm font-bold text-text-primary">#{{ item.order_number }}</span>
                <span class="text-xs text-text-secondary">{{ formatDateCompact(item.order_date) }}</span>
                <!-- Lock icon for closed accounting period -->
                <span
                  v-if="isOrderLocked(item)"
                  :title="t('ventas.ordenes.lockedPeriod')"
                  class="inline-flex items-center text-text-secondary"
                  :aria-label="t('ventas.ordenes.lockedPeriodShort')"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
              </div>
              <p class="text-xs text-text-secondary mt-0.5 truncate">
                {{ getInvoiceLabel(item) }} · {{ item.items_count }} {{ t('ventas.common.items') }} · {{ resolveLabel(item.payment_method, item.payment_method_id) }} · {{ getOrderSourceLabel(item) }}
              </p>
              <p v-if="item.discount_amount > 0" class="text-xs text-destructive mt-0.5">{{ t('ventas.ordenes.manualDiscountLine', { amount: formatCurrency(item.discount_amount) }) }}</p>
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


        <template #header-select>
          <div class="flex items-center justify-center">
            <UiBulkSelectCheckbox :checked="allPageSelected" @change="toggleSelectAll" />
          </div>
        </template>

        <template #header-source>
          <UiTableHeaderFilter
            v-model="deliveryOnly"
            :title="t('ventas.ordenes.colSource')"
            filter-type="toggle"
            :toggle-label="t('ventas.ordenes.deliveryOnly')"
            align="center"
          />
        </template>

        <template #header-payment_method>
          <UiTableHeaderFilter
            v-model="paymentHeaderFilter"
            :title="t('ventas.common.metodoPago')"
            column-key="payment_method"
            sortable
            :sort-field="sortField"
            :sort-direction="sortDirection"
            filter-type="select"
            :options="paymentHeaderOptions"
            :all-label="t('ventas.common.metodoPagoShort')"
            align="left"
            @sort="handleSort"
          />
        </template>

        <template #header-status>
          <UiTableHeaderFilter
            v-model="statusHeaderFilter"
            :title="t('ventas.common.estado')"
            filter-type="select"
            :options="statusHeaderOptions"
            :all-label="t('ventas.common.estado')"
            align="center"
          />
        </template>

        <template #cell-select="{ row }">
          <UiBulkSelectCheckbox
            v-if="row"
            :checked="selectedIds.includes(row.id)"
            @change="toggleSelect(row.id)"
          />
        </template>

        <!-- Desktop Table Cells -->
        <template #cell-order_number="{ value, row }">
          <span class="inline-flex items-center gap-1.5">
            <span class="text-sm font-bold text-text-primary">#{{ value }}</span>
            <!-- Lock icon for closed accounting period -->
            <span
              v-if="row && isOrderLocked(row)"
              :title="t('ventas.ordenes.lockedPeriod')"
              class="inline-flex items-center text-text-secondary"
              :aria-label="t('ventas.ordenes.lockedPeriodShort')"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </span>
          </span>
        </template>

        <template #cell-order_date="{ value }">
          <span class="text-sm text-text-secondary">{{ formatDate(value) }}</span>
        </template>

        <template #cell-invoice="{ row }">
          <span
            v-if="row"
            class="text-sm font-medium"
            :class="row.invoice_number ? 'text-text-primary' : 'text-text-secondary'"
          >
            {{ getInvoiceLabel(row) }}
          </span>
        </template>

        <template #cell-items_count="{ value }">
          <span class="text-sm text-text-secondary">{{ value }}</span>
        </template>

        <template #cell-source="{ value, row }">
          <span
            class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            :class="row?.is_delivery
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : value === 'barra' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : value === 'mesa' ? 'bg-crocus-100 text-crocus-700 dark:bg-crocus-900/30 dark:text-crocus-400'
              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'"
          >
            {{ getOrderSourceLabel(row) }}
          </span>
        </template>

        <template #cell-payment_method="{ row }">
          <UiStatusBadge
            v-if="row?.split_payments_count > 1"
            :value="t('ventas.ordenes.splitCount', { count: row.split_payments_count })"
            format="text"
            variant="secondary"
            size="sm"
          />
          <UiStatusBadge
            v-else
            :value="row?.payment_method ? resolveLabel(row.payment_method, row.payment_method_id) : t('ventas.common.sinRegistrar')"
            format="text"
            :variant="row?.payment_method === 'cash' ? 'success' : row?.payment_method === 'card' ? 'info' : row?.payment_method === 'digital' ? 'primary' : row?.payment_method === 'credit' ? 'warning' : 'secondary'"
            size="sm"
          />
        </template>

        <template #cell-payment_status="{ value }">
          <UiStatusBadge
            :value="getPaymentStatusLabel(value)"
            format="text"
            :variant="ventasPaymentStatusIsUnpaid(value) || value === 'partial' || value === 'credit' ? 'warning' : 'success'"
            size="sm"
          />
        </template>

        <template #cell-discount_amount="{ value }">
          <span v-if="value > 0" class="text-sm font-medium text-destructive tabular-nums">-{{ formatCurrency(value) }}</span>
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

      <!-- Pagination -->
      <div v-if="ordersTotal > 0" class="flex items-center justify-end px-1 py-2">
        <div class="flex items-center gap-1">
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.primeraPagina')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
          <button
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaAnterior')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span class="px-3 py-1 text-sm font-medium text-text-primary">{{ currentPage }}</span>
          <button
            :disabled="currentPage >= ordersTotalPages"
            @click="goToPage(currentPage + 1)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.paginaSiguiente')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            :disabled="currentPage >= ordersTotalPages"
            @click="goToPage(ordersTotalPages)"
            class="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-border text-text-secondary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :aria-label="t('ventas.common.ultimaPagina')"
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
            {{ exportResult?.success ? 'Reporte Enviado' : t('ventas.ordenes.exportErrorTitle') }}
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
