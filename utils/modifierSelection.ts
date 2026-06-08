export interface ModifierSelection {
  id: string
  quantity?: number | null
}

interface CanIncrementModifierSelectionInput {
  selections: ModifierSelection[]
  modifierId: string
  modifierMaxLimit?: number | null
  groupOptionIds: string[]
  groupMaxSelections?: number | null
}

export function modifierSelectionQty(
  selections: ModifierSelection[],
  modifierId: string,
): number {
  return selections.find(selection => selection.id === modifierId)?.quantity ?? 0
}

export function modifierGroupSelectionCount(
  selections: ModifierSelection[],
  groupOptionIds: string[],
): number {
  const groupIds = new Set(groupOptionIds)
  return selections.filter(selection =>
    groupIds.has(selection.id) && (selection.quantity ?? 0) > 0
  ).length
}

export function canIncrementModifierSelection({
  selections,
  modifierId,
  modifierMaxLimit,
  groupOptionIds,
  groupMaxSelections,
}: CanIncrementModifierSelectionInput): boolean {
  const maxLimit = Math.max(1, Number(modifierMaxLimit) || 1)
  const maxSelections = Math.max(1, Number(groupMaxSelections) || 1)
  const currentQty = modifierSelectionQty(selections, modifierId)

  if (currentQty >= maxLimit) return false

  if (
    currentQty <= 0 &&
    modifierGroupSelectionCount(selections, groupOptionIds) >= maxSelections
  ) {
    return false
  }

  return true
}
