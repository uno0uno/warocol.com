type ReceiptModifier = {
  name: string
  quantity?: number | string | null
  price?: number | string | null
  total?: number | string | null
}

export type EscposReceiptItem = {
  name: string
  quantity: number | string
  unitPrice: number
  total: number
  modifiers?: ReceiptModifier[]
}

export type EscposReceiptPayment = {
  label: string
  amount: number
  change?: number | null
}

export type EscposReceiptInvoice = {
  prefix?: string | null
  invoice_number?: string | number | null
  cufe?: string | null
}

export type EscposReceiptInput = {
  businessName?: string | null
  nit?: string | null
  address?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  documentLabel: string
  orderNumber?: string | number | null
  soldAt?: string | null
  locationLabel?: string | null
  waiterName?: string | null
  customerName?: string | null
  customerFiscalLabel?: string | null
  items: EscposReceiptItem[]
  subtotal?: number
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
  payments?: EscposReceiptPayment[]
  singlePaymentLabel?: string | null
  invoice?: EscposReceiptInvoice | null
}

const ESC = '\x1B'
const GS = '\x1D'
const WIDTH = 42

const cmd = {
  init: `${ESC}@`,
  alignLeft: `${ESC}a\x00`,
  alignCenter: `${ESC}a\x01`,
  boldOn: `${ESC}E\x01`,
  boldOff: `${ESC}E\x00`,
  doubleOn: `${GS}!\x11`,
  doubleOff: `${GS}!\x00`,
  feed: '\n\n\n',
  cut: `${GS}VA\x00`,
}

function text(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, '')
    .trim()
}

function money(value: number | string | null | undefined): string {
  const n = Number(value) || 0
  return `$ ${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(n)}`
}

function center(value: string): string {
  const clean = text(value)
  if (clean.length >= WIDTH) return clean
  return `${' '.repeat(Math.floor((WIDTH - clean.length) / 2))}${clean}`
}

function wrap(value: string, width: number): string[] {
  const clean = text(value)
  if (!clean) return []
  const words = clean.split(/\s+/)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (word.length > width) {
      if (current) lines.push(current)
      for (let i = 0; i < word.length; i += width) lines.push(word.slice(i, i + width))
      current = ''
      continue
    }
    const next = current ? `${current} ${word}` : word
    if (next.length > width) {
      if (current) lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function pair(label: string, value: string): string {
  const left = text(label)
  const right = text(value)
  const space = Math.max(1, WIDTH - left.length - right.length)
  return `${left}${' '.repeat(space)}${right}`
}

function itemLine(desc: string, qty: string, price: string, total: string): string[] {
  const qtyWidth = 4
  const priceWidth = 10
  const totalWidth = 10
  const descWidth = WIDTH - qtyWidth - priceWidth - totalWidth - 3
  const lines = wrap(desc, descWidth)
  if (lines.length === 0) lines.push('')
  const first = `${lines[0].padEnd(descWidth)} ${qty.padStart(qtyWidth)} ${price.padStart(priceWidth)} ${total.padStart(totalWidth)}`
  return [first, ...lines.slice(1).map(line => line.padEnd(descWidth))]
}

function qr(data: string): string {
  const payload = text(data)
  if (!payload || payload.length > 700) return ''
  const storeLen = payload.length + 3
  const pL = String.fromCharCode(storeLen % 256)
  const pH = String.fromCharCode(Math.floor(storeLen / 256))
  return [
    `${GS}(k\x04\x001A2\x00`,
    `${GS}(k\x03\x001C\x06`,
    `${GS}(k\x03\x001E0`,
    `${GS}(k${pL}${pH}1P0${payload}`,
    `${GS}(k\x03\x001Q0`,
  ].join('')
}

export function buildReceiptEscpos(receipt: EscposReceiptInput): string {
  const lines: string[] = []
  lines.push(cmd.init)
  lines.push(cmd.alignCenter)
  if (receipt.businessName) lines.push(cmd.boldOn + center(receipt.businessName) + cmd.boldOff)
  if (receipt.nit) lines.push(center(`NIT: ${receipt.nit}`))
  if (receipt.address || receipt.city) lines.push(center([receipt.address, receipt.city].filter(Boolean).join(', ')))
  if (receipt.phone) lines.push(center(`Tel: ${receipt.phone}`))
  if (receipt.email) lines.push(center(receipt.email))
  lines.push('='.repeat(WIDTH))
  lines.push(cmd.boldOn + center(`${receipt.documentLabel}${receipt.orderNumber ? ` #${receipt.orderNumber}` : ''}`) + cmd.boldOff)
  if (receipt.soldAt) lines.push(center(receipt.soldAt))
  if (receipt.locationLabel) lines.push(center(receipt.locationLabel))
  if (receipt.waiterName) lines.push(center(`Mesero: ${receipt.waiterName}`))
  if (receipt.customerName) {
    lines.push('-'.repeat(WIDTH))
    lines.push(cmd.boldOn + center('Datos cliente') + cmd.boldOff)
    lines.push(center(receipt.customerName))
    if (receipt.customerFiscalLabel) lines.push(center(receipt.customerFiscalLabel))
  }
  lines.push('-'.repeat(WIDTH))
  lines.push(cmd.alignLeft)
  lines.push(cmd.boldOn + itemLine('Descripcion', 'Cant', 'Precio', 'Total')[0] + cmd.boldOff)
  lines.push('-'.repeat(WIDTH))
  for (const item of receipt.items) {
    lines.push(...itemLine(item.name, String(item.quantity), money(item.unitPrice), money(item.total)))
    for (const mod of item.modifiers ?? []) {
      const qty = Number(mod.quantity) || 1
      const total = Number(mod.total) || (Number(mod.price) || 0) * qty
      lines.push(...itemLine(`+ ${mod.name}`, qty > 1 ? String(qty) : '', money(mod.price), money(total)))
    }
  }
  lines.push('-'.repeat(WIDTH))
  if ((receipt.discountAmount || 0) > 0 || (receipt.waroDiscountAmount || 0) > 0) {
    lines.push(pair('Subtotal', money(receipt.subtotal ?? receipt.orderTotal)))
  }
  if ((receipt.discountAmount || 0) > 0) lines.push(pair('Descuento', `-${money(receipt.discountAmount)}`))
  if ((receipt.waroDiscountAmount || 0) > 0) lines.push(pair(receipt.waroDiscountLabel || 'Canje WaRo', `-${money(receipt.waroDiscountAmount)}`))
  if ((receipt.standardTax || 0) > 0) lines.push(pair(receipt.standardTaxLabel || 'Impuesto', money(receipt.standardTax)))
  if ((receipt.liquorTax || 0) > 0) lines.push(pair('IVA licores 5%', money(receipt.liquorTax)))
  if ((receipt.tipAmount || 0) > 0 || (receipt.tipTaxAmount || 0) > 0 || (receipt.advanceApplied || 0) > 0) {
    lines.push(pair('Total orden', money(receipt.orderTotal)))
    if ((receipt.tipAmount || 0) > 0) lines.push(pair(receipt.tipLabel || 'Propina', money(receipt.tipAmount)))
    if ((receipt.tipTaxAmount || 0) > 0) lines.push(pair('Impuesto propina', money(receipt.tipTaxAmount)))
    if ((receipt.advanceApplied || 0) > 0) lines.push(pair('Anticipo', `-${money(receipt.advanceApplied)}`))
  }
  lines.push(cmd.boldOn + cmd.doubleOn + pair('TOTAL COBRADO', money(receipt.chargedTotal ?? receipt.orderTotal)) + cmd.doubleOff + cmd.boldOff)
  lines.push('='.repeat(WIDTH))
  lines.push(cmd.alignCenter + cmd.boldOn + 'Detalle de pago' + cmd.boldOff + cmd.alignLeft)
  if (receipt.payments?.length) {
    receipt.payments.forEach((payment, idx) => {
      lines.push(pair(`#${idx + 1} ${payment.label}`, money(payment.amount)))
      if ((payment.change || 0) > 0) lines.push(pair(`Cambio #${idx + 1}`, money(payment.change)))
    })
  } else {
    lines.push(pair(receipt.singlePaymentLabel || 'Pendiente por definir', money(receipt.chargedTotal ?? receipt.orderTotal)))
  }
  lines.push('='.repeat(WIDTH))
  lines.push(cmd.alignCenter + 'Gracias por tu compra')
  if (receipt.invoice) {
    lines.push('='.repeat(WIDTH))
    lines.push(cmd.boldOn + 'FACTURA ELECTRONICA' + cmd.boldOff)
    if (receipt.invoice.prefix || receipt.invoice.invoice_number) {
      lines.push([receipt.invoice.prefix, receipt.invoice.invoice_number].filter(Boolean).join('-'))
    }
    if (receipt.invoice.cufe) {
      const dianUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${receipt.invoice.cufe}`
      lines.push(...wrap(`CUFE: ${receipt.invoice.cufe}`, WIDTH))
      lines.push(qr(dianUrl))
      lines.push('Verificar en DIAN')
    }
  }
  lines.push(cmd.feed)
  lines.push(cmd.cut)
  return `${lines.join('\n')}\n`
}
