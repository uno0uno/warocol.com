<template>
  <div class="bg-card rounded-xl border border-border/50 p-5 shadow-sm">
    <h3 class="text-lg font-bold text-foreground mb-4">Resumen del Pedido</h3>

    <div class="flex flex-col gap-3">
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

    <div class="h-px bg-border my-4" />

    <!-- Total -->
    <div class="flex justify-between items-center mb-4">
      <span class="text-lg font-bold text-foreground">Total</span>
      <span class="text-2xl font-extrabold text-primary">{{ formatPrice(total) }}</span>
    </div>

    <!-- Minimum order warning -->
    <div v-if="minimumOrder > subtotal" class="flex flex-col items-center text-center text-sm p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 mb-4">
      ⚠️ Pedido mínimo: {{ formatPrice(minimumOrder) }}
      <small class="font-semibold mt-0.5">Faltan {{ formatPrice(minimumOrder - subtotal) }}</small>
    </div>

    <!-- Checkout button -->
    <button
      v-if="showCheckoutButton"
      class="w-full py-4 bg-primary text-primary-foreground rounded-xl text-base font-bold
             hover:opacity-90 active:scale-[0.98] transition-all
             disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed disabled:active:scale-100
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
             shadow-md shadow-primary/20"
      :disabled="isCheckoutDisabled"
      @click="$emit('checkout')"
    >
      <span v-if="!isCheckoutDisabled">Continuar a Checkout</span>
      <span v-else>Pedido mínimo no alcanzado</span>
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
    minimumOrder?: number
    showCheckoutButton?: boolean
  }>(),
  {
    orderType: 'delivery',
    deliveryFee: 0,
    discount: 0,
    minimumOrder: 0,
    showCheckoutButton: true,
  }
)

defineEmits<{
  (e: 'checkout'): void
}>()

const total = computed(() => {
  return props.subtotal + props.deliveryFee - props.discount
})

const isCheckoutDisabled = computed(() => {
  return props.minimumOrder > 0 && props.subtotal < props.minimumOrder
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}
</script>
