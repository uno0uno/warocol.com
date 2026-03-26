<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted } from 'vue'
import { $fetch } from 'ofetch'
import { usePOSStore } from '~/stores/usePOSStore'

interface TopProduct {
  name: string
  count: number
}

interface CustomerInsights {
  orders_count: number
  last_order_date: string | null
  avg_ticket: number | null
  top_products: TopProduct[] | null
  avg_days_between_visits: number | null
}

definePageMeta({
  layout: 'dashboard'
})

useHead({ title: 'Checkout' })

const router = useRouter()
const posStore = usePOSStore()

// Inject subtitle setter from layout
const setPageSubtitle = inject<(subtitle: string | undefined) => void>('setPageSubtitle', () => {})

// State
const selectedPaymentMethod = ref<'cash' | 'card' | 'digital'>('cash')
const isProcessing = ref(false)
const processingError = ref('')
const isSyncingCart = ref(false)
const syncError = ref('')

// Success modal state
const showSuccessModal = ref(false)
const orderResult = ref<{ order_number: number; total_amount: number; payment_method: string } | null>(null)

// Customer identification via modal
const showCustomerModal = ref(false)
const selectedCustomer = ref<{ id: string; name: string | null; phone_number: string | null } | null>(null)

// Customer insights
const customerInsights = ref<CustomerInsights | null>(null)
const insightsLoading = ref(false)
const activeAccordion = ref<'insights' | 'summary' | null>('summary')

// Computed (must be before any watchers that reference cartTotal)
const cartItems = computed(() => posStore.cart)
const cartTotal = computed(() => posStore.cartTotal)

// Waros
const { summary: warosSummary, isLoadingSummary: isLoadingWaros, fetchSummary: fetchWarosSummary, resetSummary } = useWarosCliente()
const { estimatedWaros, isLoadingEstimate, systemEnabled: warosSystemEnabled, fetchEstimate, resetEstimate } = useWarosEstimate()
const showWarosModal = ref(false)
const warosBalance = computed(() => warosSummary.value?.current_balance ?? 0)
const isAnonymousCustomer = computed(() => selectedCustomer.value?.phone_number === '0000000000')

let estimateTimer: ReturnType<typeof setTimeout> | null = null

watch(cartTotal, (total) => {
  if (!selectedCustomer.value || isAnonymousCustomer.value) return
  if (total <= 0) return
  if (estimateTimer) clearTimeout(estimateTimer)
  estimateTimer = setTimeout(() => {
    fetchEstimate(total, selectedCustomer.value!.id)
  }, 400)
})

const onWarosAssigned = async (_payload: { newBalance: number }) => {
  await fetchWarosSummary(selectedCustomer.value!.id)
}

watch(selectedCustomer, async (customer) => {
  // Reset Waros state on customer change
  resetSummary()
  resetEstimate()
  customerInsights.value = null
  insightsLoading.value = false
  activeAccordion.value = 'summary'
  if (!customer || customer.phone_number === '0000000000') return
  insightsLoading.value = true
  activeAccordion.value = 'insights'
  try {
    const res = await $fetch<{ data: CustomerInsights }>(`/api/customers/${customer.id}/insights`)
    customerInsights.value = res.data
    if (res.data.orders_count === 0) activeAccordion.value = 'summary'
  } catch {
    customerInsights.value = null
    activeAccordion.value = 'summary'
  } finally {
    insightsLoading.value = false
  }
  // Fetch Waros data (non-blocking — fires after insights)
  // Use Math.max(1, ...) so the probe always runs even with empty cart,
  // allowing warosSystemEnabled to be set from the API response.
  fetchWarosSummary(customer.id)
  fetchEstimate(Math.max(cartTotal.value, 1), customer.id)
})

// Methods
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(value)
}

const getItemTotal = (item: any) => {
  const basePrice = Number(item.product.price) || 0
  const modifiersPrice = item.modifiers.reduce((sum: number, mod: any) => sum + (Number(mod.price) || 0), 0)
  return (basePrice + modifiersPrice) * (Number(item.quantity) || 1)
}

const processOrder = async () => {
  // Validar que hay cliente seleccionado
  if (!selectedCustomer.value) {
    processingError.value = 'Selecciona o identifica al cliente antes de continuar'
    return
  }

  // Verificar que el carrito ya está sincronizado
  if (!posStore.cartId) {
    processingError.value = 'Error: El carrito no está sincronizado'
    return
  }

  try {
    isProcessing.value = true
    processingError.value = ''

    // Completar orden con el customer_id ya resuelto por el modal
    const response = await $fetch(`/api/pos/cart/${posStore.cartId}/complete`, {
      method: 'POST',
      body: {
        payment_method: selectedPaymentMethod.value,
        customer_id: selectedCustomer.value.id
      }
    }) as {
      success: boolean
      message: string
      data: {
        order_id: string
        order_number: number
        total_amount: number
        payment_method: string
        items_count: number
      }
    }

    if (response.success) {
      // Store order result for modal
      orderResult.value = {
        order_number: response.data.order_number,
        total_amount: response.data.total_amount,
        payment_method: response.data.payment_method
      }

      // Clear local cart
      posStore.clearAll()

      // Show success modal
      showSuccessModal.value = true
    }
  } catch (error: any) {
    processingError.value = error.data?.message || error.message || 'Error processing order'
  } finally {
    isProcessing.value = false
  }
}

const onCustomerIdentified = (customer: { id: string; name: string | null; phone_number: string | null }) => {
  selectedCustomer.value = customer
  processingError.value = ''
}

const getPaymentMethodLabel = (method: string) => {
  const labels: Record<string, string> = {
    'cash': 'Efectivo',
    'card': 'Tarjeta',
    'digital': 'Pago Digital'
  }
  return labels[method] || method
}

const cancelOrder = () => {
  router.push('/pos')
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  router.push('/pos')
}

// Sincronizar carrito al backend cuando carga la página
const syncCart = async () => {
  // Si no hay items o ya está sincronizado, no hacer nada
  if (posStore.cart.length === 0) {
    isSyncingCart.value = false
    return
  }
  if (posStore.cartId) {
    isSyncingCart.value = false
    return
  }

  try {
    isSyncingCart.value = true
    syncError.value = ''

    const success = await posStore.syncCartBatch()
    if (!success) {
      syncError.value = 'Error al sincronizar el carrito'
    }
  } catch (error: any) {
    syncError.value = error.message || 'Error al sincronizar'
  } finally {
    isSyncingCart.value = false
  }
}

// Set page subtitle and sync cart on mount
onMounted(async () => {
  setPageSubtitle('Checkout')

  // Mostrar loader inmediatamente si necesitamos sincronizar
  if (posStore.cart.length > 0 && !posStore.cartId) {
    isSyncingCart.value = true
  }

  // Sincronizar carrito al backend (batch, sin cliente)
  await syncCart()
})

// Clear subtitle and pending timers on unmount
onUnmounted(() => {
  setPageSubtitle(undefined)
  if (estimateTimer) clearTimeout(estimateTimer)
})
</script>

<template>
  <div class="w-full pb-32 lg:pb-0">
    <!-- Loading State (syncing cart) -->
    <div v-if="isSyncingCart" class="flex items-center justify-center min-h-[70vh]">
      <div class="text-center">
        <CommonsTheCustomLoader size="large" />
        <p class="text-text-secondary font-medium mt-6">Preparando checkout...</p>
      </div>
    </div>

    <!-- Sync Error State -->
    <div v-else-if="syncError" class="flex flex-col items-center justify-center min-h-[70vh]">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-text-primary mb-2">Error de Sincronización</h2>
        <p class="text-text-secondary mb-6">{{ syncError }}</p>
        <UiButton variant="default" @click="router.push('/pos')">
          Volver al POS
        </UiButton>
      </div>
    </div>

    <!-- Empty Cart State -->
    <div v-else-if="cartItems.length === 0" class="text-center py-16">
      <svg class="h-24 w-24 mx-auto text-text-secondary mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
      <h2 class="text-xl font-semibold text-text-primary mb-2">Carrito Vacío</h2>
      <p class="text-text-secondary mb-6">No hay productos en tu orden</p>
      <UiButton variant="default" @click="router.push('/pos')">
        Volver al POS
      </UiButton>
    </div>

    <!-- Main Grid (cart has items and sync completed) -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

      <!-- LEFT COLUMN: Order Items & Payment Method -->
      <div class="lg:col-span-8 space-y-6">

        <!-- Section: Order Items -->
        <div class="bg-surface rounded-2xl shadow-sm border border-border overflow-hidden">
          <div class="px-4 py-3 border-b border-border flex justify-between items-center bg-surface-secondary/50">
            <h2 class="font-bold text-text-primary flex items-center gap-2 text-sm md:text-base">
              <svg class="h-4 w-4 md:h-5 md:w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
              Items de la Orden
              <span class="text-text-tertiary font-normal text-xs ml-1">({{ cartItems.length }})</span>
            </h2>
          </div>

          <div class="divide-y divide-border">
            <!-- Cart Items -->
            <div
              v-for="(item, index) in cartItems"
              :key="index"
              class="px-3 py-2.5 md:p-4 flex gap-2.5 md:gap-4 items-start group hover:bg-surface-secondary/50 theme-transition"
            >
              <!-- Order Number -->
              <div class="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold mt-0.5">
                {{ index + 1 }}
              </div>

              <!-- Product Image -->
              <div class="w-10 h-10 md:w-16 md:h-16 rounded-lg bg-surface-secondary flex items-center justify-center text-xl md:text-3xl flex-shrink-0 border border-border">
                {{ item.product.image }}
              </div>

              <!-- Product Info -->
              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start gap-2">
                  <div class="flex items-center gap-1.5 min-w-0">
                    <h3 class="font-semibold text-text-primary text-sm leading-tight truncate">{{ item.product.name }}</h3>
                    <span v-if="item.quantity > 1" class="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                      ×{{ item.quantity }}
                    </span>
                  </div>
                  <span class="font-bold text-text-primary text-sm flex-shrink-0">{{ formatCurrency(getItemTotal(item)) }}</span>
                </div>

                <p class="text-xs text-text-tertiary mt-0.5">{{ formatCurrency(item.product.price) }} c/u</p>

                <!-- Modifiers -->
                <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-0.5 space-y-0">
                  <p v-for="mod in item.modifiers" :key="mod.id" class="text-text-tertiary text-xs">
                    + {{ mod.name }} · {{ formatCurrency(mod.price) }}
                  </p>
                </div>

                <!-- Notes -->
                <p v-if="item.notes" class="text-xs text-text-tertiary italic mt-0.5">{{ item.notes }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Payment Method -->
        <div class="bg-surface rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <h2 class="font-bold text-text-primary flex items-center gap-2 mb-3 text-sm md:text-base">
            <svg class="h-4 w-4 md:h-5 md:w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
            Método de Pago
          </h2>

          <div class="grid grid-cols-3 gap-2 md:gap-4">
            <!-- Efectivo -->
            <label class="cursor-pointer relative">
              <input type="radio" name="payment" value="cash" v-model="selectedPaymentMethod" class="sr-only">
              <div
                class="border rounded-xl p-2.5 md:p-4 theme-transition h-full flex flex-col items-center gap-1.5 md:gap-3 md:items-start"
                :class="selectedPaymentMethod === 'cash' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'"
              >
                <div class="flex items-center justify-between w-full">
                  <div class="bg-green-100 text-green-700 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                  </div>
                  <svg class="h-4 w-4 text-primary transition-all hidden md:block" :class="selectedPaymentMethod === 'cash' ? 'opacity-100' : 'opacity-0'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div class="text-center md:text-left w-full">
                  <div class="font-semibold text-text-primary text-xs md:text-sm leading-tight">Efectivo</div>
                  <div class="text-xs text-text-secondary hidden md:block">Pago en caja</div>
                </div>
                <!-- Mobile selected indicator -->
                <div v-if="selectedPaymentMethod === 'cash'" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary md:hidden"></div>
              </div>
            </label>

            <!-- Tarjeta -->
            <label class="cursor-pointer relative">
              <input type="radio" name="payment" value="card" v-model="selectedPaymentMethod" class="sr-only">
              <div
                class="border rounded-xl p-2.5 md:p-4 theme-transition h-full flex flex-col items-center gap-1.5 md:gap-3 md:items-start"
                :class="selectedPaymentMethod === 'card' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'"
              >
                <div class="flex items-center justify-between w-full">
                  <div class="bg-blue-100 text-blue-700 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                  </div>
                  <svg class="h-4 w-4 text-primary transition-all hidden md:block" :class="selectedPaymentMethod === 'card' ? 'opacity-100' : 'opacity-0'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div class="text-center md:text-left w-full">
                  <div class="font-semibold text-text-primary text-xs md:text-sm leading-tight">Datáfono</div>
                  <div class="text-xs text-text-secondary hidden md:block">Crédito / Débito</div>
                </div>
                <div v-if="selectedPaymentMethod === 'card'" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary md:hidden"></div>
              </div>
            </label>

            <!-- QR / Digital -->
            <label class="cursor-pointer relative">
              <input type="radio" name="payment" value="digital" v-model="selectedPaymentMethod" class="sr-only">
              <div
                class="border rounded-xl p-2.5 md:p-4 theme-transition h-full flex flex-col items-center gap-1.5 md:gap-3 md:items-start"
                :class="selectedPaymentMethod === 'digital' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'"
              >
                <div class="flex items-center justify-between w-full">
                  <div class="bg-purple-100 text-purple-700 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                    </svg>
                  </div>
                  <svg class="h-4 w-4 text-primary transition-all hidden md:block" :class="selectedPaymentMethod === 'digital' ? 'opacity-100' : 'opacity-0'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <div class="text-center md:text-left w-full">
                  <div class="font-semibold text-text-primary text-xs md:text-sm leading-tight">QR</div>
                  <div class="text-xs text-text-secondary hidden md:block">Nequi / Daviplata</div>
                </div>
                <div v-if="selectedPaymentMethod === 'digital'" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary md:hidden"></div>
              </div>
            </label>
          </div>
        </div>

        <!-- Section: Customer Identification -->
        <div class="bg-surface rounded-2xl shadow-sm border border-border p-4 md:p-6">
          <h2 class="font-bold text-text-primary flex items-center gap-2 mb-3 text-sm md:text-base">
            <svg class="h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            Datos del Cliente
          </h2>

          <!-- Customer selected: show card -->
          <div v-if="selectedCustomer" class="flex items-center gap-4 p-4 bg-primary/5 border border-primary/20 rounded-xl">
            <div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0">
              {{ selectedCustomer.name?.charAt(0)?.toUpperCase() || selectedCustomer.phone_number?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-text-primary truncate">{{ selectedCustomer.name || 'Cliente sin datos' }}</p>
              <p class="text-sm text-text-secondary truncate">{{ selectedCustomer.phone_number || 'Sin teléfono' }}</p>
            </div>
            <button
              @click="showCustomerModal = true"
              class="min-h-[44px] px-3 py-2 text-sm text-primary font-medium hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
            >
              Cambiar
            </button>
          </div>

          <!-- No customer yet: open modal button -->
          <button
            v-else
            @click="showCustomerModal = true"
            class="w-full min-h-[56px] flex items-center justify-center gap-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
          >
            <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <span class="font-medium">Buscar o identificar cliente</span>
          </button>
        </div>

        <!-- Customer Search Modal -->
        <PosCustomerIdentificationModal
          v-model="showCustomerModal"
          @customer-identified="onCustomerIdentified"
        />

      </div>

      <!-- RIGHT COLUMN: Accordion (Desktop Only) -->
      <div class="hidden lg:block lg:col-span-4 lg:sticky lg:top-8 space-y-3">

        <!-- ACCORDION 1: Customer Insights (loading or has history) -->
        <div
          v-if="insightsLoading || (customerInsights && customerInsights.orders_count > 0)"
          class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          <!-- Trigger -->
          <button
            @click="activeAccordion = activeAccordion === 'insights' ? null : 'insights'"
            class="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-surface-secondary/40 transition-colors"
          >
            <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 select-none">
              {{ selectedCustomer?.name?.charAt(0)?.toUpperCase() || selectedCustomer?.phone_number?.charAt(0) || '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-text-primary text-sm leading-tight truncate">
                {{ selectedCustomer?.name || 'Cliente' }}
              </p>
              <p class="text-xs text-text-secondary leading-tight mt-0.5">{{ selectedCustomer?.phone_number }}</p>
            </div>
            <svg
              class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'insights' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <!-- Body -->
          <div v-show="activeAccordion === 'insights'" class="border-t border-border">
            <!-- Skeleton while loading -->
            <div v-if="insightsLoading" class="p-4 grid grid-cols-2 gap-2.5">
              <div
                v-for="i in 4" :key="i"
                class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2 animate-pulse"
              >
                <div class="h-4 w-4 rounded bg-surface"></div>
                <div class="h-5 w-16 rounded bg-surface mt-1"></div>
                <div class="h-3 w-12 rounded bg-surface"></div>
              </div>
            </div>
            <!-- Actual insights -->
            <PosCustomerInsightsCard v-else-if="customerInsights" :insights="customerInsights" />
          </div>
        </div>

        <!-- ACCORDION 2: Resumen de la Orden -->
        <div class="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg">
          <!-- Trigger -->
          <button
            @click="activeAccordion = activeAccordion === 'summary' ? null : 'summary'"
            class="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-secondary/40 transition-colors"
          >
            <h3 class="font-bold text-text-primary">Resumen de la Orden</h3>
            <svg
              class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
              :class="activeAccordion === 'summary' ? 'rotate-0' : 'rotate-180'"
              xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
            </svg>
          </button>

          <!-- Body -->
          <div v-show="activeAccordion === 'summary'" class="border-t border-border px-5 py-4">
            <div class="space-y-3 mb-4">
              <div class="flex justify-between text-sm text-text-secondary">
                <span>Subtotal ({{ cartItems.length }} productos)</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(cartTotal) }}</span>
              </div>
              <div class="flex justify-between text-sm text-text-secondary">
                <span>Impuestos (0%)</span>
                <span class="font-medium text-text-primary">{{ formatCurrency(0) }}</span>
              </div>
              <div class="flex justify-between text-sm text-green-600">
                <span>Descuento</span>
                <span class="font-medium">- {{ formatCurrency(0) }}</span>
              </div>
            </div>

            <div class="border-t border-dashed border-border pt-4">
              <div class="flex justify-between items-end mb-1">
                <span class="text-text-secondary font-medium">Total a Pagar</span>
                <span class="text-3xl font-bold text-primary">{{ formatCurrency(cartTotal) }}</span>
              </div>
              <p class="text-right text-xs text-text-tertiary">COP</p>
            </div>
          </div>
        </div>

        <!-- WAROS CARD (desktop) -->
        <div
          v-if="selectedCustomer && !isAnonymousCustomer && warosSystemEnabled"
          class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
        >
          <div class="px-5 py-4">
            <h3 class="font-bold text-text-primary text-sm mb-3">Puntos Waros</h3>
            <!-- Skeleton while loading balance -->
            <div v-if="isLoadingWaros" class="grid grid-cols-2 gap-3 mb-3">
              <div class="animate-pulse bg-surface-secondary rounded-xl p-3 h-14"></div>
              <div class="animate-pulse bg-surface-secondary rounded-xl p-3 h-14"></div>
            </div>
            <!-- Data -->
            <div v-else class="grid grid-cols-2 gap-3 mb-3">
              <div class="bg-amber-50 rounded-xl p-3">
                <p class="text-xs text-text-secondary mb-0.5">Balance actual</p>
                <p class="text-lg font-bold text-amber-700 leading-tight">
                  {{ warosBalance.toLocaleString('es-CO') }}
                </p>
              </div>
              <div class="bg-green-50 rounded-xl p-3">
                <p class="text-xs text-text-secondary mb-0.5">Ganarías esta compra</p>
                <p
                  class="text-lg font-bold text-green-700 leading-tight"
                  aria-live="polite"
                  aria-label="Puntos estimados para esta compra"
                >
                  <span v-if="isLoadingEstimate" class="inline-block h-5 w-16 rounded bg-green-200 animate-pulse"></span>
                  <span v-else-if="estimatedWaros === null">—</span>
                  <span v-else>+ {{ estimatedWaros.toLocaleString('es-CO') }}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="showWarosModal = true"
              class="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Asignar manualmente
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="processingError" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
          <div class="flex items-start gap-3">
            <span class="text-xl">⚠️</span>
            <p class="text-sm text-red-800 dark:text-red-200">{{ processingError }}</p>
          </div>
        </div>

        <!-- Action Buttons (always visible) -->
        <div class="flex flex-col gap-2">
          <button
            @click="processOrder"
            :disabled="isProcessing || !selectedCustomer || isLoadingEstimate"
            class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UiLoadingDots v-if="isProcessing" size="9px" />
            <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span v-if="!isProcessing">Confirmar Orden</span>
            <svg v-if="!isProcessing" class="h-5 w-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <p v-if="!selectedCustomer && !isProcessing" class="text-center text-xs text-text-tertiary">Identifica al cliente para continuar</p>
          <button
            @click="cancelOrder"
            class="w-full bg-surface border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            Cancelar
          </button>
        </div>

        <!-- Security Note -->
        <div class="flex items-center justify-center gap-2 text-xs text-text-tertiary">
          <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <span>Transacción segura y encriptada</span>
        </div>

      </div>

    </div>

    <!-- Mobile Bottom Summary -->
    <div
      v-if="cartItems.length > 0 && !isSyncingCart && !syncError"
      class="lg:hidden mt-6 pb-4 space-y-3"
    >

      <!-- ACCORDION: Customer Insights (same as desktop) -->
      <div
        v-if="insightsLoading || (customerInsights && customerInsights.orders_count > 0)"
        class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        <button
          @click="activeAccordion = activeAccordion === 'insights' ? null : 'insights'"
          class="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-surface-secondary/40 transition-colors"
        >
          <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm flex-shrink-0 select-none">
            {{ selectedCustomer?.name?.charAt(0)?.toUpperCase() || selectedCustomer?.phone_number?.charAt(0) || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-semibold text-text-primary text-sm leading-tight truncate">
              {{ selectedCustomer?.name || 'Cliente' }}
            </p>
            <p class="text-xs text-text-secondary leading-tight mt-0.5">{{ selectedCustomer?.phone_number }}</p>
          </div>
          <svg
            class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
            :class="activeAccordion === 'insights' ? 'rotate-0' : 'rotate-180'"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <div v-show="activeAccordion === 'insights'" class="border-t border-border">
          <div v-if="insightsLoading" class="p-4 grid grid-cols-2 gap-2.5">
            <div v-for="i in 4" :key="i" class="bg-surface-secondary rounded-xl p-4 flex flex-col gap-2 animate-pulse">
              <div class="h-4 w-4 rounded bg-surface"></div>
              <div class="h-5 w-16 rounded bg-surface mt-1"></div>
              <div class="h-3 w-12 rounded bg-surface"></div>
            </div>
          </div>
          <PosCustomerInsightsCard v-else-if="customerInsights" :insights="customerInsights" />
        </div>
      </div>

      <!-- ACCORDION: Resumen de la Orden -->
      <div class="bg-surface rounded-2xl border border-border overflow-hidden shadow-lg">
        <button
          @click="activeAccordion = activeAccordion === 'summary' ? null : 'summary'"
          class="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-surface-secondary/40 transition-colors"
        >
          <h3 class="font-bold text-text-primary">Resumen de la Orden</h3>
          <svg
            class="h-4 w-4 text-text-tertiary flex-shrink-0 transition-transform duration-200"
            :class="activeAccordion === 'summary' ? 'rotate-0' : 'rotate-180'"
            xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <div v-show="activeAccordion === 'summary'" class="border-t border-border px-5 py-4">
          <div class="space-y-3 mb-4">
            <div class="flex justify-between text-sm text-text-secondary">
              <span>Subtotal ({{ cartItems.length }} productos)</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(cartTotal) }}</span>
            </div>
            <div class="flex justify-between text-sm text-text-secondary">
              <span>Impuestos (0%)</span>
              <span class="font-medium text-text-primary">{{ formatCurrency(0) }}</span>
            </div>
            <div class="flex justify-between text-sm text-green-600">
              <span>Descuento</span>
              <span class="font-medium">- {{ formatCurrency(0) }}</span>
            </div>
          </div>
          <div class="border-t border-dashed border-border pt-4">
            <div class="flex justify-between items-end mb-1">
              <span class="text-text-secondary font-medium">Total a Pagar</span>
              <span class="text-3xl font-bold text-primary">{{ formatCurrency(cartTotal) }}</span>
            </div>
            <p class="text-right text-xs text-text-tertiary">COP</p>
          </div>
        </div>
      </div>

      <!-- WAROS CARD (mobile) -->
      <div
        v-if="selectedCustomer && !isAnonymousCustomer && warosSystemEnabled"
        class="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm"
      >
        <div class="px-5 py-4">
          <h3 class="font-bold text-text-primary text-sm mb-3">Puntos Waros</h3>
          <div v-if="isLoadingWaros" class="grid grid-cols-2 gap-3 mb-3">
            <div class="animate-pulse bg-surface-secondary rounded-xl p-3 h-14"></div>
            <div class="animate-pulse bg-surface-secondary rounded-xl p-3 h-14"></div>
          </div>
          <div v-else class="grid grid-cols-2 gap-3 mb-3">
            <div class="bg-amber-50 rounded-xl p-3">
              <p class="text-xs text-text-secondary mb-0.5">Balance actual</p>
              <p class="text-lg font-bold text-amber-700 leading-tight">
                {{ warosBalance.toLocaleString('es-CO') }}
              </p>
            </div>
            <div class="bg-green-50 rounded-xl p-3">
              <p class="text-xs text-text-secondary mb-0.5">Ganarías esta compra</p>
              <p class="text-lg font-bold text-green-700 leading-tight" aria-live="polite">
                <span v-if="isLoadingEstimate" class="inline-block h-5 w-16 rounded bg-green-200 animate-pulse"></span>
                <span v-else-if="estimatedWaros === null">—</span>
                <span v-else>+ {{ estimatedWaros.toLocaleString('es-CO') }}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="showWarosModal = true"
            class="w-full min-h-[44px] px-4 py-2.5 text-sm font-medium border border-border rounded-lg hover:bg-surface-secondary transition-colors text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            Asignar manualmente
          </button>
        </div>
      </div>

      <!-- Error Message -->
      <div v-if="processingError" class="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
        <div class="flex items-start gap-3">
          <span class="text-xl">⚠️</span>
          <p class="text-sm text-red-800 dark:text-red-200">{{ processingError }}</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex flex-col gap-2">
        <button
          @click="processOrder"
          :disabled="isProcessing || !selectedCustomer || isLoadingEstimate"
          class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UiLoadingDots v-if="isProcessing" size="9px" />
          <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span v-if="!isProcessing">Confirmar Orden</span>
        </button>
        <p v-if="!selectedCustomer && !isProcessing" class="text-center text-xs text-text-tertiary">Identifica al cliente para continuar</p>
        <button
          @click="cancelOrder"
          class="w-full bg-surface border border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-text-secondary font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
        >
          Cancelar
        </button>
      </div>

      <!-- Security Note -->
      <div class="flex items-center justify-center gap-2 text-xs text-text-tertiary">
        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
        <span>Transacción segura y encriptada</span>
      </div>
    </div>

    <!-- Success Modal -->
    <Teleport to="body">
      <div
        v-if="showSuccessModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50"></div>

        <!-- Modal -->
        <div class="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
          <!-- Icon -->
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 dark:bg-green-900/30">
              <svg
                class="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-xl font-bold text-text-primary text-center mb-2">
            Venta Completada
          </h3>
          <p class="text-text-secondary text-center mb-6">
            La orden ha sido procesada exitosamente
          </p>

          <!-- Order Details -->
          <div v-if="orderResult" class="bg-surface-secondary rounded-lg p-4 mb-6 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Nº Orden</span>
              <span class="text-lg font-bold text-primary">#{{ orderResult.order_number }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Total</span>
              <span class="text-lg font-bold text-text-primary">{{ formatCurrency(orderResult.total_amount) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Método de Pago</span>
              <span class="text-sm font-medium text-text-primary">{{ getPaymentMethodLabel(orderResult.payment_method) }}</span>
            </div>
          </div>

          <!-- Accept Button -->
          <button
            @click="closeSuccessModal"
            class="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Nueva Venta
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Waros Manual Assignment Modal -->
    <PuntosAsignarWarosModal
      v-if="selectedCustomer"
      v-model="showWarosModal"
      :profile-id="selectedCustomer.id"
      :customer-name="selectedCustomer.name || selectedCustomer.phone_number || ''"
      :current-balance="warosBalance"
      @assigned="onWarosAssigned"
    />
  </div>
</template>

<style scoped>
/* Ensure content doesn't get hidden behind fixed bottom bar */
.pb-32 {
  padding-bottom: 8rem;
}
</style>
