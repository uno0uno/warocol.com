export type ReceiptPrintLineModifier = {
  id?: string | number | null
  modifier_id?: string | number | null
  name?: string | null
  modifier_name?: string | null
  price?: number | string | null
  price_at_purchase?: number | string | null
  quantity?: number | string | null
}

type ConsolidateOptions<T> = {
  productKey: (item: T) => string | number | null | undefined
  displayName: (item: T) => string | null | undefined
  quantity: (item: T) => number | string | null | undefined
  unitPrice: (item: T) => number | string | null | undefined
  total: (item: T) => number | string | null | undefined
  modifiers?: (item: T) => ReceiptPrintLineModifier[] | null | undefined
  notes?: (item: T) => string | null | undefined
  guards?: (item: T) => Array<string | number | boolean | null | undefined>
  merge: (base: T, aggregate: { quantity: number; total: number }) => T
}

const numericKey = (value: number | string | null | undefined) => {
  const n = Number(value)
  return Number.isFinite(n) ? n.toFixed(6) : '0.000000'
}

const textKey = (value: string | number | boolean | null | undefined) =>
  String(value ?? '').trim().toLowerCase()

const modifierIdentity = (modifier: ReceiptPrintLineModifier) => {
  const id = modifier.modifier_id ?? modifier.id ?? ''
  const name = modifier.modifier_name ?? modifier.name ?? ''
  const price = modifier.price_at_purchase ?? modifier.price
  return {
    id: textKey(id),
    name: textKey(name),
    price: numericKey(price),
    quantity: numericKey(modifier.quantity ?? 1),
  }
}

const modifiersKey = (modifiers: ReceiptPrintLineModifier[] = []) =>
  JSON.stringify(
    modifiers
      .map(modifierIdentity)
      .sort((a, b) =>
        `${a.id}|${a.name}|${a.price}|${a.quantity}`.localeCompare(`${b.id}|${b.name}|${b.price}|${b.quantity}`)
      )
  )

export function consolidateReceiptPrintLines<T>(
  items: readonly T[],
  options: ConsolidateOptions<T>,
): T[] {
  const grouped = new Map<string, { item: T; quantity: number; total: number }>()

  for (const item of items) {
    const key = JSON.stringify({
      product: textKey(options.productKey(item)),
      name: textKey(options.displayName(item)),
      unitPrice: numericKey(options.unitPrice(item)),
      notes: textKey(options.notes?.(item)),
      modifiers: modifiersKey(options.modifiers?.(item) ?? []),
      guards: (options.guards?.(item) ?? []).map(value => textKey(value)),
    })

    const quantity = Number(options.quantity(item)) || 0
    const total = Number(options.total(item)) || 0
    const existing = grouped.get(key)

    if (existing) {
      existing.quantity += quantity
      existing.total += total
    } else {
      grouped.set(key, { item, quantity, total })
    }
  }

  return Array.from(grouped.values()).map(group =>
    options.merge(group.item, {
      quantity: group.quantity,
      total: group.total,
    })
  )
}
