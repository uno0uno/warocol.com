<template>
  <Teleport to="body">
    <Transition name="bar-slide">
      <div v-if="cartStore.itemCount > 0 && orderingEnabled" class="cart-bottom-bar bg-white border-t border-border shadow-2xl">
        <div class="max-w-7xl mx-auto px-4 py-3">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="min-w-0">
                <p class="font-bold text-foreground text-sm sm:text-base truncate">
                  {{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }}
                </p>
                <p class="text-xs sm:text-sm text-muted-foreground">
                  {{ cartStore.formattedSubtotal }}
                </p>
              </div>
            </div>
            <button
              class="flex items-center gap-2 flex-shrink-0 min-h-[44px] py-2.5 px-4 sm:py-3 sm:px-6 bg-primary text-primary-foreground rounded-lg font-semibold text-sm sm:text-base transition-opacity hover:opacity-90 active:opacity-80"
              @click="$emit('open-cart')"
              aria-label="Ver carrito"
            >
              Ver carrito
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useTableQrCartStore } from '~/stores/table_qr_cart'

withDefaults(defineProps<{
  orderingEnabled?: boolean
}>(), {
  orderingEnabled: true,
})

defineEmits<{
  (e: 'open-cart'): void
}>()

const cartStore = useTableQrCartStore()
</script>

<style scoped>
.cart-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.bar-slide-enter-active,
.bar-slide-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.bar-slide-enter-from,
.bar-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
