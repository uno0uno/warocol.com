<script setup lang="ts">
import {
  formatReceiptDeliveryLines,
  receiptSectionSeparator,
  type ReceiptDeliveryFields,
} from '~/utils/receiptTicketPlainText'

const { t } = useI18n({ useScope: 'global' })

const props = defineProps<{
  delivery?: ReceiptDeliveryFields | null
}>()

const sectionSeparator = receiptSectionSeparator()

const lines = computed(() => formatReceiptDeliveryLines(props.delivery, {
  title: t('pos.receipt.deliveryTitle'),
  time: t('pos.receipt.deliveryTime'),
  notes: t('pos.receipt.deliveryNotes'),
}))
</script>

<template>
  <template v-if="lines.length">
    <div class="receipt-plain-line receipt-small">{{ sectionSeparator }}</div>
    <pre class="receipt-plain-pre">{{ lines.join('\n') }}</pre>
  </template>
</template>
