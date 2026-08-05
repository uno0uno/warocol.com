<script setup lang="ts">
export type DirectPurchasePrintItem = {
  name: string
  qtyLabel: string
  unit: string
  unitCostLabel: string
  totalLabel: string
  notes?: string | null
}

defineProps<{
  title: string
  purchaseNumber?: string | number | null
  dateLabel: string
  dateValue: string
  supplierLabel: string
  supplierValue: string
  supplierTaxId?: string | null
  statusLabel: string
  statusValue: string
  paymentLabel: string
  paymentValue: string
  itemNameLabel: string
  qtyLabel: string
  unitLabel: string
  unitCostLabel: string
  lineTotalLabel: string
  items: DirectPurchasePrintItem[]
  totalLabel: string
  totalValue: string
  notesLabel?: string
  notesValue?: string | null
}>()
</script>

<template>
  <div
    id="direct-purchase-print-document"
    class="letter-print-document direct-purchase-print-document"
    aria-hidden="true"
  >
    <header class="doc-header">
      <h1>{{ title }}</h1>
      <p
        v-if="purchaseNumber"
        class="doc-number"
      >
        #{{ purchaseNumber }}
      </p>
    </header>

    <section class="doc-meta">
      <div><strong>{{ dateLabel }}:</strong> {{ dateValue }}</div>
      <div>
        <strong>{{ supplierLabel }}:</strong> {{ supplierValue }}
        <span v-if="supplierTaxId"> · NIT {{ supplierTaxId }}</span>
      </div>
      <div><strong>{{ statusLabel }}:</strong> {{ statusValue }}</div>
      <div><strong>{{ paymentLabel }}:</strong> {{ paymentValue }}</div>
    </section>

    <table class="doc-table">
      <thead>
        <tr>
          <th>#</th>
          <th>{{ itemNameLabel }}</th>
          <th>{{ qtyLabel }}</th>
          <th>{{ unitLabel }}</th>
          <th>{{ unitCostLabel }}</th>
          <th>{{ lineTotalLabel }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in items"
          :key="index"
        >
          <td>{{ index + 1 }}</td>
          <td>
            {{ item.name }}
            <div
              v-if="item.notes"
              class="item-notes"
            >
              {{ item.notes }}
            </div>
          </td>
          <td class="num">{{ item.qtyLabel }}</td>
          <td>{{ item.unit }}</td>
          <td class="num">{{ item.unitCostLabel }}</td>
          <td class="num">{{ item.totalLabel }}</td>
        </tr>
      </tbody>
    </table>

    <p class="doc-total">
      <strong>{{ totalLabel }}:</strong> {{ totalValue }}
    </p>

    <section
      v-if="notesValue"
      class="doc-notes"
    >
      <strong>{{ notesLabel }}</strong>
      <p>{{ notesValue }}</p>
    </section>
  </div>
</template>

<style scoped>
.direct-purchase-print-document {
  display: none;
}
@media print {
  .direct-purchase-print-document {
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
    margin-bottom: 16px;
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
  .doc-meta {
    display: grid;
    gap: 4px;
    margin-bottom: 16px;
    font-size: 11pt;
  }
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12px;
    font-size: 10pt;
  }
  .doc-table th,
  .doc-table td {
    border: 1px solid #333;
    padding: 6px 8px;
    text-align: left;
    vertical-align: top;
  }
  .doc-table th {
    background: #f0f0f0;
    font-weight: 700;
  }
  .doc-table .num {
    text-align: right;
    white-space: nowrap;
  }
  .item-notes {
    margin-top: 2px;
    font-size: 9pt;
    font-style: italic;
    color: #333;
  }
  .doc-total {
    text-align: right;
    font-size: 12pt;
    margin: 8px 0 16px;
  }
  .doc-notes {
    border-top: 1px solid #999;
    padding-top: 8px;
    font-size: 10pt;
  }
  .doc-notes p {
    margin: 4px 0 0;
    white-space: pre-wrap;
  }
}
</style>
