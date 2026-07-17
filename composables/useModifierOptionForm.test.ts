import { describe, expect, it } from 'vitest'
import {
  createEmptyModifier,
  mapModifierFromApi,
  serializeModifierForApi,
  validateModifierOption,
} from './useModifierOptionForm.ts'

describe('included modifier quantity form contract', () => {
  it('defaults legacy options to zero and serializes the field', () => {
    const row = mapModifierFromApi({
      name: 'Salsa',
      option_type: 'NONE',
      max_limit: 3,
    })
    expect(row.included_quantity).toBe(0)

    row.included_quantity = 1
    expect(serializeModifierForApi(row).included_quantity).toBe(1)
  })

  it('rejects included quantity above max_limit with the option name', () => {
    const row = createEmptyModifier(0)
    row.name = 'Queso'
    row.option_type = 'NONE'
    row.max_limit = 1
    row.included_quantity = 2

    expect(validateModifierOption(row) ?? '').toMatch(/Queso/)
    expect(validateModifierOption(row) ?? '').toMatch(/no puede superar/)
  })

  it('requires integer thresholds', () => {
    const row = createEmptyModifier(0)
    row.name = 'Tocineta'
    row.option_type = 'NONE'
    row.included_quantity = 0.5

    expect(validateModifierOption(row) ?? '').toMatch(/número entero/)
  })

  it('hydrates, validates, and serializes RECIPE recipe_lines', () => {
    const row = mapModifierFromApi({
      name: 'Salsa',
      option_type: 'RECIPE',
      recipe_lines: [{
        ingredient_id: 'ingredient-1',
        quantity: 2,
        unit: 'gr',
        ingredient: { name: 'Sal' },
      }],
    })

    expect(row.recipe_lines[0]?.ingredient_name).toBe('Sal')
    expect(validateModifierOption(row)).toBeNull()
    expect(serializeModifierForApi(row).recipe_lines).toEqual([{
      ingredient_id: 'ingredient-1',
      quantity: 2,
      unit: 'gr',
    }])
  })

  it('rejects incomplete and duplicate persisted/prepared RECIPE lines', () => {
    const row = createEmptyModifier(0)
    row.name = 'Mezcla'
    row.option_type = 'RECIPE'
    row.recipe_lines = [{
      ingredient_id: 'ingredient-1',
      ingredient_name: 'Sal',
      quantity: 1,
      unit: 'gr',
    }]
    row.prepared_recipe_lines = [{
      ingredient_id: 'ingredient-1',
      name: 'Sal',
      quantity: 2,
      unit: 'gr',
      warehouse_category_id: 'category-1',
    }]
    expect(validateModifierOption(row) ?? '').toMatch(/duplicados/)

    row.prepared_recipe_lines[0]!.ingredient_id = 'ingredient-2'
    row.prepared_recipe_lines[0]!.quantity = null
    expect(validateModifierOption(row) ?? '').toMatch(/Completa/)
  })
})
