<template>
  <div class="bg-card rounded-xl border border-border/50 p-4 shadow-sm">
    <h3 class="text-sm font-bold text-foreground mb-3 uppercase tracking-wide text-muted-foreground">Resumen</h3>

    <div class="flex flex-col gap-2">
      <!-- Subtotal -->
      <div class="flex justify-between items-center text-[15px]">
        <span class="text-muted-foreground">
          Subtotal ({{ itemCount }} {{ itemCount === 1 ? 'producto' : 'productos' }})
        </span>
        <span class="text-foreground font-medium">{{ formatPrice(subtotal) }}</span>
      </div>

      <!-- Delivery fee -->
      <div v-if="orderType === 'delivery'" class="flex justify-between items-center text-[15px]">
        <span class="flex items-center gap-2 text-muted-foreground">
          Domicilio
          <span v-if="deliveryFee === 0" class="bg-success text-success-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            GRATIS
          </span>
        </span>
        <span class="text-foreground font-medium">{{ formatPrice(deliveryFee) }}</span>
      </div>

      <!-- Discount -->
      <div v-if="discount > 0" class="flex justify-between items-center text-[15px]">
        <span class="text-success">Descuento</span>
        <span class="text-success font-semibold">-{{ formatPrice(discount) }}</span>
      </div>
    </div>

    <div class="h-px bg-border my-3" />

    <!-- Total -->
    <div class="flex justify-between items-center mb-3">
      <span class="text-base font-bold text-foreground">Total</span>
      <span class="text-xl font-extrabold text-primary">{{ formatPrice(total) }}</span>
    </div>

    <!-- Minimum order warning -->
    <div v-if="normalizedMinimumOrder > subtotal" class="flex flex-col items-center text-center text-sm p-2.5 rounded-lg bg-state-warning-bg border border-state-warning-border text-state-warning-text mb-3">
      <span class="flex items-center gap-1.5">
        <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.732 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
        Pedido mínimo: {{ formatPrice(normalizedMinimumOrder) }}
      </span>
      <small class="font-semibold mt-0.5">Faltan {{ formatPrice(normalizedMinimumOrder - subtotal) }}</small>
    </div>

    <!-- Online orders disabled notice — takes priority over closed notice -->
    <div v-if="showCheckoutButton && !acceptsOnlineOrders" class="flex items-center gap-2 p-3 mb-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z" />
      </svg>
      Este restaurante no recibe pedidos en línea actualmente
    </div>

    <!-- Restaurant closed notice -->
    <div v-else-if="showCheckoutButton && !restaurantOpen" class="flex items-center gap-2 p-3 mb-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
      <svg class="w-4 h-4 flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
      El restaurante está cerrado en este momento
    </div>

    <!-- Checkout button -->
    <button
      v-if="showCheckoutButton"
      class="w-full py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold
             hover:opacity-90 active:scale-[0.98] transition-all
             disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:active:scale-100
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
             shadow-md shadow-primary/20"
      :disabled="isCheckoutDisabled"
      @click="$emit('checkout')"
    >
      <span v-if="!acceptsOnlineOrders">Pedidos en línea no disponibles</span>
      <span v-else-if="!restaurantOpen">Restaurante cerrado</span>
      <span v-else-if="normalizedMinimumOrder > subtotal">Pedido mínimo no alcanzado</span>
      <span v-else>Continuar a Checkout</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    subtotal: number
    itemCount: number
    orderType?: 'delivery' | 'pickup' | 'dine-in'
    deliveryFee?: number
    discount?: number
    // Accepts string too because the public restaurant endpoint
    // serializes Decimal as a JSON string (warocol.com#632). Normalized
    // below via `normalizedMinimumOrder` so consumers can pass the raw
    // API value without thinking about it.
    minimumOrder?: number | string
    showCheckoutButton?: boolean
    restaurantOpen?: boolean
    acceptsOnlineOrders?: boolean
  }>(),
  {
    orderType: 'delivery',
    deliveryFee: 0,
    discount: 0,
    minimumOrder: 0,
    showCheckoutButton: true,
    restaurantOpen: true,
    acceptsOnlineOrders: true,
  }
)

defineEmits<{
  (e: 'checkout'): void
}>()

// Single boundary normalization for the Decimal-string trap. Every
// downstream check (warning v-if, math, checkout-disabled, button label)
// reads through this — so future consumers of <CartSummary> stay safe
// without repeating the Number(...) || 0 dance.
const normalizedMinimumOrder = computed(() => Number(props.minimumOrder) || 0)

const total = computed(() => {
  return props.subtotal + props.deliveryFee - props.discount
})

const isCheckoutDisabled = computed(() => {
  if (!props.acceptsOnlineOrders) return true
  if (!props.restaurantOpen) return true
  return normalizedMinimumOrder.value > 0 && props.subtotal < normalizedMinimumOrder.value
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}
</script>
