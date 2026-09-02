<script setup lang="ts">
import {
  EMPTY_PLATFORM_LEGAL,
  type PlatformLegalPrint,
} from '~/constants/waroLegalEntity'
import {
  padReceiptLine,
  receiptDivider,
  receiptSectionSeparator,
} from '~/utils/receiptTicketPlainText'

export interface CrmStaffReceiptLine {
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  ticketId: string
  documentKind: 'crm-credit' | 'crm-wallet'
  documentLabel: string
  headerRoleLabel: string
  footerBanner: string
  footerNote: string
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
  lines: CrmStaffReceiptLine[]
  extraPreBlocks?: string[]
  notesLabel?: string
  notesValue?: string
}>(), {
  platformLegal: null,
})

const { t } = useI18n({ useScope: 'global' })

const strongDivider = receiptDivider(32, '=')
const sectionSeparator = receiptSectionSeparator()

const platformLegalResolved = computed(() => props.platformLegal ?? EMPTY_PLATFORM_LEGAL)
</script>

<template>
  <div
    :id="ticketId"
    class="receipt-print-ticket crm-staff-receipt-print-ticket"
    aria-hidden="true"
  >
    <PosReceiptPrintHeader
      :fiscal-data="fiscalData"
      :display-name="displayName"
      :address="address"
      :city="city"
      :phone="phone"
      :logo-url="logoUrl"
      :role-label="headerRoleLabel"
    />

    <div class="receipt-plain-line">{{ strongDivider }}</div>
    <div class="receipt-row receipt-row--center receipt-small" style="font-weight:bold;">
      {{ documentLabel }}
    </div>

    <div class="receipt-plain-line receipt-small">{{ sectionSeparator }}</div>
    <pre
      v-for="(line, index) in lines"
      :key="`${line.label}-${index}`"
      class="receipt-plain-pre"
    >{{ padReceiptLine(line.label, line.value) }}</pre>

    <template v-if="extraPreBlocks?.length">
      <div class="receipt-plain-line receipt-small">{{ sectionSeparator }}</div>
      <pre
        v-for="(block, index) in extraPreBlocks"
        :key="`extra-${index}`"
        class="receipt-plain-pre"
      >{{ block }}</pre>
    </template>

    <template v-if="notesValue">
      <pre class="receipt-plain-pre">{{ notesLabel }}</pre>
      <pre class="receipt-plain-pre">{{ notesValue }}</pre>
    </template>

    <div class="receipt-plain-line">{{ strongDivider }}</div>
    <div class="receipt-footer">{{ t('pos.receipt.thanks') }}</div>
    <div class="receipt-plain-line receipt-small">{{ sectionSeparator }}</div>
    <div class="receipt-footer receipt-small" style="font-weight:bold;">
      {{ footerBanner }}
    </div>
    <div class="receipt-footer receipt-small">
      {{ footerNote }}
    </div>
    <PosReceiptPlatformFooter
      :document-kind="documentKind"
      :platform-legal="platformLegalResolved"
      :matias-dian="false"
    />
  </div>
</template>

<style>
.crm-staff-receipt-print-ticket.receipt-print-ticket {
  display: none;
}

.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-header {
  font-size: 1.1em;
  font-weight: bold;
  text-align: center;
  margin-bottom: 4px;
}

.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-row {
  text-align: start;
  margin: 1px 0;
  overflow-wrap: anywhere;
}

.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-row--center {
  text-align: center;
}

.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-plain-line,
.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-plain-pre {
  display: block;
  margin: 2px 0;
  padding: 0;
  white-space: pre;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  line-height: 1.25;
  text-align: left;
  overflow: hidden;
}

.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-plain-pre {
  margin: 4px 0;
}

.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-footer {
  text-align: center;
  margin: 4px 0;
}

.crm-staff-receipt-print-ticket.receipt-print-ticket .receipt-small {
  font-size: 0.85em;
}

@media print {
  html,
  body.printing-receipt-ticket {
    margin: 0;
    padding: 0;
  }

  body.printing-receipt-ticket * {
    visibility: hidden;
  }

  body.printing-receipt-ticket > :not(.receipt-print-ticket) {
    display: none !important;
  }

  body.printing-receipt-ticket #pos-receipt,
  body.printing-receipt-ticket #pos-receipt *,
  body.printing-receipt-ticket #pos-prefactura,
  body.printing-receipt-ticket #pos-prefactura * {
    display: none !important;
    visibility: hidden !important;
  }

  body.printing-receipt-ticket .receipt-print-ticket {
    display: none !important;
    visibility: hidden !important;
  }

  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket,
  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket *,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket * {
    visibility: visible !important;
  }

  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket {
    display: block !important;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9.5pt;
    line-height: 1.2;
    letter-spacing: 0;
    width: 64mm;
    color: #000;
    background: #fff;
    box-sizing: border-box;
    padding: 0 1.5mm 14mm;
    position: static !important;
    max-height: none !important;
    overflow: visible !important;
    margin: 0 !important;
  }

  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket .receipt-plain-line,
  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket .receipt-plain-pre,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket .receipt-plain-line,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket .receipt-plain-pre,
  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket .receipt-row,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket .receipt-row {
    text-align: left !important;
  }

  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket .receipt-row--center,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket .receipt-row--center,
  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket .receipt-header,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket .receipt-header,
  body.printing-receipt-ticket[data-print-ticket="credit-payment-print-ticket"] #credit-payment-print-ticket .receipt-footer,
  body.printing-receipt-ticket[data-print-ticket="wallet-recharge-print-ticket"] #wallet-recharge-print-ticket .receipt-footer {
    text-align: center !important;
  }

  @page {
    size: 80mm auto;
    margin: 0;
  }
}
</style>
