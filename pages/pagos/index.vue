<template>
  <div class="page-layout">
    <div class="page-header">
      <div class="flex justify-end items-center">
        <button @click="refresh"
          class="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Refrescar listado">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SharedMetricCard title="Total Pendiente" :value="totalPending" format="currency"
          :subtitle="`${pendingPurchases.length} facturas pendientes`" variant="primary" :icon="CurrencyDollarIcon"
          :show-icon="false" />

        <SharedMetricCard title="Vencen Esta Semana" :value="dueThisWeek" format="currency"
          :subtitle="`${dueThisWeekCount} facturas`" variant="primary" :icon="ClockIcon" :show-icon="false" />

        <SharedMetricCard title="Pagado Este Mes" :value="paidThisMonth" format="currency"
          :subtitle="`${paidThisMonthCount} facturas pagadas`" variant="primary" :icon="CheckCircleIcon"
          :show-icon="false" />
      </div>

      <!-- Pending Payments Table -->
      <div class="bg-surface border-2 border-border rounded-lg">
        <div class="p-6 border-b-2 border-border flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-text-primary">Órdenes Pendientes de Pago</h3>
            <p v-if="selectedPurchases.length > 0" class="text-sm text-text-secondary mt-1">
              {{ selectedPurchases.length }} orden(es) seleccionada(s)
            </p>
          </div>
          <button
            v-if="selectedPurchases.length > 0"
            @click="openBulkPaymentModal"
            class="btn-primary px-4 py-2 rounded-lg text-sm flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Registrar Pago ({{ selectedPurchases.length }})</span>
          </button>
        </div>

        <UiDataTable :columns="pendingColumns" :data="pendingTableData"
          variant="default" empty-message="No hay pagos pendientes. Todas las órdenes verificadas han sido pagadas."
          :show-title="false">
          <template #cell-seleccion="{ row }">
            <input
              type="checkbox"
              :checked="isSelected(row.purchaseData.id)"
              @change="toggleSelection(row.purchaseData)"
              class="h-4 w-4 text-primary focus:ring-primary border-border rounded cursor-pointer"
            />
          </template>

          <template #cell-orden="{ row }">
            <div>
              <p class="font-medium text-text-primary">{{ row.orden }}</p>
              <p class="text-xs text-text-secondary">{{ row.fecha }}</p>
            </div>
          </template>

          <template #cell-factura="{ row }">
            <div>
              <p class="font-medium text-text-primary">{{ row.factura || '-' }}</p>
              <p class="text-xs text-text-secondary">{{ row.fechaFactura || '-' }}</p>
            </div>
          </template>

          <template #cell-vencimiento="{ row }">
            <span v-if="row.vencimiento" :class="[
              'px-2 py-1 rounded text-xs font-medium',
              row.estaVencido ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
            ]">
              {{ row.vencimiento }}
            </span>
            <span v-else class="text-text-secondary">-</span>
          </template>

          <template #cell-acciones="{ row }">
            <button @click="openPaymentModal(row.purchaseData)" class="btn-secondary px-4 py-2 rounded-lg text-sm">
              Pago Individual
            </button>
          </template>
        </UiDataTable>
      </div>

      <!-- Paid Purchases Table -->
      <UiDataTable title="Órdenes Pagadas" :columns="paidColumns" :data="paidTableData" variant="default"
        empty-message="No hay pagos registrados. Aún no se han registrado pagos a proveedores.">
        <template #cell-orden="{ row }">
          <div>
            <p class="font-medium text-text-primary">{{ row.orden }}</p>
            <p class="text-xs text-text-secondary">{{ row.fecha }}</p>
          </div>
        </template>

        <template #cell-factura="{ row }">
          <div>
            <p class="font-medium text-text-primary">{{ row.factura || '-' }}</p>
            <p class="text-xs text-text-secondary">{{ row.fechaFactura || '-' }}</p>
          </div>
        </template>

        <template #cell-montoPagado="{ row }">
          <p class="font-medium text-text-primary">
            {{ formatCurrency(row.montoPagado) }}
          </p>
        </template>

        <template #cell-metodo="{ row }">
          <span class="capitalize">{{ row.metodo || '-' }}</span>
        </template>

        <template #cell-estado="{ row }">
          <span class="px-2 py-1 rounded text-xs font-medium bg-success/10 text-success">
            Pagado
          </span>
        </template>
      </UiDataTable>
    </div>

    <!-- Payment Modal -->
    <PurchasesPayPurchaseModal
      v-if="selectedPurchase || selectedPurchases.length > 0"
      :is-open="showPaymentModal"
      :purchase-id="selectedPurchase?.id"
      :purchases="selectedPurchases"
      @close="closePaymentModal"
      @paid="handlePaymentCompleted" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CurrencyDollarIcon, ClockIcon, CheckCircleIcon } from '@heroicons/vue/24/outline'

definePageMeta({
  layout: 'dashboard'
})

useHead({
  title: 'Pagos - Warocol',
  meta: [
    { name: 'description', content: 'Gestión de pagos a proveedores' }
  ]
})

// State
const showPaymentModal = ref(false)
const selectedPurchase = ref<any>(null)
const selectedPurchases = ref<any[]>([])

// Tenant reactivity
const { onTenantChange, currentTenant } = useTenantReactive()

// Fetch suppliers using useAsyncData
const { data: suppliersData } = useAsyncData(
  `suppliers-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/providers', {
    query: { limit: 250 }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

const suppliers = computed(() => suppliersData.value?.data || [])

// Fetch all purchases using useAsyncData
const { data: purchasesData, pending: loading, refresh } = useAsyncData(
  `purchases-payments-${currentTenant.value?.id || 'default'}`,
  () => $fetch('/api/suppliers/purchases', {
    query: { limit: 250 }
  }),
  {
    server: false,
    watch: [currentTenant],
    default: () => ({ data: [] })
  }
)

// Filter pending purchases based on payment_type and status
const pendingPurchases = computed(() => {
  const allPurchases = purchasesData.value?.data || []
  const filtered = []

  for (const p of allPurchases) {
    // For "contado" payment type, show purchases in confirmed/preparing status (waiting for payment before invoice)
    if (p.payment_type === 'contado' && (p.status === 'confirmed' || p.status === 'preparing')) {
      filtered.push(p)
    }
    // For other payment types (credito, contraentrega, etc.), show verified purchases (traditional flow)
    else if (p.payment_type !== 'contado' && p.status === 'verified') {
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
const totalPending = computed(() => {
  return pendingPurchases.value.reduce((sum, p) => {
    const invoiceAmount = p.invoice_amount ? parseFloat(p.invoice_amount) : null
    const totalAmount = parseFloat(p.total_amount || 0)
    const taxAmount = parseFloat(p.tax_amount || 0)
    return sum + (invoiceAmount || (totalAmount + taxAmount))
  }, 0)
})

const dueThisWeek = computed(() => {
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  return pendingPurchases.value
    .filter(p => {
      if (!p.payment_due_date) return false
      const dueDate = new Date(p.payment_due_date)
      return dueDate >= today && dueDate <= nextWeek
    })
    .reduce((sum, p) => {
      const invoiceAmount = p.invoice_amount ? parseFloat(p.invoice_amount) : null
      const totalAmount = parseFloat(p.total_amount || 0)
      const taxAmount = parseFloat(p.tax_amount || 0)
      return sum + (invoiceAmount || (totalAmount + taxAmount))
    }, 0)
})

const dueThisWeekCount = computed(() => {
  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

  return pendingPurchases.value.filter(p => {
    if (!p.payment_due_date) return false
    const dueDate = new Date(p.payment_due_date)
    return dueDate >= today && dueDate <= nextWeek
  }).length
})

const paidThisMonth = computed(() => {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return paidPurchases.value
    .filter(p => {
      const dateToUse = p.payment_date || p.paid_at
      if (!dateToUse) return false
      const paymentDate = new Date(dateToUse)
      return paymentDate >= firstDayOfMonth
    })
    .reduce((sum, p) => {
      const paymentAmount = p.payment_amount ? parseFloat(p.payment_amount) : null
      const invoiceAmount = p.invoice_amount ? parseFloat(p.invoice_amount) : null
      const totalAmount = parseFloat(p.total_amount || 0)
      const taxAmount = parseFloat(p.tax_amount || 0)
      return sum + (paymentAmount || invoiceAmount || (totalAmount + taxAmount))
    }, 0)
})

const paidThisMonthCount = computed(() => {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  return paidPurchases.value.filter(p => {
    const dateToUse = p.payment_date || p.paid_at
    if (!dateToUse) return false
    const paymentDate = new Date(dateToUse)
    return paymentDate >= firstDayOfMonth
  }).length
})

// Table columns configuration
const pendingColumns = [
  { key: 'seleccion', title: '', sortable: false, align: 'center' as const },
  { key: 'orden', title: 'Orden', sortable: true, align: 'left' as const },
  { key: 'proveedor', title: 'Proveedor', sortable: true, align: 'left' as const },
  { key: 'factura', title: 'Factura', sortable: false, align: 'left' as const },
  { key: 'monto', title: 'Monto', sortable: true, align: 'right' as const, format: 'currency' as const },
  { key: 'vencimiento', title: 'Vencimiento', sortable: true, align: 'left' as const },
  { key: 'acciones', title: 'Acciones', sortable: false, align: 'center' as const }
]

const paidColumns = [
  { key: 'orden', title: 'Orden', sortable: true, align: 'left' as const },
  { key: 'proveedor', title: 'Proveedor', sortable: true, align: 'left' as const },
  { key: 'factura', title: 'Factura', sortable: false, align: 'left' as const },
  { key: 'montoPagado', title: 'Monto Pagado', sortable: true, align: 'right' as const, format: 'currency' as const },
  { key: 'fechaPago', title: 'Fecha de Pago', sortable: true, align: 'left' as const, format: 'text' as const },
  { key: 'metodo', title: 'Método', sortable: false, align: 'left' as const },
  { key: 'estado', title: 'Estado', sortable: false, align: 'center' as const }
]

// Transform pending purchases data for table
const pendingTableData = computed(() => {
  return pendingPurchases.value.map(purchase => ({
    orden: purchase.purchase_number,
    fecha: formatDate(purchase.purchase_date),
    proveedor: getSupplierName(purchase),
    factura: purchase.invoice_number,
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
    fecha: formatDate(purchase.purchase_date),
    proveedor: getSupplierName(purchase),
    factura: purchase.invoice_number,
    fechaFactura: formatDate(purchase.invoice_date),
    montoPagado: parseFloat(purchase.payment_amount || purchase.invoice_amount || '0') || (parseFloat(purchase.total_amount || '0') + parseFloat(purchase.tax_amount || '0')),
    fechaPago: formatDate(purchase.payment_date_final || purchase.payment_date || purchase.paid_at),
    metodo: purchase.payment_method_final || purchase.payment_method
  }))
})

// Helper functions
function getSupplierName(purchase: any): string {
  if (purchase.supplier_name) {
    return purchase.supplier_name
  }
  const supplier = suppliers.value.find(s => s.id === purchase.supplier_id)
  return supplier?.name || 'N/A'
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' })
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
  const today = new Date()
  const due = new Date(dueDate)
  return due < today
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

// Modal functions
function openPaymentModal(purchase: any) {
  selectedPurchase.value = purchase
  selectedPurchases.value = [] // Clear bulk selection
  showPaymentModal.value = true
}

function openBulkPaymentModal() {
  selectedPurchase.value = null
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
  selectedPurchase.value = null
  selectedPurchases.value = []
}

async function handlePaymentCompleted() {
  closePaymentModal()
  await refresh() // Use the refresh from useAsyncData
}
</script>
