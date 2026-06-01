/** Decimal precision used by {@link DecimalInput} and purchase forms. */
export type DecimalPrecision = 1 | 2 | 3

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

/** Round to fixed decimal places (matches DB / field precision). */
export function roundToPrecision(value: number, precision: DecimalPrecision): number {
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}
