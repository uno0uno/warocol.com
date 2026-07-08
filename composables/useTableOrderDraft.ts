export interface TableOrderItem {
  id: string
}

export function getTableOrderIds(items: readonly TableOrderItem[]): string[] {
  return items.map((item) => item.id)
}

export function areTableOrdersEqual(
  left: readonly TableOrderItem[],
  right: readonly TableOrderItem[],
): boolean {
  if (left.length !== right.length) return false
  return left.every((item, index) => item.id === right[index]?.id)
}

export function canMoveTableOrderItem(
  items: readonly TableOrderItem[],
  itemId: string,
  direction: -1 | 1,
): boolean {
  const index = items.findIndex((item) => item.id === itemId)
  if (index === -1) return false
  const nextIndex = index + direction
  return nextIndex >= 0 && nextIndex < items.length
}

export function moveTableOrderItem<T extends TableOrderItem>(
  items: readonly T[],
  itemId: string,
  direction: -1 | 1,
): T[] {
  const index = items.findIndex((item) => item.id === itemId)
  const nextIndex = index + direction
  if (index === -1 || nextIndex < 0 || nextIndex >= items.length) {
    return [...items]
  }

  const next = [...items]
  const currentItem = next[index]
  next[index] = next[nextIndex]
  next[nextIndex] = currentItem
  return next
}
