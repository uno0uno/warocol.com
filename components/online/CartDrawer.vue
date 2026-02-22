<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition name="fade">
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        @click="close"
      />
    </Transition>

    <!-- Drawer -->
    <Transition name="slide">
      <aside v-if="modelValue" class="fixed top-0 right-0 bottom-0 w-full max-w-[480px] bg-background z-[101] flex flex-col shadow-2xl">

        <!-- Header -->
        <header class="flex items-center justify-between px-4 py-3 border-b border-border bg-background flex-shrink-0">
          <h2 class="flex items-center gap-2 text-base font-bold text-foreground m-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="text-primary"
            >
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Mi Carrito
            <span class="text-sm font-medium text-muted-foreground">({{ cartStore.itemCount }})</span>
          </h2>

          <button
            class="w-8 h-8 flex items-center justify-center bg-muted rounded-lg text-muted-foreground hover:bg-border hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Cerrar carrito"
            @click="close"
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <!-- Error banner -->
        <Transition name="fade">
          <div
            v-if="errorMsg"
            class="mx-4 mt-3 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex-shrink-0"
          >
            <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {{ errorMsg }}
          </div>
        </Transition>

        <!-- Empty State -->
        <div v-if="cartStore.isEmpty" class="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <div class="text-5xl mb-3 opacity-50">🛒</div>
          <h3 class="text-base font-bold text-foreground mb-1">Tu carrito está vacío</h3>
          <p class="text-sm text-muted-foreground mb-4">Agrega productos para comenzar tu pedido</p>
          <button
            class="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            @click="close"
          >
            Explorar Menú
          </button>
        </div>

        <!-- Cart Content -->
        <template v-else>
          <!-- Scrollable area: order type selector + items list -->
          <div class="flex-1 overflow-y-auto flex flex-col min-h-0">

            <!-- Order Type Selector -->
            <div class="px-4 py-3 bg-muted/30 border-b border-border flex-shrink-0">
              <label class="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tipo de pedido</label>
              <div class="grid grid-cols-3 gap-1.5">
                <button
                  v-for="type in orderTypes"
                  :key="type.value"
                  class="py-2 px-2 rounded-lg text-xs font-semibold text-center border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  :class="cartStore.orderType === type.value
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-primary'"
                  @click="cartStore.setOrderType(type.value)"
                >
                  {{ type.icon }} {{ type.label }}
                </button>
              </div>
            </div>

            <!-- Items List -->
            <div class="flex-1 py-1">
              <div>
                <CartItem
                  v-for="item in cartStore.items"
                  :key="item.id"
                  :item="item"
                  :loading="cartStore.isLoading"
                  @update-quantity="handleUpdateQuantity"
                  @remove="handleRemoveItem"
                />
              </div>
            </div>
          </div>

          <!-- Pinned footer: summary + clear button -->
          <div class="flex-shrink-0 border-t border-border">
            <!-- Summary -->
            <div class="px-4 pt-3 pb-2">
              <CartSummary
                :subtotal="cartStore.subtotal"
                :item-count="cartStore.itemCount"
                :order-type="cartStore.orderType"
                :delivery-fee="deliveryFee"
                :minimum-order="minimumOrder"
                @checkout="handleCheckout"
              />
            </div>

            <!-- Clear Cart -->
            <div class="px-4 pb-3">
              <Transition name="fade" mode="out-in">
                <div v-if="confirmClear" key="confirm" class="flex items-center gap-2 justify-center py-1">
                  <span class="text-sm text-muted-foreground">¿Vaciar carrito?</span>
                  <button
                    class="px-3 py-1.5 text-sm font-semibold bg-destructive text-destructive-foreground rounded-lg hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    :disabled="cartStore.isLoading"
                    @click="confirmAndClearCart"
                  >
                    Sí, vaciar
                  </button>
                  <button
                    class="px-3 py-1.5 text-sm font-semibold bg-muted text-foreground rounded-lg hover:bg-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    @click="confirmClear = false"
                  >
                    Cancelar
                  </button>
                </div>
                <button
                  v-else
                  key="trigger"
                  class="w-full py-2 text-sm font-semibold text-destructive hover:bg-destructive/5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  @click="confirmClear = true"
                >
                  🗑️ Vaciar Carrito
                </button>
              </Transition>
            </div>
          </div>
        </template>

      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
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

const confirmClear = ref(false)
const errorMsg = ref<string | null>(null)

let errorTimeout: ReturnType<typeof setTimeout> | null = null

const showError = (msg: string) => {
  errorMsg.value = msg
  if (errorTimeout) clearTimeout(errorTimeout)
  errorTimeout = setTimeout(() => { errorMsg.value = null }, 4000)
}

const deliveryFee = computed(() => {
  if (cartStore.orderType === 'delivery') {
    return cartStore.subtotal >= 50000 ? 0 : 5000
  }
  return 0
})

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
    showError('No se pudo actualizar la cantidad')
  }
}

const handleRemoveItem = async (itemId: string) => {
  try {
    await cartStore.removeItem(itemId)
  } catch (error) {
    console.error('Error removing item:', error)
    showError('No se pudo eliminar el producto')
  }
}

const confirmAndClearCart = async () => {
  try {
    await cartStore.clearCart()
    confirmClear.value = false
  } catch (error) {
    console.error('Error clearing cart:', error)
    confirmClear.value = false
    showError('No se pudo vaciar el carrito')
  }
}

const handleCheckout = () => {
  close()
  emit('checkout')
}

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

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .slide-enter-active,
  .slide-leave-active {
    transition: none;
  }
}
</style>
