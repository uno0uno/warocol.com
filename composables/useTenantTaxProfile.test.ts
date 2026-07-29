import { describe, expect, it } from 'vitest'
import {
  buildCoTaxSavePayload,
  buildCommercialMatrixSavePayload,
  buildCommercialTaxSavePayload,
  canRemoveTaxLine,
  commercialPresetForCountry,
  countryNeedsJurisdiction,
  normalizeTaxLines,
  primaryTaxLine,
  shouldShowJurisdictionPicker,
  shouldShowWave1CountryPicker,
  taxCategoryOptions,
  taxConfigHasTaxes,
  taxLineForCategory,
  validateCommercialMatrix,
  wave1PresetForCountry,
} from './useTenantTaxProfile'

describe('useTenantTaxProfile', () => {
  it('detects CO column taxes', () => {
    expect(taxConfigHasTaxes({ inc_applicable: true })).toBe(true)
    expect(taxConfigHasTaxes({ iva_applicable: false, liquor_tax_applicable: false })).toBe(false)
  })

  it('ignores zero-rate tax_lines for hasTaxes', () => {
    expect(taxConfigHasTaxes({
      tax_lines: [{ key: 'standard', label: '', rate: 0, included_in_price: false, gl_role: 'iva' }],
    })).toBe(false)
  })

  it('detects commercial tax_lines', () => {
    expect(taxConfigHasTaxes({
      tax_lines: [{ key: 'gst', label: 'GST 10%', rate: 0.1, included_in_price: true, gl_role: 'iva' }],
    })).toBe(true)
  })

  it('parses jsonb string tax_lines from API (asyncpg)', () => {
    const cfg = {
      commercial_tax_applicable: true,
      tax_lines: '[{"key":"iva","rate":0.16,"label":"IVA 16%","gl_role":"iva","included_in_price":false}]',
      category_map: '{"exempt":null,"liquor":"iva","standard":"iva"}',
    }
    expect(taxConfigHasTaxes(cfg)).toBe(true)
    expect(taxCategoryOptions(cfg)).toEqual(['standard', 'liquor', 'exempt'])
    expect(primaryTaxLine(cfg)?.label).toBe('IVA 16%')
    expect(normalizeTaxLines(cfg.tax_lines)).toHaveLength(1)
  })

  it('respects commercial_tax_applicable flag for tax_lines path', () => {
    const lines = [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }]
    expect(taxConfigHasTaxes({ tax_lines: lines })).toBe(true)
    expect(taxConfigHasTaxes({ tax_lines: lines, commercial_tax_applicable: true })).toBe(true)
    expect(taxConfigHasTaxes({ tax_lines: lines, commercial_tax_applicable: false })).toBe(false)
  })

  it('CO applicable flags ignore commercial_tax_applicable false', () => {
    expect(taxConfigHasTaxes({
      iva_applicable: true,
      commercial_tax_applicable: false,
    })).toBe(true)
  })

  it('hides category options when commercial tax disabled', () => {
    expect(taxCategoryOptions({
      tax_lines: [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: 'iva', exempt: null },
      commercial_tax_applicable: false,
    })).toEqual([])
  })

  it('returns wave-1 PA preset', () => {
    const preset = wave1PresetForCountry('pa')
    expect(preset?.lines[0]?.rate).toBe(0.07)
    expect(preset?.category_map.exempt).toBeNull()
  })

  it('returns wave-2 MX and PE commercial presets', () => {
    const mx = commercialPresetForCountry('mx')
    expect(mx?.lines[0]?.key).toBe('iva')
    expect(mx?.lines[0]?.rate).toBe(0.16)
    const pe = commercialPresetForCountry('PE')
    expect(pe?.lines[0]?.key).toBe('igv')
    expect(pe?.lines[0]?.rate).toBe(0.18)
  })

  it('returns DE multi-rate commercial preset with standard → reduced', () => {
    const de = commercialPresetForCountry('DE')
    expect(de?.category_map.standard).toBe('mwst_reduced')
    expect(de?.category_map.liquor).toBe('mwst_standard')
    expect(de?.lines).toHaveLength(2)
  })

  it('primary line from seeded MX config matches preset', () => {
    const line = primaryTaxLine({
      tax_lines: [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: 'iva', exempt: null },
    })
    expect(line?.label).toBe('IVA 16%')
    expect(line?.rate).toBe(0.16)
  })

  it('category options from category_map', () => {
    const opts = taxCategoryOptions({
      tax_lines: [{ key: 'iva', label: 'IVA 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: 'iva', exempt: null },
    })
    expect(opts).toEqual(['standard', 'liquor', 'exempt'])
  })

  it('primary line follows category_map.standard', () => {
    const line = primaryTaxLine({
      tax_lines: [
        { key: 'other', label: 'Other', rate: 0.05, included_in_price: false, gl_role: 'iva' },
        { key: 'iva', label: 'IVA 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' },
      ],
      category_map: { standard: 'iva', exempt: null },
    })
    expect(line?.key).toBe('iva')
  })

  it('taxLineForCategory resolves liquor from multi-line map (DE-style)', () => {
    const cfg = {
      tax_lines: [
        { key: 'mwst_reduced', label: 'MwSt 7%', rate: 0.07, included_in_price: false, gl_role: 'iva' },
        { key: 'mwst_standard', label: 'MwSt 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' },
      ],
      category_map: { standard: 'mwst_reduced', liquor: 'mwst_standard', exempt: null },
    }
    expect(taxLineForCategory(cfg, 'standard')?.label).toBe('MwSt 7%')
    expect(taxLineForCategory(cfg, 'liquor')?.label).toBe('MwSt 19%')
    expect(taxLineForCategory(cfg, 'exempt')).toBeNull()
  })

  it('taxLineForCategory parses jsonb string lines + map for liquor hints', () => {
    const cfg = {
      tax_lines: '[{"key":"iva","label":"IVA 16%","rate":0.16,"included_in_price":false,"gl_role":"iva"},{"key":"liquor","label":"Liquor 8%","rate":0.08,"included_in_price":false,"gl_role":"iva"}]',
      category_map: '{"standard":"iva","liquor":"liquor","exempt":null}',
    }
    expect(taxLineForCategory(cfg, 'liquor')?.label).toBe('Liquor 8%')
    expect(primaryTaxLine(cfg)?.label).toBe('IVA 16%')
  })

  it('detects US/CA jurisdiction countries', () => {
    expect(countryNeedsJurisdiction('US')).toBe(true)
    expect(countryNeedsJurisdiction('ca')).toBe(true)
    expect(countryNeedsJurisdiction('PA')).toBe(false)
  })

  it('hides country re-picker when profile country is set (wave-1 or wave-2)', () => {
    expect(shouldShowWave1CountryPicker({ isCommercial: true, profileCountryCode: 'PA' })).toBe(false)
    expect(shouldShowWave1CountryPicker({ isCommercial: true, profileCountryCode: 'MX' })).toBe(false)
    expect(shouldShowWave1CountryPicker({ isCommercial: true, profileCountryCode: '' })).toBe(true)
    expect(shouldShowWave1CountryPicker({ isCommercial: true, profileCountryCode: 'US' })).toBe(false)
    expect(shouldShowWave1CountryPicker({ isCommercial: false, profileCountryCode: '' })).toBe(false)
  })

  it('shows jurisdiction picker only when US/CA and code missing', () => {
    expect(shouldShowJurisdictionPicker({
      isCommercial: true,
      profileCountryCode: 'US',
      taxJurisdictionCode: null,
    })).toBe(true)
    expect(shouldShowJurisdictionPicker({
      isCommercial: true,
      profileCountryCode: 'US',
      taxJurisdictionCode: 'TX',
    })).toBe(false)
    expect(shouldShowJurisdictionPicker({
      isCommercial: true,
      profileCountryCode: 'PA',
      taxJurisdictionCode: null,
    })).toBe(false)
  })

  it('commercial save keeps DE multi-rate liquor line when primary rate changes', () => {
    const payload = buildCommercialTaxSavePayload({
      primary: {
        key: 'mwst_reduced',
        label: 'MwSt 7%',
        rate: 0.08,
        included_in_price: false,
        gl_role: 'iva',
      },
      existingCfg: {
        tax_lines: [
          { key: 'mwst_reduced', label: 'MwSt 7%', rate: 0.07, included_in_price: false, gl_role: 'iva' },
          { key: 'mwst_standard', label: 'MwSt 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' },
        ],
        category_map: { standard: 'mwst_reduced', liquor: 'mwst_standard', exempt: null },
      },
      countryCode: 'DE',
    })
    expect(payload.tax_lines).toHaveLength(2)
    expect(payload.tax_lines.find(l => l.key === 'mwst_reduced')?.rate).toBe(0.08)
    expect(payload.tax_lines.find(l => l.key === 'mwst_standard')?.rate).toBe(0.19)
    expect(payload.category_map.liquor).toBe('mwst_standard')
    expect(payload.category_map.standard).toBe('mwst_reduced')
  })

  it('commercial save for MX stays single-rate', () => {
    const payload = buildCommercialTaxSavePayload({
      primary: {
        key: 'iva',
        label: 'IVA 16%',
        rate: 0.16,
        included_in_price: false,
        gl_role: 'iva',
      },
      existingCfg: null,
      countryCode: 'MX',
    })
    expect(payload.tax_lines).toHaveLength(1)
    expect(payload.category_map.liquor).toBe('iva')
  })

  it('matrix save keeps DE both rates and category map', () => {
    const payload = buildCommercialMatrixSavePayload({
      lines: [
        { key: 'mwst_reduced', label: 'MwSt 7%', rate: 0.07, included_in_price: false, gl_role: 'iva' },
        { key: 'mwst_standard', label: 'MwSt 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' },
      ],
      category_map: { standard: 'mwst_reduced', liquor: 'mwst_standard', exempt: null },
    })
    expect(payload.tax_lines).toHaveLength(2)
    expect(payload.category_map).toEqual({
      standard: 'mwst_reduced',
      liquor: 'mwst_standard',
      exempt: null,
    })
    expect(validateCommercialMatrix({
      lines: payload.tax_lines,
      category_map: payload.category_map,
    })).toBeNull()
  })

  it('matrix save for MX stays single-rate with maps', () => {
    const payload = buildCommercialMatrixSavePayload({
      lines: [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: 'iva', exempt: null },
    })
    expect(payload.tax_lines).toHaveLength(1)
    expect(validateCommercialMatrix({
      lines: payload.tax_lines,
      category_map: payload.category_map,
    })).toBeNull()
  })

  it('matrix save preserves explicit null category map (no primary fallback)', () => {
    const payload = buildCommercialMatrixSavePayload({
      lines: [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: null, liquor: null, exempt: null },
    })
    expect(payload.category_map).toEqual({
      standard: null,
      liquor: null,
      exempt: null,
    })
  })

  it('blocks removing a line still referenced by category_map', () => {
    expect(canRemoveTaxLine('iva', { standard: 'iva', liquor: 'iva', exempt: null })).toBe(false)
    expect(canRemoveTaxLine('mwst_standard', {
      standard: 'mwst_reduced',
      liquor: 'mwst_standard',
      exempt: null,
    })).toBe(false)
    expect(canRemoveTaxLine('unused', { standard: 'iva', liquor: 'iva', exempt: null })).toBe(true)
  })

  it('validates matrix map keys and positive rate', () => {
    expect(validateCommercialMatrix({
      lines: [{ key: 'iva', label: 'IVA', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'missing', liquor: null, exempt: null },
    })).toBe('bad_map')
    expect(validateCommercialMatrix({
      lines: [{ key: 'iva', label: 'IVA', rate: 0, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: 'iva', exempt: null },
    })).toBe('no_positive_rate')
  })

  it('builds CO tax save payload with rate fractions', () => {
    const body = buildCoTaxSavePayload({
      inc_applicable: false,
      inc_included_in_price: true,
      iva_applicable: true,
      iva_included_in_price: false,
      liquor_tax_applicable: true,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
    })
    expect(body.iva_rate).toBe(0.19)
    expect(body.liquor_tax_rate).toBe(0.05)
    expect(body.iva_applicable).toBe(true)
  })
})
