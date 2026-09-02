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
  totalLabel: string
  totalValue: string
  outstandingLabel?: string
  outstandingValue?: string
  notesLabel?: string
  notesValue?: string
  orderLines?: Array<{
    orderLabel: string
    paidLabel: string
    paidValue: string
    remainingLabel: string
    remainingValue: string
  }>
}>()
</script>

<template>
  <div
    id="credit-payment-print-ticket"
    class="receipt-print-ticket credit-payment-print-ticket"
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
    <template v-if="orderLines?.length">
      <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
      <template v-for="(line, index) in orderLines" :key="index">
        <pre class="receipt-plain-pre">{{ line.orderLabel }}</pre>
        <pre class="receipt-plain-pre">{{ padReceiptLine(line.paidLabel, line.paidValue) }}</pre>
        <pre class="receipt-plain-pre">{{ padReceiptLine(line.remainingLabel, line.remainingValue) }}</pre>
      </template>
    </template>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(totalLabel, totalValue) }}</pre>
    <pre
      v-if="outstandingLabel && outstandingValue"
      class="receipt-plain-pre"
    >{{ padReceiptLine(outstandingLabel, outstandingValue) }}</pre>
    <template v-if="notesValue">
      <pre class="receipt-plain-pre">{{ notesLabel }}</pre>
      <pre class="receipt-plain-pre">{{ notesValue }}</pre>
    </template>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
  </div>
</template>

<style scoped>
.credit-payment-print-ticket {
  display: none;
}
@media print {
  .credit-payment-print-ticket {
    display: block !important;
    width: 72mm;
    margin: 0 auto;
    color: #000;
    background: #fff;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 11px;
    line-height: 1.35;
  }
  .receipt-plain-pre {
    margin: 0;
    white-space: pre-wrap;
    font: inherit;
  }
}
</style>
