import { DEFAULT_APP_LOCALE, toNumberLocaleTag, type AppLocaleCode } from './appLocales.ts'

/** Product locale for quantity display punctuation (aligned with parseLocaleDecimal). */
export type DomainUiLocale = AppLocaleCode

export function formatDomainQuantity(
  value: number | string | null | undefined,
  maxFractionDigits = 4,
  locale: DomainUiLocale = DEFAULT_APP_LOCALE,
): string {
  if (value === null || value === undefined || value === '') return '-'

  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return '-'

  const normalized = Object.is(numericValue, -0) ? 0 : numericValue

  return new Intl.NumberFormat(toNumberLocaleTag(locale), {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(normalized)
}

export function normalizeDomainNumber(
  value: number | string | null | undefined,
  maxFractionDigits = 4,
): number {
  if (value === null || value === undefined || value === '') return 0

  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numericValue)) return 0

  const factor = 10 ** maxFractionDigits
  const rounded = Math.round((numericValue + Number.EPSILON) * factor) / factor
  return Object.is(rounded, -0) ? 0 : rounded
}
