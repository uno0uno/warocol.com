import { describe, expect, it } from 'vitest'
import {
  buildCoTaxSavePayload,
  buildCoTaxLinesDraft,
  buildCoRestauranteTaxLines,
  buildCommercialMatrixSavePayload,
  buildCommercialTaxSavePayload,
  canRemoveTaxLine,
  coCustomLinesFromTaxLines,
  commercialPresetForCountry,
  countryNeedsJurisdiction,
  inheritedTaxLineForMenuCategory,
  legacyTaxCategoryFromResolution,
  normalizeExemptMenuCategoryIds,
  normalizeMenuCategoryLineMap,
  normalizeTaxLines,
  primaryTaxLine,
  resolveProductTaxLinePreview,
  shouldShowJurisdictionPicker,
  shouldShowWave1CountryPicker,
  taxCategoryOptions,
  taxConfigHasTaxes,
  taxConfigUsesMenuCategoryTaxUi,
  taxLineForCategory,
  taxLinesForUi,
  validateCommercialMatrix,
  validateTaxLineModes,
  wave1PresetForCountry,
  additiveOrderTaxTotal,
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

  it('matrix save includes menu category map + exempt ids (#1884)', () => {
    const catA = '11111111-1111-1111-1111-111111111111'
    const catB = '22222222-2222-2222-2222-222222222222'
    const payload = buildCommercialMatrixSavePayload({
      lines: [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: 'iva', exempt: null },
      menu_category_line_map: { [catA]: 'iva', [catB]: null },
      exempt_menu_category_ids: [catB, catA, catB],
    })
    expect(payload.menu_category_line_map).toEqual({ [catA]: 'iva', [catB]: null })
    // Category on a line wins over exempt set.
    expect(payload.exempt_menu_category_ids).toEqual([catB])
  })

  it('normalizes menu category line map and exempt ids from jsonb strings', () => {
    const catA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    expect(normalizeMenuCategoryLineMap(`{"${catA}":"gst"}`)).toEqual({ [catA]: 'gst' })
    expect(normalizeExemptMenuCategoryIds(`["${catA}","${catA}"]`)).toEqual([catA])
    expect(normalizeExemptMenuCategoryIds([catA, null, ''])).toEqual([catA])
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

  it('blocks removing a line referenced by menu_category_line_map', () => {
    const catA = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    expect(canRemoveTaxLine('iva', { standard: null, liquor: null, exempt: null }, {
      [catA]: 'iva',
    })).toBe(false)
    expect(canRemoveTaxLine('gst', { standard: 'iva', liquor: 'iva', exempt: null }, {
      [catA]: 'iva',
    })).toBe(true)
  })

  it('validates matrix map keys and positive rate', () => {
    expect(validateCommercialMatrix({
      lines: [{ key: 'iva', label: 'IVA', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'missing', liquor: null, exempt: null },
    })).toBe('bad_map')
    expect(validateCommercialMatrix({
      lines: [{ key: 'iva', label: 'IVA', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: null, exempt: null },
      menu_category_line_map: { 'cccccccc-cccc-cccc-cccc-cccccccccccc': 'missing' },
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
      liquor_tax_included_in_price: true,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
    })
    expect(body.iva_rate).toBe(0.19)
    expect(body.liquor_tax_rate).toBe(0.05)
    expect(body.iva_applicable).toBe(true)
    expect(body.liquor_tax_included_in_price).toBe(true)
    expect(body.commercial_tax_applicable).toBe(false)
    expect(body.menu_category_line_map).toEqual({})
    expect(body.exempt_menu_category_ids).toEqual([])
  })

  it('includes exempt menu category ids in CO tax save payload (#1989)', () => {
    const catA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const catB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const body = buildCoTaxSavePayload({
      inc_applicable: true,
      inc_included_in_price: true,
      iva_applicable: false,
      iva_included_in_price: false,
      liquor_tax_applicable: false,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
      exempt_menu_category_ids: [catB, catA, catB, ''],
    })
    expect(body.exempt_menu_category_ids).toEqual([catB, catA])
    expect(body.inc_applicable).toBe(true)
  })

  it('includes menu_category_line_map in CO tax save payload (#1993)', () => {
    const catA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const catB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const catC = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    const body = buildCoTaxSavePayload({
      inc_applicable: false,
      inc_included_in_price: true,
      iva_applicable: true,
      iva_included_in_price: false,
      liquor_tax_applicable: true,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
      menu_category_line_map: {
        [catA]: 'liquor',
        [catB]: 'iva',
        [catC]: 'inc', // remapped to active primary (#2031)
        '': 'iva',
      },
      exempt_menu_category_ids: [catB],
    })
    expect(body.menu_category_line_map).toEqual({
      [catA]: 'liquor',
      [catB]: 'iva',
      [catC]: 'iva',
    })
    expect(body.exempt_menu_category_ids).toEqual([catB])
  })

  it('syncs IVA→INC tax_lines and remaps menu primary (#2031)', () => {
    const catA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const catB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const lines = buildCoTaxLinesDraft({
      inc_applicable: true,
      iva_applicable: false,
      liquor_tax_applicable: true,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
      iva_included_in_price: true,
      inc_included_in_price: true,
      liquor_tax_included_in_price: true,
      custom_lines: [{
        key: 'bebidas',
        label: 'Bebidas 5%',
        rate: 0.05,
        included_in_price: true,
        gl_role: 'iva',
        mode: 'alternate',
        exclusive_group: 'vat',
      }],
    })
    expect(lines.map(l => l.key)).toEqual(['inc', 'liquor', 'bebidas'])
    const body = buildCoTaxSavePayload({
      inc_applicable: true,
      inc_included_in_price: true,
      iva_applicable: false,
      iva_included_in_price: true,
      liquor_tax_applicable: true,
      liquor_tax_included_in_price: true,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
      tax_lines: lines,
      menu_category_line_map: {
        [catA]: 'iva',
        [catB]: 'liquor',
      },
    })
    expect((body.tax_lines as { key: string }[]).map(l => l.key)).toEqual(['inc', 'liquor', 'bebidas'])
    expect(body.category_map).toEqual({
      standard: 'inc',
      liquor: 'liquor',
      exempt: null,
    })
    expect(body.menu_category_line_map).toEqual({
      [catA]: 'inc',
      [catB]: 'liquor',
    })
  })

  it('uses menu-category tax UI for commercial tax_lines and CO columns (#1885 / #1994)', () => {
    expect(taxConfigUsesMenuCategoryTaxUi({ inc_applicable: true, inc_rate: 0.08 })).toBe(true)
    expect(taxConfigUsesMenuCategoryTaxUi({
      tax_lines: [{ key: 'iva', label: 'IVA', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
    })).toBe(true)
    expect(taxConfigUsesMenuCategoryTaxUi({})).toBe(false)
  })

  it('synthesizes CO tax lines for Menú UI (#1994)', () => {
    const lines = taxLinesForUi({
      iva_applicable: true,
      iva_rate: 0.19,
      iva_included_in_price: false,
      liquor_tax_applicable: true,
      liquor_tax_rate: 0.05,
      liquor_tax_included_in_price: true,
    })
    expect(lines.map(l => l.key)).toEqual(['iva', 'liquor'])
    expect(lines[0]?.label).toBe('IVA 19%')
    expect(lines[1]?.label).toBe('IVA licores 5%')
    expect(lines[1]?.included_in_price).toBe(true)
    expect(lines[1]?.mode).toBe('alternate')

    const incOnly = taxLinesForUi({
      inc_applicable: true,
      inc_rate: 0.08,
      inc_included_in_price: true,
    })
    expect(incOnly.map(l => l.key)).toEqual(['inc'])
  })

  it('builds Restaurante CO gold-path tax_lines (#2028)', () => {
    const lines = buildCoRestauranteTaxLines()
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({
      key: 'iva',
      rate: 0.19,
      included_in_price: true,
      mode: 'primary',
      exclusive_group: 'vat',
    })
    expect(lines[1]).toMatchObject({
      key: 'liquor',
      rate: 0.05,
      included_in_price: true,
      mode: 'alternate',
      exclusive_group: 'vat',
    })
  })

  it('builds CO tax_lines draft with custom stack line and validates modes (#2028)', () => {
    const lines = buildCoTaxLinesDraft({
      inc_applicable: false,
      iva_applicable: true,
      liquor_tax_applicable: true,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
      iva_included_in_price: true,
      inc_included_in_price: true,
      liquor_tax_included_in_price: true,
      custom_lines: [{
        key: 'tourist',
        label: 'Tourist 2%',
        rate: 0.02,
        included_in_price: false,
        gl_role: 'iva',
        mode: 'stack',
      }],
    })
    expect(lines.map(l => l.key)).toEqual(['iva', 'liquor', 'tourist'])
    expect(validateTaxLineModes(lines)).toBeNull()
    expect(validateTaxLineModes([
      ...lines,
      {
        key: 'frontera',
        label: 'Frontera',
        rate: 0.08,
        included_in_price: true,
        gl_role: 'iva',
        mode: 'stack',
        exclusive_group: 'vat',
      },
    ])).toBe('stack_exclusive_group')

    const body = buildCoTaxSavePayload({
      inc_applicable: false,
      inc_included_in_price: true,
      iva_applicable: true,
      iva_included_in_price: true,
      liquor_tax_applicable: true,
      liquor_tax_included_in_price: true,
      iva_rate: 0.19,
      inc_rate: 0.08,
      liquor_tax_rate: 0.05,
      tax_lines: lines,
      menu_category_line_map: {
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'tourist',
      },
    })
    expect(Array.isArray(body.tax_lines)).toBe(true)
    expect((body.tax_lines as { key: string }[]).map(l => l.key)).toEqual(['iva', 'liquor', 'tourist'])
    expect(body.menu_category_line_map).toEqual({
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa': 'tourist',
    })
    expect(coCustomLinesFromTaxLines(body.tax_lines).map(l => l.key)).toEqual(['tourist'])
  })

  it('normalizes mode on tax_lines JSON (#2028)', () => {
    const lines = normalizeTaxLines([
      { key: 'iva', rate: 0.19, mode: 'PRIMARY', exclusive_group: 'vat' },
      { key: 'liquor', rate: 0.05, mode: 'alternate', included_in_price: true },
    ])
    expect(lines[0]?.mode).toBe('primary')
    expect(lines[0]?.exclusive_group).toBe('vat')
    expect(lines[1]?.mode).toBe('alternate')
    expect(lines[1]?.included_in_price).toBe(true)
  })

  it('inherits tax line from menu category map with override precedence (#1885)', () => {
    const catA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const catB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const cfg = {
      tax_lines: [
        { key: 'mwst', label: 'MwSt 19%', rate: 0.19, included_in_price: false, gl_role: 'iva' },
        { key: 'mwst_reduced', label: 'MwSt 7%', rate: 0.07, included_in_price: false, gl_role: 'iva' },
      ],
      category_map: { standard: 'mwst', liquor: 'mwst', exempt: null },
      menu_category_line_map: { [catA]: 'mwst_reduced' },
      exempt_menu_category_ids: [catB],
    }
    expect(inheritedTaxLineForMenuCategory(cfg, catA)?.key).toBe('mwst_reduced')
    expect(inheritedTaxLineForMenuCategory(cfg, catB)).toBeNull()
    expect(inheritedTaxLineForMenuCategory(cfg, 'unknown')?.key).toBe('mwst')
    expect(resolveProductTaxLinePreview(cfg, {
      categoryId: catA,
      tax_resolution: 'exempt',
    })).toBeNull()
    expect(resolveProductTaxLinePreview(cfg, {
      categoryId: catA,
      tax_resolution: 'line',
      tax_line_key: 'mwst',
    })?.key).toBe('mwst')
    expect(legacyTaxCategoryFromResolution(cfg, {
      categoryId: catA,
      tax_resolution: 'inherit',
    })).toBe('standard')
    expect(legacyTaxCategoryFromResolution(cfg, {
      tax_resolution: 'exempt',
    })).toBe('exempt')
  })

  it('CO inherit/preview uses synthesized lines and dual-writes liquor (#1994)', () => {
    const catA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    const catB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    const cfg = {
      iva_applicable: true,
      iva_rate: 0.19,
      iva_included_in_price: false,
      liquor_tax_applicable: true,
      liquor_tax_rate: 0.05,
      menu_category_line_map: { [catA]: 'liquor' },
      exempt_menu_category_ids: [catB],
    }
    expect(inheritedTaxLineForMenuCategory(cfg, catA)?.key).toBe('liquor')
    expect(inheritedTaxLineForMenuCategory(cfg, catB)).toBeNull()
    expect(inheritedTaxLineForMenuCategory(cfg, 'unknown')?.key).toBe('iva')
    expect(resolveProductTaxLinePreview(cfg, {
      categoryId: catA,
      tax_resolution: 'line',
      tax_line_key: 'liquor',
    })?.key).toBe('liquor')
    expect(legacyTaxCategoryFromResolution(cfg, {
      categoryId: catA,
      tax_resolution: 'line',
      tax_line_key: 'liquor',
    })).toBe('liquor')
    expect(legacyTaxCategoryFromResolution(cfg, {
      categoryId: 'unknown',
      tax_resolution: 'inherit',
    })).toBe('standard')
  })

  it('additiveOrderTaxTotal includes exclusive MX IVA and skips included CO INC', () => {
    const mx = {
      tax_lines: [{ key: 'iva', label: 'IVA 16%', rate: 0.16, included_in_price: false, gl_role: 'iva' }],
      category_map: { standard: 'iva', liquor: 'iva', exempt: null },
    }
    expect(additiveOrderTaxTotal(0, 371, mx)).toBe(371)
    expect(additiveOrderTaxTotal(371, 0, mx)).toBe(371)

    expect(additiveOrderTaxTotal(800, 0, {
      inc_applicable: true,
      inc_included_in_price: true,
    })).toBe(0)
    expect(additiveOrderTaxTotal(800, 1000, {
      inc_applicable: true,
      inc_included_in_price: true,
      liquor_tax_applicable: true,
    })).toBe(1000)
  })

  it('additiveOrderTaxTotal falls back to preview sum when tax_lines missing from context', () => {
    // POS restaurant-context used to omit commercial tax_lines (MX trial).
    expect(additiveOrderTaxTotal(0, 186, {
      inc_applicable: false,
      iva_applicable: false,
      liquor_tax_applicable: false,
    })).toBe(186)
  })
})
