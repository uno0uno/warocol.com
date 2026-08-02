/**
 * Fixed-width receipt lines for 58mm thermal (#1979 / #1981).
 * Avoids flex/span mash; preserves modifier indent; never truncates money with "...".
 */

export const RECEIPT_THERMAL_COLS = 32
export const RECEIPT_MODIFIER_INDENT = '  '

/** Join non-empty receipt fragments with a compact separator (thermal chrome). */
export function joinReceiptParts(
  parts: Array<string | null | undefined>,
  sep = ' · ',
): string {
  return parts
    .map(part => String(part ?? '').trim())
    .filter(Boolean)
    .join(sep)
}

/** Light separator between product blocks (not the section dash). */
export function receiptItemSeparator(cols: number = RECEIPT_THERMAL_COLS): string {
  return '·'.repeat(Math.max(8, Math.min(cols, 32)))
}

/**
 * Subtle separator between major receipt sections (header / meta / products / totals).
 * Spaced dots — quieter than full dashes, visible in thermal text (#2056).
 */
export function receiptSectionSeparator(cols: number = RECEIPT_THERMAL_COLS): string {
  const n = Math.max(4, Math.floor(Math.min(cols, 32) / 2))
  return Array.from({ length: n }, () => '·').join(' ')
}

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

/**
 * Compact per-line tax declaration for thermal / window.print.
 * Amount line when taxed; bare label for exempt / label-only.
 * Always `{label} · {amount}` — never “Incluye …” wording.
 *
 * Prefer passing `text` from `t('pos.cartItem.taxLine', { label, amount })`.
 * Do not pass broken i18n templates (empty placeholders).
 */
export function formatReceiptTaxCue(opts: {
  label?: string | null
  amountLabel?: string | null
  /** @deprecated Ignored — included-in-price no longer changes copy. */
  includedInPrice?: boolean | null
  /** Pre-localized full cue (preferred). */
  text?: string | null
  /** @deprecated Ignored — use `template` / taxLine only. */
  includedTemplate?: string
  exclusiveTemplate?: string
  template?: string
}): string | null {
  const preformatted = String(opts.text ?? '').trim()
  if (preformatted) return preformatted

  const label = String(opts.label ?? '').trim()
  if (!label) return null
  const amount = compactThermalMoneyLabel(String(opts.amountLabel ?? '').trim())
  if (!amount) return label

  let template = opts.template || opts.exclusiveTemplate || '{label} · {amount}'
  if (!template.includes('{label}') || !template.includes('{amount}')) {
    template = '{label} · {amount}'
  }
  return template.replaceAll('{label}', label).replaceAll('{amount}', amount)
}

/** Indent product tax cue like adicionales (`  + …`). */
export function formatReceiptProductTaxCueLine(
  cue: string,
  indent: string = RECEIPT_MODIFIER_INDENT,
): string {
  let text = String(cue ?? '').trim()
  if (!text) return ''
  if (text.startsWith('+')) text = text.slice(1).trim()
  return `${indent}+ ${text}`
}

/** Product name on its own line; qty x unit … total padded (compact money). */
export function formatReceiptProductBlock(opts: {
  name: string
  quantity: number | string
  unitPriceLabel: string
  lineTotalLabel: string
  taxCue?: string | null
  cols?: number
  /** Prefix product name with a bullet (not a number). */
  bullet?: boolean | null
}): string {
  const cols = opts.cols ?? RECEIPT_THERMAL_COLS
  const nameRaw = String(opts.name ?? '').trim() || 'Item'
  const name = opts.bullet ? `• ${nameRaw}` : nameRaw
  const unit = compactThermalMoneyLabel(opts.unitPriceLabel)
  const total = compactThermalMoneyLabel(opts.lineTotalLabel)
  const left = `${opts.quantity} x ${unit}`
  const body = `${name}\n${padReceiptLine(left, total, cols)}`
  const cue = String(opts.taxCue ?? '').trim()
  return cue ? `${body}\n${formatReceiptProductTaxCueLine(cue)}` : body
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

/**
 * Tax / tributary breakdown line — same indent + bullet as adicionales
 * so Detalle de impuestos / Detalle tributario matches prefatura/factura modifiers.
 */
export function formatReceiptTaxBulletLine(opts: {
  label: string
  amountLabel: string
  cols?: number
  indent?: string
}): string {
  const cols = opts.cols ?? RECEIPT_THERMAL_COLS
  const indent = opts.indent ?? RECEIPT_MODIFIER_INDENT
  let label = String(opts.label ?? '').trim()
  if (label.startsWith('+')) label = label.slice(1).trim()
  const left = label ? `${indent}+ ${label}` : indent
  const right = compactThermalMoneyLabel(opts.amountLabel)
  return padReceiptLine(left, right, cols)
}
