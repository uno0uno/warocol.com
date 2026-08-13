/**
 * Public calling codes for catalog countries.
 * Keep aligned with api_warocol.com/app/core/tenant_prefs.py COUNTRY_CALLING_CODES.
 */
export const COUNTRY_CALLING_CODES: Record<string, number> = {
  US: 1,
  CA: 1,
  GB: 44,
  AU: 61,
  NZ: 64,
  BR: 55,
  DE: 49,
  FR: 33,
  NL: 31,
  SG: 65,
  AE: 971,
  IN: 91,
  CN: 86,
  MX: 52,
  ES: 34,
  CO: 57,
  CR: 506,
  UY: 598,
  CL: 56,
  PE: 51,
  AR: 54,
  DO: 1,
  PA: 507,
}

export function callingCodeForCountry(countryCode?: string | null): number | null {
  const code = String(countryCode || '').trim().toUpperCase()
  const calling = COUNTRY_CALLING_CODES[code]
  return typeof calling === 'number' ? calling : null
}

/** Hint only — never a saved value. Empty when the country is unknown. */
export function phonePlaceholderForCountry(countryCode?: string | null): string {
  const calling = callingCodeForCountry(countryCode)
  if (calling == null) return ''
  return `+${calling} 000 000 0000`
}
