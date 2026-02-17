<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="cart-backdrop"
        @click="close"
      ></div>
    </Transition>

    <!-- Drawer -->
    <Transition name="slide">
      <aside v-if="modelValue" class="cart-drawer">
        <!-- Header -->
        <header class="drawer-header">
          <h2 class="drawer-title">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Mi Carrito
            <span class="item-count">({{ cartStore.itemCount }})</span>
          </h2>

          <button class="close-btn" @click="close" aria-label="Cerrar carrito">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <!-- Empty State -->
        <div v-if="cartStore.isEmpty" class="empty-cart">
          <div class="empty-icon">🛒</div>
          <h3>Tu carrito está vacío</h3>
          <p>Agrega productos para comenzar tu pedido</p>
          <button class="continue-shopping-btn" @click="close">
            Explorar Menú
          </button>
        </div>

        <!-- Cart Content -->
        <div v-else class="drawer-content">
          <!-- Order Type Selector -->
          <div class="order-type-section">
            <label class="order-type-label">Tipo de pedido</label>
            <div class="order-type-tabs">
              <button
                v-for="type in orderTypes"
                :key="type.value"
                class="order-type-tab"
                :class="{ active: cartStore.orderType === type.value }"
                @click="cartStore.setOrderType(type.value)"
              >
                {{ type.icon }} {{ type.label }}
              </button>
            </div>
          </div>

          <!-- Items List -->
          <div class="items-section">
            <h3 class="section-title">Productos ({{ cartStore.itemCount }})</h3>

            <div class="items-list">
              <CartItem
                v-for="item in cartStore.items"
                :key="item.id"
                :item="item"
                @update-quantity="handleUpdateQuantity"
                @remove="handleRemoveItem"
              />
            </div>
          </div>

          <!-- Summary -->
          <div class="summary-section">
            <CartSummary
              :subtotal="cartStore.subtotal"
              :item-count="cartStore.itemCount"
              :order-type="cartStore.orderType"
              :delivery-fee="deliveryFee"
              :minimum-order="minimumOrder"
              @checkout="handleCheckout"
            />
          </div>

          <!-- Clear Cart Button -->
          <button class="clear-cart-btn" @click="handleClearCart">
            🗑️ Vaciar Carrito
          </button>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useOnlineCartStore } from '~/stores/online_cart'
import CartItem from './CartItem.vue'
import CartSummary from './CartSummary.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'checkout'): void
}>()

const cartStore = useOnlineCartStore()

const orderTypes = [
  { value: 'delivery', label: 'Domicilio', icon: '🚗' },
  { value: 'pickup', label: 'Recoger', icon: '🏪' },
  { value: 'dine-in', label: 'Comer aquí', icon: '🍽️' },
] as const

// Mock delivery fee
const deliveryFee = computed(() => {
  if (cartStore.orderType === 'delivery') {
    // Free delivery over 50000
    return cartStore.subtotal >= 50000 ? 0 : 5000
  }
  return 0
})

// Mock minimum order
const minimumOrder = computed(() => {
  return cartStore.orderType === 'delivery' ? 20000 : 0
})

const close = () => {
  emit('update:modelValue', false)
}

const handleUpdateQuantity = async (itemId: string, quantity: number) => {
  try {
    await cartStore.updateItemQuantity(itemId, quantity)
  } catch (error) {
    console.error('Error updating quantity:', error)
    alert('Error al actualizar cantidad')
  }
}

const handleRemoveItem = async (itemId: string) => {
  try {
    await cartStore.removeItem(itemId)
  } catch (error) {
    console.error('Error removing item:', error)
    alert('Error al eliminar producto')
  }
}

const handleClearCart = async () => {
  if (confirm('¿Estás seguro de vaciar el carrito?')) {
    try {
      await cartStore.clearCart()
    } catch (error) {
      console.error('Error clearing cart:', error)
      alert('Error al vaciar carrito')
    }
  }
}

const handleCheckout = () => {
  close()
  emit('checkout')
}

// Close on ESC key
onMounted(() => {
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) {
      close()
    }
  }
  window.addEventListener('keydown', handleKeydown)
  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown)
  })
})
</script>

<style scoped>
/* Backdrop */
.cart-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  backdrop-filter: blur(2px);
}

/* Drawer */
.cart-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 480px;
  background: white;
  z-index: 101;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* Header */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
  position: sticky;
  top: 0;
  z-index: 10;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.drawer-title svg {
  color: #667eea;
}

.item-count {
  font-size: 16px;
  color: #6b7280;
  font-weight: 500;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: #e5e7eb;
  color: #111827;
}

/* Empty State */
.empty-cart {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-cart h3 {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 8px 0;
}

.empty-cart p {
  color: #6b7280;
  margin: 0 0 24px 0;
}

.continue-shopping-btn {
  padding: 12px 32px;
  background: #667eea;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.continue-shopping-btn:hover {
  background: #5568d3;
}

/* Cart Content */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.order-type-section {
  padding: 20px 24px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.order-type-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 12px;
}

.order-type-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.order-type-tab {
  padding: 10px 8px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.order-type-tab:hover {
  border-color: #667eea;
  color: #667eea;
}

.order-type-tab.active {
  background: #667eea;
  border-color: #667eea;
  color: white;
}

.items-section {
  flex: 1;
  padding: 20px 0;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  margin: 0 0 12px 0;
  padding: 0 24px;
}

.items-list {
  /* Scroll container */
}

.summary-section {
  padding: 20px 24px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.clear-cart-btn {
  padding: 12px 24px;
  background: transparent;
  color: #ef4444;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
}

.clear-cart-btn:hover {
  background: #fef2f2;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Mobile styles */
@media (max-width: 640px) {
  .cart-drawer {
    max-width: 100%;
  }

  .drawer-header {
    padding: 16px 20px;
  }

  .drawer-title {
    font-size: 18px;
  }

  .order-type-tabs {
    gap: 6px;
  }

  .order-type-tab {
    font-size: 12px;
    padding: 8px 6px;
  }
}
</style>
