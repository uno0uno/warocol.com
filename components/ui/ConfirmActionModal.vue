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
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="messageId"
        @click="cancel"
        @keydown.esc="cancel"
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
              <div
                :class="[
                  'w-16 h-16 rounded-full flex items-center justify-center',
                  variant === 'destructive'
                    ? 'bg-state-warning-bg'
                    : 'bg-primary/10',
                ]"
              >
                <ExclamationTriangleIcon
                  :class="[
                    'w-8 h-8',
                    variant === 'destructive'
                      ? 'text-state-warning-icon'
                      : 'text-primary',
                  ]"
                  aria-hidden="true"
                />
              </div>
            </div>

            <h3 :id="titleId" class="text-xl font-bold text-text-primary text-center mb-2">
              {{ title }}
            </h3>
            <p :id="messageId" class="text-base text-text-secondary text-center leading-relaxed mb-6">
              {{ message }}
            </p>

            <div class="flex flex-col-reverse sm:flex-row gap-2">
              <button
                ref="cancelButton"
                type="button"
                :disabled="loading"
                class="flex-1 min-h-[44px] py-3 px-4 border-2 border-border rounded-lg text-text-primary font-medium whitespace-nowrap hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                @click="cancel"
              >
                {{ cancelLabel }}
              </button>
              <button
                type="button"
                :disabled="loading"
                :class="[
                  'flex-1 min-h-[44px] py-3 px-4 rounded-lg font-semibold whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95 transition-all flex items-center justify-center gap-2',
                  variant === 'destructive'
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus:ring-destructive'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary',
                ]"
                @click="confirm"
              >
                <UiLoadingDots v-if="loading" size="8px" color="currentColor" />
                <span>{{ loading ? loadingLabel : confirmLabel }}</span>
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'

interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  loadingLabel?: string
  variant?: 'destructive' | 'primary'
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  loadingLabel: 'Procesando...',
  variant: 'primary',
  loading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const uid = useId()
const titleId = `confirm-modal-title-${uid}`
const messageId = `confirm-modal-msg-${uid}`

const cancelButton = ref<HTMLButtonElement | null>(null)

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick()
      cancelButton.value?.focus()
    }
  },
)

const cancel = () => {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}

const confirm = () => {
  if (props.loading) return
  emit('confirm')
}
</script>
