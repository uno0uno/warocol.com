<script setup lang="ts">
import { padReceiptLine, receiptDivider } from '~/utils/receiptTicketPlainText'

export type DirectPurchasePrintItem = {
  name: string
  qtyLabel: string
  unitCostLabel: string
  totalLabel: string
}

defineProps<{
  title: string
  purchaseNumber?: string | number | null
  dateLabel: string
  dateValue: string
  supplierLabel: string
  supplierValue: string
  statusLabel: string
  statusValue: string
  paymentLabel: string
  paymentValue: string
  items: DirectPurchasePrintItem[]
  totalLabel: string
  totalValue: string
  notesLabel?: string
  notesValue?: string | null
}>()
</script>

<template>
  <div
    id="direct-purchase-print-ticket"
    class="receipt-print-ticket direct-purchase-print-ticket"
    aria-hidden="true"
  >
    <pre class="receipt-plain-pre">{{ title }}</pre>
    <pre
      v-if="purchaseNumber"
      class="receipt-plain-pre"
    >#{{ purchaseNumber }}</pre>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(dateLabel, dateValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(supplierLabel, supplierValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(statusLabel, statusValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(paymentLabel, paymentValue) }}</pre>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <pre class="receipt-plain-pre">{{ item.name }}</pre>
      <pre class="receipt-plain-pre">{{ padReceiptLine(item.qtyLabel, item.unitCostLabel) }}</pre>
      <pre class="receipt-plain-pre">{{ padReceiptLine('', item.totalLabel) }}</pre>
    </template>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(totalLabel, totalValue) }}</pre>
    <template v-if="notesValue">
      <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
      <pre class="receipt-plain-pre">{{ notesLabel }}</pre>
      <pre class="receipt-plain-pre">{{ notesValue }}</pre>
    </template>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
  </div>
</template>

<style scoped>
.direct-purchase-print-ticket {
  display: none;
}
@media print {
  .direct-purchase-print-ticket {
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
