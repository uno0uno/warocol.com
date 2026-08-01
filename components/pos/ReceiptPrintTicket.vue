<script setup lang="ts">
const { t } = useI18n({ useScope: 'global' })
import { consolidateReceiptPrintLines } from '~/utils/receiptPrintLines'
import {
  formatReceiptModifierBlock,
  formatReceiptProductBlock,
  formatReceiptTaxCue,
  padReceiptLine,
  receiptDivider,
  compactThermalMoneyLabel,
} from '~/utils/receiptTicketPlainText'

interface ReceiptItemModifier {
  id?: string | number | null
  name: string
  quantity?: number | string | null
  price?: number | string | null
  total?: number | string | null
}

interface ReceiptItem {
  id?: string | number | null
  productId?: string | number | null
  name: string
  quantity: number | string
  unitPrice: number
  total: number
  notes?: string | null
  modifiers?: ReceiptItemModifier[]
  promotionName?: string | null
  promoType?: string | null
  promoSavings?: number | string | null
  promoOptOut?: boolean | null
  discountAllocated?: number | string | null
  netTotal?: number | string | null
  taxCategory?: string | null
  taxLabel?: string | null
  taxAmount?: number | string | null
  includedInPrice?: boolean | null
}

interface ReceiptPaymentLine {
  id?: string | number | null
  label: string
  amount: number
  change?: number | null
}

interface PromoLine {
  promotion_id?: string | number | null
  promotion_name?: string | null
  savings: number
}

interface InvoiceTaxLine {
  label?: string | null
  base?: number | string | null
  rate?: number | string | null
  amount?: number | string | null
}

import type { PlatformLegalPrint } from '~/constants/waroLegalEntity'

const props = defineProps<{
  fiscalData?: {
    business_name?: string | null
    nit?: string | null
    fiscal_address?: string | null
    city?: string | null
    phone?: string | null
    email?: string | null
  } | null
  platformLegal?: PlatformLegalPrint | null
  /** When true, DIAN-specific receipt chrome (CO FE). */
  matiasDian?: boolean
  displayName?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  logoUrl?: string | null
  documentLabel: string
  orderNumber?: string | number | null
  soldAt?: string | null
  locationLabel?: string | null
  waiterName?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerFiscalLabel?: string | null
  items: ReceiptItem[]
  subtotal?: number
  promoBreakdown?: PromoLine[]
  discountAmount?: number
  waroDiscountLabel?: string
  waroDiscountAmount?: number
  standardTaxLabel?: string | null
  standardTax?: number
  liquorTaxLabel?: string | null
  liquorTax?: number
  orderTotal: number
  tipLabel?: string
  tipAmount?: number
  tipTaxAmount?: number
  advanceApplied?: number
  chargedTotal?: number | null
  payments?: ReceiptPaymentLine[]
  singlePaymentLabel?: string | null
  invoice?: {
    prefix?: string | null
    invoice_number?: string | number | null
    cufe?: string | null
    status?: string | null
    qrDataUrl?: string | null
    issuedAt?: string | null
    dianUrl?: string | null
    resolutionText?: string | null
    issuerLabel?: string | null
    acquirerLabel?: string | null
    paymentLabel?: string | null
    taxLines?: InvoiceTaxLine[] | null
  } | null
}>()

const { formatCurrencyThermal } = useFormatters()

const money = (value: number | string | null | undefined) => formatCurrencyThermal(value)

const modifierTotal = (modifier: ReceiptItemModifier) => {
  const explicitTotal = Number(modifier.total)
  if (modifier.total != null && Number.isFinite(explicitTotal)) return explicitTotal
  return (Number(modifier.price) || 0) * (Number(modifier.quantity) || 1)
}

const modifierDescription = (modifier: ReceiptItemModifier) => {
  const qty = Number(modifier.quantity) || 1
  return qty > 1 ? `+ ${modifier.name} x${qty}` : `+ ${modifier.name}`
}

const productTaxCue = (item: ReceiptItem) => {
  const amount = Number(item.taxAmount)
  const hasAmount = Number.isFinite(amount) && amount > 0
  const label = String(item.taxLabel ?? '').trim()
    || (String(item.taxCategory ?? '').toLowerCase() === 'exempt' ? t('pos.cartItem.taxExempt') : '')
  if (!label) return null
  if (hasAmount) {
    const amountLabel = compactThermalMoneyLabel(money(amount))
    return formatReceiptTaxCue({
      text: item.includedInPrice === true
        ? t('pos.cartItem.taxIncluded', { label, amount: amountLabel })
        : t('pos.cartItem.taxLine', { label, amount: amountLabel }),
    })
  }
  return formatReceiptTaxCue({ label })
}

const productBlock = (item: ReceiptItem) =>
  formatReceiptProductBlock({
    name: item.name,
    quantity: item.quantity,
    unitPriceLabel: money(item.unitPrice),
    lineTotalLabel: money(item.total),
    taxCue: productTaxCue(item),
  })

const modifierBlock = (modifier: ReceiptItemModifier) =>
  formatReceiptModifierBlock({
    description: modifierDescription(modifier),
    quantity: modifier.quantity ?? 1,
    unitPriceLabel: money(modifier.price),
    lineTotalLabel: money(modifierTotal(modifier)),
  })

const moneyLine = (label: string, amount: number | string | null | undefined, negative = false) => {
  const amt = compactThermalMoneyLabel(money(amount))
  return padReceiptLine(label, negative ? `-${amt}` : amt)
}

const dashDivider = receiptDivider()
const strongDivider = receiptDivider(32, '=')

const hasBreakdownSubtotal = computed(() =>
  (props.promoBreakdown?.length ?? 0) > 0
  || Number(props.discountAmount) > 0
  || Number(props.waroDiscountAmount) > 0,
)

const hasTaxBreakdown = computed(() =>
  Number(props.standardTax) > 0 || Number(props.liquorTax) > 0,
)

const hasSettlementBreakdown = computed(() =>
  Number(props.tipAmount) > 0 || Number(props.tipTaxAmount) > 0 || Number(props.advanceApplied) > 0,
)

const finalTotal = computed(() =>
  props.chargedTotal != null ? Number(props.chargedTotal) : Number(props.orderTotal) || 0,
)

const formatRate = (value: number | string | null | undefined) => {
  if (value == null || value === '') return null
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return `${numeric}%`
  return String(value)
}

const localizedInternalTaxLabel = (label?: string | null) => {
  const raw = String(label ?? '').trim()
  if (!raw) return t('pos.checkout.taxFallback')
  const normalized = raw.toLocaleLowerCase('es-CO')
  if (normalized === 'impuesto' || normalized === 'tax') return t('pos.checkout.taxFallback')
  return raw
}

const displayStandardTaxLabel = computed(() =>
  localizedInternalTaxLabel(props.standardTaxLabel),
)

const displayLiquorTaxLabel = computed(() => {
  const raw = String(props.liquorTaxLabel ?? '').trim()
  if (!raw) return t('pos.receipt.liquorVat')
  return localizedInternalTaxLabel(raw)
})

const invoiceNumberLabel = computed(() => {
  const invoice = props.invoice
  if (!invoice) return null
  return [invoice.prefix, invoice.invoice_number].filter(Boolean).join('-') || null
})

const invoiceDianUrl = computed(() => {
  const invoice = props.invoice
  if (!invoice) return null
  if (invoice.dianUrl) return invoice.dianUrl
  return invoice.cufe
    ? `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${invoice.cufe}`
    : null
})

/** Emisor FE = tenant fiscal only (never marketing displayName / WARO brand). */
const fallbackIssuerLabel = computed(() => {
  const name = props.fiscalData?.business_name?.trim() || null
  const nit = props.fiscalData?.nit?.trim() || null
  if (name && nit) return `${name} - NIT ${nit}`
  return name || (nit ? `NIT ${nit}` : null)
})

const hasCompleteHeaderIssuer = computed(() =>
  Boolean(props.fiscalData?.business_name?.trim() && props.fiscalData?.nit?.trim()),
)

const invoicePaymentLabel = computed(() => {
  if (props.invoice?.paymentLabel) return props.invoice.paymentLabel
  if ((props.payments?.length ?? 0) > 0) {
    return props.payments!.map(payment => payment.label).filter(Boolean).join(' + ') || null
  }
  return props.singlePaymentLabel || null
})

const invoiceTaxLines = computed(() => {
  const explicit = (props.invoice?.taxLines ?? []).filter(line =>
    line?.label || Number(line?.base) > 0 || Number(line?.amount) > 0,
  ).map(line => ({
    ...line,
    label: localizedInternalTaxLabel(line.label),
  }))
  if (explicit.length > 0) return explicit

  const lines: InvoiceTaxLine[] = []
  if (Number(props.standardTax) > 0) {
    lines.push({ label: displayStandardTaxLabel.value, amount: props.standardTax })
  }
  if (Number(props.liquorTax) > 0) {
    lines.push({ label: displayLiquorTaxLabel.value, amount: props.liquorTax })
  }
  return lines
})

const printableItems = computed(() =>
  consolidateReceiptPrintLines(props.items, {
    productKey: item => item.productId ?? item.name,
    displayName: item => item.name,
    quantity: item => item.quantity,
    unitPrice: item => item.unitPrice,
    total: item => item.total,
    taxAmount: item => item.taxAmount,
    modifiers: item => item.modifiers,
    notes: item => item.notes,
    guards: item => [
      item.promotionName,
      item.promoType,
      item.promoSavings,
      item.promoOptOut,
      item.discountAllocated,
      item.netTotal,
      item.taxCategory,
      item.taxLabel,
      item.includedInPrice,
    ],
    merge: (item, aggregate) => ({
      ...item,
      quantity: aggregate.quantity,
      total: aggregate.total,
      taxAmount: aggregate.taxAmount > 0 ? aggregate.taxAmount : item.taxAmount,
    }),
  })
)
</script>

<template>
  <Teleport to="body">
    <div class="receipt-print-ticket" aria-hidden="true">
    <PosReceiptPrintHeader
      :fiscal-data="fiscalData"
      :display-name="displayName"
      :address="address"
      :city="city"
      :phone="phone"
      :logo-url="logoUrl"
    />

    <div class="receipt-plain-line">{{ strongDivider }}</div>
    <div v-if="invoice" class="receipt-row receipt-document-title">
      {{ t('pos.receipt.electronicInvoiceSale') }}
    </div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">
      <template v-if="invoiceNumberLabel">
        {{ invoiceNumberLabel }}<template v-if="orderNumber"> · {{ documentLabel }} #{{ orderNumber }}</template>
      </template>
      <template v-else>
        {{ documentLabel }}<template v-if="orderNumber"> #{{ orderNumber }}</template>
      </template>
    </div>
    <div v-if="soldAt" class="receipt-row receipt-small">{{ soldAt }}</div>
    <div v-if="locationLabel" class="receipt-row receipt-small">{{ locationLabel }}</div>
    <div v-if="waiterName" class="receipt-row receipt-small">{{ t('pos.receipt.waiter', { name: waiterName }) }}</div>

    <template v-if="customerName || customerPhone || customerEmail">
      <div class="receipt-plain-line">{{ dashDivider }}</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.saleContact') }}</div>
      <div v-if="customerName" class="receipt-row receipt-small">{{ customerName }}</div>
      <div v-if="customerPhone" class="receipt-row receipt-small">{{ t('pos.receipt.phone', { phone: customerPhone }) }}</div>
      <div v-if="customerEmail" class="receipt-row receipt-small">{{ t('pos.receipt.email', { email: customerEmail }) }}</div>
      <div v-if="!invoice && customerFiscalLabel" class="receipt-row receipt-small">{{ customerFiscalLabel }}</div>
    </template>

    <div class="receipt-plain-line">{{ dashDivider }}</div>
    <div class="receipt-plain-line receipt-small">{{ padReceiptLine(t('pos.receipt.description'), t('pos.receipt.total')) }}</div>

    <template v-for="item in printableItems" :key="item.id ?? item.name">
      <pre class="receipt-plain-pre">{{ productBlock(item) }}</pre>
      <pre
        v-for="modifier in (item.modifiers ?? [])"
        :key="`${item.id ?? item.name}-${modifier.id ?? modifier.name}`"
        class="receipt-plain-pre receipt-modifier-pre"
      >{{ modifierBlock(modifier) }}</pre>
    </template>

    <div class="receipt-plain-line">{{ dashDivider }}</div>

    <div v-if="hasBreakdownSubtotal && subtotal != null" class="receipt-plain-line">
      {{ moneyLine(t('pos.receipt.subtotal'), subtotal) }}
    </div>
    <div
      v-for="promo in (promoBreakdown ?? [])"
      :key="promo.promotion_id ?? promo.promotion_name"
      class="receipt-plain-line"
    >
      {{ moneyLine(promo.promotion_name || t('pos.receipt.promoFallback'), promo.savings, true) }}
    </div>
    <div v-if="Number(discountAmount) > 0" class="receipt-plain-line">
      {{ moneyLine(t('pos.receipt.manualDiscount'), discountAmount, true) }}
    </div>
    <div v-if="Number(waroDiscountAmount) > 0" class="receipt-plain-line">
      {{ moneyLine(waroDiscountLabel || t('pos.receipt.waroRedeem'), waroDiscountAmount, true) }}
    </div>

    <template v-if="hasTaxBreakdown">
      <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.taxDetail') }}</div>
      <div v-if="Number(standardTax) > 0" class="receipt-plain-line receipt-small">
        {{ moneyLine(displayStandardTaxLabel, standardTax) }}
      </div>
      <div v-if="Number(liquorTax) > 0" class="receipt-plain-line receipt-small">
        {{ moneyLine(displayLiquorTaxLabel, liquorTax) }}
      </div>
    </template>

    <template v-if="hasSettlementBreakdown">
      <div class="receipt-plain-line">
        {{ moneyLine(t('pos.receipt.orderTotal'), orderTotal) }}
      </div>
      <div v-if="Number(tipAmount) > 0" class="receipt-plain-line">
        {{ moneyLine(tipLabel || t('pos.receipt.tipDefault'), tipAmount) }}
      </div>
      <div v-if="Number(tipTaxAmount) > 0" class="receipt-plain-line">
        {{ moneyLine(t('pos.receipt.tipTax'), tipTaxAmount) }}
      </div>
      <div v-if="Number(advanceApplied) > 0" class="receipt-plain-line">
        {{ moneyLine(t('pos.receipt.tableAdvance'), advanceApplied, true) }}
      </div>
      <div class="receipt-plain-line receipt-plain-total">
        {{ moneyLine(t('pos.receipt.totalChargedUpper'), finalTotal) }}
      </div>
    </template>
    <div v-else class="receipt-plain-line receipt-plain-total">
      {{ moneyLine(t('pos.receipt.totalUpper'), orderTotal) }}
    </div>

    <div class="receipt-plain-line">{{ dashDivider }}</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.paymentDetail') }}</div>
    <template v-if="(payments?.length ?? 0) > 0">
      <template v-for="(payment, idx) in payments" :key="payment.id ?? idx">
        <div class="receipt-plain-line receipt-small">
          {{ moneyLine(`#${idx + 1} - ${payment.label}`, payment.amount) }}
        </div>
        <div v-if="payment.change && payment.change > 0" class="receipt-plain-line receipt-small">
          {{ moneyLine(t('pos.receipt.changeNumber', { number: idx + 1 }), payment.change) }}
        </div>
      </template>
    </template>
    <template v-else>
      <div class="receipt-plain-line receipt-small">
        {{ moneyLine(singlePaymentLabel || t('pos.checkout.summary.pendingPayment'), finalTotal) }}
      </div>
    </template>

    <!-- Venta sin FE: comprobante del establecimiento (DIAN disclaimer only for CO FE tenants) -->
    <template v-if="!invoice">
      <div class="receipt-plain-line">{{ strongDivider }}</div>
      <div class="receipt-footer">{{ t('pos.receipt.thanks') }}</div>
      <div class="receipt-plain-line">{{ dashDivider }}</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">
        {{ t('pos.receipt.saleReceipt') }}
      </div>
      <div class="receipt-row receipt-small">
        {{ matiasDian
          ? t('pos.receipt.notDianInvoice')
          : t('pos.receipt.notElectronicInvoice') }}
      </div>
      <div
        v-if="fallbackIssuerLabel"
        class="receipt-row receipt-small"
      >
        {{ t('pos.receipt.seller', { label: fallbackIssuerLabel }) }}
      </div>
      <PosReceiptPlatformFooter
        document-kind="sale"
        :platform-legal="platformLegal"
        :matias-dian="matiasDian"
      />
    </template>

    <template v-else>
      <div class="receipt-plain-line">{{ strongDivider }}</div>
      <div class="receipt-fe-details">
        <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.printedElectronicInvoice') }}</div>
        <div v-if="invoice.issuedAt" class="receipt-row receipt-row--start receipt-small">{{ t('pos.receipt.dianIssueDate', { date: invoice.issuedAt }) }}</div>
        <div
          v-if="!hasCompleteHeaderIssuer && (invoice.issuerLabel || fallbackIssuerLabel)"
          class="receipt-row receipt-row--start receipt-small"
        >
          {{ t('pos.receipt.issuer', { label: invoice.issuerLabel || fallbackIssuerLabel }) }}
        </div>
        <div
          v-if="invoice.acquirerLabel"
          class="receipt-row receipt-row--start receipt-small"
        >
          {{ t('pos.receipt.acquirer', { label: invoice.acquirerLabel }) }}
        </div>
        <div v-if="invoice.resolutionText" class="receipt-row receipt-row--start receipt-small">{{ invoice.resolutionText }}</div>
        <div v-if="invoicePaymentLabel" class="receipt-row receipt-row--start receipt-small">{{ t('pos.receipt.paymentForm', { label: invoicePaymentLabel }) }}</div>
      </div>
      <template v-if="invoiceTaxLines.length > 0">
        <div class="receipt-plain-line">{{ dashDivider }}</div>
        <div class="receipt-row receipt-small" style="font-weight:bold;">{{ t('pos.receipt.taxTributaryDetail') }}</div>
        <div
          v-for="(line, idx) in invoiceTaxLines"
          :key="`${line.label ?? 'tax'}-${idx}`"
          class="receipt-plain-line receipt-small"
        >
          {{ moneyLine(
            [
              line.label || t('pos.checkout.taxFallback'),
              formatRate(line.rate),
              Number(line.base) > 0 ? t('pos.receipt.taxBase', { amount: money(line.base) }) : null,
            ].filter(Boolean).join(' '),
            line.amount,
          ) }}
        </div>
      </template>
      <div v-if="invoice.cufe" class="receipt-row receipt-row--start receipt-small receipt-cufe">
        {{ t('pos.receipt.cufe', { cufe: invoice.cufe }) }}
      </div>
      <img
        v-if="invoice.qrDataUrl"
        :src="invoice.qrDataUrl"
        :alt="t('pos.receipt.qrDianAlt')"
        class="receipt-qr"
      >
      <div v-if="invoiceDianUrl" class="receipt-row receipt-small">{{ t('pos.receipt.verifyDian') }}</div>
      <div class="receipt-plain-line">{{ strongDivider }}</div>
      <div class="receipt-footer">{{ t('pos.receipt.thanks') }}</div>
      <PosReceiptPlatformFooter document-kind="fe" :platform-legal="platformLegal" :matias-dian="true" />
    </template>
    </div>
  </Teleport>
</template>

<style>
.receipt-print-ticket {
  display: none;
}

.receipt-print-ticket .receipt-header {
  font-size: 1.1em;
  font-weight: bold;
  text-align: center;
  margin-bottom: 4px;
}

.receipt-print-ticket .receipt-row {
  text-align: center;
  margin: 1px 0;
  overflow-wrap: anywhere;
}

.receipt-print-ticket .receipt-row--start {
  text-align: start;
}

.receipt-print-ticket .receipt-document-title {
  font-size: 1.05em;
  font-weight: bold;
  line-height: 1.1;
}

.receipt-print-ticket .receipt-divider {
  height: 0;
  border: 0;
  border-top: 1px dashed #000;
  margin: 3px 0;
  overflow: hidden;
}

.receipt-print-ticket .receipt-divider--strong {
  border-top-style: solid;
  border-top-width: 2px;
  margin: 4px 0;
}

.receipt-print-ticket .receipt-item {
  display: flex;
  justify-content: space-between;
  margin: 2px 0;
  gap: 4px;
}

.receipt-print-ticket .receipt-item span:first-child {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.receipt-print-ticket .receipt-item span:last-child {
  white-space: nowrap;
  flex-shrink: 0;
}

.receipt-print-ticket .receipt-tax-line {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 3px;
  margin: 2px 0;
}

.receipt-print-ticket .receipt-tax-line span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.receipt-print-ticket .receipt-tax-line span:not(:first-child) {
  white-space: nowrap;
  text-align: right;
}

.receipt-print-ticket .receipt-total {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 1.1em;
  margin: 4px 0;
}

.receipt-print-ticket .receipt-cufe {
  word-break: break-all;
  line-height: 1.1;
}

.receipt-print-ticket .receipt-qr {
  width: 30mm;
  height: 30mm;
  margin: 4px auto;
  display: block;
}

.receipt-print-ticket .receipt-plain-line,
.receipt-print-ticket .receipt-plain-pre {
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

.receipt-print-ticket .receipt-plain-pre {
  margin: 4px 0;
}

.receipt-print-ticket .receipt-modifier-pre {
  margin-top: 0;
  padding-left: 0;
}

.receipt-print-ticket .receipt-plain-total {
  font-weight: 700;
  margin-top: 4px;
}

.receipt-print-ticket .receipt-footer {
  text-align: center;
  margin: 4px 0;
}

.receipt-print-ticket .receipt-small {
  font-size: 0.85em;
}

.receipt-print-ticket .receipt-product-header,
.receipt-print-ticket .receipt-product-values {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2mm;
  align-items: baseline;
}

.receipt-print-ticket .receipt-product-header {
  font-weight: bold;
  border-bottom: 1px dashed #000;
  padding-bottom: 2px;
  margin-bottom: 3px;
}

.receipt-print-ticket .receipt-col-total {
  text-align: right;
  white-space: nowrap;
}

.receipt-print-ticket .receipt-product-line {
  margin: 0 0 3px;
  break-inside: avoid;
  page-break-inside: avoid;
}

.receipt-print-ticket .receipt-product-name {
  overflow-wrap: anywhere;
}

.receipt-print-ticket .receipt-product-values {
  padding-left: 2mm;
}

.receipt-print-ticket .receipt-product-values span:last-child,
.receipt-print-ticket .receipt-product-values strong {
  text-align: right;
  white-space: nowrap;
}

.receipt-print-ticket .receipt-modifier-row {
  padding-left: 2mm;
  margin-top: -1px;
  font-size: 0.92em;
}

.receipt-print-ticket .receipt-fe-details {
  break-inside: avoid;
  page-break-inside: avoid;
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

  /* Remove the hidden app from print layout entirely. The ticket is
     teleported to <body>; siblings that stay in flow (visibility:hidden
     still occupies space) would push the static ticket to page 2,
     producing a blank first page. */
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

  body.printing-receipt-ticket .receipt-print-ticket,
  body.printing-receipt-ticket .receipt-print-ticket * {
    visibility: visible !important;
  }

  body.printing-receipt-ticket .receipt-print-ticket {
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

  body.printing-receipt-ticket .receipt-print-ticket .receipt-logo {
    filter: grayscale(100%) !important;
    -webkit-filter: grayscale(100%) !important;
  }

  body.printing-receipt-ticket .receipt-print-ticket .receipt-item {
    page-break-inside: avoid;
  }

  @page {
    size: 80mm auto;
    margin: 0;
  }
}
</style>
