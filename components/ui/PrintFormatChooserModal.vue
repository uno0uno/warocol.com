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
        class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-overlay-backdrop/50"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
        @click="cancel"
        @keydown.esc="cancel"
      >
        <div
          class="relative bg-surface rounded-2xl shadow-xl border border-border w-full max-w-md p-6"
          @click.stop
        >
          <h3 :id="titleId" class="text-xl font-bold text-text-primary text-center mb-2">
            {{ title }}
          </h3>
          <p :id="messageId" class="text-sm text-text-secondary text-center leading-relaxed mb-6">
            {{ message }}
          </p>

          <div class="flex flex-col gap-2 mb-4">
            <button
              ref="firstOption"
              type="button"
              class="w-full min-h-[48px] px-4 py-3 rounded-lg border-2 border-border text-start hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
              @click="pick('ticket')"
            >
              <span class="block text-sm font-semibold text-text-primary">{{ ticketLabel }}</span>
              <span class="block text-xs text-text-secondary mt-0.5">{{ ticketHint }}</span>
            </button>
            <button
              type="button"
              class="w-full min-h-[48px] px-4 py-3 rounded-lg border-2 border-border text-start hover:border-primary hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
              @click="pick('document')"
            >
              <span class="block text-sm font-semibold text-text-primary">{{ documentLabel }}</span>
              <span class="block text-xs text-text-secondary mt-0.5">{{ documentHint }}</span>
            </button>
          </div>

          <button
            type="button"
            class="w-full min-h-[44px] py-3 px-4 border-2 border-border rounded-lg text-text-primary font-medium hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all"
            @click="cancel"
          >
            {{ cancelLabel }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export type PrintFormatChoice = 'ticket' | 'document'

interface Props {
  modelValue: boolean
  title: string
  message: string
  ticketLabel: string
  ticketHint: string
  documentLabel: string
  documentHint: string
  cancelLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  cancelLabel: 'Cancelar',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', format: PrintFormatChoice): void
  (e: 'cancel'): void
}>()

const uid = useId()
const titleId = `print-format-title-${uid}`
const messageId = `print-format-msg-${uid}`
const firstOption = ref<HTMLButtonElement | null>(null)

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick()
      firstOption.value?.focus()
    }
  },
)

const cancel = () => {
  emit('update:modelValue', false)
  emit('cancel')
}

const pick = (format: PrintFormatChoice) => {
  emit('update:modelValue', false)
  emit('select', format)
}
</script>
