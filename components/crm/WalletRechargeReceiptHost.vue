<script setup lang="ts">
import { computed } from 'vue'
import CrmStaffReceiptPrintTicket from '~/components/crm/CrmStaffReceiptPrintTicket.vue'
import type { WalletRechargeReceiptData } from '~/components/crm/WalletRechargeSuccessPanel.vue'
import { useWalletRechargeReceiptPrint } from '~/composables/useWalletRechargeReceiptPrint'
import type { PlatformLegalPrint } from '~/constants/waroLegalEntity'
import { padReceiptLine, receiptDivider } from '~/utils/receiptTicketPlainText'

const props = defineProps<{
  receipt: WalletRechargeReceiptData | null
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
}>()

const { t } = useI18n({ useScope: 'global' })
const { formatCurrency, formatDateTime } = useFormatters()
const { printWalletRechargeTicket } = useWalletRechargeReceiptPrint()

const rechargeDateLabel = computed(() => {
  const raw = props.receipt?.recharge_date
  if (!raw) return ''
  try {
    return formatDateTime(raw)
  }
  catch {
    return raw
  }
})

const receiptLines = computed(() => {
  if (!props.receipt) return []
  return [
    {
      label: t('analitica.customerDetail.wallet.receipt.customer'),
      value: props.receipt.customer_name,
    },
    {
      label: t('analitica.customerDetail.wallet.receipt.ticketDateTime'),
      value: rechargeDateLabel.value,
    },
    {
      label: t('analitica.customerDetail.paymentMethod'),
      value: props.receipt.payment_method_label,
    },
  ]
})

const extraPreBlocks = computed(() => {
  if (!props.receipt) return []
  return [
    receiptDivider(),
    padReceiptLine(
      t('analitica.customerDetail.wallet.receipt.amount'),
      formatCurrency(props.receipt.amount_cop),
    ),
    padReceiptLine(
      t('analitica.customerDetail.wallet.receipt.balanceAfter'),
      formatCurrency(props.receipt.balance_after_cop),
    ),
  ]
})

const printReceipt = async (options?: { auto?: boolean }) => {
  if (!props.receipt) return
  await printWalletRechargeTicket(options)
}

defineExpose({ printReceipt })
</script>

<template>
  <Teleport to="body">
    <CrmStaffReceiptPrintTicket
      v-if="receipt"
      ticket-id="wallet-recharge-print-ticket"
      document-kind="crm-wallet"
      :document-label="t('analitica.customerDetail.wallet.receipt.ticketTitle')"
      :header-role-label="t('analitica.customerDetail.wallet.receipt.establishmentRole')"
      :footer-banner="t('analitica.customerDetail.wallet.receipt.ticketFooterBanner')"
      :footer-note="t('analitica.customerDetail.wallet.receipt.ticketFooterNote')"
      :fiscal-data="fiscalData"
      :display-name="displayName"
      :address="address"
      :city="city"
      :phone="phone"
      :logo-url="logoUrl"
      :platform-legal="platformLegal"
      :lines="receiptLines"
      :extra-pre-blocks="extraPreBlocks"
      :notes-label="receipt.notes ? t('analitica.customerDetail.notes') : undefined"
      :notes-value="receipt.notes || undefined"
    />
  </Teleport>
</template>
