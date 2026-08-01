/**
 * Fixed-width receipt lines for 58mm thermal (#1979 / #1981).
 * Avoids flex/span mash; preserves modifier indent; never truncates money with "...".
 */

export const RECEIPT_THERMAL_COLS = 32
export const RECEIPT_MODIFIER_INDENT = '  '

/**
 * Compact `$ COP 45.000,00` → `$45.000,00` so qty×unit + total fit 32 cols.
 */
export function compactThermalMoneyLabel(label: string): string {
  return String(label ?? '')
    .replace(/^\$\s*COP\s+/i, '$')
    .replace(/^\$\s+/, '$')
    .trim()
}

/**
 * One label/amount row padded to `cols`.
 * Preserves leading indent on `left`. If both sides do not fit, stacks
 * (label line + right-aligned amount) — never truncates with "...".
 */
export function padReceiptLine(
  left: string,
  right: string,
  cols: number = RECEIPT_THERMAL_COLS,
): string {
  const rawLeft = String(left ?? '')
  const indentMatch = rawLeft.match(/^(\s*)([\s\S]*)$/)
  const indent = indentMatch?.[1] ?? ''
  const l = (indentMatch?.[2] ?? '').replace(/\s+$/g, '')
  const r = String(right ?? '').trim()

  if (!r) {
    const full = indent + l
    return full.length <= cols ? full : full.slice(0, cols)
  }
  if (!l) {
    return r.length <= cols ? r.padStart(cols) : r.slice(-cols)
  }

  const gap = 1
  const availableForLeft = cols - r.length - gap - indent.length
  if (availableForLeft < 1 || indent.length + l.length + gap + r.length > cols) {
    const nameLine = indent + l
    const amountLine = r.length <= cols ? r.padStart(cols) : r.slice(-cols)
    return `${nameLine}\n${amountLine}`
  }

  const spaces = cols - indent.length - l.length - r.length
  return indent + l + ' '.repeat(Math.max(gap, spaces)) + r
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
      // Keep leading spaces (modifier indent); only trim trailing on the block.
      const trimmed = raw.replace(/\s+$/g, '')
      if (trimmed) lines.push(trimmed)
      return
    }
    const t = raw.replace(/\s+/g, ' ').trim()
    if (t) lines.push(t)
  }

  const walk = (el: Element) => {
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
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}

/** Product name on its own line; qty x unit … total padded (compact money). */
export function formatReceiptProductBlock(opts: {
  name: string
  quantity: number | string
  unitPriceLabel: string
  lineTotalLabel: string
  cols?: number
}): string {
  const cols = opts.cols ?? RECEIPT_THERMAL_COLS
  const name = String(opts.name ?? '').trim() || 'Item'
  const unit = compactThermalMoneyLabel(opts.unitPriceLabel)
  const total = compactThermalMoneyLabel(opts.lineTotalLabel)
  const left = `${opts.quantity} x ${unit}`
  return `${name}\n${padReceiptLine(left, total, cols)}`
}

/** Modifier indented under parent; compact money; no truncation. */
export function formatReceiptModifierBlock(opts: {
  description: string
  quantity: number | string
  unitPriceLabel: string
  lineTotalLabel: string
  cols?: number
  indent?: string
}): string {
  const cols = opts.cols ?? RECEIPT_THERMAL_COLS
  const indent = opts.indent ?? RECEIPT_MODIFIER_INDENT
  let desc = String(opts.description ?? '').trim()
  if (desc.startsWith('+')) desc = `+ ${desc.slice(1).trim()}`
  else if (desc) desc = `+ ${desc}`
  const unit = compactThermalMoneyLabel(opts.unitPriceLabel)
  const total = compactThermalMoneyLabel(opts.lineTotalLabel)
  const qty = Number(opts.quantity) || 1
  const left = qty > 1 ? `${qty} x ${unit}` : unit
  return `${indent}${desc}\n${padReceiptLine(`${indent}${left}`, total, cols)}`
}
