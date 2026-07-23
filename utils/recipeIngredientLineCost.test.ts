import { describe, expect, it } from 'vitest'
import {
  recipeIngredientLineCost,
  recipeQtyToStockUnits,
} from './recipeIngredientLineCost'

describe('recipeQtyToStockUnits', () => {
  it('converts ml on und via unit_weight', () => {
    expect(recipeQtyToStockUnits(45, 'ml', 'und', 750)).toBeCloseTo(45 / 750)
  })

  it('leaves same-unit ml unchanged', () => {
    expect(recipeQtyToStockUnits(45, 'ml', 'ml')).toBe(45)
  })

  it('leaves und×und unchanged', () => {
    expect(recipeQtyToStockUnits(1, 'und', 'und')).toBe(1)
  })
})

describe('recipeIngredientLineCost', () => {
  it('prefers costo_linea', () => {
    expect(
      recipeIngredientLineCost({
        costo_linea: 21,
        base_quantity: 45,
        unit: 'ml',
        stock_unit: 'und',
        unit_weight_gr: 750,
        costo_unitario: 350,
      }),
    ).toBe(21)
  })

  it('scales costo_linea by multiplier', () => {
    expect(recipeIngredientLineCost({ costo_linea: 21 }, { multiplier: 2 })).toBe(42)
  })

  it('converts bottle ml line without costo_linea → ~21', () => {
    expect(
      recipeIngredientLineCost({
        base_quantity: 45,
        unit: 'ml',
        stock_unit: 'und',
        unit_weight_gr: 750,
        costo_unitario: 350,
      }),
    ).toBeCloseTo(21)
  })

  it('same-unit ml × unit cost', () => {
    expect(
      recipeIngredientLineCost({
        base_quantity: 20,
        unit: 'ml',
        stock_unit: 'ml',
        costo_unitario: 0.25,
      }),
    ).toBeCloseTo(5)
  })
})
