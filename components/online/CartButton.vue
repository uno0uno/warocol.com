<template>
  <button
    v-if="count > 0"
    class="cart-button"
    @click="$emit('click')"
    aria-label="Ver carrito"
  >
    <div class="cart-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      <span class="cart-badge">{{ count }}</span>
    </div>
    <span class="cart-text">Ver Carrito</span>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  count: number
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<style scoped>
.cart-button {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  animation: slideUp 0.4s ease-out;
}

.cart-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
}

.cart-button:active {
  transform: translateY(0);
}

.cart-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cart-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ef4444;
  color: white;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  animation: pop 0.3s ease-out;
}

.cart-text {
  white-space: nowrap;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pop {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

/* Mobile styles */
@media (max-width: 640px) {
  .cart-button {
    bottom: 16px;
    right: 16px;
    padding: 14px 20px;
    font-size: 14px;
  }

  .cart-text {
    display: none;
  }

  .cart-icon svg {
    width: 22px;
    height: 22px;
  }
}
</style>
