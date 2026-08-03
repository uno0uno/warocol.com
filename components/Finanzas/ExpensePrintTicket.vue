<script setup lang="ts">
import { padReceiptLine, receiptDivider } from '~/utils/receiptTicketPlainText'

defineProps<{
  title: string
  expenseNumber?: string | number | null
  dateLabel: string
  categoryLabel: string
  descriptionLabel: string
  amountLabel: string
  methodLabel: string
  typeLabel: string
  dateValue: string
  categoryValue: string
  descriptionValue: string
  amountValue: string
  methodValue: string
  typeValue: string
}>()
</script>

<template>
  <div
    id="expense-print-ticket"
    class="receipt-print-ticket expense-print-ticket"
    aria-hidden="true"
  >
    <pre class="receipt-plain-pre">{{ title }}</pre>
    <pre
      v-if="expenseNumber"
      class="receipt-plain-pre"
    >#{{ expenseNumber }}</pre>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(dateLabel, dateValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(categoryLabel, categoryValue) }}</pre>
    <pre class="receipt-plain-pre">{{ descriptionLabel }}</pre>
    <pre class="receipt-plain-pre">{{ descriptionValue }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(amountLabel, amountValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(methodLabel, methodValue) }}</pre>
    <pre class="receipt-plain-pre">{{ padReceiptLine(typeLabel, typeValue) }}</pre>
    <pre class="receipt-plain-pre">{{ receiptDivider() }}</pre>
  </div>
</template>

<style scoped>
.expense-print-ticket {
  display: none;
}
@media print {
  .expense-print-ticket {
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
