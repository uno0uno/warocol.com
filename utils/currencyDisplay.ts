/**
 * Display-only money formatting (epic #1598 / batch #1603).
 *
 * Uses tenant `currency_code` when present; defaults to COP so Colombia
 * tenants keep current formatting. This is NOT a multi-currency ledger
 * and does not imply FX or FE/DIAN multi-currency.
 *
 * See docs/engineering/display-currency.md
 */

export const DEFAULT_CURRENCY_CODE = 'COP'
export const DEFAULT_NUMBER_LOCALE = 'es-CO'

/** Normalize ISO 4217-ish display code; invalid/missing → COP. */
export function normalizeCurrencyCode(value?: string | null): string {
  if (value == null || typeof value !== 'string') return DEFAULT_CURRENCY_CODE
  const code = value.trim().toUpperCase()
  if (code.length !== 3 || !/^[A-Z]{3}$/.test(code)) return DEFAULT_CURRENCY_CODE
  return code
}

/**
 * Map tenant locale pref (es|en) or Intl tag to number-format tag.
 * Default es-CO preserves current COP display punctuation.
 */
export function localeToNumberFormatTag(locale?: string | null): string {
  if (locale == null || typeof locale !== 'string' || !locale.trim()) {
    return DEFAULT_NUMBER_LOCALE
  }
  return toNumberLocaleTag(locale)
}

export type FormatMoneyOptions = {
  /** ISO display currency (default COP). */
  currency?: string | null
  /** Tenant locale `es`|`en` or number tag; default es-CO. */
  locale?: string | null
  /** Currency minor units supplied by the authoritative tenant profile. */
  minorUnits?: number | null
  /** Optional compact notation for metric cards; currency still comes from the tenant profile. */
  notation?: 'standard' | 'compact'
}

/** Keep Intl fraction settings bounded even if a partial API response is malformed. */
export function normalizeMinorUnits(value?: number | null, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 3) {
    return fallback
  }
  return value
}

/**
 * Format a money amount for UI display only.
 * null/undefined/non-finite values render as zero in the resolved currency.
 * Does not convert amounts or touch storage/API payloads.
 */
export function formatMoney(
  value: number | null | undefined,
  options?: FormatMoneyOptions,
): string {
  const currency = normalizeCurrencyCode(options?.currency)
  const localeTag = localeToNumberFormatTag(options?.locale)
  const minorUnits = normalizeMinorUnits(options?.minorUnits, 0)
  const numericValue = value === null || value === undefined || !Number.isFinite(value) ? 0 : value

  return new Intl.NumberFormat(localeTag, {
    style: 'currency',
    currency,
    notation: options?.notation ?? 'standard',
    compactDisplay: 'short',
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  }).format(numericValue)
}
import { toNumberLocaleTag } from './appLocales.ts'
