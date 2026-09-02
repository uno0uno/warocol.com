<script setup lang="ts">
import { computed } from 'vue'
import CrmStaffReceiptPrintTicket from '~/components/crm/CrmStaffReceiptPrintTicket.vue'
import type { CreditPaymentReceiptData } from '~/components/crm/CreditPaymentSuccessPanel.vue'
import { useCreditPaymentReceiptPrint } from '~/composables/useCreditPaymentReceiptPrint'
import type { PlatformLegalPrint } from '~/constants/waroLegalEntity'
import { padReceiptLine, receiptDivider } from '~/utils/receiptTicketPlainText'

const props = defineProps<{
  receipt: CreditPaymentReceiptData | null
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
  platformLegal?: PlatformLegalPrint | null
  matiasDian?: boolean
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

const receiptLines = computed(() => {
  if (!props.receipt) return []
  return [
    {
      label: t('analitica.customerDetail.credit.receipt.customer'),
      value: props.receipt.customer_name,
    },
    {
      label: t('analitica.common.date'),
      value: paymentDateLabel.value,
    },
    {
      label: t('analitica.customerDetail.paymentMethod'),
      value: props.receipt.payment_method_label,
    },
  ]
})

const extraPreBlocks = computed(() => {
  if (!props.receipt) return []
  const blocks: string[] = []
  if (props.receipt.lines.length) {
    blocks.push(receiptDivider())
    for (const line of props.receipt.lines) {
      blocks.push(t('analitica.customerDetail.credit.receipt.orderLine', { order: line.order_number }))
      blocks.push(padReceiptLine(
        t('analitica.customerDetail.credit.receipt.paid'),
        formatCurrency(line.amount),
      ))
      blocks.push(padReceiptLine(
        t('analitica.customerDetail.credit.remaining'),
        formatCurrency(line.remaining_amount),
      ))
    }
  }
  blocks.push(receiptDivider())
  blocks.push(padReceiptLine(
    t('analitica.customerDetail.credit.receipt.totalPaid'),
    formatCurrency(props.receipt.total_amount),
  ))
  if (props.receipt.total_outstanding_after != null) {
    blocks.push(padReceiptLine(
      t('analitica.customerDetail.credit.receipt.outstandingAfter'),
      formatCurrency(props.receipt.total_outstanding_after),
    ))
  }
  return blocks
})

const printReceipt = async (options?: { auto?: boolean }) => {
  if (!props.receipt) return
  await printCreditPaymentTicket(options)
}

defineExpose({ printReceipt })
</script>

<template>
  <Teleport to="body">
    <CrmStaffReceiptPrintTicket
      v-if="receipt"
      ticket-id="credit-payment-print-ticket"
      :document-label="t('analitica.customerDetail.credit.receipt.ticketTitle')"
      :fiscal-data="fiscalData"
      :display-name="displayName"
      :address="address"
      :city="city"
      :phone="phone"
      :logo-url="logoUrl"
      :platform-legal="platformLegal"
      :matias-dian="matiasDian"
      :lines="receiptLines"
      :extra-pre-blocks="extraPreBlocks"
      :notes-label="receipt.notes ? t('analitica.customerDetail.notes') : undefined"
      :notes-value="receipt.notes || undefined"
    />
  </Teleport>
</template>
