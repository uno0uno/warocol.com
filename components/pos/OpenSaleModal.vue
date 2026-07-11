<template>
  <Transition name="sheet">
    <div
      v-if="modelValue"
      class="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-overlay-backdrop/50"
      @click.self="handleClose"
    >
      <div
        class="bottom-sheet-panel bg-surface w-full md:max-w-md border border-border flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl"
        @click.stop
      >
        <div class="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-border" />
        </div>

        <div class="p-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h2 class="text-xl font-bold text-text-primary">{{ t('pos.openSale.title') }}</h2>
            <p class="text-sm text-text-secondary mt-0.5">
              {{ productLine }}
            </p>
          </div>
          <button
            type="button"
            :aria-label="t('common.close')"
            class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
            @click="handleClose"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form class="p-5 space-y-4" @submit.prevent="handleSubmit">
          <div>
            <label for="open-sale-amount" class="block text-sm font-medium text-text-primary mb-1.5">
              {{ t('pos.openSale.amountLabel') }} <span class="text-destructive">*</span>
            </label>
            <input
              id="open-sale-amount"
              ref="amountInputRef"
              v-model="amountInput"
              type="number"
              inputmode="numeric"
              min="1"
              step="1"
              required
              :placeholder="t('pos.openSale.amountPlaceholder')"
              class="w-full min-h-[44px] px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base tabular-nums"
            />
          </div>

          <div>
            <label for="open-sale-description" class="block text-sm font-medium text-text-primary mb-1.5">
              {{ t('pos.openSale.description') }} <span class="text-text-tertiary font-normal">{{ t('pos.openSale.optional') }}</span>
            </label>
            <input
              id="open-sale-description"
              v-model="descriptionInput"
              type="text"
              maxlength="200"
              :placeholder="t('pos.openSale.descriptionPlaceholder')"
              class="w-full min-h-[44px] px-4 py-3 border-2 border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary bg-background text-base"
            />
          </div>

          <p v-if="errorMessage" class="text-sm text-state-danger-text" role="alert">{{ errorMessage }}</p>

          <div class="flex gap-2 pt-1">
            <button
              type="button"
              class="min-h-[44px] px-4 py-3 rounded-xl border border-border text-text-secondary font-medium hover:bg-surface-secondary transition-colors"
              @click="handleClose"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="isSubmitting"
              class="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-action-primary-bg text-action-primary-text font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ isSubmitting ? t('pos.openSale.adding') : resolvedConfirmLabel }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { ref, watch, nextTick, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    shellName?: string | null
    confirmLabel?: string
    mesaMode?: boolean
    tableLabel?: string
  }>(),
  { confirmLabel: undefined, mesaMode: false, tableLabel: '' },
)

const productLine = computed(() => {
  const name = (props.shellName || '').trim()
  // Catalog open-sale product is often still named "Venta libre" — don't show raw ES SKU in EN UI.
  if (!name || /^venta\s*libre$/i.test(name)) return t('pos.openSale.customAmount')
  return t('pos.openSale.productPrefix', { name })
})

const resolvedConfirmLabel = computed(() => {
  if (props.confirmLabel) return props.confirmLabel
  if (props.mesaMode) {
    return t('pos.openSale.addToTable', { table: props.tableLabel || 'mesa' })
  }
  return t('pos.openSale.addToCart')
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', payload: { amount: number; description?: string }): void
}>()

const amountInput = ref('')
const descriptionInput = ref('')
const errorMessage = ref<string | null>(null)
const isSubmitting = ref(false)
const amountInputRef = ref<HTMLInputElement | null>(null)

const resetForm = () => {
  amountInput.value = ''
  descriptionInput.value = ''
  errorMessage.value = null
  isSubmitting.value = false
}

const handleClose = () => {
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      resetForm()
      nextTick(() => amountInputRef.value?.focus())
    }
  },
)

const handleSubmit = () => {
  errorMessage.value = null
  const amount = Number(amountInput.value)
  if (!Number.isFinite(amount) || amount <= 0) {
    errorMessage.value = t('pos.openSale.amountError')
    return
  }
  isSubmitting.value = true
  emit('confirm', {
    amount: Math.round(amount),
    description: descriptionInput.value.trim() || undefined,
  })
}

defineExpose({ clearSubmitting: () => { isSubmitting.value = false } })
</script>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.15s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
</style>
