export interface DraftPurchaseUnit {
  purchase_unit_label: string
  purchase_unit: string
  conversion_factor: number
  is_default: boolean
}

export interface PurchaseUnitSuggestion {
  purchase_unit: string
  label: string
  conversion_factor: number
}

export function defaultUndDraftUnits(): DraftPurchaseUnit[] {
  return [{
    purchase_unit_label: 'Unidad',
    purchase_unit: 'und',
    conversion_factor: 1,
    is_default: true,
  }]
}

export function usesCustomPurchaseUnitsDraft(units: DraftPurchaseUnit[]): boolean {
  if (units.length === 0) return false
  if (units.length > 1) return true
  const only = units[0]
  return only.purchase_unit !== 'und'
    || only.purchase_unit_label !== 'Unidad'
    || only.conversion_factor !== 1
}

export async function persistDraftPurchaseUnits(ingredientId: string, units: DraftPurchaseUnit[]) {
  for (const unit of units) {
    await $fetch('/api/suppliers/ingredient-purchase-units/', {
      method: 'POST',
      body: {
        ingredient_id: ingredientId,
        purchase_unit_label: unit.purchase_unit_label,
        purchase_unit: unit.purchase_unit,
        conversion_factor: unit.conversion_factor,
        is_default: unit.is_default,
        is_active: true,
      },
    })
  }
}
