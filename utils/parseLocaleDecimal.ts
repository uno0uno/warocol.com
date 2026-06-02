/** Decimal precision used by {@link DecimalInput} and purchase forms. */
export type DecimalPrecision = 1 | 2 | 3

/** OCR receipt fields: qty vs COP amounts interpret separators differently. */
export type ReceiptNumberKind = 'quantity' | 'amount'

/**
 * Parse a locale-formatted decimal (es-CO comma or dot separators).
 * Returns `null` for empty or invalid input.
 *
 * Examples: `"1,50"` → 1.5, `"1.234,56"` → 1234.56, `"12.345"` → 12.345
 */
export function parseLocaleDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const trimmed = String(value).trim()
  if (!trimmed) return null

  let normalized = trimmed.replace(/[$\s\u00A0]/g, '')

  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')

  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(',')
    const lastDot = normalized.lastIndexOf('.')
    if (lastComma > lastDot) {
      // es-CO thousands with dot, decimal comma: 1.234,56
      normalized = normalized.replace(/\./g, '').replace(',', '.')
    } else {
      // en-US thousands with comma: 1,234.56
      normalized = normalized.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = normalized.replace(',', '.')
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Parse numbers from Colombian POS receipt OCR (Gemini JSON).
 * Amounts often use thousands (`2.000`, `2,000`, `8.900`); qty may be decimal (`1.345`).
 */
export function parseReceiptDecimal(
  value: string | number | null | undefined,
  kind: ReceiptNumberKind = 'amount',
): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const trimmed = String(value).trim()
  if (!trimmed) return null

  const normalized = trimmed.replace(/[$\s\u00A0]/g, '')
  if (!normalized || !/^[\d.,]+$/.test(normalized)) return null

  const hasComma = normalized.includes(',')
  const hasDot = normalized.includes('.')

  if (hasComma && hasDot) {
    return parseLocaleDecimal(normalized)
  }

  if (hasComma) {
    const thousandsComma = /^\d{1,3}(,\d{3})+$/.test(normalized)
    const commaGroups = (normalized.match(/,/g) || []).length
    if (thousandsComma && kind === 'amount') {
      return Number(normalized.replace(/,/g, ''))
    }
    if (thousandsComma && kind === 'quantity' && commaGroups > 1) {
      return Number(normalized.replace(/,/g, ''))
    }
    if (kind === 'quantity') {
      return Number(normalized.replace(',', '.'))
    }
    if (/^\d+,\d{1,2}$/.test(normalized)) {
      return Number(normalized.replace(',', '.'))
    }
    if (/^\d+,\d{3}$/.test(normalized)) {
      return Number(normalized.replace(/,/g, ''))
    }
    return Number(normalized.replace(',', '.'))
  }

  if (hasDot) {
    if (kind === 'amount' && /^\d{1,3}(\.\d{3})+$/.test(normalized)) {
      return Number(normalized.replace(/\./g, ''))
    }
    return Number(normalized)
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

/** Round to fixed decimal places (matches DB / field precision). */
export function roundToPrecision(value: number, precision: DecimalPrecision): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}
