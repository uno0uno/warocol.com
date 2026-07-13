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
}

/**
 * Format a money amount for UI display only.
 * null/undefined → `$0` (legacy useFormatters contract).
 * Does not convert amounts or touch storage/API payloads.
 */
export function formatMoney(
  value: number | null | undefined,
  options?: FormatMoneyOptions,
): string {
  if (value === null || value === undefined) return '$0'
  if (!Number.isFinite(value)) return '$0'

  const currency = normalizeCurrencyCode(options?.currency)
  const localeTag = localeToNumberFormatTag(options?.locale)

  return new Intl.NumberFormat(localeTag, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(value)
}
import { toNumberLocaleTag } from './appLocales.ts'
