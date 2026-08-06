<template>
  <!-- Teleport + slideover chrome matches CustomerIdentificationModal / bodega (#2149) -->
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
        class="fixed inset-0 z-[60] bg-overlay-backdrop/40"
        aria-hidden="true"
        @click="handleClose"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="modelValue"
        class="fixed z-[61] flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto
               md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full
               md:border-s md:border-border"
        role="dialog"
        aria-modal="true"
        :aria-label="t('pos.openSale.title')"
        @click.stop
      >
        <div class="flex justify-center pt-3 pb-1 md:hidden flex-shrink-0" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-border" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-base font-bold text-text-primary leading-tight">
                  {{ t('pos.openSale.title') }}
                </h2>
                <p class="text-xs text-text-secondary leading-snug mt-0.5">
                  {{ productLine }}
                </p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('common.close')"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="handleClose"
            >
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form class="flex-1 overflow-y-auto px-6 py-5 space-y-4" @submit.prevent="handleSubmit">
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
        </form>

        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex gap-2 bg-surface">
          <button
            type="button"
            class="min-h-[44px] px-4 py-3 rounded-xl border border-border text-text-secondary font-medium hover:bg-surface-secondary transition-colors"
            @click="handleClose"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting"
            class="flex-1 min-h-[44px] px-4 py-3 rounded-xl bg-action-primary-bg text-action-primary-text font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSubmit"
          >
            {{ isSubmitting ? t('pos.openSale.adding') : resolvedConfirmLabel }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
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
/* Match CustomerIdentificationModal / bodega slideover (#2149) */
.panel-enter-active,
.panel-leave-active {
  transition: transform 250ms ease;
}

.panel-enter-from,
.panel-leave-to {
  transform: translateY(100%);
}

@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
