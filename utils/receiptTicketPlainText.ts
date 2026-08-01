/**
 * Fixed-width receipt lines for 58mm thermal (#1979).
 * Avoids flex/span mash (DescripcionTotal, Subtotal$COP) on PrintBridge/Windows.
 */

export const RECEIPT_THERMAL_COLS = 32

/** One label/amount row padded to `cols` (spaces between). */
export function padReceiptLine(
  left: string,
  right: string,
  cols: number = RECEIPT_THERMAL_COLS,
): string {
  const l = String(left ?? '').trim()
  const r = String(right ?? '').trim()
  if (!r) return l.length <= cols ? l : l.slice(0, cols)
  if (!l) {
    return r.length <= cols ? r.padStart(cols) : r.slice(-cols)
  }
  const gap = 1
  const maxLeft = cols - r.length - gap
  if (maxLeft < 4) {
    // Amount needs the row; put label above
    return `${l.length <= cols ? l : l.slice(0, cols)}\n${r.length <= cols ? r.padStart(cols) : r.slice(-cols)}`
  }
  const leftPart = l.length > maxLeft ? `${l.slice(0, Math.max(1, maxLeft - 3))}...` : l
  const spaces = cols - leftPart.length - r.length
  return leftPart + ' '.repeat(Math.max(gap, spaces)) + r
}

export function receiptDivider(cols: number = RECEIPT_THERMAL_COLS, char = '-'): string {
  return char.repeat(cols)
}

/** Product name on its own line; qty x unit … total padded. */
export function formatReceiptProductBlock(opts: {
  name: string
  quantity: number | string
  unitPriceLabel: string
  lineTotalLabel: string
  cols?: number
}): string {
  const cols = opts.cols ?? RECEIPT_THERMAL_COLS
  const name = String(opts.name ?? '').trim() || 'Item'
  const qty = opts.quantity
  const left = `${qty} x ${opts.unitPriceLabel}`
  return `${name}\n${padReceiptLine(left, opts.lineTotalLabel, cols)}`
}

/** Modifier indented; qty x unit … total. */
export function formatReceiptModifierBlock(opts: {
  description: string
  quantity: number | string
  unitPriceLabel: string
  lineTotalLabel: string
  cols?: number
}): string {
  const cols = opts.cols ?? RECEIPT_THERMAL_COLS
  const desc = String(opts.description ?? '').trim()
  const qty = Number(opts.quantity) || 1
  const left = qty > 1 ? `${qty} x ${opts.unitPriceLabel}` : opts.unitPriceLabel
  return `${desc}\n${padReceiptLine(`  ${left}`, opts.lineTotalLabel, cols)}`
}
