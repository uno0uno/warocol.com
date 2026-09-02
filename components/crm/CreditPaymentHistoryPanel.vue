<script setup lang="ts">
export interface CustomerCreditPaymentRow {
  payment_id: string
  order_id: string
  order_number: number
  amount: number
  payment_method: string
  payment_method_id: string | null
  payment_date: string
  notes: string | null
  created_at: string
  order_total_amount: number
  remaining_amount_after: number
}

const props = defineProps<{
  open: boolean
  payment: CustomerCreditPaymentRow | null
  customerName?: string | null
  methodLabel?: string | null
}>()

const emit = defineEmits<{
  close: []
  print: []
}>()

const { t } = useI18n({ useScope: 'global' })
const { formatCurrency, formatTenantDate } = useFormatters()
const paymentDateLabel = computed(() => {
  const raw = props.payment?.payment_date
  if (!raw) return ''
  try {
    return formatTenantDate(raw)
  }
  catch {
    return raw
  }
})

const displayMethodLabel = computed(() => props.methodLabel || props.payment?.payment_method || '')

watch(
  () => props.open,
  (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open ? 'hidden' : ''
  },
)
</script>

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
        @click="emit('close')"
      />
    </Transition>

    <Transition name="panel">
      <div
        v-if="open && payment"
        role="dialog"
        aria-modal="true"
        :aria-label="t('analitica.customerDetail.paymentHistory.detailTitle')"
        class="fixed z-50 flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full"
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="text-base font-bold text-text-primary leading-tight">
                {{ t('analitica.customerDetail.paymentHistory.detailTitle') }}
              </h2>
              <p class="text-xs text-text-secondary leading-snug mt-0.5">{{ customerName }}</p>
            </div>
            <button
              type="button"
              :aria-label="t('analitica.customerDetail.closePanel')"
              class="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              @click="emit('close')"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
          <div class="bg-background rounded-lg border border-border p-3 space-y-2.5">
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.orderNumber') }}</span>
              <span class="text-sm font-medium text-text-primary">#{{ payment.order_number }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.common.date') }}</span>
              <span class="text-sm font-medium text-text-primary">{{ paymentDateLabel }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.paymentMethod') }}</span>
              <span class="text-sm font-medium text-text-primary">{{ displayMethodLabel }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.credit.receipt.paid') }}</span>
              <span class="text-sm font-semibold text-primary">{{ formatCurrency(payment.amount) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.total') }}</span>
              <span class="text-sm font-medium text-text-primary tabular-nums">{{ formatCurrency(payment.order_total_amount) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.credit.remaining') }}</span>
              <span class="text-sm font-medium text-text-primary tabular-nums">{{ formatCurrency(payment.remaining_amount_after) }}</span>
            </div>
            <div v-if="payment.notes" class="pt-1">
              <p class="text-xs text-text-secondary mb-1">{{ t('analitica.customerDetail.notes') }}</p>
              <p class="text-sm text-text-primary">{{ payment.notes }}</p>
            </div>
          </div>

          <button
            type="button"
            class="w-full min-h-[44px] py-2 px-4 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary active:scale-95 transition-all flex items-center justify-center gap-2"
            @click="emit('print')"
          >
            <svg class="h-[1em] w-[1em]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            {{ t('analitica.customerDetail.credit.receipt.print') }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

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
