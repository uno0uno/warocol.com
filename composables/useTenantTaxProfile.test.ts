import { describe, expect, it } from 'vitest'
import {
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

  it('hides wave-1 country re-picker when profile country is set', () => {
    expect(shouldShowWave1CountryPicker({ isCommercial: true, profileCountryCode: 'PA' })).toBe(false)
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
})
