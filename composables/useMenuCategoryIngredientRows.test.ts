import { describe, expect, it } from 'vitest'
import {
  applyCategorySelectorLayout,
  buildWarehouseCategorySelectorHydration,
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
  it('builds category hydration grouped by warehouse category', () => {
    const hydration = buildWarehouseCategorySelectorHydration(
      [
        { ingredient_id: 'ingredient-1', quantity: 2, unit: 'kg' },
        { ingredient_id: 'ingredient-2', base_quantity: 1, unit: 'ml' },
        { ingredient_id: 'manual-1', quantity: 1, unit: 'und' },
      ],
      [
        {
          id: 'ingredient-1',
          name: 'Arroz',
          unit: 'kg',
          warehouse_category_id: 'category-1',
          category: 'Granos',
        },
        {
          id: 'ingredient-2',
          name: 'Leche',
          unit: 'ml',
          warehouse_category_id: 'category-2',
          category: 'Lácteos',
        },
        { id: 'manual-1', name: 'Sal', unit: 'und' },
      ],
    )

    expect(hydration.categories.map(category => category.name)).toEqual(['Granos', 'Lácteos'])
    expect(hydration.preparedRows).toEqual([
      {
        ingredient_id: 'ingredient-1',
        name: 'Arroz',
        quantity: 2,
        unit: 'kg',
        warehouse_category_id: 'category-1',
      },
      {
        ingredient_id: 'ingredient-2',
        name: 'Leche',
        quantity: 1,
        unit: 'ml',
        warehouse_category_id: 'category-2',
      },
    ])
  })

  it('splits manual rows from category-backed rows for edit hydration', () => {
    const layout = applyCategorySelectorLayout(
      [
        { ingredient_id: 'ingredient-1', ingredient_name: 'Arroz', quantity: 2, unit: 'kg' },
        { ingredient_id: 'manual-1', ingredient_name: 'Sal', quantity: 1, unit: 'und' },
      ],
      [{
        id: 'ingredient-1',
        name: 'Arroz',
        unit: 'kg',
        warehouse_category_id: 'category-1',
        category: 'Granos',
      }, {
        id: 'manual-1',
        name: 'Sal',
        unit: 'und',
      }],
    )

    expect(layout.categories).toHaveLength(1)
    expect(layout.manualRows).toEqual([
      { ingredient_id: 'manual-1', ingredient_name: 'Sal', quantity: 1, unit: 'und' },
    ])
    expect(layout.preparedRows[0]?.warehouse_category_id).toBe('category-1')
  })

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
