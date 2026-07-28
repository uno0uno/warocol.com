import { describe, expect, it } from 'vitest'
import {
  primaryTaxLine,
  taxCategoryOptions,
  taxConfigHasTaxes,
  wave1PresetForCountry,
} from './useTenantTaxProfile'

describe('useTenantTaxProfile', () => {
  it('detects CO column taxes', () => {
    expect(taxConfigHasTaxes({ inc_applicable: true })).toBe(true)
    expect(taxConfigHasTaxes({ iva_applicable: false, liquor_tax_applicable: false })).toBe(false)
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
})
