<template>
  <div class="page-layout">

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Filters Bar -->
      <UiAdvancedFiltersBar
        v-model:search="localSearchTerm"
        v-model:search-field="apiSearchField"
        :search-fields="searchFields"
        search-placeholder="Buscar órdenes..."
        :show-date-range="false"
        :show-clear="hasActiveFilters"
        @search="performSearch"
        @clear="clearFilters"
      >
        <template #additional-filters>
          <select
            v-model="selectedSupplierFilter"
            :class="[filterSelectClass, 'md:hidden']"
            aria-label="Filtrar por proveedor"
          >
            <option value="">Proveedor</option>
            <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>

          <select
            v-model="selectedDateFilter"
            :class="filterSelectClass"
            aria-label="Filtrar por período"
          >
            <option v-for="opt in purchaseDateFilterOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </template>
      </UiAdvancedFiltersBar>

      <!-- Pending Payments -->
      <div class="bg-surface rounded-lg">
        <!-- Header -->
        <div class="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border">
          <div>
            <h3 class="text-lg font-semibold text-text-primary">Órdenes Pendientes de Pago</h3>
            <p v-if="selectedPurchases.length > 0" class="text-sm text-text-secondary mt-1">
              {{ selectedPurchases.length }} orden(es) seleccionada(s)
            </p>
          </div>
          <button v-if="selectedPurchases.length > 0" @click="navigateToPayment(selectedPurchases)"
            class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center justify-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Registrar Pago ({{ selectedPurchases.length }})</span>
          </button>
        </div>

        <!-- Mobile: Cards -->
        <div class="md:hidden p-4">
          <div v-if="filteredPendingTableData.length === 0" class="text-center py-12">
            <p class="text-text-primary font-medium">No hay pagos pendientes</p>
            <p class="text-muted-foreground text-sm mt-1">Todas las órdenes verificadas han sido pagadas.</p>
          </div>
          <div v-else class="grid grid-cols-1 gap-3">
            <PaymentsPendingPaymentCard v-for="payment in filteredPendingTableData" :key="payment.purchaseData.id"
              :payment="payment" :is-selected="isSelected(payment.purchaseData.id)" @toggle-selection="toggleSelection"
              @pay="navigateToPayment([payment.purchaseData])" />
          </div>
        </div>

        <!-- Desktop: Table -->
        <div class="hidden md:block">
          <UiDataTable :columns="pendingColumns" :data="filteredPendingTableData" variant="default"
            empty-message="No hay pagos pendientes. Todas las órdenes verificadas han sido pagadas."
            :show-title="false"
            :sort-field="sortField"
            :sort-direction="sortDirection"
            @sort="handleSort">
            <template #header-proveedor>
              <UiTableHeaderFilter
                v-model="selectedSupplierFilter"
                title="Proveedor"
                column-key="proveedor"
                sortable
                :sort-field="sortField"
                :sort-direction="sortDirection"
                filter-type="select"
                :options="supplierHeaderOptions"
                all-label="Proveedor"
                align="left"
                @sort="handleSort"
              />
            </template>

            <template #cell-seleccion="{ row }">
              <input type="checkbox" :checked="isSelected(row.purchaseData.id)"
                @change="toggleSelection(row.purchaseData)"
                class="h-4 w-4 text-primary focus:ring-primary border-border rounded cursor-pointer" />
            </template>

            <template #cell-orden="{ row }">
              <span class="text-sm font-bold text-text-primary">{{ row.orden }}</span>
            </template>

            <template #cell-factura="{ row }">
              <span class="text-sm text-text-secondary">{{ row.factura }}</span>
            </template>

            <template #cell-vencimiento="{ row }">
              <span v-if="row.vencimiento" :class="[
                'px-2 py-1 rounded text-xs',
                row.estaVencido ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
              ]">
                {{ row.vencimiento }}
              </span>
              <span v-else class="text-text-secondary">-</span>
            </template>

            <template #cell-acciones="{ row }">
              <button @click="navigateToPayment([row.purchaseData])" class="btn-secondary px-4 py-2 rounded-lg text-sm">
                Pago Individual
              </button>
            </template>
          </UiDataTable>
        </div>
      </div>

      <!-- Paid Purchases -->
      <div class="bg-surface rounded-lg">
        <!-- Header -->
        <div class="p-4 md:p-6 border-b border-border">
          <h3 class="text-lg font-semibold text-text-primary">Órdenes Pagadas</h3>
        </div>

        <!-- Mobile: Cards -->
        <div class="md:hidden p-4">
          <div v-if="filteredPaidTableData.length === 0" class="text-center py-12">
            <p class="text-text-primary font-medium">No hay pagos registrados</p>
            <p class="text-muted-foreground text-sm mt-1">Aún no se han registrado pagos a proveedores.</p>
          </div>
          <div v-else class="grid grid-cols-1 gap-3">
            <PaymentsPaidPaymentCard v-for="payment in filteredPaidTableData" :key="payment.purchaseData.id"
              :payment="payment" />
          </div>
        </div>

        <!-- Desktop: Table -->
        <div class="hidden md:block">
          <UiDataTable :columns="paidColumns" :data="filteredPaidTableData" variant="default"
            empty-message="No hay pagos registrados. Aún no se han registrado pagos a proveedores." :show-title="false"
            :sort-field="sortField"
            :sort-direction="sortDirection"
            @sort="handleSort">
            <template #header-proveedor>
              <UiTableHeaderFilter
                v-model="selectedSupplierFilter"
                title="Proveedor"
                column-key="proveedor"
                sortable
                :sort-field="sortField"
                :sort-direction="sortDirection"
                filter-type="select"
                :options="supplierHeaderOptions"
                all-label="Proveedor"
                align="left"
                @sort="handleSort"
              />
            </template>

            <template #cell-orden="{ row }">
              <span :class="['text-sm font-bold text-text-primary', { 'animate-pulse': row.isHighlighted }]">{{ row.orden }}</span>
            </template>

            <template #cell-fechaOrden="{ row }">
              <span :class="['text-sm text-text-secondary', { 'animate-pulse': row.isHighlighted }]">{{ row.fechaOrden }}</span>
            </template>

            <template #cell-factura="{ row }">
              <span class="text-sm text-text-secondary">{{ row.factura }}</span>
            </template>

            <template #cell-montoPagado="{ row }">
              <span class="text-sm font-bold text-primary">{{ formatCurrency(row.montoPagado) }}</span>
            </template>

            <template #cell-metodo="{ row }">
              <span class="text-sm text-text-secondary capitalize">{{ row.metodo || '-' }}</span>
            </template>

            <template #cell-estado="{ row }">
              <span :class="[
                'px-2 py-1 rounded text-xs',
                row.isHighlighted
                  ? 'bg-success/30 text-success border-2 border-success animate-pulse'
                  : 'bg-success/10 text-success'
              ]">
                {{ row.isHighlighted ? '✓ Pagado (desde compra)' : 'Pagado' }}
              </span>
            </template>
          </UiDataTable>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, onMounted } from 'vue'
import { CurrencyDollarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'
import { useFormatters } from '~/composables/useFormatters'

definePageMeta({
  layout: 'dashboard',
  title: 'Gestión de Pagos',
  module: 'finanzas',
})

useHead({
  title: 'Gestión de Pagos - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de pagos a proveedores' }
  ]
})

// State
const selectedPurchases = ref<any[]>([])

// Get route for query params
const route = useRoute()
const highlightId = ref<string | null>(null)

// Filter state — AdvancedFiltersBar (#765); init from query params
const { localSearchTerm, appliedSearch, performSearch: applySearch, clearSearch } = useAppliedSearch()
appliedSearch.value = (route.query.search as string) || ''
localSearchTerm.value = appliedSearch.value
const apiSearchField = ref((route.query.search_field as string) || 'purchase_number')
const selectedSupplierFilter = ref((route.query.supplier_id as string) || '')
const selectedStatusFilter = ref((route.query.payment_status as string) || '')
const { dateFilter: selectedDateFilter, purchaseDateFilterOptions, clearPurchaseDateFilter } = usePurchaseDateFilter()
selectedDateFilter.value = (route.query.date_filter as string) || ''

// Sorting state
const sortField = ref('')
const sortDirection = ref<'asc' | 'desc'>('asc')

const searchFields = [
  { label: 'N° Orden', value: 'purchase_number' },
  { label: 'N° Factura', value: 'invoice_number' },
  { label: 'Proveedor', value: 'supplier_name' }
]

const statusOptions = [
  { label: 'Pendiente', value: 'pending' },
  { label: 'Vencido', value: 'overdue' },
  { label: 'Vence esta semana', value: 'due_this_week' }
]

const hasActiveFilters = computed(
  () =>
    !!localSearchTerm.value
    || !!appliedSearch.value
    || !!selectedSupplierFilter.value
    || !!selectedDateFilter.value,
)

const performSearch = () => applySearch()

// Set highlight ID from query params
if (route.query.highlight) {
  highlightId.value = route.query.highlight as string
}

// Tenant reactivity
const { currentTenant } = useTenantReactive()
const { todayISO } = useTenantTimezone()

// Fetch suppliers (static lookup per tenant)
const { data: suppliersData } = useQuery({
  key: () => ['suppliers', 'providers', currentTenant.value?.id],
  query: () => $fetch('/api/suppliers/providers', { params: { limit: 250 } }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const suppliers = computed(() => (suppliersData.value as any)?.data || [])
const supplierHeaderOptions = computed(() =>
  suppliers.value.map((supplier: any) => ({ label: supplier.name, value: supplier.id })),
)

// Fetch all purchases with reactive filters
const { data: purchasesData, status: queryStatus, asyncStatus: queryAsyncStatus, refetch } = useQuery({
  key: () => ['suppliers', 'purchases-payments', currentTenant.value?.id, {
    search: appliedSearch.value || null,
    searchField: apiSearchField.value,
    supplier: selectedSupplierFilter.value || null,
    status: selectedStatusFilter.value || null,
    date: selectedDateFilter.value || null,
  }],
  query: () => $fetch('/api/suppliers/purchases', {
    params: {
      limit: 250,
      search: appliedSearch.value || undefined,
      search_field: apiSearchField.value || undefined,
      supplier_id: selectedSupplierFilter.value || undefined,
      payment_status: selectedStatusFilter.value || undefined,
      date_filter: selectedDateFilter.value || undefined,
    }
  }),
  enabled: () => !!currentTenant.value,
  staleTime: 30_000,
})

const loading = computed(() => !purchasesData.value)
const isRefreshing = computed(() => queryAsyncStatus.value === 'loading' && purchasesData.value != null)

// Inject refresh handler setter from layout
const { setRefreshHandler, clearRefreshHandler, registerProgressiveLoading } = useLayoutActions()

onMounted(() => {
  setRefreshHandler(refetch)
})
registerProgressiveLoading(isRefreshing)
onUnmounted(() => {
  clearRefreshHandler(refetch)
})

// Filter pending purchases based on payment_type and status
// Server-side filtering already applied via query params, just filter by payment flow
const pendingPurchases = computed(() => {
  const allPurchases = purchasesData.value?.data || []
  const filtered = []

  for (const p of allPurchases) {
    // For "contado" payment type, show purchases in confirmed/preparing status (waiting for payment before invoice)
    if (p.payment_type === 'contado' && (p.status === 'confirmed' || p.status === 'preparing')) {
      filtered.push(p)
    }
    // For other payment types (credito, contraentrega, etc.), show received purchases (updated flow)
    else if (p.payment_type !== 'contado' && p.status === 'received') {
      filtered.push(p)
    }
  }

  return filtered
})

// Compute paid purchases from all purchases (those with payment history)
const paidPurchases = computed(() => {
  const allPurchases = purchasesData.value?.data || []
  // A purchase is "paid" if has_payment flag is true (checks history)
  return allPurchases.filter(p => p.has_payment || p.payment_method || p.payment_reference || p.paid_at)
})

// Computed stats


// Table columns configuration
const pendingColumns = [
  { key: 'seleccion', title: '', sortable: false, align: 'center' as const, class: 'font-normal' },
  { key: 'orden', title: 'Orden', sortable: true, align: 'left' as const, class: 'font-bold' },
  { key: 'fechaOrden', title: 'Fecha Orden', sortable: true, align: 'left' as const, class: 'font-normal' },
  { key: 'proveedor', title: 'Proveedor', sortable: true, align: 'left' as const, class: 'font-normal' },
  { key: 'factura', title: 'Factura', sortable: false, align: 'left' as const, class: 'font-normal' },
  { key: 'fechaFactura', title: 'Fecha Factura', sortable: false, align: 'left' as const, class: 'font-normal' },
  { key: 'monto', title: 'Monto', sortable: true, align: 'right' as const, format: 'currency' as const, class: 'font-normal' },
  { key: 'vencimiento', title: 'Vencimiento', sortable: true, align: 'left' as const, class: 'font-normal' },
  { key: 'acciones', title: 'Acciones', sortable: false, align: 'center' as const, class: 'font-normal' }
]

const paidColumns = [
  { key: 'orden', title: 'Orden', sortable: true, align: 'left' as const, class: 'font-bold' },
  { key: 'fechaOrden', title: 'Fecha Orden', sortable: true, align: 'left' as const, class: 'font-normal' },
  { key: 'proveedor', title: 'Proveedor', sortable: true, align: 'left' as const, class: 'font-normal' },
  { key: 'factura', title: 'Factura', sortable: false, align: 'left' as const, class: 'font-normal' },
  { key: 'fechaFactura', title: 'Fecha Factura', sortable: false, align: 'left' as const, class: 'font-normal' },
  { key: 'montoPagado', title: 'Monto Pagado', sortable: true, align: 'right' as const, format: 'currency' as const, class: 'font-normal' },
  { key: 'fechaPago', title: 'Fecha de Pago', sortable: true, align: 'left' as const, format: 'text' as const, class: 'font-normal' },
  { key: 'metodo', title: 'Método', sortable: false, align: 'left' as const, class: 'font-normal' },
  { key: 'estado', title: 'Estado', sortable: false, align: 'center' as const, class: 'font-normal' }
]

// Transform pending purchases data for table
const pendingTableData = computed(() => {
  return pendingPurchases.value.map(purchase => ({
    orden: purchase.purchase_number,
    fechaOrden: formatDate(purchase.purchase_date),
    proveedor: getSupplierName(purchase),
    factura: purchase.invoice_number || '-',
    fechaFactura: formatDate(purchase.invoice_date),
    monto: parseFloat(purchase.invoice_amount || '0') || (parseFloat(purchase.total_amount || '0') + parseFloat(purchase.tax_amount || '0')),
    vencimiento: formatDate(purchase.payment_due_date),
    estaVencido: isOverdue(purchase.payment_due_date),
    purchaseData: purchase
  }))
})

// Transform paid purchases data for table
const paidTableData = computed(() => {
  return paidPurchases.value.map(purchase => ({
    orden: purchase.purchase_number,
    fechaOrden: formatDate(purchase.purchase_date),
    proveedor: getSupplierName(purchase),
    factura: purchase.invoice_number || '-',
    fechaFactura: formatDate(purchase.invoice_date),
    montoPagado: parseFloat(purchase.payment_amount || purchase.invoice_amount || '0') || (parseFloat(purchase.total_amount || '0') + parseFloat(purchase.tax_amount || '0')),
    fechaPago: formatDate(purchase.payment_date_final || purchase.payment_date || purchase.paid_at),
    metodo: purchase.payment_method_final || purchase.payment_method,
    purchaseData: purchase,
    isHighlighted: highlightId.value === purchase.id
  }))
})

// Sort pending data
const sortedPendingTableData = computed(() => {
  if (!sortField.value) return pendingTableData.value

  const sorted = [...pendingTableData.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    // Numeric comparison for numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
    }

    // Date comparison for date fields
    if (sortField.value === 'fechaOrden' || sortField.value === 'fechaFactura' || sortField.value === 'vencimiento') {
      // Dates are already formatted strings, need to convert back
      const dateA = new Date(a.purchaseData.purchase_date || a.purchaseData.invoice_date || a.purchaseData.payment_due_date).getTime()
      const dateB = new Date(b.purchaseData.purchase_date || b.purchaseData.invoice_date || b.purchaseData.payment_due_date).getTime()
      return sortDirection.value === 'asc' ? dateA - dateB : dateB - dateA
    }

    // String comparison
    const strA = String(aValue).toLowerCase()
    const strB = String(bValue).toLowerCase()
    if (sortDirection.value === 'asc') {
      return strA.localeCompare(strB)
    } else {
      return strB.localeCompare(strA)
    }
  })

  return sorted
})

// Sort paid data
const sortedPaidTableData = computed(() => {
  if (!sortField.value) return paidTableData.value

  const sorted = [...paidTableData.value].sort((a, b) => {
    const aValue = a[sortField.value]
    const bValue = b[sortField.value]

    // Handle null/undefined
    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    // Numeric comparison for numbers
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
    }

    // Date comparison for date fields
    if (sortField.value === 'fechaOrden' || sortField.value === 'fechaFactura' || sortField.value === 'fechaPago') {
      // Dates are already formatted strings, need to convert back
      const dateA = new Date(a.purchaseData.purchase_date || a.purchaseData.invoice_date || a.purchaseData.payment_date_final || a.purchaseData.payment_date || a.purchaseData.paid_at).getTime()
      const dateB = new Date(b.purchaseData.purchase_date || b.purchaseData.invoice_date || b.purchaseData.payment_date_final || b.purchaseData.payment_date || b.purchaseData.paid_at).getTime()
      return sortDirection.value === 'asc' ? dateA - dateB : dateB - dateA
    }

    // String comparison
    const strA = String(aValue).toLowerCase()
    const strB = String(bValue).toLowerCase()
    if (sortDirection.value === 'asc') {
      return strA.localeCompare(strB)
    } else {
      return strB.localeCompare(strA)
    }
  })

  return sorted
})

// Filtered data (for backwards compatibility)
const filteredPendingTableData = computed(() => sortedPendingTableData.value)
const filteredPaidTableData = computed(() => sortedPaidTableData.value)

// Helper functions
function getSupplierName(purchase: any): string {
  if (purchase.supplier_name) {
    return purchase.supplier_name
  }
  const supplier = suppliers.value.find(s => s.id === purchase.supplier_id)
  return supplier?.name || 'N/A'
}

const { formatDate: _fmtDate } = useFormatters()
function formatDate(dateString: string | null | undefined): string {
  return _fmtDate(dateString)
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false
  const dueIso = dueDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  return !!dueIso && dueIso < todayISO()
}

// Selection functions
function toggleSelection(purchase: any) {
  const index = selectedPurchases.value.findIndex(p => p.id === purchase.id)
  if (index >= 0) {
    selectedPurchases.value.splice(index, 1)
  } else {
    selectedPurchases.value.push(purchase)
  }
}

function isSelected(purchaseId: string): boolean {
  return selectedPurchases.value.some(p => p.id === purchaseId)
}

// Navigation functions
function navigateToPayment(purchases: any[]) {
  const ids = purchases.map(p => p.id).join(',')
  navigateTo(`/finanzas/pagos/registrar?ids=${ids}`)
}

// Handle sort
function handleSort(field: string) {
  if (sortField.value === field) {
    // Toggle direction
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New field, default to ascending
    sortField.value = field
    sortDirection.value = 'asc'
  }
}

// Filter functions
function clearFilters() {
  clearSearch()
  selectedSupplierFilter.value = ''
  selectedStatusFilter.value = ''
  clearPurchaseDateFilter()
}
</script>
