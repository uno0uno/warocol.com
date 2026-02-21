<template>
  <Teleport to="body">
    <Transition name="bar-slide">
    <div v-if="cartStore.itemCount > 0" class="cart-bottom-bar">
      <!-- Left: icon + count + subtotal -->
      <div class="bar-info">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="bar-icon"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        <span class="bar-count">{{ cartStore.itemCount }} {{ cartStore.itemCount === 1 ? 'item' : 'items' }}</span>
        <span class="bar-separator">·</span>
        <span class="bar-subtotal">{{ cartStore.formattedSubtotal }}</span>
      </div>

      <!-- Right: CTA button -->
      <button class="bar-cta" @click="$emit('open-cart')" aria-label="Ver carrito">
        Ver carrito
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
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
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  padding-bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
}

.bar-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
}

.bar-icon {
  flex-shrink: 0;
  opacity: 0.9;
}

.bar-count {
  font-weight: 600;
}

.bar-separator {
  opacity: 0.6;
}

.bar-subtotal {
  font-weight: 700;
}

.bar-cta {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: white;
  color: #667eea;
  border: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.bar-cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.bar-cta:active {
  transform: translateY(0);
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

/* Mobile: slightly compact */
@media (max-width: 640px) {
  .cart-bottom-bar {
    padding: 12px 16px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  }

  .bar-info {
    font-size: 14px;
    gap: 6px;
  }

  .bar-cta {
    padding: 8px 14px;
    font-size: 13px;
  }
}
</style>
