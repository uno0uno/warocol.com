/**
 * Recipe-line costing aligned with API cost_resolution_service (#702 / #704 / #1748).
 * Prefer server `costo_linea`; else convert recipe qty → stock unit via unit_weight.
 */

const CATALOG_TO_BASE: Record<string, { factor: number; base: 'gr' | 'ml' }> = {
  kg: { factor: 1000, base: 'gr' },
  libra: { factor: 500, base: 'gr' },
  arroba: { factor: 12500, base: 'gr' },
  bulto_25kg: { factor: 25000, base: 'gr' },
  lt: { factor: 1000, base: 'ml' },
  botella: { factor: 750, base: 'ml' },
  galon: { factor: 3785, base: 'ml' },
}

export type RecipeCostLineInput = {
  costo_linea?: number | null
  base_quantity?: number | null
  quantity?: number | null
  unit?: string | null
  stock_unit?: string | null
  unit_weight_gr?: number | null
  costo_unitario?: number | null
  price?: number | null
}

export function recipeQtyToStockUnits(
  quantity: number,
  recipeUnit: string | null | undefined,
  stockUnit: string | null | undefined,
  unitWeightGr?: number | null,
): number {
  const qty = Number(quantity) || 0
  const ru = (recipeUnit || stockUnit || '').trim()
  const su = (stockUnit || '').trim()
  if (!su || !ru || ru === su) return qty

  const weight = Number(unitWeightGr)
  const hasWeight = Number.isFinite(weight) && weight > 0

  if (su === 'und' && (ru === 'gr' || ru === 'ml') && hasWeight) return qty / weight
  if (ru === 'und' && (su === 'gr' || su === 'ml') && hasWeight) return qty * weight

  const catalog = CATALOG_TO_BASE[ru]
  if (catalog && su === 'und' && hasWeight && (catalog.base === 'gr' || catalog.base === 'ml')) {
    return (qty * catalog.factor) / weight
  }

  return qty
}

/**
 * @param multiplier - scales API `costo_linea` or raw qty (e.g. recipe-base link quantity)
 */
export function recipeIngredientLineCost(
  ing: RecipeCostLineInput,
  options?: { multiplier?: number; unitCost?: number | null },
): number {
  const multiplier = Number(options?.multiplier ?? 1) || 1

  if (ing.costo_linea != null && Number.isFinite(Number(ing.costo_linea))) {
    return Number(ing.costo_linea) * multiplier
  }

  const qty = Number(ing.base_quantity ?? ing.quantity ?? 0) || 0
  const unitCost = Number(
    options?.unitCost ?? ing.costo_unitario ?? ing.price ?? 0,
  ) || 0
  const stockQty = recipeQtyToStockUnits(
    qty,
    ing.unit,
    ing.stock_unit,
    ing.unit_weight_gr,
  )
  return stockQty * unitCost * multiplier
}
