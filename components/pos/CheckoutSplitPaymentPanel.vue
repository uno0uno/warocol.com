<script setup lang="ts">
interface ReceiptPaymentLine {
  id: string
  amount: number
  payment_method: string
  payment_method_id?: string | null
  payment_method_name: string
  cash_received?: number | null
  change?: number | null
}

const { t, locale } = useI18n({ useScope: 'global' })
const { formatCurrency } = useFormatters()

const cashReceivedInput = defineModel<number>('cashReceivedInput', { default: 0 })

const props = defineProps<{
  splitMode: boolean
  splitPayments: ReceiptPaymentLine[]
  splitPaidTotal: number
  splitIsComplete: boolean
  splitRemaining: number
  splitAmountDue: number
  splitPartialAmount: number | null
  splitAmountValidationMessage: string
  splitPaymentValidationMessage: string
  tipAmount: number
  tipTaxAmount: number
  tipTaxLabel: string
  discountedTotal: number
  isVoidingPayment: string | null
  isCashMethod: boolean
  cashAmountToCharge: number
  cashInputId: string
  isAddingPayment: boolean
  selectedPaymentMethod: string
  requiresMethodSelection: boolean
  splitAmountToCharge: number
  canAddSplitPayment: boolean
  getPaymentMethodLabel: (method: string) => string
}>()

defineEmits<{
  toggleSplitMode: []
  splitAmountInput: [event: Event]
  addSplitPayment: []
  voidPayment: [payment: ReceiptPaymentLine]
}>()

const uiLocale = computed(() => locale.value)
</script>

<template>
  <div class="bg-surface rounded-2xl border border-border p-4 shadow-sm">
    <div class="flex items-center justify-between">
      <h3 class="font-bold text-text-primary flex items-center gap-2 text-sm">
        <svg class="h-[1em] w-[1em] text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" />
        </svg>
        {{ t('pos.checkout.split.title') }}
      </h3>
      <button
        type="button"
        role="switch"
        :aria-checked="splitMode"
        :aria-label="splitMode ? t('pos.checkout.split.disableAria') : t('pos.checkout.split.enableAria')"
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        :class="splitMode ? 'bg-primary' : 'bg-border'"
        @click="$emit('toggleSplitMode')"
      >
        <span
          class="pointer-events-none inline-block h-5 w-5 rounded-full bg-control-toggle-thumb shadow transform ring-0 transition duration-200"
          :class="splitMode ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
    </div>

    <div v-if="splitMode" class="mt-3 space-y-3">
      <div v-if="splitPayments.length > 0">
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            {{ t('pos.checkout.split.registeredPayments') }}
          </span>
          <span class="text-xs font-bold text-primary tabular-nums">
            {{ splitPayments.length }} · {{ formatCurrency(splitPaidTotal) }}
          </span>
        </div>
        <div class="space-y-1.5">
          <div
            v-for="(p, idx) in splitPayments"
            :key="p.id"
            class="flex items-center gap-2.5 px-3 py-2 bg-surface-secondary rounded-lg text-sm"
          >
            <svg class="h-[1em] w-[1em] text-state-success-icon flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
            </svg>
            <span class="text-text-secondary flex-1">#{{ idx + 1 }} · {{ p.payment_method_name }}</span>
            <span class="font-semibold text-text-primary tabular-nums">{{ formatCurrency(p.amount) }}</span>
            <button
              type="button"
              :disabled="isVoidingPayment === p.id"
              :aria-label="`Eliminar pago #${idx + 1} de ${formatCurrency(p.amount)}`"
              class="ms-1 p-1 rounded text-text-tertiary hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-destructive/30"
              @click="$emit('voidPayment', p)"
            >
              <svg v-if="isVoidingPayment === p.id" class="h-[1em] w-[1em] animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <svg v-else class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="tipAmount > 0"
        class="rounded-lg border border-border bg-surface-secondary/60 px-3 py-2.5 space-y-1.5 text-sm"
      >
        <div class="flex items-center justify-between text-text-secondary">
          <span>{{ t('pos.checkout.split.orderTotal') }}</span>
          <span class="tabular-nums font-medium text-text-primary">{{ formatCurrency(discountedTotal) }}</span>
        </div>
        <div class="flex items-center justify-between text-text-secondary">
          <span>{{ t('pos.checkout.split.tip') }}</span>
          <span class="tabular-nums font-medium text-text-primary">{{ formatCurrency(tipAmount) }}</span>
        </div>
        <div
          v-if="tipTaxAmount > 0"
          class="flex items-center justify-between text-text-secondary"
        >
          <span>{{ tipTaxLabel }}</span>
          <span class="tabular-nums font-medium text-text-primary">{{ formatCurrency(tipTaxAmount) }}</span>
        </div>
        <div class="flex items-center justify-between border-t border-border pt-1.5 font-semibold text-text-primary">
          <span>{{ t('pos.checkout.split.totalToCharge') }}</span>
          <span class="tabular-nums">{{ formatCurrency(splitAmountDue) }}</span>
        </div>
      </div>

      <div
        class="flex items-center justify-between px-3 py-2.5 rounded-lg"
        :class="splitIsComplete ? 'bg-state-success-bg ' : 'bg-primary/10'"
      >
        <span class="text-sm font-medium flex items-center gap-1.5" :class="splitIsComplete ? 'text-state-success-text ' : 'text-primary'">
          <svg v-if="splitIsComplete" class="h-[1em] w-[1em]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd" />
          </svg>
          {{ splitIsComplete ? t('pos.checkout.split.complete') : t('pos.checkout.split.pendingBalance') }}
        </span>
        <span
          class="text-sm font-bold tabular-nums"
          :class="splitIsComplete ? 'text-state-success-text ' : 'text-text-primary'"
          aria-live="polite"
        >{{ formatCurrency(splitRemaining) }}</span>
      </div>

      <div v-if="!splitIsComplete" class="flex flex-col gap-1">
        <label class="text-xs font-medium text-text-secondary">{{ t('pos.checkout.split.amountNow') }}</label>
        <div class="relative">
          <span class="absolute start-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-secondary pointer-events-none">$</span>
          <input
            type="text"
            inputmode="numeric"
            :value="splitPartialAmount ? splitPartialAmount.toLocaleString(uiLocale) : ''"
            class="w-full ps-7 pe-4 py-3 min-h-[44px] bg-surface-secondary border border-border rounded-xl text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary tabular-nums"
            :class="splitAmountValidationMessage ? 'border-state-danger-border focus:border-state-danger-border focus:ring-state-danger-border/30' : ''"
            placeholder="0"
            @input="$emit('splitAmountInput', $event)"
          >
        </div>
        <p
          v-if="splitPaymentValidationMessage"
          class="text-xs font-medium text-state-danger-text"
        >
          {{ splitPaymentValidationMessage }}
        </p>
      </div>

      <CheckoutCashTenderPanel
        v-if="isCashMethod && !splitIsComplete"
        v-model="cashReceivedInput"
        :input-id="cashInputId"
        :amount-to-charge="cashAmountToCharge"
        require-input-for-feedback
      />

      <button
        v-if="!splitIsComplete"
        type="button"
        :disabled="!canAddSplitPayment"
        class="w-full min-h-[44px] px-4 py-3 bg-action-primary-bg text-action-primary-text text-sm font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-action-primary-hover-bg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        @click="$emit('addSplitPayment')"
      >
        <UiLoadingDots v-if="isAddingPayment" size="10px" />
        <span v-else>{{ t('pos.checkout.split.chargeAmount', { amount: formatCurrency(splitAmountToCharge), method: getPaymentMethodLabel(selectedPaymentMethod) }) }}</span>
      </button>
    </div>
  </div>
</template>
