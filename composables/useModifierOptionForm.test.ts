import { describe, expect, it } from 'vitest'
import {
  appendWarehouseModifiersFromCategory,
  applyModifierUiOptionType,
  createEmptyModifier,
  collectModifierRecipeExcludedIngredientIds,
  getModifierUiOptionType,
  getRecipeBaseIngredientIds,
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

  it('collects excluded recipe ingredient ids from manual lines and recipe base rows', () => {
    const row = createEmptyModifier(0)
    row.option_type = 'RECIPE'
    row.recipe_lines = [{
      ingredient_id: 'manual-1',
      ingredient_name: 'Manual',
      quantity: 1,
      unit: 'gr',
    }]
    row.prepared_recipe_lines = [{
      ingredient_id: 'prepared-1',
      name: 'Prepared',
      quantity: 1,
      unit: 'gr',
      warehouse_category_id: 'category-1',
    }]

    expect(collectModifierRecipeExcludedIngredientIds(row, ['base-1'])).toEqual([
      'base-1',
      'manual-1',
    ])
  })

  it('rejects recipe lines that duplicate recipe base ingredients', () => {
    const row = createEmptyModifier(0)
    row.name = 'Extra'
    row.option_type = 'RECIPE'
    row.recipe_base_type_id = 'base-recipe-1'
    row.recipe_lines = [{
      ingredient_id: 'base-ingredient-1',
      ingredient_name: 'Harina',
      quantity: 1,
      unit: 'gr',
    }]

    expect(validateModifierOption(row, {
      recipeBaseIngredientIds: getRecipeBaseIngredientIds('base-recipe-1', [{
        id: 'base-recipe-1',
        ingredients: [{ ingredient_id: 'base-ingredient-1' }],
      }]),
    }) ?? '').toMatch(/duplicados/)
  })

  it('merges prepared category rows when serializing RECIPE modifiers', () => {
    const row = createEmptyModifier(0)
    row.name = 'Mix'
    row.option_type = 'RECIPE'
    row.recipe_lines = [{
      ingredient_id: 'manual-1',
      ingredient_name: 'Manual',
      quantity: 1,
      unit: 'gr',
    }]
    row.prepared_recipe_lines = [{
      ingredient_id: 'prepared-1',
      name: 'Prepared',
      quantity: 2,
      unit: 'ml',
      warehouse_category_id: 'category-1',
    }]

    expect(serializeModifierForApi(row).recipe_lines).toEqual([
      { ingredient_id: 'manual-1', quantity: 1, unit: 'gr' },
      { ingredient_id: 'prepared-1', quantity: 2, unit: 'ml' },
    ])
  })

  it('maps UI option types and bulk warehouse modifiers from categories', () => {
    const warehouse = createEmptyModifier(0)
    warehouse.option_type = 'INGREDIENT'
    warehouse.ingredient_mode = 'warehouse'
    expect(getModifierUiOptionType(warehouse)).toBe('WAREHOUSE')

    const resale = createEmptyModifier(1)
    resale.option_type = 'INGREDIENT'
    resale.ingredient_mode = 'resale'
    expect(getModifierUiOptionType(resale)).toBe('RESALE')

    applyModifierUiOptionType(warehouse, 'RESALE')
    expect(warehouse.option_type).toBe('INGREDIENT')
    expect(warehouse.ingredient_mode).toBe('resale')
    expect(warehouse.ingredient_id).toBeNull()

    const appended = appendWarehouseModifiersFromCategory([], [{
      ingredient_id: 'ing-1',
      name: 'Harina',
      quantity: 1,
      unit: 'kg',
      warehouse_category_id: 'cat-1',
    }])
    expect(appended).toHaveLength(1)
    expect(appended[0]?.ingredient_mode).toBe('warehouse')
    expect(appended[0]?.name).toBe('Harina')

    const deduped = appendWarehouseModifiersFromCategory(appended, [{
      ingredient_id: 'ing-1',
      name: 'Harina',
      quantity: 2,
      unit: 'kg',
      warehouse_category_id: 'cat-1',
    }])
    expect(deduped).toHaveLength(1)
  })

  it('hydrates resale ingredient mode from API rows', () => {
    const row = mapModifierFromApi({
      name: 'Gaseosa',
      option_type: 'INGREDIENT',
      ingredient_id: 'ing-resale',
      ingredient: { id: 'ing-resale', name: 'Gaseosa', is_resale: true },
    })
    expect(row.ingredient_mode).toBe('resale')
    expect(getModifierUiOptionType(row)).toBe('RESALE')
  })
})
