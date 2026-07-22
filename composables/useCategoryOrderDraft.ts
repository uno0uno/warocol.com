export interface CategoryOrderItem {
  id: string
}

export function getCategoryOrderIds(items: readonly CategoryOrderItem[]): string[] {
  return items.map((item) => item.id)
}

export function areCategoryOrdersEqual(
  left: readonly CategoryOrderItem[],
  right: readonly CategoryOrderItem[],
): boolean {
  if (left.length !== right.length) return false
  return left.every((item, index) => item.id === right[index]?.id)
}
