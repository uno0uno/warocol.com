import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'
import { warehouseCategoryFromIngredient } from '~/composables/useWarehouseCatalogEditMode'
import type { WarehouseCategoryRow } from '~/composables/useWarehouseCategorySearch'

export interface MenuCategoryIngredientSourceRow {
  ingredient_id?: string
  ingredient_name?: string
  quantity?: number | null
  base_quantity?: number | null
  unit?: string | null
}

export interface MenuCategoryCatalogIngredient {
  id: string
  name?: string
  unit?: string
  warehouse_category_id?: string | null
  category?: string | null
}

export function buildWarehouseCategorySelectorHydration(
  rows: MenuCategoryIngredientSourceRow[],
  catalog: MenuCategoryCatalogIngredient[],
): { categories: WarehouseCategoryRow[], preparedRows: PreparedWarehouseCategoryIngredient[] } {
  const catalogById = new Map(catalog.map(item => [item.id, item]))
  const categoriesById = new Map<string, WarehouseCategoryRow>()
  const preparedRows: PreparedWarehouseCategoryIngredient[] = []

  for (const row of rows) {
    const ingredientId = row.ingredient_id?.trim()
    if (!ingredientId) continue

    const catalogItem = catalogById.get(ingredientId)
    if (!catalogItem) continue

    const category = warehouseCategoryFromIngredient(catalogItem)
    if (!category) continue

    categoriesById.set(category.id, category)
    const quantity = row.quantity ?? row.base_quantity ?? null
    preparedRows.push({
      ingredient_id: ingredientId,
      name: row.ingredient_name?.trim() || catalogItem.name || '',
      quantity: quantity == null || !Number.isFinite(Number(quantity)) ? null : Number(quantity),
      unit: row.unit?.trim() || catalogItem.unit?.trim() || null,
      warehouse_category_id: category.id,
    })
  }

  return {
    categories: [...categoriesById.values()],
    preparedRows,
  }
}

export function applyCategorySelectorLayout<T extends MenuCategoryIngredientSourceRow>(
  rows: T[],
  catalog: MenuCategoryCatalogIngredient[],
): {
  categories: WarehouseCategoryRow[]
  preparedRows: PreparedWarehouseCategoryIngredient[]
  manualRows: T[]
} {
  const hydration = buildWarehouseCategorySelectorHydration(rows, catalog)
  const categoryIngredientIds = new Set(hydration.preparedRows.map(row => row.ingredient_id))

  return {
    categories: hydration.categories,
    preparedRows: hydration.preparedRows,
    manualRows: rows.filter(row => !row.ingredient_id || !categoryIngredientIds.has(row.ingredient_id)),
  }
}

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
