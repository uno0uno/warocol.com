import {
  normalizeEnabledAppLocale,
  type AppLocaleCode,
} from './appLocales.ts'

/** Spanish-speaking markets in the registration catalog (epic #2100 v1). */
export const ES_LATAM_COUNTRY_CODES = new Set([
  'CO',
  'MX',
  'CR',
  'UY',
  'CL',
  'PE',
  'AR',
  'DO',
  'PA',
  'ES',
])

/**
 * Default UI locale for a business country.
 * Align with api_warocol.com/app/core/country_locale.py.
 */
export function localeFromCountry(countryCode?: string | null): AppLocaleCode {
  const code = String(countryCode || '').trim().toUpperCase()
  if (code === 'US') return 'en'
  if (code === 'BR') return 'pt'
  if (ES_LATAM_COUNTRY_CODES.has(code)) return 'es'
  return 'es'
}

/**
 * Suggest a business country when the draft country is empty.
 * User override always wins; only en/es/pt map to US/CO/BR.
 */
export function suggestCountryFromLocale(locale?: string | null): string | null {
  const code = normalizeEnabledAppLocale(locale)
  if (code === 'en') return 'US'
  if (code === 'es') return 'CO'
  if (code === 'pt') return 'BR'
  return null
}
