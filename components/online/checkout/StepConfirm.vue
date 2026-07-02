<template>
  <div>
  <div class="space-y-5">
    <h4 class="text-base font-semibold text-foreground">Revisar y confirmar</h4>

    <!-- Order type -->
    <div class="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <svg class="w-7 h-7 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="orderTypeIcon" />
      </svg>
      <div>
        <p class="font-semibold text-foreground text-sm">{{ orderTypeLabel }}</p>
        <p v-if="cartStore.orderType === 'pickup'" class="text-xs text-muted-foreground mt-0.5">
          Recibirás un PIN al confirmar
        </p>
      </div>
    </div>

    <!-- Delivery address -->
    <div v-if="cartStore.orderType === 'delivery' && displayAddress" class="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
      <svg class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <div class="text-sm">
        <p class="font-semibold text-foreground">{{ displayAddress.address_line1 }}</p>
        <p v-if="displayAddress.address_line2" class="text-muted-foreground">{{ displayAddress.address_line2 }}</p>
        <p class="text-muted-foreground">{{ displayAddress.city }}, {{ displayAddress.state }}</p>
        <p v-if="displayAddress.delivery_notes" class="text-muted-foreground mt-1 italic">
          {{ displayAddress.delivery_notes }}
        </p>
      </div>
    </div>

    <!-- Scheduled time / Immediate -->
    <div v-if="cartStore.deliveryInfo?.scheduled_time" class="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
      <p class="text-sm text-foreground">{{ formatScheduledTime(cartStore.deliveryInfo.scheduled_time) }}</p>
    </div>
    <div v-else class="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <svg class="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <p class="text-sm text-foreground">Lo antes posible · <span class="font-medium">Entrega inmediata</span></p>
    </div>

    <!-- Delivery instructions -->
    <div v-if="cartStore.deliveryInfo?.delivery_instructions" class="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
      <svg class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <p class="text-sm text-foreground">{{ cartStore.deliveryInfo.delivery_instructions }}</p>
    </div>

    <!-- Verified email -->
    <div class="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <svg class="w-5 h-5 text-state-success-icon flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
      <div class="text-sm">
        <p class="text-xs text-muted-foreground">Identidad verificada</p>
        <p class="font-medium text-foreground">{{ otpAuthStore.email }}</p>
      </div>
    </div>

    <!-- Items list -->
    <div class="rounded-xl border border-border bg-card overflow-hidden">
      <div class="px-4 py-3 border-b border-border">
        <p class="text-sm font-semibold text-foreground">
          Tu pedido ({{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'artículo' : 'artículos' }})
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
                + {{ mod.name }}<template v-if="mod.quantity && mod.quantity > 1"> x{{ mod.quantity }}</template>
                <template v-if="modifierLineAmount(mod) !== 0"> · {{ formatPrice(modifierLineAmount(mod)) }}</template>
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
      :minimum-order="minOrderAmount"
      :show-checkout-button="false"
    />

    <!-- warocol.com#639 — Tip selector (hidden when tenant has tip_enabled=false).
         Placed between cart summary and payment method so the customer sees the
         total they're committing to before choosing how to pay. -->
    <CheckoutTipSelector
      v-if="tipEnabled"
      :enabled="tipEnabled"
      :presets="tipPresets"
      :preselect-index="tipPreselectIndex"
      :subtotal="cartStore.subtotal"
      v-model="tipModel"
    />

    <!-- WaRos card -->
    <div
      v-if="warosSystemEnabled === true"
      class="rounded-2xl overflow-hidden border border-primary/20 shadow-sm"
    >
      <div class="flex items-center gap-2.5 px-4 py-3 bg-primary/10 border-b border-primary/20">
        <svg class="w-5 h-5 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
        <p class="text-sm font-bold text-primary tracking-wide">Tus WaRos</p>
      </div>

      <!-- Body rows -->
      <div class="bg-surface divide-y divide-border">
        <!-- Saldo actual -->
        <div class="flex items-center justify-between px-4 py-3.5">
          <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider">Saldo actual</p>
          <p class="text-lg font-bold text-text-primary tabular-nums">
            {{ warosBalance !== null ? warosBalance.toLocaleString('es-CO') : '—' }}
          </p>
        </div>

        <!-- Ganarás con este pedido -->
        <div v-if="warosEstimate !== null" class="flex items-center justify-between px-4 py-3.5 bg-state-success-bg">
          <p class="text-xs font-semibold text-state-success-text uppercase tracking-wider">Ganarás con este pedido</p>
          <p
            class="text-lg font-extrabold tabular-nums"
            :class="warosEstimate > 0 ? 'text-state-success-text' : 'text-text-tertiary'"
          >
            {{ warosEstimate > 0 ? `+${warosEstimate.toLocaleString('es-CO')}` : '—' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Payment method (warocol.com#610) -->
    <div class="rounded-xl border border-border bg-card p-4">
      <p class="text-sm font-semibold text-foreground mb-3">¿Cómo vas a pagar?</p>
      <p v-if="paymentGroups.length === 0" class="text-sm text-muted-foreground">
        Cargando métodos disponibles…
      </p>
      <PaymentsPaymentMethodSelector
        v-else
        v-model="paymentSelection"
        :groups="paymentGroups"
        exclude-cartera
        :disabled="isSubmitting"
      />
      <p v-if="paymentError" class="mt-2 text-xs text-destructive">{{ paymentError }}</p>
    </div>

    <!-- Checkout error -->
    <div v-if="checkoutError" class="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      {{ checkoutError }}
    </div>

  </div>

  <!-- Success modal -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="showSuccessModal"
        class="fixed inset-0 bg-overlay-backdrop-strong/60 backdrop-blur-sm z-50 flex items-center justify-center p-5"
      >
        <div class="bg-background rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
          <!-- Check icon -->
          <div class="w-20 h-20 rounded-full bg-state-success-bg flex items-center justify-center mx-auto mb-5">
            <svg class="w-10 h-10 text-state-success-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h2 class="text-2xl font-bold text-foreground mb-2">¡Pedido confirmado!</h2>

          <p class="text-muted-foreground mb-5">
            Número de pedido: <strong class="text-foreground">#{{ confirmedOrder?.order_number }}</strong>
          </p>

          <!-- Pickup PIN -->
          <div
            v-if="confirmedOrder?.pickup_pin || otpAuthStore.pickupPin"
            class="bg-state-warning-bg border-2 border-state-warning-border rounded-xl p-5 mb-5"
          >
            <p class="text-xs font-semibold text-state-warning-text mb-2 uppercase tracking-wide">Tu PIN de recogida</p>
            <p class="text-4xl font-extrabold text-state-warning-text tracking-[0.2em] mb-2">
              {{ confirmedOrder?.pickup_pin || otpAuthStore.pickupPin }}
            </p>
            <p class="text-xs text-state-warning-text">Muestra este PIN al recoger tu pedido</p>
          </div>

          <!-- ETA message -->
          <p class="text-sm text-muted-foreground mb-6">
            <template v-if="cartStore.deliveryInfo?.scheduled_time">
              Tu pedido está programado para
              <strong>{{ formatScheduledTime(cartStore.deliveryInfo.scheduled_time) }}</strong>
            </template>
            <template v-else-if="cartStore.orderType === 'delivery'">
              Tu pedido llegará en aproximadamente
              <strong>{{ confirmedOrder?.estimated_preparation_time ? `${confirmedOrder.estimated_preparation_time} minutos` : '30–45 minutos' }}</strong>
            </template>
            <template v-else-if="cartStore.orderType === 'pickup'">
              Tu pedido estará listo en
              <strong>{{ confirmedOrder?.estimated_preparation_time ? `${confirmedOrder.estimated_preparation_time} minutos` : '20–30 minutos' }}</strong>
            </template>
            <template v-else>
              Tu pedido está siendo preparado
            </template>
          </p>

          <Button class="w-full" @click="goToOrder">
            Ver mi pedido
          </Button>
          <button
            class="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
            @click="emit('success')"
          >
            Seguir comprando
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useOnlineCartStore } from '~/stores/online_cart'
import { useOtpAuthStore } from '~/stores/otp_auth'
import { useAddressStore } from '~/stores/address'
import { useOrderNotification } from '~/composables/useOrderNotification'
import CartSummary from '~/components/online/CartSummary.vue'
import { Button } from '~/components/ui'
import type { PosPaymentGroup } from '~/utils/paymentDefaults'
import { modifierLineTotal } from '~/utils/saleModifierOption'

const emit = defineEmits<{
  (e: 'success'): void
}>()

const route = useRoute()
const router = useRouter()
const cartStore = useOnlineCartStore()
const otpAuthStore = useOtpAuthStore()
const addressStore = useAddressStore()

// Tenant profile fetch — same Pinia Colada query key as the parent
// `pages/[tenant]/index.vue` so this is a cache hit when the user
// navigates from the menu page (warocol.com#632). Falls back to one
// fresh fetch when the user arrives directly at /checkout (bookmark).
const restaurantSlug = computed(() => String(route.params.tenant ?? ''))
const { data: tenantProfile } = useQuery({
  key: () => ['restaurant', 'public', restaurantSlug.value],
  query: () => $fetch(`/api/public/restaurant/${restaurantSlug.value}`),
  enabled: () => !!restaurantSlug.value,
})
const minOrderAmount = computed(
  () => (tenantProfile.value as { data?: { min_order_amount?: number | string } } | null)
    ?.data?.min_order_amount ?? 0,
)

// warocol.com#639 — tipping config (read from the same tenantProfile query;
// backend exposes the 3 fields in api-warolabs#247). Hidden by default until
// the tenant opts in via /operaciones/propinas (warocol.com#638).
type TipProfile = {
  tip_enabled?: boolean
  tip_default_percentages?: number[]
  tip_preselect_index?: number | null
}
const tipEnabled = computed(
  () => (tenantProfile.value as { data?: TipProfile } | null)?.data?.tip_enabled === true,
)
const tipPresets = computed<number[]>(
  () => (tenantProfile.value as { data?: TipProfile } | null)?.data?.tip_default_percentages ?? [10],
)
const tipPreselectIndex = computed<number | null>(
  () => (tenantProfile.value as { data?: TipProfile } | null)?.data?.tip_preselect_index ?? null,
)
const tipModel = ref<{ amount: number; source: 'preset' | 'custom' | 'none' }>({
  amount: 0,
  source: 'none',
})

// ── Display helpers ───────────────────────────────────────────────────────

const displayAddress = computed(() =>
  addressStore.selectedAddress ?? addressStore.pendingAddress,
)

const deliveryFee = computed(() => 0)

const orderTypeIcon = computed(() => ({
  delivery: 'M8 16a3 3 0 01-3-3V7a3 3 0 013-3h8a3 3 0 013 3v6a3 3 0 01-3 3H8zm-4 0h1m14 0h1M1 10h2m18 0h2M5 20h14',
  pickup: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  'dine-in': 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
}[cartStore.orderType] ?? 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'))

const orderTypeLabel = computed(() => ({
  delivery: 'Domicilio',
  pickup: 'Recoger en tienda',
  'dine-in': 'En mesa',
}[cartStore.orderType] ?? cartStore.orderType))

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)

const modifierLineAmount = (modifier: { price: number; quantity?: number }) =>
  modifierLineTotal(modifier)

const formatScheduledTime = (isoString: string) =>
  new Date(isoString).toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// ── WaRos ─────────────────────────────────────────────────────────────────

const warosBalance = ref<number | null>(null)
const warosEstimate = ref<number | null>(null)
const warosSystemEnabled = ref<boolean | null>(null)

const fetchWarosInfo = async () => {
  if (!otpAuthStore.isAuthenticated) return
  try {
    const [summary, estimate] = await Promise.allSettled([
      $fetch<{ current_balance: number }>('/api/customer/waros/summary'),
      $fetch<{ estimated_waros: number; system_enabled: boolean }>(
        `/api/customer/waros/estimate?total_amount=${cartStore.subtotal}`
      ),
    ])
    if (summary.status === 'fulfilled') {
      warosBalance.value = summary.value.current_balance
    }
    if (estimate.status === 'fulfilled') {
      warosSystemEnabled.value = estimate.value.system_enabled
      warosEstimate.value = estimate.value.estimated_waros
    }
  } catch {
    // Silently fail — don't break checkout
  }
}

onMounted(fetchWarosInfo)

// ── Payment method (warocol.com#610) ──────────────────────────────────────
// Public endpoint returns the same shape as /pos/payment-methods but is
// scoped by tenant slug and already excludes triggersCartera groups.

const paymentGroups = ref<PosPaymentGroup[]>([])
const paymentSelection = ref<{ slug: string; id: string | null }>({ slug: '', id: null })
const paymentError = ref('')

const tenantSlug = computed(() => String(route.params.tenant ?? ''))

const fetchPaymentMethods = async () => {
  if (!tenantSlug.value) return
  try {
    const res = await $fetch<{ success: boolean; data: PosPaymentGroup[] }>(
      `/api/public/restaurant/${tenantSlug.value}/payment-methods`,
    )
    const groups = res?.data ?? []
    paymentGroups.value = groups
    // Default to the first non-cartera group so a returning customer can
    // confirm in a single tap. excludeCartera on the selector already hides
    // them visually, but we also gate here to stay safe.
    const first = groups.find((g) => !g.triggersCartera)
    if (first) {
      paymentSelection.value = { slug: first.slug, id: null }
    }
  } catch {
    // Keep empty — selector will render "Cargando…" and isValid will block submit.
    paymentGroups.value = []
  }
}

onMounted(fetchPaymentMethods)

// ── Submit logic ──────────────────────────────────────────────────────────

interface ConfirmedOrder {
  order_id: string
  order_number: number
  total_amount: number
  order_type: string
  pickup_pin: string | null
  estimated_preparation_time: number | null
}

const { notify: notifyOrderConfirmed } = useOrderNotification()

const isSubmitting = ref(false)
const checkoutError = ref('')
const confirmedOrder = ref<ConfirmedOrder | null>(null)
const showSuccessModal = ref(false)

const checkoutErrorMessage = (error: any) => {
  const detail = error?.data?.detail
  if (typeof detail === 'string') return detail
  if (detail?.customer_message) return String(detail.customer_message)
  if (detail?.message) return String(detail.message)
  return error?.message || 'No pudimos confirmar tu pedido. Intenta de nuevo.'
}

const submitOrder = async () => {
  if (!cartStore.cartId) return

  paymentError.value = ''
  if (!paymentSelection.value.slug) {
    paymentError.value = 'Selecciona un método de pago.'
    return
  }
  const chosenGroup = paymentGroups.value.find(
    (g) => g.slug === paymentSelection.value.slug,
  )
  if (chosenGroup?.methods?.length && !paymentSelection.value.id) {
    paymentError.value = `Elegí un método de ${chosenGroup.name}.`
    return
  }

  isSubmitting.value = true
  checkoutError.value = ''

  try {
    // Ensure delivery_address_id is set on the cart, forwarding all existing
    // delivery info to prevent overwriting scheduled_time and
    // delivery_instructions (backend does a full UPDATE, not a partial PATCH).
    //
    // Two cases:
    // - Returning customer with a saved address selected → selectedAddressId set.
    // - New customer who typed a new address AFTER OTP verification (the
    //   wizard runs OTP in step 3 and the address form in step 4, so the
    //   "post-OTP applyDeliveryAddress" hook in StepIdentity runs before the
    //   address exists). In that case pendingAddress is set; persist it here.
    if (cartStore.orderType === 'delivery') {
      if (addressStore.selectedAddressId) {
        await cartStore.updateDeliveryInfo({
          order_type: 'delivery',
          delivery_address_id: addressStore.selectedAddressId,
          scheduled_time: cartStore.deliveryInfo?.scheduled_time,
          delivery_instructions: cartStore.deliveryInfo?.delivery_instructions,
        })
      }
      else if (addressStore.pendingAddress && otpAuthStore.customerId) {
        const addressId = await addressStore.persistPendingAddress(otpAuthStore.customerId)
        if (addressId) {
          await cartStore.updateDeliveryInfo({
            order_type: 'delivery',
            delivery_address_id: addressId,
            scheduled_time: cartStore.deliveryInfo?.scheduled_time,
            delivery_instructions: cartStore.deliveryInfo?.delivery_instructions,
          })
        }
      }
    }

    const response = await $fetch<{ success: boolean; data: ConfirmedOrder }>(
      `/api/online/cart/${cartStore.cartId}/checkout`,
      {
        method: 'POST',
        body: {
          payment_method: paymentSelection.value.slug,
          payment_method_id: paymentSelection.value.id,
          // warocol.com#639 — tip capture (server validates against tenant.tip_enabled)
          ...(tipModel.value.amount > 0
            ? { tip_amount: tipModel.value.amount, tip_source: tipModel.value.source }
            : {}),
        },
      },
    )

    confirmedOrder.value = response.data
    showSuccessModal.value = true
    notifyOrderConfirmed('Tu pedido fue confirmado')
  }
  catch (error: any) {
    if (error.status === 409) {
      // Order already placed — treat as success
      showSuccessModal.value = true
      notifyOrderConfirmed('Tu pedido fue confirmado')
      return
    }
    checkoutError.value = checkoutErrorMessage(error)
  }
  finally {
    isSubmitting.value = false
  }
}

// ── Post-order navigation ─────────────────────────────────────────────────

const goToOrder = () => {
  emit('success')
  if (confirmedOrder.value?.order_id) {
    router.push(`/mis-pedidos/${confirmedOrder.value.order_id}`)
  }
}

// ── Exposed interface for wizard page ─────────────────────────────────────

const isValid = computed(() => {
  if (cartStore.isEmpty || !otpAuthStore.isAuthenticated) return false
  if (!paymentSelection.value.slug) return false
  const grp = paymentGroups.value.find((g) => g.slug === paymentSelection.value.slug)
  if (grp?.methods?.length && !paymentSelection.value.id) return false
  return true
})

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
