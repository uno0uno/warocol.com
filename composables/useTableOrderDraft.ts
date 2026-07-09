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
