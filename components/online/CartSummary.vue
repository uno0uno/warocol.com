<template>
  <div class="cart-summary">
    <h3 class="summary-title">Resumen del Pedido</h3>

    <div class="summary-lines">
      <!-- Subtotal -->
      <div class="summary-line">
        <span class="line-label">Subtotal ({{ itemCount }} {{ itemCount === 1 ? 'producto' : 'productos' }})</span>
        <span class="line-value">{{ formatPrice(subtotal) }}</span>
      </div>

      <!-- Delivery Fee (only for delivery orders) -->
      <div v-if="orderType === 'delivery'" class="summary-line">
        <span class="line-label">
          Domicilio
          <span v-if="deliveryFee === 0" class="free-badge">GRATIS</span>
        </span>
        <span class="line-value">{{ formatPrice(deliveryFee) }}</span>
      </div>

      <!-- Discount (if any) -->
      <div v-if="discount > 0" class="summary-line discount-line">
        <span class="line-label">Descuento</span>
        <span class="line-value">-{{ formatPrice(discount) }}</span>
      </div>
    </div>

    <div class="summary-divider"></div>

    <!-- Total -->
    <div class="summary-total">
      <span class="total-label">Total</span>
      <span class="total-value">{{ formatPrice(total) }}</span>
    </div>

    <!-- Minimum Order Note -->
    <div v-if="minimumOrder > subtotal" class="minimum-order-note">
      ⚠️ Pedido mínimo: {{ formatPrice(minimumOrder) }}
      <br />
      <small>Faltan {{ formatPrice(minimumOrder - subtotal) }}</small>
    </div>

    <!-- Checkout Button -->
    <button
      v-if="showCheckoutButton"
      class="checkout-btn"
      :disabled="isCheckoutDisabled"
      @click="$emit('checkout')"
    >
      <span v-if="!isCheckoutDisabled">Continuar a Checkout</span>
      <span v-else>Pedido mínimo no alcanzado</span>
    </button>
  </div>
</template>

<script setup lang="ts">
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

<style scoped>
.cart-summary {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.summary-title {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 16px 0;
}

.summary-lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
}

.line-label {
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
}

.line-value {
  color: #111827;
  font-weight: 500;
}

.free-badge {
  background: #10b981;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 12px;
}

.discount-line {
  color: #10b981;
}

.discount-line .line-value {
  color: #10b981;
  font-weight: 600;
}

.summary-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 16px 0;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.total-label {
  font-size: 18px;
  font-weight: 700;
  color: #111827;
}

.total-value {
  font-size: 24px;
  font-weight: 800;
  color: #667eea;
}

.minimum-order-note {
  background: #fef3c7;
  color: #92400e;
  font-size: 13px;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
  border: 1px solid #fbbf24;
}

.minimum-order-note small {
  font-weight: 600;
}

.checkout-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.checkout-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.checkout-btn:active:not(:disabled) {
  transform: translateY(0);
}

.checkout-btn:disabled {
  background: #d1d5db;
  cursor: not-allowed;
  box-shadow: none;
}

/* Mobile styles */
@media (max-width: 640px) {
  .cart-summary {
    padding: 16px;
  }

  .summary-title {
    font-size: 16px;
  }

  .total-value {
    font-size: 20px;
  }
}
</style>
