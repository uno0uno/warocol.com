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

/**
 * Primary display currency per catalog country (first pair in API COUNTRY_CURRENCY_PAIRS).
 * LATAM / unknown → COP at the caller.
 */
export const PRIMARY_CURRENCY_BY_COUNTRY: Record<string, string> = {
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  AU: 'AUD',
  NZ: 'NZD',
  BR: 'BRL',
  DE: 'EUR',
  FR: 'EUR',
  NL: 'EUR',
  SG: 'SGD',
  AE: 'AED',
  IN: 'INR',
  CN: 'CNY',
  MX: 'MXN',
  ES: 'EUR',
  CO: 'COP',
  CR: 'CRC',
  UY: 'UYU',
  CL: 'CLP',
  PE: 'PEN',
  AR: 'ARS',
  DO: 'DOP',
  PA: 'USD',
}

export function currencyFromCountry(countryCode?: string | null): string {
  const code = String(countryCode || '').trim().toUpperCase()
  return PRIMARY_CURRENCY_BY_COUNTRY[code] || 'COP'
}
