import type { PreparedWarehouseCategoryIngredient } from '~/composables/useWarehouseCategoryIngredientSelector'

export type ModifierOptionType = 'INGREDIENT' | 'RECIPE' | 'PRODUCT' | 'NONE'

export interface ModifierRecipeLineForm {
  ingredient_id: string
  ingredient_name: string
  quantity: number | null
  unit: string | null
}

export interface ModifierFormRow {
  name: string
  price: number
  max_limit: number
  included_quantity: number
  is_default: boolean
  is_available: boolean
  sort_order: number
  option_type: ModifierOptionType
  ingredient_id: string | null
  ingredient_name: string | null
  ingredient_quantity: number | null
  ingredient_unit: string | null
  recipe_base_type_id: string | null
  recipe_base_name: string | null
  recipe_base_quantity: number
  recipe_lines: ModifierRecipeLineForm[]
  prepared_recipe_lines: PreparedWarehouseCategoryIngredient[]
  linked_product_id: string | null
  linked_product_name: string | null
  linked_product_quantity: number
  unit_cost: number | null
}

const OPTION_TYPES: ModifierOptionType[] = ['INGREDIENT', 'RECIPE', 'PRODUCT', 'NONE']

export function createEmptyModifier(sortOrder: number): ModifierFormRow {
  return {
    name: '',
    price: 0,
    max_limit: 1,
    included_quantity: 0,
    is_default: false,
    is_available: true,
    sort_order: sortOrder,
    option_type: 'INGREDIENT',
    ingredient_id: null,
    ingredient_name: null,
    ingredient_quantity: null,
    ingredient_unit: null,
    recipe_base_type_id: null,
    recipe_base_name: null,
    recipe_base_quantity: 1,
    recipe_lines: [],
    prepared_recipe_lines: [],
    linked_product_id: null,
    linked_product_name: null,
    linked_product_quantity: 1,
    unit_cost: null,
  }
}

export function resetModifierFieldsForType(modifier: ModifierFormRow, nextType: ModifierOptionType) {
  modifier.option_type = nextType
  modifier.ingredient_id = null
  modifier.ingredient_name = null
  modifier.ingredient_quantity = null
  modifier.ingredient_unit = null
  modifier.recipe_base_type_id = null
  modifier.recipe_base_name = null
  modifier.recipe_base_quantity = 1
  modifier.recipe_lines = []
  modifier.prepared_recipe_lines = []
  modifier.linked_product_id = null
  modifier.linked_product_name = null
  modifier.linked_product_quantity = 1
  modifier.unit_cost = null
}

export function getRecipeBaseIngredientIds(
  recipeBaseTypeId: string | null,
  recipeBases: Array<Record<string, unknown>>,
): string[] {
  if (!recipeBaseTypeId) return []
  const base = recipeBases.find(row => String(row.id) === recipeBaseTypeId)
  const ingredients = base?.ingredients
  if (!Array.isArray(ingredients)) return []
  return ingredients
    .map((ing: Record<string, unknown>) => String(ing.ingredient_id || ing.id || ''))
    .filter(Boolean)
}

export function collectModifierRecipeExcludedIngredientIds(
  row: ModifierFormRow,
  recipeBaseIngredientIds: string[] = [],
): string[] {
  return [
    ...recipeBaseIngredientIds,
    ...row.recipe_lines.map(line => line.ingredient_id),
    ...row.prepared_recipe_lines.map(line => line.ingredient_id),
  ].filter(Boolean)
}

export function mapModifierFromApi(m: Record<string, unknown>): ModifierFormRow {
  const optionType = String(m.option_type || 'INGREDIENT').toUpperCase() as ModifierOptionType
  const ingredient = m.ingredient as { id?: string; name?: string } | undefined
  const recipeBase = m.recipe_base as { id?: string; name?: string } | undefined
  const linkedProduct = m.linked_product as { id?: string; name?: string } | undefined
  const recipeLines = Array.isArray(m.recipe_lines)
    ? (m.recipe_lines as Array<Record<string, unknown>>)
    : []

  return {
    name: String(m.name || ''),
    price: Number(m.price ?? 0),
    max_limit: Number(m.max_limit ?? 1),
    included_quantity: Number(m.included_quantity ?? 0),
    is_default: Boolean(m.is_default),
    is_available: m.is_available !== false,
    sort_order: Number(m.sort_order ?? 0),
    option_type: OPTION_TYPES.includes(optionType) ? optionType : 'INGREDIENT',
    ingredient_id: (m.ingredient_id as string) || ingredient?.id || null,
    ingredient_name: ingredient?.name || (m.ingredient_name as string) || null,
    ingredient_quantity: m.ingredient_quantity != null ? Number(m.ingredient_quantity) : null,
    ingredient_unit: (m.ingredient_unit as string) || null,
    recipe_base_type_id: (m.recipe_base_type_id as string) || recipeBase?.id || null,
    recipe_base_name: recipeBase?.name || null,
    recipe_base_quantity: Number(m.recipe_base_quantity ?? 1),
    recipe_lines: recipeLines.map(line => {
      const lineIngredient = line.ingredient as { name?: string } | undefined
      return {
        ingredient_id: String(line.ingredient_id || ''),
        ingredient_name: lineIngredient?.name || String(line.ingredient_name || ''),
        quantity: line.quantity != null ? Number(line.quantity) : null,
        unit: line.unit ? String(line.unit) : null,
      }
    }),
    prepared_recipe_lines: [],
    linked_product_id: (m.linked_product_id as string) || linkedProduct?.id || null,
    linked_product_name: linkedProduct?.name || null,
    linked_product_quantity: Number(m.linked_product_quantity ?? 1),
    unit_cost: m.unit_cost != null ? Number(m.unit_cost) : null,
  }
}

export function serializeModifierForApi(row: ModifierFormRow) {
  const optionType = row.option_type
  const recipeLines = [
    ...row.recipe_lines,
    ...row.prepared_recipe_lines,
  ].map(line => ({
    ingredient_id: line.ingredient_id,
    quantity: line.quantity,
    unit: line.unit,
  }))
  return {
    name: row.name.trim(),
    price: row.price,
    max_limit: row.max_limit,
    included_quantity: row.included_quantity,
    is_default: row.is_default,
    is_available: row.is_available,
    sort_order: row.sort_order,
    option_type: optionType,
    ingredient_id: optionType === 'INGREDIENT' ? row.ingredient_id : null,
    ingredient_quantity: optionType === 'INGREDIENT' ? row.ingredient_quantity : null,
    ingredient_unit: optionType === 'INGREDIENT' ? row.ingredient_unit : null,
    recipe_base_type_id: optionType === 'RECIPE' ? (row.recipe_base_type_id || null) : null,
    recipe_base_quantity: optionType === 'RECIPE' ? row.recipe_base_quantity : 1,
    recipe_lines: optionType === 'RECIPE' ? recipeLines : null,
    linked_product_id: optionType === 'PRODUCT' ? (row.linked_product_id || null) : null,
    linked_product_quantity: optionType === 'PRODUCT' ? row.linked_product_quantity : 1,
  }
}

export function validateModifierOption(
  row: ModifierFormRow,
  options?: { recipeBaseIngredientIds?: string[] },
): string | null {
  if (!row.name?.trim()) {
    return 'Cada opción debe tener un nombre.'
  }
  if (!Number.isInteger(row.included_quantity) || row.included_quantity < 0) {
    return `La cantidad incluida de «${row.name}» debe ser un número entero mayor o igual a 0.`
  }
  if (!Number.isInteger(row.max_limit) || row.max_limit < 1) {
    return `La cantidad máxima de «${row.name}» debe ser un número entero mayor o igual a 1.`
  }
  if (row.included_quantity > row.max_limit) {
    return `La cantidad incluida de «${row.name}» no puede superar la cantidad máxima.`
  }

  const type = row.option_type
  if (type === 'INGREDIENT') {
    if (!row.ingredient_id) return `La opción «${row.name}» requiere un ingrediente o reventa.`
    if (row.ingredient_quantity == null || row.ingredient_quantity <= 0) {
      return `Indica la cantidad del ingrediente en «${row.name}».`
    }
    if (!row.ingredient_unit?.trim()) {
      return `Indica la unidad del ingrediente en «${row.name}».`
    }
  }
  if (type === 'RECIPE') {
    const recipeLines = [...row.recipe_lines, ...row.prepared_recipe_lines]
    if (!row.recipe_base_type_id && recipeLines.length === 0) {
      return `La opción «${row.name}» requiere una receta base o ingredientes.`
    }
    const seenIds = new Set<string>(options?.recipeBaseIngredientIds ?? [])
    for (const line of recipeLines) {
      if (!line.ingredient_id || line.quantity == null || line.quantity <= 0 || !line.unit?.trim()) {
        return `Completa ingrediente, cantidad y unidad en la receta de «${row.name}».`
      }
      if (seenIds.has(line.ingredient_id)) {
        return `La receta de «${row.name}» tiene ingredientes duplicados.`
      }
      seenIds.add(line.ingredient_id)
    }
  }
  if (type === 'PRODUCT') {
    if (!row.linked_product_id) return `La opción «${row.name}» requiere un producto del menú.`
    if (row.linked_product_quantity == null || row.linked_product_quantity <= 0) {
      return `Indica la cantidad del producto en «${row.name}».`
    }
  }
  return null
}

export function formatModifierOptionTypeLabel(type: string): string {
  switch (String(type).toUpperCase()) {
    case 'INGREDIENT':
      return 'Ingrediente'
    case 'RECIPE':
      return 'Receta'
    case 'PRODUCT':
      return 'Producto'
    case 'NONE':
      return 'Solo precio'
    default:
      return type
  }
}

export function formatModifierCurrency(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}
