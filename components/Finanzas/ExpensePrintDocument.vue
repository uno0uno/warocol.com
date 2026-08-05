<script setup lang="ts">
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
    id="expense-print-document"
    class="letter-print-document expense-print-document"
    aria-hidden="true"
  >
    <header class="doc-header">
      <h1>{{ title }}</h1>
      <p
        v-if="expenseNumber"
        class="doc-number"
      >
        #{{ expenseNumber }}
      </p>
    </header>

    <table class="doc-table">
      <tbody>
        <tr>
          <th>{{ dateLabel }}</th>
          <td>{{ dateValue }}</td>
        </tr>
        <tr>
          <th>{{ categoryLabel }}</th>
          <td>{{ categoryValue }}</td>
        </tr>
        <tr>
          <th>{{ descriptionLabel }}</th>
          <td>{{ descriptionValue }}</td>
        </tr>
        <tr>
          <th>{{ amountLabel }}</th>
          <td class="num">{{ amountValue }}</td>
        </tr>
        <tr>
          <th>{{ methodLabel }}</th>
          <td>{{ methodValue }}</td>
        </tr>
        <tr>
          <th>{{ typeLabel }}</th>
          <td>{{ typeValue }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.expense-print-document {
  display: none;
}
@media print {
  .expense-print-document {
    display: block !important;
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 12mm 14mm;
    color: #000;
    background: #fff;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.4;
  }
  .doc-header {
    margin-bottom: 20px;
    border-bottom: 1px solid #000;
    padding-bottom: 8px;
  }
  .doc-header h1 {
    margin: 0;
    font-size: 18pt;
    font-weight: 700;
  }
  .doc-number {
    margin: 4px 0 0;
    font-size: 11pt;
  }
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11pt;
  }
  .doc-table th,
  .doc-table td {
    border: 1px solid #333;
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }
  .doc-table th {
    width: 32%;
    background: #f0f0f0;
    font-weight: 700;
  }
  .doc-table .num {
    text-align: right;
    font-weight: 700;
  }
}
</style>
