<template>
  <div class="cart-item">
    <div class="item-content">
      <!-- Product Info -->
      <div class="item-info">
        <h4 class="item-name">{{ item.product_name }}</h4>

        <!-- Modifiers -->
        <div v-if="item.modifiers.length > 0" class="item-modifiers">
          <span
            v-for="modifier in item.modifiers"
            :key="modifier.id"
            class="modifier-tag"
          >
            + {{ modifier.name }}
          </span>
        </div>

        <!-- Notes -->
        <p v-if="item.notes" class="item-notes">
          📝 {{ item.notes }}
        </p>

        <!-- Price -->
        <p class="item-price">
          {{ formatPrice(item.unit_price) }}
          <span v-if="item.modifiers.length > 0" class="modifiers-price">
            + {{ formatPrice(modifiersTotal) }}
          </span>
        </p>
      </div>

      <!-- Quantity Controls -->
      <div class="item-actions">
        <div class="quantity-controls">
          <button
            class="qty-btn"
            @click="decreaseQuantity"
            :disabled="loading"
            aria-label="Disminuir cantidad"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <span class="qty-value">{{ item.quantity }}</span>

          <button
            class="qty-btn"
            @click="increaseQuantity"
            :disabled="loading"
            aria-label="Aumentar cantidad"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        <!-- Total -->
        <p class="item-total">{{ formatPrice(item.total) }}</p>

        <!-- Remove Button -->
        <button
          class="remove-btn"
          @click="handleRemove"
          :disabled="loading"
          aria-label="Eliminar producto"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CartItem } from '~/stores/online_cart'

const props = defineProps<{
  item: CartItem
}>()

const emit = defineEmits<{
  (e: 'update-quantity', itemId: string, quantity: number): void
  (e: 'remove', itemId: string): void
}>()

const loading = ref(false)

const modifiersTotal = computed(() => {
  return props.item.modifiers.reduce((sum, mod) => sum + mod.price, 0)
})

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(price)
}

const increaseQuantity = () => {
  emit('update-quantity', props.item.id, props.item.quantity + 1)
}

const decreaseQuantity = () => {
  if (props.item.quantity > 1) {
    emit('update-quantity', props.item.id, props.item.quantity - 1)
  } else {
    // If quantity is 1, remove item
    handleRemove()
  }
}

const handleRemove = () => {
  emit('remove', props.item.id)
}
</script>

<style scoped>
.cart-item {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s ease;
}

.cart-item:hover {
  background-color: #f9fafb;
}

.cart-item:last-child {
  border-bottom: none;
}

.item-content {
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.item-modifiers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.modifier-tag {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 4px 8px;
  border-radius: 12px;
}

.item-notes {
  font-size: 13px;
  color: #6b7280;
  font-style: italic;
  margin: 4px 0 8px 0;
}

.item-price {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.modifiers-price {
  color: #9ca3af;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 4px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.qty-btn:hover:not(:disabled) {
  background: #667eea;
  color: white;
}

.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.qty-value {
  min-width: 24px;
  text-align: center;
  font-weight: 600;
  color: #111827;
}

.item-total {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.remove-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  color: #ef4444;
  transition: all 0.2s ease;
}

.remove-btn:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #ef4444;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Mobile styles */
@media (max-width: 640px) {
  .cart-item {
    padding: 12px;
  }

  .item-content {
    flex-direction: column;
    gap: 12px;
  }

  .item-actions {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }
}
</style>
