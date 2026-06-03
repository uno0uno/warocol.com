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
        class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
        @click="close"
        @keydown.esc="close"
      >
        <Transition
          enter-active-class="transition-all duration-200"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-200"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="modelValue"
            class="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md p-6"
            @click.stop
          >
            <div class="flex justify-center mb-4">
              <div class="w-16 h-16 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/30">
                <ExclamationTriangleIcon class="w-8 h-8 text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
            </div>

            <h3 :id="titleId" class="text-xl font-bold text-text-primary text-center mb-2">
              {{ title }}
            </h3>
            <p :id="messageId" class="text-base text-text-secondary text-center leading-relaxed mb-4">
              {{ message }}
            </p>

            <div
              v-if="dependents && dependents.length > 0"
              class="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-4 py-3 mb-6 space-y-2"
            >
              <div
                v-for="dep in dependents"
                :key="dep.label"
                class="flex items-center justify-between"
              >
                <span class="text-sm font-medium text-text-primary">{{ dep.label }}</span>
                <span class="text-sm font-bold text-red-700 dark:text-red-300">{{ dep.count }}</span>
              </div>
            </div>

            <button
              ref="acceptButton"
              type="button"
              class="w-full min-h-[44px] py-3 px-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-95 transition-all"
              @click="close"
            >
              Aceptar
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

interface Dependent {
  label: string
  count: number
}

interface Props {
  modelValue: boolean
  title: string
  message: string
  dependents?: Dependent[]
}

const props = withDefaults(defineProps<Props>(), {
  dependents: () => [],
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const uid = useId()
const titleId = `error-modal-title-${uid}`
const messageId = `error-modal-msg-${uid}`

const acceptButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick()
      acceptButton.value?.focus()
    }
  },
)

const close = () => {
  emit('update:modelValue', false)
}
</script>
