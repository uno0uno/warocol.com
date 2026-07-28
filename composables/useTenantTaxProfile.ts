/**
 * Tenant tax profile helpers — warocol.com#1846 / #1847 / #1848 / #1864.
 * Consumes GET /tenant/tax-config tax_lines + category_map (#1845).
 * Server packs (wave-1 #1847, wave-2 #1862/#1863, US/CA #1848) are SoT;
 * COMMERCIAL_TAX_PRESETS are a client fallback / UX mirror.
 */

export type TaxLineDraft = {
  key: string
  label: string
  rate: number
  included_in_price: boolean
  gl_role: string
}

export type TaxCategoryKey = 'standard' | 'liquor' | 'exempt'

export type CommercialTaxPreset = {
  lines: TaxLineDraft[]
  category_map: Record<string, string | null>
}

/** @deprecated Prefer CommercialTaxPreset */
export type Wave1TaxPreset = CommercialTaxPreset

export type TaxJurisdictionOption = {
  code: string
  label: string
  regime: string
  rate: number
  lines: TaxLineDraft[]
  components?: TaxLineDraft[]
}

/** Countries that require state/province jurisdiction for tax rates. */
export const JURISDICTION_COUNTRY_CODES = ['US', 'CA'] as const

/** Epic #1843 wave-1 shortlist — one primary rate + exempt. */
export const WAVE1_TAX_PRESETS: Record<string, CommercialTaxPreset> = {
  PA: {
    lines: [{ key: 'itbms', label: 'ITBMS 7%', rate: 0.07, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'itbms', liquor: 'itbms', exempt: null },
  },
  CL: {
    lines: [{ key: 'iva', label: 'IVA 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'iva', liquor: 'iva', exempt: null },
  },
  DO: {
    lines: [{ key: 'itbis', label: 'ITBIS 18%', rate: 0.18, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'itbis', liquor: 'itbis', exempt: null },
  },
  UY: {
    lines: [{ key: 'iva', label: 'IVA 22%', rate: 0.22, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'iva', liquor: 'iva', exempt: null },
  },
  AU: {
    lines: [{ key: 'gst', label: 'GST 10%', rate: 0.10, included_in_price: true, gl_role: 'iva' }],
    category_map: { standard: 'gst', liquor: 'gst', exempt: null },
  },
  NZ: {
    lines: [{ key: 'gst', label: 'GST 15%', rate: 0.15, included_in_price: true, gl_role: 'iva' }],
    category_map: { standard: 'gst', liquor: 'gst', exempt: null },
  },
  SG: {
    lines: [{ key: 'gst', label: 'GST 9%', rate: 0.09, included_in_price: true, gl_role: 'iva' }],
    category_map: { standard: 'gst', liquor: 'gst', exempt: null },
  },
  AE: {
    lines: [{ key: 'vat', label: 'VAT 5%', rate: 0.05, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'vat', liquor: 'vat', exempt: null },
  },
}

export const WAVE1_COUNTRY_CODES = Object.keys(WAVE1_TAX_PRESETS)

/** Epic #1860 wave-2 — mirror API hospitality_tax_packs WAVE2_* (#1862/#1863). */
export const WAVE2_TAX_PRESETS: Record<string, CommercialTaxPreset> = {
  PE: {
    lines: [{ key: 'igv', label: 'IGV 18%', rate: 0.18, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'igv', liquor: 'igv', exempt: null },
  },
  MX: {
    lines: [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'iva', liquor: 'iva', exempt: null },
  },
  CR: {
    lines: [{ key: 'iva', label: 'IVA 13%', rate: 0.13, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'iva', liquor: 'iva', exempt: null },
  },
  AR: {
    lines: [{ key: 'iva', label: 'IVA 21%', rate: 0.21, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'iva', liquor: 'iva', exempt: null },
  },
  ES: {
    lines: [{ key: 'iva', label: 'IVA 10%', rate: 0.10, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'iva', liquor: 'iva', exempt: null },
  },
  FR: {
    lines: [{ key: 'tva', label: 'TVA 10%', rate: 0.10, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'tva', liquor: 'tva', exempt: null },
  },
  GB: {
    lines: [{ key: 'vat', label: 'VAT 20%', rate: 0.20, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'vat', liquor: 'vat', exempt: null },
  },
  CN: {
    lines: [{ key: 'vat', label: 'VAT 6%', rate: 0.06, included_in_price: false, gl_role: 'iva' }],
    category_map: { standard: 'vat', liquor: 'vat', exempt: null },
  },
  DE: {
    lines: [
      { key: 'mwst_reduced', label: 'MwSt 7%', rate: 0.07, included_in_price: false, gl_role: 'iva' },
      { key: 'mwst_standard', label: 'MwSt 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' },
    ],
    category_map: { standard: 'mwst_reduced', liquor: 'mwst_standard', exempt: null },
  },
  NL: {
    lines: [
      { key: 'btw_reduced', label: 'BTW 9%', rate: 0.09, included_in_price: false, gl_role: 'iva' },
      { key: 'btw_standard', label: 'BTW 21%', rate: 0.21, included_in_price: false, gl_role: 'iva' },
    ],
    category_map: { standard: 'btw_reduced', liquor: 'btw_standard', exempt: null },
  },
}

export const WAVE2_COUNTRY_CODES = Object.keys(WAVE2_TAX_PRESETS)

/** Wave-1 + wave-2 client fallback map (server seed remains SoT). */
export const COMMERCIAL_TAX_PRESETS: Record<string, CommercialTaxPreset> = {
  ...WAVE1_TAX_PRESETS,
  ...WAVE2_TAX_PRESETS,
}

export const COMMERCIAL_COUNTRY_CODES = Object.keys(COMMERCIAL_TAX_PRESETS)

export function countryNeedsJurisdiction(countryCode: string | null | undefined): boolean {
  const code = String(countryCode || '').toUpperCase()
  return (JURISDICTION_COUNTRY_CODES as readonly string[]).includes(code)
}

export function normalizeTaxLines(raw: unknown): TaxLineDraft[] {
  if (!Array.isArray(raw)) return []
  const lines: TaxLineDraft[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const key = String(row.key || '').trim()
    if (!key) continue
    lines.push({
      key,
      label: String(row.label || key),
      rate: Number(row.rate) || 0,
      included_in_price: Boolean(row.included_in_price),
      gl_role: String(row.gl_role || 'iva'),
    })
  }
  return lines
}

export function normalizeCategoryMap(raw: unknown): Record<string, string | null> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const out: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    out[key] = value == null || value === '' ? null : String(value)
  }
  return out
}

export function taxConfigHasTaxes(cfg: Record<string, unknown> | null | undefined): boolean {
  if (!cfg) return false
  if (cfg.inc_applicable || cfg.iva_applicable || cfg.liquor_tax_applicable) return true
  const lines = normalizeTaxLines(cfg.tax_lines)
  if (!lines.length) return false
  // Commercial path: require enable flag when present (missing → true until API #1868 lands).
  if (cfg.commercial_tax_applicable === false) return false
  return lines.some(line => line.rate > 0)
}

export function primaryTaxLine(cfg: Record<string, unknown> | null | undefined): TaxLineDraft | null {
  const lines = normalizeTaxLines(cfg?.tax_lines)
  if (!lines.length) return null
  const map = normalizeCategoryMap(cfg?.category_map)
  const standardKey = map?.standard
  if (standardKey) {
    const match = lines.find(line => line.key === standardKey)
    if (match) return match
  }
  return lines[0] ?? null
}

/** Product tax_category keys to show in Menú (shared POS + venta directa). */
export function taxCategoryOptions(cfg: Record<string, unknown> | null | undefined): TaxCategoryKey[] {
  if (!taxConfigHasTaxes(cfg)) return []
  const map = normalizeCategoryMap(cfg?.category_map)
  if (map) {
    const opts: TaxCategoryKey[] = []
    if ('standard' in map) opts.push('standard')
    if ('liquor' in map && map.liquor) opts.push('liquor')
    if ('exempt' in map || opts.length) opts.push('exempt')
    return [...new Set(opts)]
  }
  return ['standard', 'liquor', 'exempt']
}

export function wave1PresetForCountry(countryCode: string): CommercialTaxPreset | null {
  const code = String(countryCode || '').toUpperCase()
  return WAVE1_TAX_PRESETS[code] ?? null
}

export function commercialPresetForCountry(countryCode: string): CommercialTaxPreset | null {
  const code = String(countryCode || '').toUpperCase()
  return COMMERCIAL_TAX_PRESETS[code] ?? null
}

/**
 * Build tax_lines + category_map for Facturación commercial save.
 * Upserts the edited primary line; preserves DE/NL sibling lines + liquor map.
 */
export function buildCommercialTaxSavePayload(options: {
  primary: TaxLineDraft
  existingCfg?: Record<string, unknown> | null
  countryCode?: string | null
}): { tax_lines: TaxLineDraft[]; category_map: Record<string, string | null> } {
  const primaryKey = options.primary.key || 'standard'
  const primaryLine: TaxLineDraft = {
    key: primaryKey,
    label: options.primary.label,
    rate: options.primary.rate,
    included_in_price: options.primary.included_in_price,
    gl_role: options.primary.gl_role || 'iva',
  }

  const existingLines = normalizeTaxLines(options.existingCfg?.tax_lines)
  const existingMap = normalizeCategoryMap(options.existingCfg?.category_map)
  const preset = commercialPresetForCountry(options.countryCode || '')
  const isMultiRate = existingLines.length > 1
    || Boolean(existingMap?.liquor && existingMap.liquor !== existingMap.standard)
    || Boolean(preset && preset.lines.length > 1)

  if (!isMultiRate) {
    return {
      tax_lines: [primaryLine],
      category_map: {
        standard: primaryKey,
        liquor: primaryKey,
        exempt: null,
      },
    }
  }

  const baseLines = existingLines.length > 1 ? existingLines : (preset?.lines ?? [primaryLine])
  let found = false
  const tax_lines = baseLines.map((line) => {
    if (line.key === primaryKey) {
      found = true
      return { ...primaryLine }
    }
    return { ...line }
  })
  if (!found) tax_lines.unshift(primaryLine)

  return {
    tax_lines,
    category_map: {
      standard: existingMap?.standard || preset?.category_map.standard || primaryKey,
      liquor: existingMap?.liquor || preset?.category_map.liquor || primaryKey,
      exempt: existingMap?.exempt ?? preset?.category_map.exempt ?? null,
    },
  }
}

/** Hide Facturación commercial country dropdown when profile country is already known. */
export function shouldShowWave1CountryPicker(options: {
  isCommercial: boolean
  profileCountryCode?: string | null
}): boolean {
  if (!options.isCommercial) return false
  if (countryNeedsJurisdiction(options.profileCountryCode)) return false
  return !String(options.profileCountryCode || '').trim()
}

/** Show US/CA jurisdiction select only when tax_jurisdiction_code is still empty. */
export function shouldShowJurisdictionPicker(options: {
  isCommercial: boolean
  profileCountryCode?: string | null
  taxJurisdictionCode?: string | null
}): boolean {
  if (!options.isCommercial) return false
  if (!countryNeedsJurisdiction(options.profileCountryCode)) return false
  return !String(options.taxJurisdictionCode || '').trim()
}

export function normalizeJurisdictionOptions(raw: unknown): TaxJurisdictionOption[] {
  if (!Array.isArray(raw)) return []
  const out: TaxJurisdictionOption[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const code = String(row.code || '').trim().toUpperCase()
    if (!code) continue
    out.push({
      code,
      label: String(row.label || code),
      regime: String(row.regime || ''),
      rate: Number(row.rate) || 0,
      lines: normalizeTaxLines(row.lines),
      components: normalizeTaxLines(row.components),
    })
  }
  return out
}

export function useTenantTaxProfile() {
  return {
    WAVE1_COUNTRY_CODES,
    WAVE1_TAX_PRESETS,
    WAVE2_COUNTRY_CODES,
    WAVE2_TAX_PRESETS,
    COMMERCIAL_COUNTRY_CODES,
    COMMERCIAL_TAX_PRESETS,
    JURISDICTION_COUNTRY_CODES,
    countryNeedsJurisdiction,
    shouldShowWave1CountryPicker,
    shouldShowJurisdictionPicker,
    normalizeTaxLines,
    normalizeCategoryMap,
    normalizeJurisdictionOptions,
    taxConfigHasTaxes,
    primaryTaxLine,
    taxCategoryOptions,
    wave1PresetForCountry,
    commercialPresetForCountry,
    buildCommercialTaxSavePayload,
  }
}
