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

/** Soft cap for custom commercial tax lines in Facturación matrix (#1874). */
export const MAX_COMMERCIAL_TAX_LINES = 5

export type CommercialMatrixValidationError =
  | 'empty_lines'
  | 'missing_label'
  | 'invalid_rate'
  | 'no_positive_rate'
  | 'duplicate_key'
  | 'bad_map'
  | 'too_many'

/** asyncpg often returns jsonb as a JSON string — accept both shapes. */
function parseJsonField(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  const trimmed = raw.trim()
  if (!trimmed) return raw
  try {
    return JSON.parse(trimmed)
  } catch {
    return raw
  }
}

export function normalizeTaxLines(raw: unknown): TaxLineDraft[] {
  const parsed = parseJsonField(raw)
  if (!Array.isArray(parsed)) return []
  const lines: TaxLineDraft[] = []
  for (const item of parsed) {
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
  const parsed = parseJsonField(raw)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const out: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    out[key] = value == null || value === '' ? null : String(value)
  }
  return out
}

/** Stable key from label; avoids colliding with existing keys. */
export function suggestTaxLineKey(label: string, existingKeys: string[]): string {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32) || 'tax'
  const used = new Set(existingKeys.map(k => k.toLowerCase()))
  if (!used.has(base)) return base
  let i = 2
  while (used.has(`${base}_${i}`)) i += 1
  return `${base}_${i}`
}

export function canRemoveTaxLine(
  key: string,
  categoryMap: Record<string, string | null> | null | undefined,
): boolean {
  if (!key) return false
  if (!categoryMap) return true
  return !Object.values(categoryMap).some(v => v === key)
}

export function validateCommercialMatrix(options: {
  lines: TaxLineDraft[]
  category_map: Record<string, string | null>
  requirePositiveRate?: boolean
}): CommercialMatrixValidationError | null {
  const lines = options.lines || []
  if (!lines.length) return 'empty_lines'
  if (lines.length > MAX_COMMERCIAL_TAX_LINES) return 'too_many'
  const keys = new Set<string>()
  for (const line of lines) {
    const key = String(line.key || '').trim()
    if (!key) return 'duplicate_key'
    if (keys.has(key)) return 'duplicate_key'
    keys.add(key)
    if (!String(line.label || '').trim()) return 'missing_label'
    if (!Number.isFinite(line.rate) || line.rate < 0) return 'invalid_rate'
  }
  if (options.requirePositiveRate !== false && !lines.some(l => l.rate > 0)) {
    return 'no_positive_rate'
  }
  for (const value of Object.values(options.category_map || {})) {
    if (value == null || value === '') continue
    if (!keys.has(value)) return 'bad_map'
  }
  return null
}

/**
 * Full-matrix commercial PUT body (#1874).
 * Prefer this over primary-only buildCommercialTaxSavePayload.
 */
export function buildCommercialMatrixSavePayload(options: {
  lines: TaxLineDraft[]
  category_map: Record<string, string | null>
}): { tax_lines: TaxLineDraft[]; category_map: Record<string, string | null> } {
  const tax_lines = options.lines.map(line => ({
    key: String(line.key || '').trim(),
    label: String(line.label || '').trim(),
    rate: Math.max(0, Number(line.rate) || 0),
    included_in_price: Boolean(line.included_in_price),
    gl_role: String(line.gl_role || 'iva'),
  }))
  const category_map: Record<string, string | null> = {
    standard: options.category_map?.standard ?? (tax_lines[0]?.key || null),
    liquor: options.category_map?.liquor ?? options.category_map?.standard ?? (tax_lines[0]?.key || null),
    exempt: options.category_map?.exempt ?? null,
  }
  return { tax_lines, category_map }
}

/** CO column bridge PUT fields (#1873 / #1874) — rates as fractions. */
export function buildCoTaxSavePayload(options: {
  inc_applicable: boolean
  inc_included_in_price: boolean
  iva_applicable: boolean
  iva_included_in_price: boolean
  liquor_tax_applicable: boolean
  iva_rate: number
  inc_rate: number
  liquor_tax_rate: number
}): Record<string, boolean | number> {
  return {
    inc_applicable: Boolean(options.inc_applicable),
    inc_included_in_price: Boolean(options.inc_included_in_price),
    iva_applicable: Boolean(options.iva_applicable),
    iva_included_in_price: Boolean(options.iva_included_in_price),
    liquor_tax_applicable: Boolean(options.liquor_tax_applicable),
    iva_rate: Math.max(0, Number(options.iva_rate) || 0),
    inc_rate: Math.max(0, Number(options.inc_rate) || 0),
    liquor_tax_rate: Math.max(0, Number(options.liquor_tax_rate) || 0),
  }
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

/**
 * Resolve the tax line mapped to a product category (standard / liquor).
 * Always normalizes jsonb strings so Menú hints match Facturación matrix.
 */
export function taxLineForCategory(
  cfg: Record<string, unknown> | null | undefined,
  category: TaxCategoryKey,
): TaxLineDraft | null {
  if (category === 'exempt') return null
  const lines = normalizeTaxLines(cfg?.tax_lines)
  if (!lines.length) return null
  const map = normalizeCategoryMap(cfg?.category_map)
  const mappedKey = map?.[category]
  if (mappedKey) {
    const match = lines.find(line => line.key === mappedKey)
    if (match) return match
  }
  if (category === 'standard') return lines[0] ?? null
  return null
}

export function primaryTaxLine(cfg: Record<string, unknown> | null | undefined): TaxLineDraft | null {
  return taxLineForCategory(cfg, 'standard')
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
    MAX_COMMERCIAL_TAX_LINES,
    countryNeedsJurisdiction,
    shouldShowWave1CountryPicker,
    shouldShowJurisdictionPicker,
    normalizeTaxLines,
    normalizeCategoryMap,
    normalizeJurisdictionOptions,
    taxConfigHasTaxes,
    taxLineForCategory,
    primaryTaxLine,
    taxCategoryOptions,
    wave1PresetForCountry,
    commercialPresetForCountry,
    buildCommercialTaxSavePayload,
    buildCommercialMatrixSavePayload,
    buildCoTaxSavePayload,
    validateCommercialMatrix,
    canRemoveTaxLine,
    suggestTaxLineKey,
  }
}
