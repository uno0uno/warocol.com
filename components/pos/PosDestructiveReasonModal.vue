<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-backdrop/50"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        @click.self="!loading && close()"
        @keydown.esc="!loading && close()"
      >
        <div class="w-full max-w-sm bg-surface rounded-2xl shadow-2xl overflow-hidden">
          <div class="px-5 pt-5 pb-4">
            <div class="flex items-start gap-3">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                :class="variant === 'warning' ? 'bg-status-warning-bg' : 'bg-destructive/10'"
              >
                <svg
                  class="w-5 h-5"
                  :class="variant === 'warning' ? 'text-status-warning-text' : 'text-destructive'"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <h3 :id="titleId" class="text-base font-bold text-text-primary leading-tight">
                  {{ resolvedTitle }}
                </h3>
                <p v-if="resolvedMessage" class="text-sm text-text-secondary mt-1 leading-snug">
                  {{ resolvedMessage }}
                </p>
              </div>
            </div>

            <label
              :for="reasonInputId"
              class="block text-xs font-medium text-text-secondary uppercase tracking-wide mt-4 mb-1.5"
            >
              {{ t('pos.destructive.reasonLabel') }} <span class="text-destructive">{{ t('pos.destructive.reasonRequired') }}</span>
            </label>
            <textarea
              :id="reasonInputId"
              v-model="reason"
              rows="2"
              :disabled="loading"
              :placeholder="resolvedReasonPlaceholder"
              class="w-full px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 disabled:opacity-50"
            />
            <p v-if="error" class="mt-2 text-sm text-destructive">
              {{ error }}
            </p>
          </div>

          <div class="px-5 pb-5 flex gap-2">
            <button
              type="button"
              :disabled="loading"
              class="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-surface-secondary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-40 disabled:cursor-not-allowed"
              @click="close"
            >
              {{ t('pos.destructive.cancel') }}
            </button>
            <button
              type="button"
              :disabled="loading || !reason.trim()"
              class="flex-1 min-h-[44px] rounded-xl text-sm font-semibold active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              :class="variant === 'warning'
                ? 'bg-action-secondary-bg text-action-secondary-text hover:bg-action-secondary-hover-bg focus-visible:ring-action-secondary-focus-ring'
                : 'bg-action-destructive-bg text-action-destructive-text hover:bg-action-destructive-hover-bg focus-visible:ring-action-destructive-focus-ring'"
              @click="submit"
            >
              <UiLoadingDots v-if="loading" size="9px" :color="variant === 'warning' ? 'white' : 'white'" />
              <span v-else>{{ resolvedConfirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const { t, locale } = useI18n({ useScope: 'global' })
import { computed, ref, watch } from 'vue'

interface Props {
  modelValue: boolean
  /** Pre-translated title (legacy). Prefer titleKey. */
  title?: string
  titleKey?: string
  titleParams?: Record<string, unknown>
  message?: string
  messageKey?: string
  messageParams?: Record<string, unknown>
  confirmLabel?: string
  confirmLabelKey?: string
  confirmLabelParams?: Record<string, unknown>
  reasonPlaceholder?: string
  loading?: boolean
  error?: string
  variant?: 'destructive' | 'warning'
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  titleKey: undefined,
  titleParams: () => ({}),
  message: '',
  messageKey: undefined,
  messageParams: () => ({}),
  confirmLabel: undefined,
  confirmLabelKey: undefined,
  confirmLabelParams: () => ({}),
  reasonPlaceholder: undefined,
  loading: false,
  error: '',
  variant: 'destructive',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', reason: string): void
  (e: 'cancel'): void
}>()

const resolvedTitle = computed(() => {
  void locale.value
  if (props.titleKey) return t(props.titleKey, props.titleParams as any)
  return props.title
})
const resolvedMessage = computed(() => {
  void locale.value
  if (props.messageKey) return t(props.messageKey, props.messageParams as any)
  return props.message
})
const resolvedReasonPlaceholder = computed(() => {
  void locale.value
  return props.reasonPlaceholder || t('pos.destructive.reasonPlaceholder')
})
const resolvedConfirmLabel = computed(() => {
  void locale.value
  if (props.confirmLabelKey) return t(props.confirmLabelKey, props.confirmLabelParams as any)
  if (props.confirmLabel) return props.confirmLabel
  return t('pos.destructive.confirm')
})

const uid = useId()
const titleId = `pos-destructive-title-${uid}`
const reasonInputId = `pos-destructive-reason-${uid}`
const reason = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) reason.value = ''
  },
)

const close = () => {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}

const submit = () => {
  if (props.loading || !reason.value.trim()) return
  emit('confirm', reason.value.trim())
}
</script>
