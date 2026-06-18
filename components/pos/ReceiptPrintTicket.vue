<script setup lang="ts">
interface ReceiptItemModifier {
  id?: string | number | null
  name: string
  quantity?: number | string | null
  price?: number | string | null
  total?: number | string | null
}

interface ReceiptItem {
  id?: string | number | null
  name: string
  quantity: number | string
  unitPrice: number
  total: number
  modifiers?: ReceiptItemModifier[]
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

const props = defineProps<{
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
  documentLabel: string
  orderNumber?: string | number | null
  soldAt?: string | null
  locationLabel?: string | null
  waiterName?: string | null
  customerName?: string | null
  customerFiscalLabel?: string | null
  items: ReceiptItem[]
  subtotal?: number
  promoBreakdown?: PromoLine[]
  discountAmount?: number
  waroDiscountLabel?: string
  waroDiscountAmount?: number
  standardTaxLabel?: string | null
  standardTax?: number
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
  } | null
}>()

const money = (value: number | string | null | undefined) => {
  const n = Number(value) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

const modifierTotal = (modifier: ReceiptItemModifier) => {
  const explicitTotal = Number(modifier.total)
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal
  return (Number(modifier.price) || 0) * (Number(modifier.quantity) || 1)
}

const modifierDescription = (modifier: ReceiptItemModifier) => {
  const qty = Number(modifier.quantity) || 1
  return qty > 1 ? `+ ${modifier.name} x${qty}` : `+ ${modifier.name}`
}

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
</script>

<template>
  <div class="receipt-print-ticket" aria-hidden="true">
    <PosReceiptPrintHeader
      :fiscal-data="fiscalData"
      :display-name="displayName"
      :address="address"
      :city="city"
      :phone="phone"
      :logo-url="logoUrl"
    />

    <div class="receipt-divider">================================</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">
      {{ documentLabel }}<span v-if="orderNumber"> #{{ orderNumber }}</span>
    </div>
    <div v-if="soldAt" class="receipt-row receipt-small">{{ soldAt }}</div>
    <div v-if="locationLabel" class="receipt-row receipt-small">{{ locationLabel }}</div>
    <div v-if="waiterName" class="receipt-row receipt-small">Mesero: {{ waiterName }}</div>

    <template v-if="customerName">
      <div class="receipt-divider receipt-small">--------------------------------</div>
      <div class="receipt-row receipt-small" style="font-weight:bold;">Datos cliente</div>
      <div class="receipt-row receipt-small">{{ customerName }}</div>
      <div v-if="customerFiscalLabel" class="receipt-row receipt-small">{{ customerFiscalLabel }}</div>
    </template>

    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-grid-header receipt-small">
      <span class="receipt-col-desc">Descripcion</span>
      <span class="receipt-col-qty">Cant</span>
      <span class="receipt-col-price">Precio</span>
      <span class="receipt-col-total">Total</span>
    </div>

    <template v-for="item in items" :key="item.id ?? item.name">
      <div class="receipt-grid-row receipt-small">
        <span class="receipt-col-desc">{{ item.name }}</span>
        <span class="receipt-col-qty">{{ item.quantity }}</span>
        <span class="receipt-col-price">{{ money(item.unitPrice) }}</span>
        <span class="receipt-col-total">{{ money(item.total) }}</span>
      </div>
      <div
        v-for="modifier in (item.modifiers ?? [])"
        :key="`${item.id ?? item.name}-${modifier.id ?? modifier.name}`"
        class="receipt-grid-row receipt-small receipt-modifier-row"
      >
        <span class="receipt-col-desc">{{ modifierDescription(modifier) }}</span>
        <span class="receipt-col-qty">{{ (Number(modifier.quantity) || 1) > 1 ? modifier.quantity : '' }}</span>
        <span class="receipt-col-price">{{ money(modifier.price) }}</span>
        <span class="receipt-col-total">{{ money(modifierTotal(modifier)) }}</span>
      </div>
    </template>

    <div class="receipt-divider">--------------------------------</div>

    <div v-if="hasBreakdownSubtotal && subtotal != null" class="receipt-item">
      <span>Subtotal</span>
      <span>{{ money(subtotal) }}</span>
    </div>
    <div
      v-for="promo in (promoBreakdown ?? [])"
      :key="promo.promotion_id ?? promo.promotion_name"
      class="receipt-item"
    >
      <span>{{ promo.promotion_name || 'Promocion' }}</span>
      <span>-{{ money(promo.savings) }}</span>
    </div>
    <div v-if="Number(discountAmount) > 0" class="receipt-item">
      <span>Descuento manual</span>
      <span>-{{ money(discountAmount) }}</span>
    </div>
    <div v-if="Number(waroDiscountAmount) > 0" class="receipt-item">
      <span>{{ waroDiscountLabel || 'Canje WaRo' }}</span>
      <span>-{{ money(waroDiscountAmount) }}</span>
    </div>

    <template v-if="hasTaxBreakdown">
      <div class="receipt-row receipt-small" style="font-weight:bold;">Detalle de impuestos</div>
      <div v-if="Number(standardTax) > 0" class="receipt-item receipt-small">
        <span>{{ standardTaxLabel || 'Impuesto' }}</span>
        <span>{{ money(standardTax) }}</span>
      </div>
      <div v-if="Number(liquorTax) > 0" class="receipt-item receipt-small">
        <span>IVA licores 5%</span>
        <span>{{ money(liquorTax) }}</span>
      </div>
    </template>

    <template v-if="hasSettlementBreakdown">
      <div class="receipt-item">
        <span>Total orden</span>
        <span>{{ money(orderTotal) }}</span>
      </div>
      <div v-if="Number(tipAmount) > 0" class="receipt-item">
        <span>{{ tipLabel || 'Propina' }}</span>
        <span>{{ money(tipAmount) }}</span>
      </div>
      <div v-if="Number(tipTaxAmount) > 0" class="receipt-item">
        <span>Impuesto propina</span>
        <span>{{ money(tipTaxAmount) }}</span>
      </div>
      <div v-if="Number(advanceApplied) > 0" class="receipt-item">
        <span>Anticipo mesa</span>
        <span>-{{ money(advanceApplied) }}</span>
      </div>
      <div class="receipt-total">
        <span>TOTAL COBRADO</span>
        <span>{{ money(finalTotal) }}</span>
      </div>
    </template>
    <div v-else class="receipt-total">
      <span>TOTAL</span>
      <span>{{ money(orderTotal) }}</span>
    </div>

    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-row receipt-small" style="font-weight:bold;">Detalle de pago</div>
    <template v-if="(payments?.length ?? 0) > 0">
      <template v-for="(payment, idx) in payments" :key="payment.id ?? idx">
        <div class="receipt-item receipt-small">
          <span>#{{ idx + 1 }} · {{ payment.label }}</span>
          <span>{{ money(payment.amount) }}</span>
        </div>
        <div v-if="payment.change && payment.change > 0" class="receipt-item receipt-small">
          <span>Cambio (#{{ idx + 1 }})</span>
          <span>{{ money(payment.change) }}</span>
        </div>
      </template>
    </template>
    <template v-else>
      <div class="receipt-item receipt-small">
        <span>{{ singlePaymentLabel || 'Pendiente por definir' }}</span>
        <span>{{ money(finalTotal) }}</span>
      </div>
    </template>

    <div class="receipt-divider">================================</div>
    <div class="receipt-footer">Gracias por tu compra</div>

    <template v-if="invoice">
      <div class="receipt-divider">================================</div>
      <div class="receipt-row" style="font-weight:bold;">FACTURA ELECTRONICA</div>
      <div v-if="invoice.prefix || invoice.invoice_number" class="receipt-row">
        {{ [invoice.prefix, invoice.invoice_number].filter(Boolean).join('-') }}
      </div>
      <div v-if="invoice.cufe" class="receipt-row receipt-small receipt-cufe">
        CUFE: {{ invoice.cufe }}
      </div>
      <img
        v-if="invoice.qrDataUrl"
        :src="invoice.qrDataUrl"
        alt="QR verificacion DIAN"
        class="receipt-qr"
      >
      <div v-if="invoice.cufe" class="receipt-row receipt-small">Verificar en DIAN</div>
      <div class="receipt-divider">================================</div>
    </template>
  </div>
</template>

<style>
.receipt-print-ticket {
  display: none;
}

.receipt-print-ticket .receipt-logo {
  width: 18mm;
  max-width: 22mm;
  max-height: 18mm;
  display: block;
  margin: 0 auto 4px;
  object-fit: contain;
  filter: grayscale(100%);
  -webkit-filter: grayscale(100%);
}

.receipt-print-ticket .receipt-header {
  font-size: 1.1em;
  font-weight: bold;
  text-align: center;
  margin-bottom: 4px;
}

.receipt-print-ticket .receipt-row {
  text-align: center;
  margin: 2px 0;
}

.receipt-print-ticket .receipt-divider {
  letter-spacing: 0;
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

.receipt-print-ticket .receipt-total {
  display: flex;
  justify-content: space-between;
  font-weight: bold;
  font-size: 1.1em;
  margin: 4px 0;
}

.receipt-print-ticket .receipt-cufe {
  word-break: break-all;
  text-align: center;
}

.receipt-print-ticket .receipt-qr {
  width: 30mm;
  height: 30mm;
  margin: 4px auto;
  display: block;
}

.receipt-print-ticket .receipt-footer {
  text-align: center;
  margin-top: 8px;
}

.receipt-print-ticket .receipt-small {
  font-size: 0.85em;
}

.receipt-print-ticket .receipt-grid-header,
.receipt-print-ticket .receipt-grid-row {
  display: grid;
  grid-template-columns: 1fr 7mm 14mm 16mm;
  gap: 1mm;
  align-items: start;
  margin: 2px 0;
}

.receipt-print-ticket .receipt-col-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.receipt-print-ticket .receipt-col-qty,
.receipt-print-ticket .receipt-col-price,
.receipt-print-ticket .receipt-col-total {
  text-align: right;
  white-space: nowrap;
}

.receipt-print-ticket .receipt-grid-header {
  font-weight: bold;
  border-bottom: 1px dashed #000;
  padding-bottom: 2px;
  margin-bottom: 4px;
}

.receipt-print-ticket .receipt-modifier-row .receipt-col-desc {
  padding-left: 8px;
  font-size: 0.92em;
}

@media print {
  body.printing-receipt-ticket {
    margin: 0;
    padding: 0;
  }

  body.printing-receipt-ticket * {
    visibility: hidden;
  }

  body.printing-receipt-ticket .receipt-print-ticket,
  body.printing-receipt-ticket .receipt-print-ticket * {
    visibility: visible !important;
  }

  body.printing-receipt-ticket .receipt-print-ticket {
    display: block !important;
    font-family: 'Courier New', Courier, monospace;
    font-size: 9pt;
    line-height: 1.2;
    letter-spacing: 0;
    width: 72mm;
    color: #000;
    background: #fff;
    padding: 2mm;
    position: absolute;
    top: 0;
    left: 0;
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
    margin: 2mm;
  }
}
</style>
