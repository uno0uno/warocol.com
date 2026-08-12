import { describe, expect, it } from 'vitest'
import {
  buildDualUnitPurchaseSuggestions,
  isDualUnitPurchaseConfig,
  undFactorToWeightQuantity,
  weightQuantityToUndFactor,
} from './useIngredientPurchaseUnitsDraft'

describe('isDualUnitPurchaseConfig', () => {
  it('requires und base + positive weight + gr|ml', () => {
    expect(isDualUnitPurchaseConfig('und', 750, 'ml')).toBe(true)
    expect(isDualUnitPurchaseConfig('und', 180, 'gr')).toBe(true)
    expect(isDualUnitPurchaseConfig('ml', 750, 'ml')).toBe(false)
    expect(isDualUnitPurchaseConfig('und', 0, 'ml')).toBe(false)
    expect(isDualUnitPurchaseConfig('und', 750, null)).toBe(false)
  })
})

describe('weightQuantityToUndFactor / undFactorToWeightQuantity', () => {
  it('converts onza ml to und for 750 ml bottle', () => {
    const und = weightQuantityToUndFactor(29.57, 750)
    expect(und).toBeCloseTo(0.0394266, 5)
    expect(undFactorToWeightQuantity(und, 750)).toBeCloseTo(29.57, 4)
  })

  it('maps full bottle ml to 1 und', () => {
    expect(weightQuantityToUndFactor(750, 750)).toBe(1)
  })
})

describe('buildDualUnitPurchaseSuggestions', () => {
  it('seeds und + ml catalog as und factors', () => {
    const rows = buildDualUnitPurchaseSuggestions('ml', 750)
    expect(rows[0]).toEqual({ purchase_unit: 'und', label: 'Unidad', conversion_factor: 1 })
    const botella = rows.find(r => r.purchase_unit === 'botella')
    expect(botella?.label).toBe('Botella')
    expect(botella?.conversion_factor).toBe(1)
    const lt = rows.find(r => r.purchase_unit === 'lt')
    expect(lt?.conversion_factor).toBeCloseTo(1000 / 750, 6)
  })

  it('seeds und + gr catalog for weight equivalence', () => {
    const rows = buildDualUnitPurchaseSuggestions('gr', 500)
    const libra = rows.find(r => r.purchase_unit === 'libra')
    expect(libra?.conversion_factor).toBe(1)
    const kg = rows.find(r => r.purchase_unit === 'kg')
    expect(kg?.conversion_factor).toBe(2)
  })
})
