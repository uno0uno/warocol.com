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

export const UND_PURCHASE_UNIT_SUGGESTIONS: PurchaseUnitSuggestion[] = [
  { purchase_unit: 'und', label: 'Unidad', conversion_factor: 1 },
]

export function defaultUndPurchaseUnitsDraft(): DraftPurchaseUnit[] {
  return suggestionsToDraftUnits(UND_PURCHASE_UNIT_SUGGESTIONS)
}

export function suggestionsToDraftUnits(suggestions: PurchaseUnitSuggestion[]): DraftPurchaseUnit[] {
  return suggestions.map((s, i) => ({
    purchase_unit_label: s.label,
    purchase_unit: s.purchase_unit,
    conversion_factor: s.conversion_factor,
    is_default: i === 0,
  }))
}

export function draftMatchesCatalogSuggestions(
  draft: DraftPurchaseUnit[],
  suggestions: PurchaseUnitSuggestion[],
): boolean {
  if (draft.length !== suggestions.length) return false
  return draft.every((unit, index) => {
    const suggestion = suggestions[index]
    return unit.purchase_unit === suggestion.purchase_unit
      && unit.conversion_factor === suggestion.conversion_factor
      && unit.is_default === (index === 0)
  })
}

export function usesCustomPurchaseUnitsDraft(
  draft: DraftPurchaseUnit[],
  suggestions: PurchaseUnitSuggestion[],
): boolean {
  if (draft.length === 0) return false
  return !draftMatchesCatalogSuggestions(draft, suggestions)
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

export async function syncResalePurchaseUnitsDraft(
  ingredientId: string,
  draft: DraftPurchaseUnit[],
) {
  if (!usesCustomPurchaseUnitsDraft(draft, UND_PURCHASE_UNIT_SUGGESTIONS)) {
    return
  }

  try {
    const res: any = await $fetch(`/api/suppliers/ingredient-purchase-units/ingredient/${ingredientId}`)
    const existing = res?.data ?? []
    for (const unit of existing) {
      await $fetch(`/api/suppliers/ingredient-purchase-units/${unit.id}`, { method: 'DELETE' })
    }
  } catch {
    // Ingredient may not have units yet — continue with insert.
  }

  if (draft.length > 0) {
    await persistDraftPurchaseUnits(ingredientId, draft)
  }
}
