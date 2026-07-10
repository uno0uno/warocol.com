/** Decimal precision used by {@link DecimalInput} and purchase forms. */
export type DecimalPrecision = number

/** OCR receipt fields: qty vs COP amounts interpret separators differently. */
export type ReceiptNumberKind = 'quantity' | 'amount'

/** Tenant/UI language codes that drive number punctuation (epic #1598 B3). */
export type UiLocale = 'es' | 'en'

export const DEFAULT_UI_LOCALE: UiLocale = 'es'

/** Map product locale → Intl number tag (es → es-CO, en → en-US). */
export function toNumberLocaleTag(locale: UiLocale = DEFAULT_UI_LOCALE): string {
  return locale === 'en' ? 'en-US' : 'es-CO'
}

/** Normalize free-form locale strings to es|en. Missing/junk → es. */
export function normalizeUiLocale(value: unknown): UiLocale {
  if (value === null || value === undefined) return DEFAULT_UI_LOCALE
  const raw = String(value).trim().toLowerCase().replace(/_/g, '-')
  if (!raw) return DEFAULT_UI_LOCALE
  if (raw === 'en' || raw.startsWith('en-')) return 'en'
  if (raw === 'es' || raw.startsWith('es-')) return 'es'
  return DEFAULT_UI_LOCALE
}

function stripCurrencyNoise(value: string): string {
  return value.replace(/[$\s\u00A0]/g, '')
}

/** Heuristic parse (no locale): supports mixed es-CO / en-US when both separators present. */
function parseLocaleDecimalHeuristic(normalized: string): number | null {
  let work = normalized
  const hasComma = work.includes(',')
  const hasDot = work.includes('.')

  if (hasComma && hasDot) {
    const lastComma = work.lastIndexOf(',')
    const lastDot = work.lastIndexOf('.')
    if (lastComma > lastDot) {
      // es-CO thousands with dot, decimal comma: 1.234,56
      work = work.replace(/\./g, '').replace(',', '.')
    } else {
      // en-US thousands with comma: 1,234.56
      work = work.replace(/,/g, '')
    }
  } else if (hasComma) {
    // Single comma → decimal (legacy): "2,000" → 2
    work = work.replace(',', '.')
  }

  const parsed = Number(work)
  return Number.isFinite(parsed) ? parsed : null
}

function parseLocaleDecimalEs(normalized: string): number | null {
  let work = normalized
  const hasComma = work.includes(',')
  const hasDot = work.includes('.')

  if (hasComma && hasDot) {
    const lastComma = work.lastIndexOf(',')
    const lastDot = work.lastIndexOf('.')
    if (lastComma > lastDot) {
      work = work.replace(/\./g, '').replace(/,/g, '.')
    } else {
      work = work.replace(/,/g, '')
    }
  } else if (hasComma) {
    // es: comma is decimal separator (1,50 → 1.5; 2,000 → 2.000 legacy decimal)
    work = work.replace(/\./g, '').replace(',', '.')
  }
  // only-dot: treat as decimal quantity (1.345 → 1.345). Integer COP uses parseIntegerMoney.

  const parsed = Number(work)
  return Number.isFinite(parsed) ? parsed : null
}

function parseLocaleDecimalEn(normalized: string): number | null {
  let work = normalized
  const hasComma = work.includes(',')
  const hasDot = work.includes('.')

  if (hasComma && hasDot) {
    const lastComma = work.lastIndexOf(',')
    const lastDot = work.lastIndexOf('.')
    if (lastDot > lastComma) {
      work = work.replace(/,/g, '')
    } else {
      work = work.replace(/\./g, '').replace(/,/g, '.')
    }
  } else if (hasComma) {
    // en: comma is thousands (1,234 → 1234). Lone European-style 1,50 → still decimal for resilience.
    if (/^\d{1,3}(,\d{3})+$/.test(work)) {
      work = work.replace(/,/g, '')
    } else if (/^\d+,\d{1,2}$/.test(work)) {
      work = work.replace(',', '.')
    } else {
      work = work.replace(/,/g, '')
    }
  }
  // only-dot: standard en decimal (1.50 → 1.5; 12.345 → 12.345)

  const parsed = Number(work)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Parse a locale-formatted decimal.
 * Returns `null` for empty or invalid input.
 *
 * When `locale` is omitted, uses a mixed es/en heuristic (legacy callers).
 * When `locale` is `es`|`en`, separators follow that locale explicitly.
 *
 * Examples (es): `"1,50"` → 1.5, `"1.234,56"` → 1234.56
 * Examples (en): `"1.50"` → 1.5, `"1,234.56"` → 1234.56
 */
export function parseLocaleDecimal(
  value: string | number | null | undefined,
  locale?: UiLocale | null,
): number | null {
  if (value === null || value === undefined) return null

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  const trimmed = String(value).trim()
  if (!trimmed) return null

  const normalized = stripCurrencyNoise(trimmed)
  if (!normalized) return null

  const resolved = locale == null ? null : normalizeUiLocale(locale)
  if (resolved === 'es') return parseLocaleDecimalEs(normalized)
  if (resolved === 'en') return parseLocaleDecimalEn(normalized)
  return parseLocaleDecimalHeuristic(normalized)
}

/**
 * Format a number for display with locale punctuation.
 * Defaults preserve es-CO separators.
 *
 * Editable inputs should pass `useGrouping: false` so format→parse round-trips
 * safely under es (grouped `"5.000"` is ambiguous with decimal-only-dot parse).
 */
export function formatLocaleNumber(
  value: number | null | undefined,
  locale: UiLocale = DEFAULT_UI_LOCALE,
  options?: {
    minimumFractionDigits?: number
    maximumFractionDigits?: number
    /** Default true for read-only display; false for editable inputs. */
    useGrouping?: boolean
  },
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  const normalized = Object.is(value, -0) ? 0 : value
  return new Intl.NumberFormat(toNumberLocaleTag(locale), {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 20,
    useGrouping: options?.useGrouping ?? true,
  }).format(normalized)
}

/**
 * Integer money (COP pesos UI): parse typed cash/tip with locale thousands.
 * Strips non-digits after removing the locale thousands separator.
 */
export function parseIntegerMoney(
  value: string | number | null | undefined,
  locale: UiLocale = DEFAULT_UI_LOCALE,
): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(Math.abs(value)) : 0
  }

  let work = stripCurrencyNoise(String(value).trim())
  if (!work) return 0

  const resolved = normalizeUiLocale(locale)
  if (resolved === 'en') {
    work = work.replace(/,/g, '')
  } else {
    work = work.replace(/\./g, '')
  }
  work = work.replace(/\D/g, '')
  if (!work) return 0

  const parsed = Number(work)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Format integer money with locale thousands (empty when 0). */
export function formatIntegerMoney(
  value: number | null | undefined,
  locale: UiLocale = DEFAULT_UI_LOCALE,
): string {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return ''
  return new Intl.NumberFormat(toNumberLocaleTag(locale), {
    maximumFractionDigits: 0,
  }).format(Math.round(value))
}

/**
 * Parse numbers from Colombian POS receipt OCR (Gemini JSON).
 * Amounts often use thousands (`2.000`, `2,000`, `8.900`); qty may be decimal (`1.345`).
 * Intentionally CO-oriented (not driven by tenant UI locale) — see epic #1598 B3.
 */
export function parseReceiptDecimal(
  value: string | number | null | undefined,
  kind: ReceiptNumberKind = 'amount',
): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null

  const trimmed = String(value).trim()
  if (!trimmed) return null

  const normalized = stripCurrencyNoise(trimmed)
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
