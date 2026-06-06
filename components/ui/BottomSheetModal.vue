<template>
  <Teleport to="body">
    <!-- Backdrop + sheet as siblings (not nested) so taps on controls are not swallowed by the overlay flex container. -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 bg-overlay-backdrop/50 z-[70] lg:hidden"
        aria-hidden="true"
        @click="closeModal"
      />
    </Transition>

    <Transition
      enter-active-class="transition-transform duration-300"
      enter-from-class="translate-y-full"
      enter-to-class="translate-y-0"
      leave-active-class="transition-transform duration-300"
      leave-from-class="translate-y-0"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="modelValue"
        class="fixed inset-x-0 bottom-0 z-[71] lg:hidden bg-sheet-surface-bg rounded-t-2xl w-full flex flex-col overflow-hidden shadow-2xl touch-manipulation"
        :class="maxHeightClass"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Header -->
        <div class="flex-shrink-0 bg-sheet-header-bg border-b border-sheet-border px-4 py-4 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-modal-surface-text">{{ title }}</h3>
          <button
            type="button"
            @click="closeModal"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-icon-button-neutral-hover-bg focus:outline-none focus:ring-2 focus:ring-icon-button-focus-ring rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <XMarkIcon class="w-5 h-5 text-icon-button-neutral-text" />
          </button>
        </div>

        <!-- Content: default scroll, or fill for self-contained panels (POS cart) -->
        <div
          class="flex-1 min-h-0"
          :class="fillContent ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overscroll-y-contain'"
        >
          <slot />
        </div>

        <!-- Footer (optional, sticky) -->
        <div v-if="$slots.footer" class="flex-shrink-0 bg-sheet-footer-bg border-t border-sheet-border">
          <slot name="footer" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: boolean
  title: string
  maxHeight?: 'sm' | 'md' | 'lg' | 'xl'
  /** When true, slot manages its own internal scroll (e.g. CartPanel). Avoids nested scroll stealing taps on mobile. */
  fillContent?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: 'lg',
  fillContent: false,
})

const emit = defineEmits<Emits>()

const maxHeightClass = computed(() => {
  const heights = {
    sm: 'max-h-[50vh]',
    md: 'max-h-[65vh]',
    lg: 'max-h-[80vh]',
    xl: 'max-h-[90vh]',
  }
  return heights[props.maxHeight]
})

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>
