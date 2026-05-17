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
        class="hidden lg:flex fixed inset-0 bg-black bg-opacity-50 z-[60] items-center justify-center p-4"
        @click="closeModal"
      >
        <Transition
          enter-active-class="transition-all duration-300"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-300"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            class="bg-white rounded-2xl w-full max-w-md flex flex-col shadow-xl"
            @click.stop
          >
            <!-- Header -->
            <div class="flex-shrink-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 class="text-lg font-semibold text-text-primary">{{ title }}</h3>
              <button
                @click="closeModal"
                class="p-2 hover:bg-surface-secondary rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <XMarkIcon class="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            <!-- Content -->
            <div class="flex-1">
              <slot />
            </div>

            <!-- Footer (optional, sticky) -->
            <div v-if="$slots.footer" class="flex-shrink-0 bg-white border-t border-border rounded-b-2xl">
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
  maxHeight: 'lg'
})

const emit = defineEmits<Emits>()

const maxHeightClass = computed(() => {
  const heights = {
    sm: 'max-h-[50vh]',
    md: 'max-h-[65vh]',
    lg: 'max-h-[80vh]',
    xl: 'max-h-[90vh]'
  }
  return heights[props.maxHeight]
})

const closeModal = () => {
  emit('update:modelValue', false)
}
</script>
