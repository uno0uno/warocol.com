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
          class="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
          @click.stop
        >
          <div class="border-b border-border bg-surface-secondary/40 px-6 py-5 text-center">
            <h3
              :id="titleId"
              class="text-lg font-bold tracking-tight text-text-primary"
            >
              {{ title }}
            </h3>
            <p
              :id="messageId"
              class="mt-1.5 text-sm leading-relaxed text-text-secondary"
            >
              {{ message }}
            </p>
          </div>

          <div class="space-y-3 p-5 sm:p-6">
            <button
              ref="firstOption"
              type="button"
              class="group flex w-full min-h-[56px] items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3.5 text-start transition-all hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              @click="pick('ticket')"
            >
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                aria-hidden="true"
              >
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.5h16.5M4.5 4.5v15a.75.75 0 0 0 .75.75h13.5a.75.75 0 0 0 .75-.75v-15M8.25 8.25h7.5M8.25 12h7.5M8.25 15.75h4.5" />
                </svg>
              </span>
              <span class="min-w-0 flex-1 pt-0.5">
                <span class="block text-sm font-semibold text-text-primary">{{ ticketLabel }}</span>
                <span class="mt-0.5 block text-xs leading-snug text-text-secondary">{{ ticketHint }}</span>
              </span>
              <svg
                class="mt-2 h-4 w-4 shrink-0 text-text-tertiary transition-colors group-hover:text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>

            <button
              type="button"
              class="group flex w-full min-h-[56px] items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3.5 text-start transition-all hover:border-primary/50 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              @click="pick('document')"
            >
              <span
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15"
                aria-hidden="true"
              >
                <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </span>
              <span class="min-w-0 flex-1 pt-0.5">
                <span class="block text-sm font-semibold text-text-primary">{{ documentLabel }}</span>
                <span class="mt-0.5 block text-xs leading-snug text-text-secondary">{{ documentHint }}</span>
              </span>
              <svg
                class="mt-2 h-4 w-4 shrink-0 text-text-tertiary transition-colors group-hover:text-primary"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="2"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div class="border-t border-border px-5 py-4 sm:px-6">
            <button
              type="button"
              class="w-full min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              @click="cancel"
            >
              {{ cancelLabel }}
            </button>
          </div>
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
