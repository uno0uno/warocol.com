import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'

export interface MenuCompositionIngredientRow {
  ingredient_id: string
  quantity: number | null
  unit: string | null
}

export type MenuCompositionValidationError =
  | 'incomplete'
  | 'duplicate'
  | 'incompatible-unit'

export function mapPreparedRowsToRecipe(
  rows: PreparedWarehouseCategoryIngredient[],
) {
  return rows.map(row => ({
    ingredient_id: row.ingredient_id,
    ingredient_name: row.name,
    base_quantity: row.quantity,
    unit: row.unit ?? '',
    notes: '',
  }))
}

export function mapPreparedRowsToProduct(
  rows: PreparedWarehouseCategoryIngredient[],
) {
  return rows.map(row => ({
    ingredient_id: row.ingredient_id,
    ingredient_name: row.name,
    quantity: row.quantity,
    unit: row.unit ?? '',
  }))
}

export function validateMenuCompositionRows(
  rows: MenuCompositionIngredientRow[],
  getCompatibleUnits?: (ingredientId: string) => string[],
): MenuCompositionValidationError | null {
  const seen = new Set<string>()

  for (const row of rows) {
    const ingredientId = row.ingredient_id?.trim()
    const unit = row.unit?.trim()
    const quantity = Number(row.quantity)
    if (!ingredientId || !unit || !Number.isFinite(quantity) || quantity <= 0) {
      return 'incomplete'
    }
    if (seen.has(ingredientId)) return 'duplicate'
    seen.add(ingredientId)

    const compatibleUnits = getCompatibleUnits?.(ingredientId) ?? []
    if (compatibleUnits.length && !compatibleUnits.includes(unit)) {
      return 'incompatible-unit'
    }
  }

  return null
}
