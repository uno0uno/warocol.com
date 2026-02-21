<template>
  <div class="space-y-5">

    <!-- Order type -->
    <div class="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <span class="text-3xl">{{ orderTypeIcon }}</span>
      <div>
        <p class="font-semibold text-foreground text-sm">{{ orderTypeLabel }}</p>
        <p v-if="cartStore.orderType === 'pickup'" class="text-xs text-muted-foreground mt-0.5">
          You will receive a PIN when confirmed
        </p>
      </div>
    </div>

    <!-- Delivery address -->
    <div v-if="cartStore.orderType === 'delivery' && displayAddress" class="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
      <Icon name="heroicons:map-pin" class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      <div class="text-sm">
        <p class="font-semibold text-foreground">{{ displayAddress.address_line1 }}</p>
        <p v-if="displayAddress.address_line2" class="text-muted-foreground">{{ displayAddress.address_line2 }}</p>
        <p class="text-muted-foreground">{{ displayAddress.city }}, {{ displayAddress.state }}</p>
        <p v-if="displayAddress.delivery_notes" class="text-muted-foreground mt-1 italic">
          {{ displayAddress.delivery_notes }}
        </p>
      </div>
    </div>

    <!-- Scheduled time -->
    <div v-if="cartStore.deliveryInfo?.scheduled_time" class="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <Icon name="heroicons:calendar" class="w-5 h-5 text-primary flex-shrink-0" />
      <p class="text-sm text-foreground">{{ formatScheduledTime(cartStore.deliveryInfo.scheduled_time) }}</p>
    </div>

    <!-- Delivery instructions -->
    <div v-if="cartStore.deliveryInfo?.delivery_instructions" class="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
      <Icon name="heroicons:chat-bubble-left-ellipsis" class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      <p class="text-sm text-foreground">{{ cartStore.deliveryInfo.delivery_instructions }}</p>
    </div>

    <!-- Verified email -->
    <div class="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <Icon name="heroicons:lock-closed" class="w-5 h-5 text-green-600 flex-shrink-0" />
      <div class="text-sm">
        <p class="text-xs text-muted-foreground">Verified identity</p>
        <p class="font-medium text-foreground">{{ otpAuthStore.email }}</p>
      </div>
    </div>

    <!-- Items list -->
    <div class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-sm font-semibold text-foreground">
          Your order ({{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }})
        </p>
      </div>
      <div class="divide-y divide-border">
        <div
          v-for="item in cartStore.items"
          :key="item.id"
          class="flex items-start gap-3 px-4 py-3"
        >
          <span class="text-sm font-bold text-primary min-w-[2rem]">{{ item.quantity }}×</span>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-foreground">{{ item.product_name }}</p>
            <div v-if="item.modifiers.length > 0" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="mod in item.modifiers"
                :key="mod.id"
                class="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
              >
                + {{ mod.name }}
              </span>
            </div>
            <p v-if="item.notes" class="text-xs text-muted-foreground mt-1 italic">{{ item.notes }}</p>
          </div>
          <p class="text-sm font-semibold text-foreground flex-shrink-0">{{ formatPrice(item.total) }}</p>
        </div>
      </div>
    </div>

    <!-- Cart summary -->
    <CartSummary
      :subtotal="cartStore.subtotal"
      :item-count="cartStore.itemCount"
      :order-type="cartStore.orderType"
      :delivery-fee="deliveryFee"
      :show-checkout-button="false"
    />

    <!-- Payment method -->
    <div class="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
      <span class="text-lg">💵</span>
      <p class="text-sm text-amber-900"><strong>Payment:</strong> Cash on delivery</p>
    </div>

    <!-- Checkout error -->
    <div v-if="checkoutError" class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      <Icon name="heroicons:exclamation-triangle" class="w-4 h-4 flex-shrink-0 mt-0.5" />
      {{ checkoutError }}
    </div>

  </div>

  <!-- Success modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showSuccessModal"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5"
      >
        <div class="bg-background rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <!-- Check icon -->
          <div class="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
            <Icon name="heroicons:check" class="w-10 h-10 text-green-600" />
          </div>

          <h2 class="text-2xl font-bold text-foreground mb-2">Order confirmed!</h2>

          <p class="text-muted-foreground mb-5">
            Order number: <strong class="text-foreground">#{{ confirmedOrder?.order_number }}</strong>
          </p>

          <!-- Pickup PIN -->
          <div
            v-if="confirmedOrder?.pickup_pin || otpAuthStore.pickupPin"
            class="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 mb-5"
          >
            <p class="text-xs font-semibold text-amber-800 mb-2 uppercase tracking-wide">Your pickup PIN</p>
            <p class="text-4xl font-extrabold text-amber-900 tracking-[0.2em] mb-2">
              {{ confirmedOrder?.pickup_pin || otpAuthStore.pickupPin }}
            </p>
            <p class="text-xs text-amber-700">Show this PIN when picking up your order</p>
          </div>

          <!-- ETA message -->
          <p class="text-sm text-muted-foreground mb-6">
            <template v-if="cartStore.orderType === 'delivery'">
              Your order will arrive in approximately <strong>30–45 minutes</strong>
            </template>
            <template v-else-if="cartStore.orderType === 'pickup'">
              Your order will be ready in <strong>20–30 minutes</strong>
            </template>
            <template v-else>
              Your order is being prepared
            </template>
          </p>

          <Button class="w-full" @click="emit('success')">
            Back to store
          </Button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useAddressStore } from '~/stores/address'
import CartSummary from '~/components/online/CartSummary.vue'
import { Button } from '~/components/ui'

const emit = defineEmits<{
  (e: 'success'): void
}>()

const cartStore = useOnlineCartStore()
const otpAuthStore = useOtpAuthStore()
const addressStore = useAddressStore()

// ── Display helpers ───────────────────────────────────────────────────────

const displayAddress = computed(() =>
  addressStore.selectedAddress ?? addressStore.pendingAddress,
)

const deliveryFee = computed(() =>
  cartStore.orderType === 'delivery' && cartStore.subtotal < 50000 ? 5000 : 0,
)

const orderTypeIcon = computed(() => ({
  delivery: '🛵',
  pickup: '🏪',
  'dine-in': '🍽️',
}[cartStore.orderType] ?? '📦'))

const orderTypeLabel = computed(() => ({
  delivery: 'Delivery',
  pickup: 'Pick up at the store',
  'dine-in': 'Order from the table',
}[cartStore.orderType] ?? cartStore.orderType))

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)

const formatScheduledTime = (isoString: string) =>
  new Date(isoString).toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// ── Submit logic ──────────────────────────────────────────────────────────

interface ConfirmedOrder {
  order_id: string
  order_number: number
  total_amount: number
  order_type: string
  pickup_pin: string | null
  estimated_preparation_time: number | null
}

const isSubmitting = ref(false)
const checkoutError = ref('')
const confirmedOrder = ref<ConfirmedOrder | null>(null)
const showSuccessModal = ref(false)

const submitOrder = async () => {
  if (!cartStore.cartId) return

  isSubmitting.value = true
  checkoutError.value = ''

  try {
    // Ensure delivery_address_id is set on the cart if address was selected
    if (cartStore.orderType === 'delivery' && addressStore.selectedAddressId) {
      await cartStore.updateDeliveryInfo({
        order_type: 'delivery',
        delivery_address_id: addressStore.selectedAddressId,
      })
    }

    const response = await $fetch<{ success: boolean; data: ConfirmedOrder }>(
      `/api/online/cart/${cartStore.cartId}/checkout`,
      { method: 'POST' },
    )

    confirmedOrder.value = response.data
    showSuccessModal.value = true
  }
  catch (error: any) {
    if (error.status === 409) {
      // Order already placed — treat as success
      showSuccessModal.value = true
      return
    }
    checkoutError.value = error.data?.detail || error.message || 'Error placing order. Please try again.'
  }
  finally {
    isSubmitting.value = false
  }
}

// ── Exposed interface for wizard page ─────────────────────────────────────

const isValid = computed(() => !cartStore.isEmpty && otpAuthStore.isAuthenticated)

defineExpose({ isValid, isSubmitting, submitOrder })
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
