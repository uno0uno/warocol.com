<template>
  <Teleport to="body">
    <Transition name="bar-slide">
      <div v-if="cartStore.itemCount > 0" class="cart-bottom-bar bg-white border-t border-border shadow-2xl">
        <!-- Inner container — matches layout padding -->
        <div class="px-4 md:px-16 2xl:px-[30rem] py-3">
          <div class="flex items-center justify-between gap-3">

            <!-- Left: icon + stacked text -->
            <div class="flex items-center gap-3 min-w-0">
              <!-- Icon square (desktop only) -->
              <div class="hidden sm:flex w-10 h-10 bg-primary/10 rounded-xl items-center justify-center flex-shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="text-primary"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>

              <!-- Count + subtotal stacked -->
              <div class="min-w-0">
                <p class="font-bold text-foreground text-sm sm:text-base truncate">
                  {{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }}
                </p>
                <p class="text-xs sm:text-sm text-muted-foreground">
                  {{ cartStore.formattedSubtotal }}
                </p>
              </div>
            </div>

            <!-- Right: CTA button -->
            <button
              class="flex items-center gap-2 flex-shrink-0 py-2.5 px-4 sm:py-3 sm:px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-sm sm:text-base transition-opacity hover:opacity-90 active:opacity-80"
              @click="$emit('open-cart')"
              aria-label="Ver carrito"
            >
              Ver carrito
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
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
import { useOnlineCartStore } from '~/stores/online_cart'

defineEmits<{
  (e: 'open-cart'): void
}>()

const cartStore = useOnlineCartStore()
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

/* Slide-up / slide-down transition */
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
