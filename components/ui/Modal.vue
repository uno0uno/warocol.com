<template>
  <Teleport to="body">
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
        class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
        @click="closeModal"
      >
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          enter-to-class="opacity-100 translate-y-0 sm:scale-100"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 translate-y-0 sm:scale-100"
          leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        >
          <div
            v-if="modelValue"
            class="bg-surface w-full sm:max-w-md flex flex-col shadow-xl rounded-t-2xl sm:rounded-2xl max-h-[90vh]"
            :class="maxHeightClass"
            @click.stop
          >
            <!-- Header -->
            <div class="flex-shrink-0 border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl sm:rounded-t-2xl">
              <h3 class="text-lg font-semibold text-text-primary">{{ title }}</h3>
              <button
                type="button"
                class="min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-surface-secondary rounded-lg transition-colors"
                aria-label="Cerrar"
                @click="closeModal"
              >
                <XMarkIcon class="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto">
              <slot />
            </div>

            <!-- Footer (optional, sticky) -->
            <div v-if="$slots.footer" class="flex-shrink-0 border-t border-border rounded-b-2xl">
              <slot name="footer" />
            </div>
          </div>
        </Transition>
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
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  maxHeight: 'lg',
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
