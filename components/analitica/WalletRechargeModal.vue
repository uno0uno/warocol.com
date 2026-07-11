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
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40"
        aria-hidden="true"
        @click="close"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="open"
        role="dialog"
        aria-modal="true"
        :aria-label="t('analitica.customerDetail.wallet.rechargeAria')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl border-border
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:right-0 md:bottom-auto md:left-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full md:border-l"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-border" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-bold text-text-primary leading-tight">{{ t('analitica.customerDetail.wallet.rechargeTitle') }}</h2>
                <p class="text-sm text-text-secondary mt-0.5 truncate">{{ customerName }}</p>
              </div>
            </div>
            <button
              type="button"
              :aria-label="t('common.close')"
              class="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-text-secondary hover:bg-surface-secondary hover:text-text-primary transition-colors"
              @click="close"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div class="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
            <p class="text-sm text-text-secondary font-medium">{{ t('analitica.customerDetail.wallet.currentBalance') }}</p>
            <p class="text-xl font-bold text-primary tabular-nums">{{ formatCurrency(currentBalance) }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="wallet-amount" class="text-sm font-medium text-text-primary">{{ t('analitica.customerDetail.wallet.amount') }}</label>
            <input
              id="wallet-amount"
              v-model.number="amount"
              type="number"
              min="1"
              step="1000"
              placeholder="50000"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              :class="{ 'border-red-400': !!validationError }"
              :disabled="isSubmitting"
            />
            <p v-if="validationError" role="alert" class="text-sm text-red-600">{{ validationError }}</p>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="wallet-payment" class="text-sm font-medium text-text-primary">{{ t('analitica.customerDetail.paymentMethod') }}</label>
            <select
              id="wallet-payment"
              v-model="paymentSelection"
              class="h-10 px-3 text-sm border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              :disabled="isSubmitting"
            >
              <option value="" disabled>{{ t('analitica.customerDetail.wallet.selectMethod') }}</option>
              <template v-for="group in paymentGroups" :key="group.id">
                <option v-if="!(group.methods?.length)" :value="group.slug">{{ group.name }}</option>
                <optgroup v-else :label="group.name">
                  <option v-for="m in group.methods ?? []" :key="m.id" :value="m.id">{{ m.name }}</option>
                </optgroup>
              </template>
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="wallet-notes" class="text-sm font-medium text-text-primary">
              {{ t('analitica.customerDetail.note') }} <span class="text-text-secondary font-normal">{{ t('analitica.customerDetail.optional') }}</span>
            </label>
            <textarea
              id="wallet-notes"
              v-model="notes"
              rows="2"
              :placeholder="t('analitica.customerDetail.wallet.notesPlaceholder')"
              class="px-3 py-2 text-sm border-2 border-border rounded-lg bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              :disabled="isSubmitting"
            />
          </div>

          <p v-if="apiError" role="alert" class="text-sm text-red-600">{{ apiError }}</p>
        </div>

        <div class="flex-shrink-0 border-t border-border px-6 py-4 flex items-center justify-end gap-3 bg-surface">
          <button
            type="button"
            @click="close"
            class="min-h-[44px] px-4 text-sm font-medium text-text-secondary border-2 border-border rounded-lg hover:bg-surface-secondary"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="isSubmitting || !!validationError || !amount || !paymentSelection"
            @click="handleSubmit"
            class="min-h-[44px] px-5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <UiLoadingDots v-if="isSubmitting" size="9px" />
            <span v-else>{{ t('analitica.customerDetail.wallet.submitRecharge') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PosPaymentGroup } from '~/utils/paymentDefaults'

interface Props {
  modelValue: boolean
  customerId: string
  customerName: string
  currentBalance: number
  paymentGroups: PosPaymentGroup[]
  recharge: (
    amount_cop: number,
    payment_method: string,
    notes?: string,
    payment_method_id?: string,
  ) => Promise<unknown>
  onOpen?: () => void
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'recharged'): void
}

const props = withDefaults(defineProps<Props>(), {
  paymentGroups: () => [],
})
const emit = defineEmits<Emits>()

const { show: showToast } = useToast()
const { t } = useI18n({ useScope: 'global' })
const { formatCurrency } = useFormatters()

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const amount = ref<number | null>(null)
const paymentSelection = ref('')
const notes = ref('')
const localError = ref<string | null>(null)
const isSubmitting = ref(false)

function defaultPaymentSelection(groups: PosPaymentGroup[]): string {
  for (const group of groups) {
    const methods = group.methods ?? []
    if (methods.length) return methods[0].id
    return group.slug
  }
  return ''
}

function resolvePaymentSelection(value: string): { slug: string; payment_method_id?: string } {
  for (const group of props.paymentGroups) {
    const method = (group.methods ?? []).find(m => m.id === value)
    if (method) return { slug: group.slug, payment_method_id: method.id }
    if (group.slug === value) return { slug: group.slug }
  }
  return { slug: value }
}

watch(() => props.modelValue, (v) => {
  if (v) {
    amount.value = null
    notes.value = ''
    localError.value = null
    isSubmitting.value = false
    paymentSelection.value = defaultPaymentSelection(props.paymentGroups)
    props.onOpen?.()
  }
})

watch(
  () => props.paymentGroups,
  (groups) => {
    const safeGroups = groups ?? []
    if (!safeGroups.length) return
    const valid =
      safeGroups.some(g => g.slug === paymentSelection.value)
      || safeGroups.some(g => (g.methods ?? []).some(m => m.id === paymentSelection.value))
    if (!valid) {
      paymentSelection.value = defaultPaymentSelection(safeGroups)
    }
  },
  { immediate: true },
)

const validationError = computed(() => {
  if (!amount.value || amount.value <= 0) return null
  if (!Number.isFinite(amount.value)) return t('analitica.customerDetail.wallet.invalidAmount')
  return null
})

const apiError = computed(() => localError.value)

function close() {
  open.value = false
}

const handleSubmit = async () => {
  if (
    isSubmitting.value
    || !amount.value
    || amount.value <= 0
    || validationError.value
    || !paymentSelection.value
  ) return
  localError.value = null
  isSubmitting.value = true
  const { slug, payment_method_id } = resolvePaymentSelection(paymentSelection.value)
  try {
    await props.recharge(
      amount.value,
      slug,
      notes.value.trim() || undefined,
      payment_method_id,
    )
    showToast(t('analitica.customerDetail.wallet.success'), 'success')
    emit('recharged')
    close()
  } catch (e: any) {
    localError.value = e?.data?.detail || e?.message || t('analitica.customerDetail.wallet.error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .panel-enter-from,
  .panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
