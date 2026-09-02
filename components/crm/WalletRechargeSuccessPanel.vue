<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import WalletRechargeReceiptHost from '~/components/crm/WalletRechargeReceiptHost.vue'

export interface WalletRechargeReceiptData {
  movement_id: string
  customer_name: string
  recharge_date: string
  payment_method_label: string
  amount_cop: number
  balance_after_cop: number
  notes?: string
}

const props = defineProps<{
  open: boolean
  receipt: WalletRechargeReceiptData | null
  customerId: string
  defaultEmail?: string | null
  fiscalData?: {
    business_name?: string | null
    nit?: string | null
    fiscal_address?: string | null
    city?: string | null
    phone?: string | null
    email?: string | null
  } | null
  displayName?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  logoUrl?: string | null
  platformLegal?: import('~/constants/waroLegalEntity').PlatformLegalPrint | null
  matiasDian?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n({ useScope: 'global' })
const toast = useToast()
const { formatCurrency, formatTenantDate } = useFormatters()
const receiptHostRef = ref<InstanceType<typeof WalletRechargeReceiptHost> | null>(null)

const showEmailPanel = ref(false)
const receiptEmail = ref('')
const emailSent = ref(false)
const lastSentEmail = ref('')
const isSendingEmail = ref(false)
const autoPrintDone = ref(false)

const rechargeDateLabel = computed(() => {
  const raw = props.receipt?.recharge_date
  if (!raw) return ''
  try {
    return formatTenantDate(raw)
  }
  catch {
    return raw
  }
})

const resetEmailState = () => {
  showEmailPanel.value = false
  receiptEmail.value = ''
  isSendingEmail.value = false
  emailSent.value = false
  lastSentEmail.value = ''
}

const closePanel = () => {
  resetEmailState()
  autoPrintDone.value = false
  emit('close')
}

const openEmailPanel = () => {
  const usable = (props.defaultEmail || '').trim()
  receiptEmail.value = usable
  emailSent.value = false
  showEmailPanel.value = true
}

const printReceipt = async (options?: { auto?: boolean }) => {
  await receiptHostRef.value?.printReceipt(options)
}

const sendReceiptEmail = async () => {
  const email = (receiptEmail.value || '').trim()
  if (!email || !props.receipt || isSendingEmail.value) return
  isSendingEmail.value = true
  try {
    const res = await $fetch<{ success: boolean }>(
      `/api/customers/${props.customerId}/wallet/receipt-email`,
      {
        method: 'POST',
        body: {
          email,
          customer_name: props.receipt.customer_name,
          recharge_date: rechargeDateLabel.value || props.receipt.recharge_date,
          payment_method_label: props.receipt.payment_method_label,
          amount_cop: props.receipt.amount_cop,
          balance_after_cop: props.receipt.balance_after_cop,
          notes: props.receipt.notes || undefined,
        business_name: props.displayName || props.fiscalData?.business_name || undefined,
        business_address: props.address || props.fiscalData?.fiscal_address || undefined,
        business_city: props.city || props.fiscalData?.city || undefined,
        business_phone: props.phone || props.fiscalData?.phone || undefined,
        },
      },
    )
    if (!res?.success) {
      throw new Error(t('analitica.customerDetail.wallet.receipt.emailError'))
    }
    lastSentEmail.value = email
    emailSent.value = true
    receiptEmail.value = ''
    toast.success(t('analitica.customerDetail.wallet.receipt.sentTo', { email }), {
      title: t('analitica.customerDetail.wallet.receipt.sendByEmail'),
    })
  }
  catch (e: any) {
    const detail = e?.data?.detail
    const message =
      Array.isArray(detail)
        ? detail[0]?.msg ?? t('analitica.customerDetail.wallet.receipt.emailError')
        : typeof detail === 'string'
          ? detail
          : t('analitica.customerDetail.wallet.receipt.emailError')
    toast.error(message, { title: t('analitica.customerDetail.wallet.receipt.sendByEmail') })
  }
  finally {
    isSendingEmail.value = false
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!import.meta.client) return
    document.body.style.overflow = open || showEmailPanel.value ? 'hidden' : ''
    if (open && props.receipt && !autoPrintDone.value) {
      autoPrintDone.value = true
      await nextTick()
      await printReceipt({ auto: true })
    }
    if (!open) resetEmailState()
  },
)

watch(showEmailPanel, (open) => {
  if (!import.meta.client) return
  document.body.style.overflow = open || props.open ? 'hidden' : ''
})
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
        class="fixed inset-0 z-50 bg-overlay-backdrop/40"
        aria-hidden="true"
      />
    </Transition>

    <Transition name="checkout-success-panel">
      <div
        v-if="open && receipt"
        role="dialog"
        aria-modal="true"
        :aria-label="t('analitica.customerDetail.wallet.receipt.successTitle')"
        class="fixed z-[51] flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[92dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto
               md:rounded-none md:w-full md:max-w-md md:max-h-none md:h-full
               md:border-s md:border-border"
        @click.stop
      >
        <div class="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden="true">
          <div class="w-10 h-1 rounded-full bg-sheet-border" />
        </div>

        <div class="flex-shrink-0 bg-surface-secondary/40 border-b border-border px-6 py-4">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <div
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-state-success-bg flex items-center justify-center text-state-success-text"
                aria-hidden="true"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-bold leading-tight text-text-primary">
                  {{ t('analitica.customerDetail.wallet.receipt.successTitle') }}
                </h3>
                <p class="text-xs leading-snug text-text-secondary mt-0.5">
                  {{ t('analitica.customerDetail.wallet.receipt.successBody') }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-action-primary-focus-ring/30 transition-colors"
              :aria-label="t('analitica.customerDetail.wallet.receipt.close')"
              @click="closePanel"
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
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.wallet.receipt.amount') }}</span>
              <span class="text-lg font-bold text-primary">{{ formatCurrency(receipt.amount_cop) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.paymentMethod') }}</span>
              <span class="text-sm font-medium text-text-primary">{{ receipt.payment_method_label }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-sm text-text-secondary">{{ t('analitica.customerDetail.wallet.receipt.balanceAfter') }}</span>
              <span class="text-sm font-medium text-text-primary tabular-nums">{{ formatCurrency(receipt.balance_after_cop) }}</span>
            </div>
          </div>

          <button
            type="button"
            class="w-full min-h-[44px] py-2 px-4 bg-surface border border-border text-text-primary text-sm font-medium rounded-lg hover:bg-surface-secondary active:scale-95 transition-all flex items-center justify-center gap-2"
            @click="printReceipt()"
          >
            <svg class="h-[1em] w-[1em]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-3 0h.008v.008H15V10.5Z" />
            </svg>
            {{ t('analitica.customerDetail.wallet.receipt.print') }}
          </button>

          <button
            type="button"
            class="w-full min-h-[44px] py-2 px-4 bg-action-primary-bg text-action-primary-text text-sm font-medium rounded-lg hover:bg-action-primary-hover-bg active:scale-95 transition-all flex items-center justify-center gap-2"
            @click="openEmailPanel"
          >
            <svg class="h-[1em] w-[1em]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
            {{ t('analitica.customerDetail.wallet.receipt.sendByEmail') }}
          </button>
        </div>

        <div class="flex-shrink-0 border-t border-border p-4 bg-surface">
          <button
            type="button"
            class="w-full min-h-[44px] py-3 px-4 bg-surface-secondary text-text-primary rounded-lg font-medium hover:bg-surface-secondary/80 transition-colors border border-border"
            @click="closePanel"
          >
            {{ t('analitica.customerDetail.wallet.receipt.done') }}
          </button>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showEmailPanel"
        class="fixed inset-0 z-[60] bg-overlay-backdrop/50"
        aria-hidden="true"
        @click="showEmailPanel = false"
      />
    </Transition>

    <Transition name="checkout-success-panel">
      <div
        v-if="showEmailPanel && receipt"
        role="dialog"
        aria-modal="true"
        :aria-label="t('analitica.customerDetail.wallet.receipt.sendByEmail')"
        class="fixed z-[61] flex flex-col bg-surface shadow-2xl
               inset-x-0 bottom-0 rounded-t-2xl max-h-[70dvh]
               md:inset-y-0 md:end-0 md:bottom-auto md:start-auto md:inset-x-auto
               md:rounded-none md:w-full md:max-w-sm md:max-h-none md:h-full
               md:border-s md:border-border"
        @click.stop
      >
        <div class="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 class="text-base font-bold text-text-primary">
            {{ t('analitica.customerDetail.wallet.receipt.sendByEmail') }}
          </h3>
          <button
            type="button"
            class="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-text-tertiary hover:bg-surface-secondary"
            :aria-label="t('analitica.customerDetail.wallet.receipt.close')"
            @click="showEmailPanel = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p v-if="emailSent && lastSentEmail" class="text-sm text-state-success-text">
            {{ t('analitica.customerDetail.wallet.receipt.sentTo', { email: lastSentEmail }) }}
          </p>
          <p class="text-sm text-text-secondary">
            {{ emailSent
              ? t('analitica.customerDetail.wallet.receipt.sendAnother')
              : t('analitica.customerDetail.wallet.receipt.emailHint') }}
          </p>
          <div class="space-y-2">
            <label for="wallet-receipt-email" class="text-sm font-medium text-text-primary">
              {{ t('analitica.customerDetail.wallet.receipt.emailLabel') }}
            </label>
            <input
              id="wallet-receipt-email"
              v-model="receiptEmail"
              type="email"
              autocomplete="email"
              class="w-full min-h-[44px] px-3 text-sm border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              :placeholder="t('analitica.customerDetail.wallet.receipt.emailPlaceholder')"
            />
          </div>
        </div>

        <div class="flex-shrink-0 border-t border-border px-6 py-4">
          <button
            type="button"
            :disabled="isSendingEmail || !receiptEmail.trim()"
            class="w-full min-h-[44px] py-3 px-4 bg-action-primary-bg text-action-primary-text rounded-lg font-medium hover:bg-action-primary-hover-bg disabled:opacity-50 transition-colors"
            @click="sendReceiptEmail"
          >
            <UiLoadingDots v-if="isSendingEmail" size="8px" color="currentColor" aria-hidden="true" />
            <span v-else>{{ isSendingEmail ? t('analitica.customerDetail.wallet.receipt.sending') : t('analitica.customerDetail.wallet.receipt.send') }}</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <WalletRechargeReceiptHost
    ref="receiptHostRef"
    :receipt="receipt"
    :fiscal-data="fiscalData"
    :display-name="displayName"
    :address="address"
    :city="city"
    :phone="phone"
    :logo-url="logoUrl"
    :platform-legal="platformLegal"
    :matias-dian="matiasDian"
  />
</template>

<style>
.checkout-success-panel-enter-active,
.checkout-success-panel-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.checkout-success-panel-enter-from,
.checkout-success-panel-leave-to {
  opacity: 0;
  transform: translateY(100%);
}
@media (min-width: 768px) {
  .checkout-success-panel-enter-from,
  .checkout-success-panel-leave-to {
    transform: translateX(100%);
  }
}
</style>
