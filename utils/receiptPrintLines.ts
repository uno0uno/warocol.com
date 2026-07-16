import { modifierLineTotal } from './saleModifierOption'

export type ReceiptPrintLineModifier = {
  id?: string | number | null
  modifier_id?: string | number | null
  name?: string | null
  modifier_name?: string | null
  price?: number | string | null
  price_at_purchase?: number | string | null
  quantity?: number | string | null
  included_quantity?: number | string | null
  total?: number | string | null
}

export type ReceiptTicketItem = {
  id?: string | number | null
  productId?: string | number | null
  name: string
  quantity: number
  unitPrice: number
  total: number
  notes?: string | null
  modifiers: Array<{
    id?: string | number | null
    name: string
    quantity: number
    price: number
    included_quantity: number
    total: number
  }>
  promotionName?: string | null
  promoType?: string | null
  promoSavings?: number | string | null
  promoOptOut?: boolean | null
  discountAllocated?: number | string | null
  netTotal?: number | string | null
  taxCategory?: string | null
}

type ReceiptTicketSourceItem = {
  id?: string | number | null
  orderItemId?: string | number | null
  product?: {
    id?: string | number | null
    name?: string | null
    price?: number | string | null
  } | null
  productId?: string | number | null
  product_id?: string | number | null
  productName?: string | null
  name?: string | null
  quantity?: number | string | null
  unitPrice?: number | string | null
  unit_price?: number | string | null
  price_at_purchase?: number | string | null
  total?: number | string | null
  subtotal?: number | string | null
  notes?: string | null
  modifiers?: ReceiptPrintLineModifier[] | null
  promotionName?: string | null
  promotion_name?: string | null
  promoType?: string | null
  promotion_type?: string | null
  promoSavings?: number | string | null
  promo_savings_allocated?: number | string | null
  promoOptOut?: boolean | null
  promo_opt_out?: boolean | null
  discountAllocated?: number | string | null
  discount_allocated?: number | string | null
  netTotal?: number | string | null
  net_total?: number | string | null
  taxCategory?: string | null
  tax_category?: string | null
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

const finiteNumber = (...values: Array<number | string | null | undefined>) => {
  for (const value of values) {
    if (value == null || value === '') continue
    const numeric = Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return null
}

/**
 * Adapts the nested POS cart/tab shape to the flat contract consumed by
 * ReceiptPrintTicket. Keeping this boundary explicit prevents Vue's runtime
 * Object prop validation from accepting structurally incompatible line items.
 */
export function buildReceiptTicketItems(
  items: readonly ReceiptTicketSourceItem[],
): ReceiptTicketItem[] {
  return items.map((item) => {
    const quantity = finiteNumber(item.quantity) || 1
    const modifiers = (item.modifiers ?? []).map((modifier) => {
      const modifierQuantity = finiteNumber(modifier.quantity) || 1
      const includedQuantity = Math.max(0, finiteNumber(modifier.included_quantity) || 0)
      const price = finiteNumber(modifier.price, modifier.price_at_purchase) || 0
      return {
        id: modifier.id ?? modifier.modifier_id ?? null,
        name: String(modifier.name ?? modifier.modifier_name ?? ''),
        quantity: modifierQuantity,
        price,
        included_quantity: includedQuantity,
        total: modifierLineTotal({
          price,
          quantity: modifierQuantity,
          included_quantity: includedQuantity,
        }),
      }
    })
    const basePrice = finiteNumber(
      item.product?.price,
      item.unitPrice,
      item.unit_price,
      item.price_at_purchase,
    ) || 0
    const calculatedTotal = (
      basePrice + modifiers.reduce((sum, modifier) => sum + modifier.total, 0)
    ) * quantity
    const total = finiteNumber(item.total, item.subtotal) ?? calculatedTotal

    return {
      id: item.id ?? item.orderItemId ?? null,
      productId: item.product?.id ?? item.productId ?? item.product_id ?? null,
      name: String(item.product?.name ?? item.productName ?? item.name ?? ''),
      quantity,
      unitPrice: quantity > 0 ? total / quantity : 0,
      total,
      notes: item.notes ?? null,
      modifiers,
      promotionName: item.promotionName ?? item.promotion_name ?? null,
      promoType: item.promoType ?? item.promotion_type ?? null,
      promoSavings: item.promoSavings ?? item.promo_savings_allocated ?? null,
      promoOptOut: item.promoOptOut ?? item.promo_opt_out ?? null,
      discountAllocated: item.discountAllocated ?? item.discount_allocated ?? null,
      netTotal: item.netTotal ?? item.net_total ?? null,
      taxCategory: item.taxCategory ?? item.tax_category ?? null,
    }
  })
}

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
