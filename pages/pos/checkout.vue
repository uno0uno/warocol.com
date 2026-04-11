<script setup lang="ts">
import { ref, computed, inject, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
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
const cache = useQueryCache()
const { currentTenant, businessProfile } = useTenantReactive()

// Inject subtitle setter from layout
const setPageSubtitle = inject<(subtitle: string | undefined) => void>('setPageSubtitle', () => {})

// Payment method types
interface PosPaymentMethod {
  id: string
  name: string
}
interface PosPaymentGroup {
  id: string
  slug: string
  name: string
  triggersCartera: boolean
  methods: PosPaymentMethod[]
}

const PAYMENT_DEFAULTS: PosPaymentGroup[] = [
  { id: 'cash',    slug: 'cash',    name: 'Efectivo', triggersCartera: false, methods: [] },
  { id: 'card',    slug: 'card',    name: 'Datáfono', triggersCartera: false, methods: [] },
  { id: 'digital', slug: 'digital', name: 'QR',       triggersCartera: false, methods: [] },
  { id: 'credit',  slug: 'credit',  name: 'Crédito',  triggersCartera: true,  methods: [] },
]

// State
const selectedPaymentMethod = ref<string>('cash')
const selectedPaymentMethodId = ref<string | null>(null)
const posPaymentGroups = ref<PosPaymentGroup[]>(PAYMENT_DEFAULTS)
const creditDueDate = ref<string>('')
const methodSearch = ref<string>('')
const isProcessing = ref(false)
const processingError = ref('')
const isSyncingCart = ref(false)
const syncError = ref('')

// Success modal state
const showSuccessModal = ref(false)
const orderResult = ref<{ order_number: number; total_amount: number; payment_method: string; payment_method_name?: string; customer_id?: string } | null>(null)
const wasMesaMode = ref(false)
const receiptEmail = ref('')
const emailSent = ref(false)
const isSendingEmail = ref(false)
const cartItemsSnapshot = ref<any[]>([])

// Customer identification via modal
const showCustomerModal = ref(false)
const selectedCustomer = ref<{ id: string; name: string | null; phone_number: string | null; email: string | null } | null>(null)

// Customer insights
const customerInsights = ref<CustomerInsights | null>(null)
const insightsLoading = ref(false)
const activeAccordion = ref<'insights' | 'summary' | null>('summary')

// Mesa mode detection
const isMesaMode = computed(() => !!posStore.activeTableSession)
const { tabItems: storeTabItems } = storeToRefs(posStore)

// Computed (must be before any watchers that reference cartTotal)
const cartItems = computed(() => {
  if (isMesaMode.value) {
    return storeTabItems.value.map(item => ({
      product: { id: '', name: item.productName, price: item.unitPrice, image: '🍽️', category: '' },
      modifiers: [] as Array<{ id: string; name: string; price: number }>,
      quantity: item.quantity,
      notes: undefined as string | undefined
    }))
  }
  return posStore.cart
})
const cartTotal = computed(() => {
  if (isMesaMode.value) return posStore.activeTableSession?.runningTotal ?? 0
  return posStore.cartTotal
})

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

  // Fetch insights + Waros in parallel so the right column doesn't fill in step by step.
  const insightsPromise = (async () => {
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
  })()

  const warosPromise = Promise.allSettled([
    fetchWarosSummary(customer.id),
    fetchEstimate(Math.max(cartTotal.value, 1), customer.id)
  ])

  try {
    await Promise.allSettled([insightsPromise, warosPromise])
  } finally {
    if (insightsLoading.value) {
      insightsLoading.value = false
    }
  }
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
  // Mesa mode: close the table session as payment
  if (!selectedCustomer.value) {
    processingError.value = 'Selecciona o identifica al cliente antes de continuar'
    return
  }

  if (isMesaMode.value) {
    const session = posStore.activeTableSession!
    try {
      isProcessing.value = true
      processingError.value = ''
      await $fetch(`/api/tables/${session.tableId}/close`, {
        method: 'POST',
        body: {
          payment_method: selectedPaymentMethod.value,
          customer_id: selectedCustomer.value?.id ?? null,
          payment_method_id: selectedPaymentMethodId.value ?? null,
          ...(selectedGroup.value?.triggersCartera && creditDueDate.value
            ? { credit_due_date: creditDueDate.value }
            : {}),
        },
      })
      orderResult.value = {
        order_number: 0,
        total_amount: session.runningTotal,
        payment_method: selectedPaymentMethod.value
      }
      wasMesaMode.value = true
      cartItemsSnapshot.value = [...cartItems.value]
      const customerEmail = selectedCustomer.value?.email ?? ''
      receiptEmail.value = customerEmail && !customerEmail.endsWith('@customer.temp') ? customerEmail : ''
      emailSent.value = false
      posStore.clearAll()
      showSuccessModal.value = true
    } catch (error: any) {
      processingError.value = error.data?.message || error.message || 'Error al cerrar la mesa'
    } finally {
      isProcessing.value = false
    }
    return
  }

  // Standard POS mode
  if (!selectedCustomer.value) {
    processingError.value = 'Selecciona o identifica al cliente antes de continuar'
    return
  }

  if (!posStore.cartId) {
    processingError.value = 'Error: El carrito no está sincronizado'
    return
  }

  try {
    isProcessing.value = true
    processingError.value = ''

    const preEmail = selectedCustomer.value?.email ?? ''
    const emailForReceipt = preEmail && !preEmail.endsWith('@customer.temp') ? preEmail : undefined

    const response = await $fetch(`/api/pos/cart/${posStore.cartId}/complete`, {
      method: 'POST',
      body: {
        payment_method: selectedPaymentMethod.value,
        customer_id: selectedCustomer.value.id,
        payment_method_id: selectedPaymentMethodId.value ?? null,
        ...(selectedGroup.value?.triggersCartera && creditDueDate.value
          ? { credit_due_date: creditDueDate.value }
          : {}),
        ...(emailForReceipt ? { receipt_email: emailForReceipt } : {}),
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
      const subMethodName = selectedPaymentMethodId.value
        ? selectedGroup.value?.methods.find(m => m.id === selectedPaymentMethodId.value)?.name
        : undefined
      orderResult.value = {
        order_number: response.data.order_number,
        total_amount: response.data.total_amount,
        payment_method: response.data.payment_method,
        payment_method_name: subMethodName,
        customer_id: selectedCustomer.value?.id,
      }
      cartItemsSnapshot.value = [...cartItems.value]
      receiptEmail.value = emailForReceipt ?? ''
      emailSent.value = !!emailForReceipt
      posStore.clearAll()
      showSuccessModal.value = true
    }
  } catch (error: any) {
    processingError.value = error.data?.message || error.message || 'Error processing order'
  } finally {
    isProcessing.value = false
  }
}

const onCustomerIdentified = (customer: { id: string; name: string | null; phone_number: string | null; email: string | null }) => {
  selectedCustomer.value = customer
  processingError.value = ''
}

// Derived from dynamic groups
const selectedGroup = computed(() =>
  posPaymentGroups.value.find(g => g.slug === selectedPaymentMethod.value) ?? null
)

// Reset sub-method and search when group changes
watch(selectedPaymentMethod, () => {
  selectedPaymentMethodId.value = null
  methodSearch.value = ''
})

const filteredMethods = computed(() => {
  const methods = selectedGroup.value?.methods ?? []
  const q = methodSearch.value.trim().toLowerCase()
  if (!q) return methods
  return methods.filter(m => m.name.toLowerCase().includes(q))
})

const getPaymentMethodLabel = (method: string) => {
  return posPaymentGroups.value.find(g => g.slug === method)?.name ?? method
}

// True when the selected group has sub-methods but none is chosen yet
const requiresMethodSelection = computed(() =>
  (selectedGroup.value?.methods?.length ?? 0) > 0 && !selectedPaymentMethodId.value
)

// Dynamic grid class based on group count (excluding hidden cartera groups)
const paymentGridClass = computed(() => {
  const visibleCount = posPaymentGroups.value.filter(
    g => !g.triggersCartera || (selectedCustomer.value && !isAnonymousCustomer.value)
  ).length
  if (visibleCount <= 2) return 'grid-cols-2'
  if (visibleCount === 3) return 'grid-cols-3'
  return 'grid-cols-2 md:grid-cols-4'
})

const cancelOrder = async () => {
  if (isMesaMode.value) {
    const session = posStore.activeTableSession!
    try {
      await $fetch(`/api/tables/${session.tableId}/close`, { method: 'POST' })
    } catch {
      // Non-critical
    }
    posStore.clearAll()
    cache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
    router.push('/pos')
  } else {
    router.push('/pos')
  }
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  if (wasMesaMode.value) {
    cache.invalidateQueries({ key: ['tables', currentTenant.value?.id] })
    router.push('/pos')
  } else {
    router.push('/pos')
  }
}

const printReceipt = () => {
  window.print()
}

const sendReceiptEmail = async () => {
  if (!receiptEmail.value || !orderResult.value || isSendingEmail.value) return
  isSendingEmail.value = true
  try {
    // Map frontend cart items to include computed subtotal for the email template
    const itemsForEmail = cartItemsSnapshot.value.map((item: any) => ({
      ...item,
      subtotal: getItemTotal(item),
    }))
    await $fetch(`/api/pos/cart/receipt-email`, {
      method: 'POST',
      body: {
        email: receiptEmail.value,
        order_number: orderResult.value.order_number,
        total_amount: orderResult.value.total_amount,
        payment_method: orderResult.value.payment_method,
        items: itemsForEmail,
        business_name: businessProfile.value?.display_name ?? null,
        business_address: businessProfile.value?.address ?? null,
        business_city: businessProfile.value?.city ?? null,
        business_phone: businessProfile.value?.phone_number ?? null,
      }
    })
    emailSent.value = true
  } catch {
    // Silent failure — cashier can try again or skip
  } finally {
    isSendingEmail.value = false
  }
}

// Fetch dynamic payment methods from API — falls back to hardcoded defaults on error
const isLoadingPaymentMethods = ref(true)

const fetchPaymentMethods = async () => {
  isLoadingPaymentMethods.value = true
  try {
    const response = await $fetch<{ success: boolean; data: PosPaymentGroup[] }>('/api/pos/payment-methods')
    if (response.success && response.data?.length) {
      posPaymentGroups.value = response.data
    }
  } catch {
    // Keep PAYMENT_DEFAULTS — POS must never break
  } finally {
    isLoadingPaymentMethods.value = false
  }
}

// Sincronizar carrito al backend cuando carga la página
const syncCart = async () => {
  // Si no hay items, no hacer nada
  if (posStore.cart.length === 0) {
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


  // Siempre regeneramos el carrito backend desde el estado local actual.
  if (posStore.cart.length > 0) {
    isSyncingCart.value = true
  }

  // Fetch dynamic payment methods (fallback to defaults on error)
  await fetchPaymentMethods()

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
    <CommonsTheErrorState v-else-if="syncError" />

    <!-- Empty Cart State -->
    <div v-else-if="cartItems.length === 0 && !isMesaMode && !showSuccessModal" class="text-center py-16">
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

          <!-- Skeleton while loading payment methods -->
          <div v-if="isLoadingPaymentMethods" class="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div
              v-for="i in 4"
              :key="i"
              class="rounded-xl border border-border p-2.5 md:p-4 h-[72px] md:h-[88px] flex flex-col items-center md:items-start gap-2 animate-pulse"
            >
              <div class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-border flex-shrink-0" />
              <div class="h-3 w-14 rounded bg-border" />
            </div>
          </div>

          <!-- Dynamic payment method groups — loaded from API, falls back to 4 defaults -->
          <div v-else class="grid gap-2 md:gap-4" :class="paymentGridClass">
            <label
              v-for="group in posPaymentGroups"
              :key="group.slug"
              v-show="!group.triggersCartera || (selectedCustomer && !isAnonymousCustomer)"
              class="cursor-pointer relative"
            >
              <input type="radio" name="payment" :value="group.slug" v-model="selectedPaymentMethod" class="sr-only">
              <div
                class="border rounded-xl p-2.5 md:p-4 theme-transition h-full flex flex-col items-center gap-1.5 md:gap-3 md:items-start"
                :class="selectedPaymentMethod === group.slug
                  ? (group.triggersCartera ? 'border-amber-500 bg-amber-50 shadow-sm dark:bg-amber-950/20' : 'border-primary bg-primary/5 shadow-sm')
                  : (group.triggersCartera ? 'border-border hover:border-amber-400/40' : 'border-border hover:border-primary/30')"
              >
                <div class="flex items-center justify-between w-full">
                  <!-- Icon — cash -->
                  <div
                    v-if="group.slug === 'cash'"
                    class="bg-green-100 text-green-700 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                    </svg>
                  </div>
                  <!-- Icon — card -->
                  <div
                    v-else-if="group.slug === 'card'"
                    class="bg-blue-100 text-blue-700 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                  </div>
                  <!-- Icon — digital -->
                  <div
                    v-else-if="group.slug === 'digital'"
                    class="bg-purple-100 text-purple-700 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                    </svg>
                  </div>
                  <!-- Icon — credit / triggersCartera -->
                  <div
                    v-else-if="group.triggersCartera"
                    class="bg-amber-100 text-amber-700 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <!-- Icon — custom group fallback -->
                  <div
                    v-else
                    class="bg-primary/10 text-primary w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  >
                    <svg class="h-4 w-4 md:h-6 md:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                    </svg>
                  </div>

                  <!-- Checkmark -->
                  <svg
                    class="h-4 w-4 transition-all hidden md:block"
                    :class="[
                      selectedPaymentMethod === group.slug ? 'opacity-100' : 'opacity-0',
                      group.triggersCartera ? 'text-amber-600' : 'text-primary'
                    ]"
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>

                <!-- Group name -->
                <div class="text-center md:text-left w-full">
                  <div
                    class="font-semibold text-xs md:text-sm leading-tight"
                    :class="selectedPaymentMethod === group.slug && group.triggersCartera ? 'text-amber-700' : 'text-text-primary'"
                  >
                    {{ group.name }}
                  </div>
                </div>

                <!-- Mobile selected dot -->
                <div
                  v-if="selectedPaymentMethod === group.slug"
                  class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full md:hidden"
                  :class="group.triggersCartera ? 'bg-amber-500' : 'bg-primary'"
                ></div>
              </div>
            </label>
          </div>

          <!-- Sub-method selector — shown when selected group has subtypes (e.g. Nequi, Daviplata) -->
          <div v-if="selectedGroup?.methods?.length" class="mt-3">
            <p class="text-xs font-semibold mb-2 flex items-center gap-1.5" :class="requiresMethodSelection ? 'text-destructive' : 'text-text-secondary'">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
              ¿Con cuál método de {{ selectedGroup.name }}?
            </p>

            <!-- Search — only when > 10 methods -->
            <div v-if="selectedGroup.methods.length > 10" class="relative mb-2">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="methodSearch"
                type="text"
                placeholder="Buscar método..."
                class="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <!-- Grid mode — up to 6 methods -->
            <div
              v-if="selectedGroup.methods.length <= 6"
              class="grid gap-2"
              :class="selectedGroup.methods.length <= 2
                ? 'grid-cols-2'
                : selectedGroup.methods.length === 3
                  ? 'grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-3'"
            >
              <button
                v-for="method in selectedGroup.methods"
                :key="method.id"
                type="button"
                @click="selectedPaymentMethodId = selectedPaymentMethodId === method.id ? null : method.id"
                class="relative min-h-[48px] px-3 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-center active:scale-95"
                :class="selectedPaymentMethodId === method.id
                  ? (selectedGroup.triggersCartera
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                      : 'border-primary bg-primary/10 text-primary shadow-sm')
                  : 'border-border bg-background text-text-secondary hover:border-primary/30 hover:text-text-primary'"
              >
                {{ method.name }}
                <span
                  v-if="selectedPaymentMethodId === method.id"
                  class="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                  :class="selectedGroup.triggersCartera ? 'bg-amber-500' : 'bg-primary'"
                />
              </button>
            </div>

            <!-- List mode — more than 6 methods (scrollable) -->
            <div
              v-else
              class="rounded-xl border border-border bg-background overflow-hidden"
            >
              <div class="max-h-[220px] overflow-y-auto divide-y divide-border">
                <button
                  v-for="method in filteredMethods"
                  :key="method.id"
                  type="button"
                  @click="selectedPaymentMethodId = selectedPaymentMethodId === method.id ? null : method.id"
                  class="w-full flex items-center justify-between px-4 py-3 text-sm transition-colors active:scale-[0.99]"
                  :class="selectedPaymentMethodId === method.id
                    ? (selectedGroup.triggersCartera
                        ? 'bg-amber-50 text-amber-700 font-semibold'
                        : 'bg-primary/8 text-primary font-semibold')
                    : 'text-text-primary hover:bg-surface-secondary/50'"
                >
                  <span>{{ method.name }}</span>
                  <svg
                    v-if="selectedPaymentMethodId === method.id"
                    class="w-4 h-4 flex-shrink-0"
                    :class="selectedGroup.triggersCartera ? 'text-amber-600' : 'text-primary'"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <div v-if="filteredMethods.length === 0" class="px-4 py-3 text-sm text-text-secondary text-center">
                  Sin resultados para "{{ methodSearch }}"
                </div>
              </div>
            </div>
          </div>

          <!-- Credit due date (optional) — shown only when a triggersCartera group is selected -->
          <div v-if="selectedGroup?.triggersCartera && selectedCustomer && !isAnonymousCustomer" class="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <label class="block text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
              Fecha límite de pago <span class="font-normal text-amber-600">(opcional)</span>
            </label>
            <input
              v-model="creditDueDate"
              type="date"
              class="w-full h-9 px-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
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
            :disabled="isProcessing || !selectedCustomer || isLoadingEstimate || requiresMethodSelection"
            class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UiLoadingDots v-if="isProcessing" size="9px" />
            <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            <span v-if="!isProcessing">{{ selectedPaymentMethod === 'credit' ? 'Registrar como crédito' : 'Confirmar Orden' }}</span>
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
          :disabled="isProcessing || !selectedCustomer || isLoadingEstimate || requiresMethodSelection"
          class="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <UiLoadingDots v-if="isProcessing" size="9px" />
          <svg v-else class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span v-if="!isProcessing">{{ selectedPaymentMethod === 'credit' ? 'Registrar como crédito' : 'Confirmar Orden' }}</span>
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
            {{ orderResult?.payment_method === 'credit' ? 'Orden registrada como crédito' : 'Venta Completada' }}
          </h3>
          <p class="text-text-secondary text-center mb-4">
            {{ orderResult?.payment_method === 'credit' ? 'El pago queda pendiente para el cliente' : 'La orden ha sido procesada exitosamente' }}
          </p>

          <!-- Credit notice banner -->
          <div v-if="orderResult?.payment_method === 'credit'" class="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div class="flex items-start gap-2">
              <svg class="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              <p class="text-xs text-amber-800">Para registrar abonos, accede al perfil del cliente donde encontrarás el estado de su cartera, historial de pagos y saldo pendiente.</p>
            </div>
          </div>

          <!-- Order Details -->
          <div v-if="orderResult" class="bg-surface-secondary rounded-lg p-4 mb-6 space-y-3">
            <div v-if="orderResult.order_number > 0" class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Nº Orden</span>
              <span class="text-lg font-bold text-primary">#{{ orderResult.order_number }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Total</span>
              <span class="text-lg font-bold text-text-primary">{{ formatCurrency(orderResult.total_amount) }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-text-secondary">Método de Pago</span>
              <span class="text-sm font-medium text-text-primary">
                {{ orderResult.payment_method_name
                    ? `${getPaymentMethodLabel(orderResult.payment_method)} · ${orderResult.payment_method_name}`
                    : getPaymentMethodLabel(orderResult.payment_method) }}
              </span>
            </div>
          </div>

          <!-- Receipt actions -->
          <div class="mb-4 space-y-3">
            <!-- Email receipt -->
            <div class="flex flex-col gap-1.5">
              <label for="receipt-email" class="text-sm font-medium text-text-primary">
                Correo para el recibo <span class="text-text-tertiary text-xs">(opcional)</span>
              </label>
              <div class="flex gap-2">
                <input
                  id="receipt-email"
                  v-model="receiptEmail"
                  type="email"
                  placeholder="cliente@email.com"
                  :disabled="emailSent"
                  class="flex-1 px-3 py-2 border border-border rounded-lg text-sm text-text-primary bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50"
                />
                <button
                  @click="sendReceiptEmail"
                  :disabled="!receiptEmail || emailSent || isSendingEmail"
                  class="min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95
                         disabled:opacity-50 disabled:cursor-not-allowed
                         bg-surface border border-border text-text-primary hover:bg-surface-secondary"
                >
                  <span v-if="isSendingEmail">Enviando...</span>
                  <span v-else-if="emailSent" class="text-green-600">✓ Enviado</span>
                  <span v-else>Enviar</span>
                </button>
              </div>
            </div>

            <!-- Print -->
            <button
              @click="printReceipt"
              class="w-full min-h-[44px] py-2 px-4 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
              </svg>
              Imprimir comprobante
            </button>
          </div>

          <!-- Accept Button -->
          <button
            @click="closeSuccessModal"
            class="w-full py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            {{ wasMesaMode ? 'Ver mesas' : 'Nueva Venta' }}
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

  <!-- Hidden receipt for printing — only visible via @media print -->
  <div id="pos-receipt" aria-hidden="true">
    <div class="receipt-header">{{ businessProfile?.display_name || 'WARO' }}</div>
    <div v-if="businessProfile?.address" class="receipt-row receipt-small">{{ businessProfile.address }}<span v-if="businessProfile.city">, {{ businessProfile.city }}</span></div>
    <div v-if="businessProfile?.phone_number" class="receipt-row receipt-small">Tel: {{ businessProfile.phone_number }}</div>
    <div class="receipt-divider">================================</div>
    <div v-if="orderResult?.order_number > 0" class="receipt-row">Orden #{{ orderResult?.order_number }}</div>
    <div class="receipt-divider">--------------------------------</div>
    <div v-for="item in cartItemsSnapshot" :key="item.id" class="receipt-item">
      <span>{{ item.quantity }}x {{ item.product?.name }}</span>
      <span>{{ formatCurrency(getItemTotal(item)) }}</span>
    </div>
    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-total">
      <span>TOTAL</span>
      <span>{{ formatCurrency(orderResult?.total_amount ?? 0) }}</span>
    </div>
    <div class="receipt-row">{{ getPaymentMethodLabel(orderResult?.payment_method ?? '') }}</div>
    <div class="receipt-divider">================================</div>
    <div class="receipt-footer">¡Gracias por tu compra!</div>
  </div>
  </div>
</template>

<style scoped>
/* Ensure content doesn't get hidden behind fixed bottom bar */
.pb-32 {
  padding-bottom: 8rem;
}

/* Receipt — hidden on screen, visible only when printing */
#pos-receipt {
  display: none;
}

/* Modifier/utility classes used by the receipt div */
.receipt-header { font-size: 1.1em; font-weight: bold; text-align: center; margin-bottom: 4px; }
.receipt-row { text-align: center; margin: 2px 0; }
.receipt-divider { letter-spacing: 0; margin: 4px 0; }
.receipt-item { display: flex; justify-content: space-between; margin: 2px 0; }
.receipt-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em; margin: 4px 0; }
.receipt-footer { text-align: center; margin-top: 8px; }
.receipt-small { font-size: 0.85em; }
</style>

<style>
@media print {
  /* Hide everything, then reveal only the receipt */
  body * { visibility: hidden; }
  #pos-receipt,
  #pos-receipt * { visibility: visible; }

  #pos-receipt {
    display: block !important;
    position: absolute;
    top: 0;
    left: 0;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    width: 54mm;
    color: #000;
    background: #fff;
    padding: 2mm;
  }

  @page {
    size: 58mm auto;
    margin: 2mm;
  }
}
</style>
