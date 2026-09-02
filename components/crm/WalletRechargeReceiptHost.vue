<script setup lang="ts">
import { computed } from 'vue'
import WalletRechargePrintTicket from '~/components/crm/WalletRechargePrintTicket.vue'
import type { WalletRechargeReceiptData } from '~/components/crm/WalletRechargeSuccessPanel.vue'
import { useWalletRechargeReceiptPrint } from '~/composables/useWalletRechargeReceiptPrint'

const props = defineProps<{
  receipt: WalletRechargeReceiptData | null
  businessName?: string | null
  businessAddress?: string | null
  businessCity?: string | null
  businessPhone?: string | null
}>()

const { t } = useI18n({ useScope: 'global' })
const { formatCurrency, formatTenantDate } = useFormatters()
const { printWalletRechargeTicket } = useWalletRechargeReceiptPrint()

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

const printReceipt = async (options?: { auto?: boolean }) => {
  if (!props.receipt) return
  await printWalletRechargeTicket(options)
}

defineExpose({ printReceipt })
</script>

<template>
  <Teleport to="body">
    <WalletRechargePrintTicket
      v-if="receipt"
      :title="t('analitica.customerDetail.wallet.receipt.ticketTitle')"
      :business-name="businessName"
      :business-address="businessAddress"
      :business-city="businessCity"
      :business-phone="businessPhone"
      :customer-label="t('analitica.customerDetail.wallet.receipt.customer')"
      :customer-value="receipt.customer_name"
      :date-label="t('analitica.common.date')"
      :date-value="rechargeDateLabel"
      :method-label="t('analitica.customerDetail.paymentMethod')"
      :method-value="receipt.payment_method_label"
      :amount-label="t('analitica.customerDetail.wallet.receipt.amount')"
      :amount-value="formatCurrency(receipt.amount_cop)"
      :balance-label="t('analitica.customerDetail.wallet.receipt.balanceAfter')"
      :balance-value="formatCurrency(receipt.balance_after_cop)"
      :notes-label="receipt.notes ? t('analitica.customerDetail.notes') : undefined"
      :notes-value="receipt.notes || undefined"
    />
  </Teleport>
</template>
