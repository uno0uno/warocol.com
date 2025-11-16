<template>
  <div class="page-layout">
    <div class="page-header">
      <div class="flex justify-between items-start">
        <div>
          <h1 class="page-title">Gestión de Pagos</h1>
          <p class="page-subtitle">Administra los pagos a proveedores y cuentas por pagar</p>
        </div>
        <button
          @click="refresh"
          class="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
          title="Refrescar listado"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-[60vh]">
      <CommonsTheCustomLoader size="large" />
    </div>

    <!-- Content -->
    <div v-else>
      <!-- Quick Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <!-- Total Pending -->
        <div class="bg-surface border-2 border-border rounded-lg p-6">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-text-secondary mb-2">Total Pendiente</p>
              <p class="text-2xl font-bold text-text-primary">{{ formatCurrency(totalPending) }}</p>
              <p class="text-xs text-text-secondary mt-1">{{ pendingPurchases.length }} facturas pendientes</p>
            </div>
            <div class="bg-warning/10 p-3 rounded-lg">
              <svg class="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Due This Week -->
        <div class="bg-surface border-2 border-border rounded-lg p-6">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-text-secondary mb-2">Vencen Esta Semana</p>
              <p class="text-2xl font-bold text-text-primary">{{ formatCurrency(dueThisWeek) }}</p>
              <p class="text-xs text-text-secondary mt-1">{{ dueThisWeekCount }} facturas</p>
            </div>
            <div class="bg-destructive/10 p-3 rounded-lg">
              <svg class="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Paid This Month -->
        <div class="bg-surface border-2 border-border rounded-lg p-6">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm text-text-secondary mb-2">Pagado Este Mes</p>
              <p class="text-2xl font-bold text-text-primary">{{ formatCurrency(paidThisMonth) }}</p>
              <p class="text-xs text-text-secondary mt-1">{{ paidThisMonthCount }} facturas pagadas</p>
            </div>
            <div class="bg-success/10 p-3 rounded-lg">
              <svg class="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Payments List -->
      <div class="bg-surface border-2 border-border rounded-lg p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-6">Órdenes Pendientes de Pago</h2>

        <!-- Empty State -->
        <div v-if="pendingPurchases.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-text-secondary mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-xl font-bold text-text-primary mb-2">No hay pagos pendientes</h3>
          <p class="text-text-secondary">Todas las órdenes verificadas han sido pagadas</p>
        </div>

        <!-- Purchases Table -->
        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-surface-secondary border-b-2 border-border">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Orden
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Proveedor
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Factura
                </th>
                <th class="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Monto
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Vencimiento
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="purchase in pendingPurchases"
                :key="purchase.id"
                class="hover:bg-surface-secondary/50 transition-colors"
              >
                <td class="px-4 py-4 text-sm">
                  <div>
                    <p class="font-medium text-text-primary">{{ purchase.purchase_number }}</p>
                    <p class="text-xs text-text-secondary">{{ formatDate(purchase.purchase_date) }}</p>
                  </div>
                </td>
                <td class="px-4 py-4 text-sm text-text-primary">
                  {{ getSupplierName(purchase) }}
                </td>
                <td class="px-4 py-4 text-sm">
                  <div>
                    <p class="font-medium text-text-primary">{{ purchase.invoice_number || '-' }}</p>
                    <p class="text-xs text-text-secondary">{{ formatDate(purchase.invoice_date) }}</p>
                  </div>
                </td>
                <td class="px-4 py-4 text-sm text-right">
                  <p class="font-semibold text-text-primary">
                    {{ formatCurrency(parseFloat(purchase.invoice_amount || 0) || (parseFloat(purchase.total_amount || 0) + parseFloat(purchase.tax_amount || 0))) }}
                  </p>
                </td>
                <td class="px-4 py-4 text-sm">
                  <span
                    v-if="purchase.payment_due_date"
                    :class="[
                      'px-2 py-1 rounded text-xs font-medium',
                      isOverdue(purchase.payment_due_date) ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                    ]"
                  >
                    {{ formatDate(purchase.payment_due_date) }}
                  </span>
                  <span v-else class="text-text-secondary">-</span>
                </td>
                <td class="px-4 py-4 text-center">
                  <button
                    @click="openPaymentModal(purchase)"
                    class="btn-primary px-4 py-2 rounded-lg text-sm"
                  >
                    Registrar Pago
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Payment Modal -->
    <PurchasesPayPurchaseModal
      v-if="selectedPurchase"
      :is-open="showPaymentModal"
      :purchase-id="selectedPurchase.id"
      @close="closePaymentModal"
      @paid="handlePaymentCompleted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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
const loading = ref(true)
const pendingPurchases = ref<any[]>([])
const paidPurchases = ref<any[]>([])
const suppliers = ref<any[]>([])
const showPaymentModal = ref(false)
const selectedPurchase = ref<any>(null)

// Fetch suppliers
const { data: suppliersData } = await useFetch('/api/suppliers/providers', {
  server: false,
  query: { limit: 250 }
})

suppliers.value = suppliersData.value?.data || []

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
      if (!p.payment_date) return false
      const paymentDate = new Date(p.payment_date)
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
    if (!p.payment_date) return false
    const paymentDate = new Date(p.payment_date)
    return paymentDate >= firstDayOfMonth
  }).length
})

// Helper functions
function getSupplierName(purchase: any): string {
  // First try to use supplier_name from purchase data
  if (purchase.supplier_name) {
    return purchase.supplier_name
  }
  // Fallback to finding in suppliers array
  const supplier = suppliers.value.find(s => s.id === purchase.supplier_id)
  return supplier?.name || 'N/A'
}

function formatDate(dateString: string | null): string {
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

function isOverdue(dueDate: string): boolean {
  const today = new Date()
  const due = new Date(dueDate)
  return due < today
}

function openPaymentModal(purchase: any) {
  selectedPurchase.value = purchase
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
  selectedPurchase.value = null
}

async function handlePaymentCompleted() {
  closePaymentModal()
  await loadPurchases()
}

async function loadPurchases() {
  try {
    // Load verified purchases (pending payment)
    const verifiedResponse = await $fetch('/api/suppliers/purchases', {
      query: {
        status: 'verified',
        limit: 250
      }
    })
    pendingPurchases.value = verifiedResponse.data || []

    // Load paid purchases (for stats)
    const paidResponse = await $fetch('/api/suppliers/purchases', {
      query: {
        status: 'paid',
        limit: 250
      }
    })
    paidPurchases.value = paidResponse.data || []

    loading.value = false
  } catch (err: any) {
    console.error('Error loading purchases:', err)
    loading.value = false
  }
}

const refresh = async () => {
  loading.value = true
  await loadPurchases()
}

// Load on mount
onMounted(async () => {
  await loadPurchases()
})
</script>
