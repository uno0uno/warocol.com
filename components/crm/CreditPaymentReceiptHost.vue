<script setup lang="ts">
import { computed } from 'vue'
import CreditPaymentPrintTicket from '~/components/crm/CreditPaymentPrintTicket.vue'
import type { CreditPaymentReceiptData } from '~/components/crm/CreditPaymentSuccessPanel.vue'
import { useCreditPaymentReceiptPrint } from '~/composables/useCreditPaymentReceiptPrint'

const props = defineProps<{
  receipt: CreditPaymentReceiptData | null
  businessName?: string | null
  businessAddress?: string | null
  businessCity?: string | null
  businessPhone?: string | null
}>()

const { t } = useI18n({ useScope: 'global' })
const { formatCurrency, formatTenantDate } = useFormatters()
const { printCreditPaymentTicket } = useCreditPaymentReceiptPrint()

const paymentDateLabel = computed(() => {
  const raw = props.receipt?.payment_date
  if (!raw) return ''
  try {
    return formatTenantDate(raw)
  }
  catch {
    return raw
  }
})

const orderLinesForTicket = computed(() => {
  if (!props.receipt?.lines.length) return undefined
  return props.receipt.lines.map(line => ({
    orderLabel: t('analitica.customerDetail.credit.receipt.orderLine', { order: line.order_number }),
    paidLabel: t('analitica.customerDetail.credit.receipt.paid'),
    paidValue: formatCurrency(line.amount),
    remainingLabel: t('analitica.customerDetail.credit.remaining'),
    remainingValue: formatCurrency(line.remaining_amount),
  }))
})

const outstandingFormatted = computed(() => {
  if (props.receipt?.total_outstanding_after == null) return undefined
  return formatCurrency(props.receipt.total_outstanding_after)
})

const printReceipt = async (options?: { auto?: boolean }) => {
  if (!props.receipt) return
  await printCreditPaymentTicket(options)
}

defineExpose({ printReceipt })
</script>

<template>
  <Teleport to="body">
    <CreditPaymentPrintTicket
      v-if="receipt"
      :title="t('analitica.customerDetail.credit.receipt.ticketTitle')"
      :business-name="businessName"
      :business-address="businessAddress"
      :business-city="businessCity"
      :business-phone="businessPhone"
      :customer-label="t('analitica.customerDetail.credit.receipt.customer')"
      :customer-value="receipt.customer_name"
      :date-label="t('analitica.common.date')"
      :date-value="paymentDateLabel"
      :method-label="t('analitica.customerDetail.paymentMethod')"
      :method-value="receipt.payment_method_label"
      :total-label="t('analitica.customerDetail.credit.receipt.totalPaid')"
      :total-value="formatCurrency(receipt.total_amount)"
      :outstanding-label="outstandingFormatted ? t('analitica.customerDetail.credit.receipt.outstandingAfter') : undefined"
      :outstanding-value="outstandingFormatted"
      :notes-label="receipt.notes ? t('analitica.customerDetail.notes') : undefined"
      :notes-value="receipt.notes || undefined"
      :order-lines="orderLinesForTicket"
    />
  </Teleport>
</template>
