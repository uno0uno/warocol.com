import { describe, expect, it } from 'vitest'
import {
  mapPreparedRowsToProduct,
  mapPreparedRowsToRecipe,
  validateMenuCompositionRows,
} from './useMenuCategoryIngredientRows'

const prepared = [{
  ingredient_id: 'ingredient-1',
  name: 'Arroz',
  quantity: 2.5,
  unit: 'kg',
  warehouse_category_id: 'category-1',
}]

describe('menu category ingredient row adapters', () => {
  it('maps generic prepared rows to recipe and product payload fields', () => {
    expect(mapPreparedRowsToRecipe(prepared)).toEqual([{
      ingredient_id: 'ingredient-1',
      ingredient_name: 'Arroz',
      base_quantity: 2.5,
      unit: 'kg',
      notes: '',
    }])
    expect(mapPreparedRowsToProduct(prepared)).toEqual([{
      ingredient_id: 'ingredient-1',
      ingredient_name: 'Arroz',
      quantity: 2.5,
      unit: 'kg',
    }])
  })

  it('rejects incomplete, duplicate, and incompatible combined rows', () => {
    const valid = { ingredient_id: 'ingredient-1', quantity: 2, unit: 'kg' }
    expect(validateMenuCompositionRows([valid], () => ['gr', 'kg'])).toBeNull()
    expect(validateMenuCompositionRows([{ ...valid, quantity: null }])).toBe('incomplete')
    expect(validateMenuCompositionRows([valid, valid])).toBe('duplicate')
    expect(validateMenuCompositionRows([valid], () => ['gr'])).toBe('incompatible-unit')
  })
})
