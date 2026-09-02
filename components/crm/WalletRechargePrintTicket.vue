<script setup lang="ts">
import { padReceiptLine, receiptDivider } from '~/utils/receiptTicketPlainText'

defineProps<{
  title: string
  businessName?: string | null
  businessAddress?: string | null
  businessCity?: string | null
  businessPhone?: string | null
  customerLabel: string
  customerValue: string
  dateLabel: string
  dateValue: string
  methodLabel: string
  methodValue: string
  amountLabel: string
  amountValue: string
  balanceLabel: string
  balanceValue: string
  notesLabel?: string
  notesValue?: string
}>()
</script>

<template>
  <div
    id="wallet-recharge-print-ticket"
    class="receipt-print-ticket wallet-recharge-print-ticket"
    aria-hidden="true"
  >
    <pre v-if="businessName" class="receipt-plain-pre">{{ businessName }}</pre>
    <pre v-if="businessAddress" class="receipt-plain-pre">{{ businessAddress }}</pre>
    <pre v-if="businessCity" class="receipt-plain-pre">{{ businessCity }}</pre>
    <pre v-if="businessPhone" class="receipt-plain-pre">{{ businessPhone }}</pre>
    <pre v-if="businessName || businessAddress || businessCity || businessPhone" class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <pre class="receipt-plain-pre">{{ title }}</pre>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(customerLabel, customerValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(dateLabel, dateValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(methodLabel, methodValue) }}</pre>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(amountLabel, amountValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(balanceLabel, balanceValue) }}</pre>
    <template v-if="notesValue">
      <pre class="receipt-plain-pre">{{ notesLabel }}</pre>
      <pre class="receipt-plain-pre">{{ notesValue }}</pre>
    </template>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
  </div>
</template>

<style scoped>
.wallet-recharge-print-ticket {
  display: none;
}
</style>

<style>
@media print {
  body.printing-wallet-receipt-ticket * {
    visibility: hidden !important;
  }

  body.printing-wallet-receipt-ticket #wallet-recharge-print-ticket,
  body.printing-wallet-receipt-ticket #wallet-recharge-print-ticket * {
    visibility: visible !important;
  }

  body.printing-wallet-receipt-ticket #wallet-recharge-print-ticket {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 72mm;
    margin: 0;
    color: #000;
    background: #fff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.35;
  }

  body.printing-wallet-receipt-ticket #wallet-recharge-print-ticket .receipt-plain-pre {
    margin: 0;
    white-space: pre-wrap;
    font: inherit;
  }

  @page {
    size: 80mm auto;
    margin: 0;
  }
}
</style>
