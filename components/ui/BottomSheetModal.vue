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
        class="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-end lg:hidden"
        @click="closeModal"
      >
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
            class="bg-white rounded-t-2xl w-full flex flex-col overflow-hidden"
            :class="maxHeightClass"
            @click.stop
          >
            <!-- Header -->
            <div class="flex-shrink-0 bg-white border-b border-titan-300 px-4 py-4 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-ebony-800">{{ title }}</h3>
              <button
                @click="closeModal"
                class="p-2 hover:bg-titan-100 rounded-lg transition-colors"
                aria-label="Cerrar"
              >
                <XMarkIcon class="w-5 h-5 text-titan-500" />
              </button>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto">
              <slot />
            </div>

            <!-- Footer (optional, sticky) -->
            <div v-if="$slots.footer" class="flex-shrink-0 bg-white border-t border-titan-300">
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
