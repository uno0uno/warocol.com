/**
 * Tenant tax profile helpers — warocol.com#1846.
 * Consumes GET /tenant/tax-config tax_lines + category_map (#1845).
 * Wave-1 presets are transitional until #1847 server packs.
 */

export type TaxLineDraft = {
  key: string
  label: string
  rate: number
  included_in_price: boolean
  gl_role: string
}

export type TaxCategoryKey = 'standard' | 'liquor' | 'exempt'

export type Wave1TaxPreset = {
  lines: TaxLineDraft[]
  category_map: Record<string, string | null>
}

/** Epic #1843 wave-1 shortlist — one primary rate + exempt. */
export const WAVE1_TAX_PRESETS: Record<string, Wave1TaxPreset> = {
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
  return normalizeTaxLines(cfg.tax_lines).some(line => line.rate > 0)
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
    // de-dupe while preserving order
    return [...new Set(opts)]
  }
  // CO column path: always offer the three legacy categories
  return ['standard', 'liquor', 'exempt']
}

export function wave1PresetForCountry(countryCode: string): Wave1TaxPreset | null {
  const code = String(countryCode || '').toUpperCase()
  return WAVE1_TAX_PRESETS[code] ?? null
}

export function useTenantTaxProfile() {
  return {
    WAVE1_COUNTRY_CODES,
    WAVE1_TAX_PRESETS,
    normalizeTaxLines,
    normalizeCategoryMap,
    taxConfigHasTaxes,
    primaryTaxLine,
    taxCategoryOptions,
    wave1PresetForCountry,
  }
}
