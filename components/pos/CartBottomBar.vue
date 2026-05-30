<template>
  <Transition name="bar-slide">
    <div
      v-if="visible"
      class="pos-cart-bottom-bar bg-surface border-b border-border"
      role="region"
      aria-label="Resumen del carrito"
    >
      <div class="px-4 py-3">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="hidden sm:flex w-10 h-10 bg-primary/10 rounded-xl items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
              </svg>
            </div>
            <div class="min-w-0">
              <p class="font-bold text-text-primary text-sm sm:text-base truncate">
                {{ itemCount }} {{ itemCount === 1 ? 'ítem' : 'ítems' }}
              </p>
              <p class="text-xs sm:text-sm text-text-secondary tabular-nums truncate">
                {{ formattedTotal }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="flex items-center gap-2 flex-shrink-0 min-h-[44px] py-2.5 px-4 sm:px-6 bg-primary text-primary-foreground rounded-lg font-semibold text-sm sm:text-base transition-opacity hover:opacity-90 active:opacity-80"
            aria-label="Ver orden actual"
            @click="$emit('open-cart')"
          >
            Ver orden
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  visible: boolean
  itemCount: number
  formattedTotal: string
}>(), {
  visible: false,
  itemCount: 0,
  formattedTotal: '$0',
})

defineEmits<{
  (e: 'open-cart'): void
}>()
</script>

<style scoped>
.bar-slide-enter-active,
.bar-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
}

.bar-slide-enter-from,
.bar-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.bar-slide-enter-to,
.bar-slide-leave-from {
  max-height: 5rem;
  opacity: 1;
}
</style>
