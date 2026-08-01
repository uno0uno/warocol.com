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

/**
 * Read printable text from a hidden ticket root (`display:none`).
 * Prefer this over `innerText` (empty when hidden) or `outerHTML`→plain
 * (collapses padReceiptLine spaces via ticketHtmlToPlainText).
 */
export function collectThermalTicketText(root: Element | null | undefined): string {
  if (!root) return ''
  const lines: string[] = []

  const push = (raw: string, preserveInternalNewlines: boolean) => {
    if (preserveInternalNewlines) {
      const trimmed = raw.replace(/\s+$/g, '').replace(/^\s+/g, '')
      if (trimmed) lines.push(trimmed)
      return
    }
    const t = raw.replace(/\s+/g, ' ').trim()
    if (t) lines.push(t)
  }

  const walk = (el: Element) => {
    // Skip logos (raster handled separately by ESC/POS). Guard for non-DOM test envs.
    const tag = (el as { tagName?: string }).tagName
    if (tag && tag.toLowerCase() === 'img') return
    if (typeof HTMLImageElement !== 'undefined' && el instanceof HTMLImageElement) return
    const cls = el.classList
    if (
      cls.contains('receipt-plain-pre')
      || cls.contains('receipt-plain-line')
      || cls.contains('comanda-ticket-pre')
      || cls.contains('receipt-divider')
    ) {
      push(el.textContent || '', true)
      return
    }
    if (
      cls.contains('receipt-row')
      || cls.contains('receipt-footer')
      || cls.contains('receipt-header')
      || cls.contains('receipt-document-title')
      || cls.contains('receipt-cufe')
    ) {
      push(el.textContent || '', false)
      return
    }
    for (const child of Array.from(el.children)) walk(child)
  }

  walk(root)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
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
