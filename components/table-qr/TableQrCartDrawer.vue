<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="modelValue" class="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-[100]" @click="close" />
    </Transition>
    <Transition name="slide">
      <aside v-if="modelValue" class="fixed top-0 end-0 bottom-0 w-full max-w-[480px] bg-background z-[101] flex flex-col shadow-2xl">
        <header class="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h2 class="text-base font-bold text-foreground m-0">Tu pedido</h2>
          <button
            class="w-10 h-10 flex items-center justify-center bg-muted rounded-lg"
            aria-label="Cerrar carrito"
            @click="close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div v-if="cartStore.isEmpty" class="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div class="text-5xl mb-3 opacity-50">🛒</div>
          <p class="text-sm text-muted-foreground">Agrega productos del menú</p>
        </div>

        <template v-else>
          <div class="flex-1 overflow-y-auto min-h-0 py-1">
            <CartItem
              v-for="item in cartStore.items"
              :key="item.id"
              :item="item"
              :loading="false"
              :restaurant-closed="!restaurantOpen"
              @update-quantity="(id, qty) => cartStore.updateItemQuantity(id, qty)"
              @remove="(id) => cartStore.removeItem(id)"
              @customize-add="handleCustomizeAdd(item)"
            />
          </div>
          <div class="flex-shrink-0 border-t border-border p-4 space-y-3">
            <div class="flex justify-between text-sm font-semibold">
              <span>Subtotal ({{ cartStore.itemCount }} items)</span>
              <span>{{ cartStore.formattedSubtotal }}</span>
            </div>
            <button
              class="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold disabled:opacity-50"
              :disabled="!restaurantOpen || !orderingEnabled"
              @click="handleCheckout"
            >
              {{ restaurantOpen ? 'Continuar' : 'Restaurante cerrado' }}
            </button>
            <button
              class="w-full py-2 text-sm text-destructive"
              @click="cartStore.clearCart()"
            >
              Vaciar carrito
            </button>
          </div>
        </template>
      </aside>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import CartItem from '~/components/online/CartItem.vue'
import { useTableQrCartStore } from '~/stores/table_qr_cart'

const props = defineProps<{
  modelValue: boolean
  restaurantOpen?: boolean
  orderingEnabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'checkout'): void
  (e: 'open-product', product: { id: string; name: string; price: number; has_modifiers: boolean }): void
}>()

const cartStore = useTableQrCartStore()

const close = () => emit('update:modelValue', false)

const handleCheckout = () => {
  close()
  emit('checkout')
}

const handleCustomizeAdd = (item: { product_id: string; product_name: string; unit_price: number }) => {
  emit('open-product', {
    id: item.product_id,
    name: item.product_name,
    price: item.unit_price,
    has_modifiers: true,
  })
}

onMounted(() => {
  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.modelValue) close()
  }
  window.addEventListener('keydown', onKeydown)
  onUnmounted(() => window.removeEventListener('keydown', onKeydown))
})
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.slide-enter-active, .slide-leave-active { transition: transform 0.3s ease; }
.slide-enter-from, .slide-leave-to { transform: translateX(100%); }
</style>
