<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-full"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-full"
      >
        <div
          v-if="shouldShowBar"
          class="fixed bottom-0 left-0 md:left-64 right-0 border-t-2 shadow-lg z-40"
          style="pointer-events: auto; background-color: hsl(var(--surface)); border-top-color: hsl(var(--border));"
        >
        <div class="px-8 py-4">
          <div class="flex justify-between items-center">
            <!-- Back button -->
            <NuxtLink
              to="/abastecimiento/compras"
              class="btn-secondary px-6 py-2 rounded-lg"
            >
              ← Volver a Órdenes
            </NuxtLink>

            <!-- Loading skeleton -->
            <div v-if="isLoadingOrUpdating" class="flex gap-3">
              <div class="flex items-center space-x-2 px-4 py-2 border-2 rounded-lg animate-pulse" style="border-color: hsl(var(--crocus-600) / 0.3); width: 180px; height: 42px;">
                <div class="w-5 h-5 rounded" style="background-color: hsl(var(--surface-secondary));"></div>
                <div class="h-4 rounded flex-1" style="background-color: hsl(var(--surface-secondary));"></div>
              </div>
              <div class="flex items-center space-x-2 px-4 py-2 border-2 rounded-lg animate-pulse" style="border-color: hsl(var(--destructive) / 0.3); width: 150px; height: 42px;">
                <div class="w-5 h-5 rounded" style="background-color: hsl(var(--surface-secondary));"></div>
                <div class="h-4 rounded flex-1" style="background-color: hsl(var(--surface-secondary));"></div>
              </div>
            </div>

            <!-- Action buttons based on current status -->
            <div v-else class="flex gap-3">
              <!-- WAITING: Quotation - Supplier must complete prices -->
              <div
                v-if="currentPurchase.status === 'quotation'"
                class="px-4 py-2 border-2 border-dashed rounded-lg flex items-center space-x-2"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));"
              >
                <svg class="w-5 h-5 animate-pulse" style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Esperando cotización del proveedor</span>
              </div>

              <!-- Confirm (when in pending status) - USER ACTION -->
              <button
                v-if="currentPurchase.status === 'pending'"
                type="button"
                @click="showConfirmModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--success)); color: hsl(var(--success));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--success) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Aprobar Orden</span>
              </button>

              <!-- WAITING: Payment (for "contado" type) or Invoice (for other types) -->
              <div
                v-if="currentPurchase.status === 'confirmed' || currentPurchase.status === 'preparing'"
                class="px-4 py-2 border-2 border-dashed rounded-lg flex items-center space-x-2"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));"
              >
                <svg class="w-5 h-5 animate-pulse" style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span v-if="currentPurchase.payment_type === 'contado'">Esperando pago antes de facturar</span>
                <span v-else>Esperando factura del proveedor</span>
              </div>

              <!-- WAITING: Invoice after payment (for "contado" type only) -->
              <div
                v-if="currentPurchase.status === 'paid' && currentPurchase.payment_type === 'contado'"
                class="px-4 py-2 border-2 border-dashed rounded-lg flex items-center space-x-2"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));"
              >
                <svg class="w-5 h-5 animate-pulse" style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Pago recibido. Esperando factura del proveedor</span>
              </div>

              <!-- WAITING: Ship - Supplier must ship -->
              <div
                v-if="currentPurchase.status === 'invoiced'"
                class="px-4 py-2 border-2 border-dashed rounded-lg flex items-center space-x-2"
                style="border-color: hsl(var(--warning)); color: hsl(var(--text-secondary));"
              >
                <svg class="w-5 h-5 animate-pulse" style="color: hsl(var(--warning));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Esperando envío del proveedor</span>
              </div>

              <!-- Receive (includes quality verification) -->
              <button
                v-if="currentPurchase.status === 'shipped' || currentPurchase.status === 'partially_received'"
                type="button"
                @click="showReceiveModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--crocus-600)); color: hsl(var(--crocus-600));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--crocus-600) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Recibir Orden</span>
              </button>

              <!-- Received state - Redirect to Pagos (only for credit types that haven't been paid yet) -->
              <div
                v-if="currentPurchase.status === 'received' && shouldShowPaymentReminder"
                class="px-4 py-2 border-2 border-dashed rounded-lg flex items-center space-x-2"
                style="border-color: hsl(var(--success)); color: hsl(var(--text-secondary));"
              >
                <svg class="w-5 h-5" style="color: hsl(var(--success));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Orden recibida. Registrar pago en módulo de Pagos</span>
              </div>

              <!-- Received state - Payment already completed (for contado orders) -->
              <div
                v-if="currentPurchase.status === 'received' && !shouldShowPaymentReminder"
                class="px-4 py-2 border-2 border-dashed rounded-lg flex items-center space-x-2"
                style="border-color: hsl(var(--success)); color: hsl(var(--text-secondary));"
              >
                <svg class="w-5 h-5" style="color: hsl(var(--success));" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Orden recibida y pagada. Proceso completado</span>
              </div>

              <!-- Cancel (not available in received state) -->
              <button
                v-if="currentPurchase.status !== 'received'"
                type="button"
                @click="showCancelModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--destructive)); color: hsl(var(--destructive));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--destructive) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Cancelar Orden</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modals (only render when we have a current purchase) -->
    <template v-if="currentPurchaseId && currentPurchase">
      <PurchasesCompletePricesModal
        :is-open="showCompletePricesModal"
        :purchase-id="currentPurchaseId"
        :items="currentPurchase.items"
        :ingredients="ingredients"
        @close="showCompletePricesModal = false"
        @completed="handleStateChanged"
      />

      <PurchasesConfirmPurchaseModal
        :is-open="showConfirmModal"
        :purchase-id="currentPurchaseId"
        :purchase-number="currentPurchase.purchase_number"
        @close="showConfirmModal = false"
        @confirmed="handleStateChanged"
      />

      <PurchasesShipPurchaseModal
        :is-open="showShipModal"
        :purchase-id="currentPurchaseId"
        :purchase-number="currentPurchase.purchase_number"
        @close="showShipModal = false"
        @shipped="handleStateChanged"
      />

      <PurchasesReceivePurchaseModal
        :is-open="showReceiveModal"
        :purchase-id="currentPurchaseId"
        :purchase-items="currentPurchase.items"
        :ingredients="ingredients"
        @close="showReceiveModal = false"
        @received="handleStateChanged"
      />

      <PurchasesInvoicePurchaseModal
        :is-open="showInvoiceModal"
        :purchase-id="currentPurchaseId"
        @close="showInvoiceModal = false"
        @invoiced="handleStateChanged"
      />

      <PurchasesCancelPurchaseModal
        :is-open="showCancelModal"
        :purchase-id="currentPurchaseId"
        @close="showCancelModal = false"
        @cancelled="handleStateChanged"
      />
    </template>
    </Teleport>
  </ClientOnly>
</template>

<script setup lang="ts">
import { usePurchasesStore } from '~/stores/purchases'
import { storeToRefs } from 'pinia'

const purchasesStore = usePurchasesStore()
const { currentPurchaseId, currentPurchase, showActionBar, isLoading } = storeToRefs(purchasesStore)

// Local loading state for actions
const isUpdating = ref(false)

// Computed to check if we should show the bar
const shouldShowBar = computed(() => {
  if (!showActionBar.value || !currentPurchase.value) {
    return false
  }

  const status = currentPurchase.value.status
  const paymentType = currentPurchase.value.payment_type

  // Never show for cancelled orders
  if (status === 'cancelled') {
    return false
  }

  // For "contado" payment type, show bar even in "paid" status (waiting for invoice)
  if (paymentType === 'contado' && status === 'paid') {
    return true
  }

  // For other payment types, hide bar when paid
  return status !== 'paid'
})

// Combined loading state
const isLoadingOrUpdating = computed(() => isLoading.value || isUpdating.value)

// Check if we should show payment reminder for verified orders
// For "contado" orders, payment happens before verification, so we shouldn't show the reminder
// For "credito" orders, payment happens after verification, so we should show the reminder
const shouldShowPaymentReminder = computed(() => {
  if (!currentPurchase.value) return false

  const paymentType = currentPurchase.value.payment_type
  const history = currentPurchase.value.status_history || []

  // For contado orders, check if payment already occurred (status transitioned through "paid")
  if (paymentType === 'contado') {
    const hasPaidStatus = history.some((entry: any) => entry.to_status === 'paid')
    return !hasPaidStatus // Don't show reminder if already paid
  }

  // For credit orders, show reminder (payment happens after verification)
  return true
})

// Fetch ingredients for modals
const { data: ingredientsData } = useFetch('/api/suppliers/ingredients', {
  server: false,
  query: { limit: 250 }
})

const ingredients = computed(() => ingredientsData.value?.data || [])

// Modal visibility states
const showCompletePricesModal = ref(false)
const showConfirmModal = ref(false)
const showShipModal = ref(false)
const showReceiveModal = ref(false)
const showInvoiceModal = ref(false)
const showCancelModal = ref(false)

// Handle state change after successful transition
const handleStateChanged = async () => {
  if (currentPurchaseId.value) {
    isUpdating.value = true
    try {
      await purchasesStore.fetchPurchase(currentPurchaseId.value, true)
    } finally {
      isUpdating.value = false
    }
  }
}
</script>
