/**
 * Ingredient unit options for recipe/composition UIs (dual-unit und → gr/ml + catalog).
 *
 * Backend mirror: `resolve_recipe_quantity_to_base_unit` in
 * `api_warocol.com/app/services/ingredient_purchase_units_service.py` — converts
 * recipe quantities in gr/ml/und/catalog keys (lt, kg, …) to the ingredient base unit.
 *
 * warocol.com#773
 */

export interface IngredientForUnits {
  unit?: string
  unit_weight_gr?: number | null
  unit_weight_unit?: string | null
}

export interface UnitOption {
  value: string
  label: string
}

export interface UnitCatalogEntry {
  label: string
  factor: number
  base: 'gr' | 'ml'
}

export interface PurchaseUnitForOptions {
  purchase_unit?: string
  purchase_unit_label?: string
  conversion_factor?: number
}

/** Display labels for base and weight units in recipe selectors. */
export const UNIT_LABELS: Record<string, string> = {
  g: 'Gramos (g)',
  gr: 'Gramos (gr)',
  kg: 'Kilogramos (kg)',
  ml: 'Mililitros (ml)',
  l: 'Litros (l)',
  u: 'Unidades (u)',
  und: 'Unidades (und)',
  lb: 'Libras (lb)',
}

/** Standard catalog matching backend PURCHASE_UNIT_CATALOG / _CATALOG_TO_BASE. */
export const UNIT_CATALOG: Record<string, UnitCatalogEntry> = {
  kg: { label: 'Kilogramo', factor: 1000, base: 'gr' },
  libra: { label: 'Libra', factor: 500, base: 'gr' },
  arroba: { label: 'Arroba', factor: 12500, base: 'gr' },
  bulto_25kg: { label: 'Bulto (25 kg)', factor: 25000, base: 'gr' },
  lt: { label: 'Litro', factor: 1000, base: 'ml' },
  botella: { label: 'Botella', factor: 750, base: 'ml' },
  galon: { label: 'Galón', factor: 3785, base: 'ml' },
}

export function allUnitLabelOptions(): UnitOption[] {
  return Object.entries(UNIT_LABELS).map(([value, label]) => ({ value, label }))
}

export function isDualUnitIngredient(
  ingredient: IngredientForUnits | null | undefined,
): boolean {
  if (!ingredient) return false
  const baseUnit = ingredient.unit || 'g'
  return !!(
    ingredient.unit_weight_gr
    && ingredient.unit_weight_gr > 0
    && ingredient.unit_weight_unit
    && ingredient.unit_weight_unit !== baseUnit
  )
}

/** Default recipe unit: prefers unit_weight_unit when dual-unit. */
export function defaultUnitForIngredient(
  ingredient: IngredientForUnits | null | undefined,
): string {
  if (
    ingredient?.unit_weight_gr
    && ingredient.unit_weight_gr > 0
    && ingredient.unit_weight_unit
    && ingredient.unit_weight_unit !== ingredient.unit
  ) {
    return ingredient.unit_weight_unit
  }
  return ingredient?.unit || 'g'
}

export function formatCatalogOptionLabel(
  entry: Pick<UnitCatalogEntry, 'label' | 'factor'>,
  weightUnit: string,
): string {
  return `${entry.label} · ${entry.factor.toLocaleString('es-CO')} ${weightUnit}`
}

export function formatPurchaseUnitOptionLabel(
  purchaseUnitLabel: string,
  conversionFactor: number,
  baseUnit: string,
): string {
  return `${purchaseUnitLabel} · ${Number(conversionFactor).toLocaleString('es-CO')} ${baseUnit}`
}

/** Catalog keys (kg, lt, …) for a dual-unit weight base (gr | ml). */
export function buildDualUnitCatalogOptions(weightUnit: string): UnitOption[] {
  return Object.entries(UNIT_CATALOG)
    .filter(([, entry]) => entry.base === weightUnit)
    .map(([key, entry]) => ({
      value: key,
      label: formatCatalogOptionLabel(entry, weightUnit),
    }))
}

/** Same as buildDualUnitCatalogOptions but includes conversion_factor (compras-directas). */
export function buildDualUnitCatalogOptionsWithMeta(weightUnit: string): Array<UnitOption & { conversion_factor: number }> {
  return Object.entries(UNIT_CATALOG)
    .filter(([, entry]) => entry.base === weightUnit)
    .map(([key, entry]) => ({
      value: key,
      label: formatCatalogOptionLabel(entry, weightUnit),
      conversion_factor: entry.factor,
    }))
}

/**
 * Recipe/composition unit dropdown options ({ value, label }).
 * When ingredient is missing but an id was provided, uses base unit fallback `g`.
 */
export function buildRecipeUnitOptions(params: {
  ingredient?: IngredientForUnits | null
  purchaseUnits?: PurchaseUnitForOptions[]
}): UnitOption[] {
  const { ingredient, purchaseUnits = [] } = params
  const baseUnit = ingredient?.unit || 'g'

  const options: UnitOption[] = [
    { value: baseUnit, label: UNIT_LABELS[baseUnit] || baseUnit },
  ]

  const weightUnit = ingredient?.unit_weight_unit
  if (isDualUnitIngredient(ingredient) && weightUnit) {
    options.push({ value: weightUnit, label: UNIT_LABELS[weightUnit] || weightUnit })
    options.push(...buildDualUnitCatalogOptions(weightUnit))
  }

  purchaseUnits.forEach((pu) => {
    if (pu.purchase_unit && !options.find(o => o.value === pu.purchase_unit)) {
      options.push({
        value: pu.purchase_unit,
        label: formatPurchaseUnitOptionLabel(
          pu.purchase_unit_label || pu.purchase_unit,
          Number(pu.conversion_factor) || 0,
          baseUnit,
        ),
      })
    }
  })

  return options
}

export function useIngredientUnitOptions() {
  function getIngredientUnitOptions(
    ingredientId: string,
    caches: {
      ingredientCache: Record<string, IngredientForUnits>
      purchaseUnitsCache: Map<string, PurchaseUnitForOptions[]>
    },
  ): UnitOption[] {
    if (!ingredientId) return allUnitLabelOptions()
    const ingredient = caches.ingredientCache[ingredientId]
    const purchaseUnits = caches.purchaseUnitsCache.get(ingredientId) || []
    return buildRecipeUnitOptions({ ingredient, purchaseUnits })
  }

  return {
    UNIT_LABELS,
    UNIT_CATALOG,
    allUnitLabelOptions,
    isDualUnitIngredient,
    defaultUnitForIngredient,
    formatCatalogOptionLabel,
    formatPurchaseUnitOptionLabel,
    buildDualUnitCatalogOptions,
    buildDualUnitCatalogOptionsWithMeta,
    buildRecipeUnitOptions,
    getIngredientUnitOptions,
  }
}
