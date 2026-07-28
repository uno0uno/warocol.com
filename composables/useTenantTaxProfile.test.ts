import { describe, expect, it } from 'vitest'
import {
  buildCommercialTaxSavePayload,
  commercialPresetForCountry,
  countryNeedsJurisdiction,
  primaryTaxLine,
  shouldShowJurisdictionPicker,
  shouldShowWave1CountryPicker,
  taxCategoryOptions,
  taxConfigHasTaxes,
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
})
