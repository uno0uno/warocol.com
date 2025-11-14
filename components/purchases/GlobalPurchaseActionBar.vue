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
              <!-- Complete Quotation (when in quotation status) -->
              <button
                v-if="currentPurchase.status === 'quotation'"
                type="button"
                @click="showCompletePricesModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--success)); color: hsl(var(--success));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--success) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Completar Precios</span>
              </button>

              <!-- Confirm (when in pending status) -->
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

              <!-- Invoice (after confirmation) -->
              <button
                v-if="currentPurchase.status === 'confirmed' || currentPurchase.status === 'preparing'"
                type="button"
                @click="showInvoiceModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--warning)); color: hsl(var(--warning));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--warning) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Registrar Factura</span>
              </button>

              <!-- Ship (after invoice) -->
              <button
                v-if="currentPurchase.status === 'invoiced'"
                type="button"
                @click="showShipModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--primary)); color: hsl(var(--primary));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--primary) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span>Marcar como Enviado</span>
              </button>

              <!-- Receive -->
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

              <!-- Verify -->
              <button
                v-if="currentPurchase.status === 'received'"
                type="button"
                @click="showVerifyModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--info)); color: hsl(var(--info));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--info) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Verificar Calidad</span>
              </button>

              <!-- Pay (after verification, at the end) -->
              <button
                v-if="currentPurchase.status === 'verified'"
                type="button"
                @click="showPayModal = true"
                class="px-4 py-2 border-2 rounded-lg transition-colors flex items-center space-x-2"
                style="border-color: hsl(var(--success)); color: hsl(var(--success));"
                @mouseenter="$event.target.style.backgroundColor = 'hsl(var(--success) / 0.1)'"
                @mouseleave="$event.target.style.backgroundColor = 'transparent'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Registrar Pago</span>
              </button>

              <!-- Cancel -->
              <button
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

      <PurchasesVerifyPurchaseModal
        :is-open="showVerifyModal"
        :purchase-id="currentPurchaseId"
        :purchase-items="currentPurchase.items"
        :ingredients="ingredients"
        @close="showVerifyModal = false"
        @verified="handleStateChanged"
      />

      <PurchasesInvoicePurchaseModal
        :is-open="showInvoiceModal"
        :purchase-id="currentPurchaseId"
        @close="showInvoiceModal = false"
        @invoiced="handleStateChanged"
      />

      <PurchasesPayPurchaseModal
        :is-open="showPayModal"
        :purchase-id="currentPurchaseId"
        @close="showPayModal = false"
        @paid="handleStateChanged"
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
  return showActionBar.value &&
         currentPurchase.value &&
         currentPurchase.value.status !== 'paid' &&
         currentPurchase.value.status !== 'cancelled'
})

// Combined loading state
const isLoadingOrUpdating = computed(() => isLoading.value || isUpdating.value)

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
const showVerifyModal = ref(false)
const showInvoiceModal = ref(false)
const showPayModal = ref(false)
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
