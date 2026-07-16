export type SaleModifierOptionType = 'INGREDIENT' | 'RECIPE' | 'PRODUCT' | 'NONE'

export interface ModifierPriceSelection {
  price: number
  quantity?: number
  included_quantity?: number
}

export interface SaleModifierOption {
  id: string
  name: string
  price: number
  max_limit: number
  included_quantity: number
  option_type: SaleModifierOptionType
  type_label: string
}

/** Charge only selected units above the included threshold. */
export function modifierLineTotal(mod: ModifierPriceSelection): number {
  const selected = Math.max(0, Number(mod.quantity ?? 1) || 0)
  const included = Math.max(0, Number(mod.included_quantity ?? 0) || 0)
  return Number(mod.price) * Math.max(selected - included, 0)
}

export function modifiersCartTotal(mods: ModifierPriceSelection[]): number {
  return mods.reduce((sum, mod) => sum + modifierLineTotal(mod), 0)
}

export function saleLineTotal(
  unitPrice: number,
  productQuantity: number,
  modifiers: ModifierPriceSelection[],
): number {
  const quantity = Math.max(0, Number(productQuantity) || 0)
  return (Number(unitPrice) + modifiersCartTotal(modifiers)) * quantity
}

export function normalizeModifierOptionType(raw: unknown): SaleModifierOptionType {
  const t = String(raw || 'INGREDIENT').toUpperCase()
  if (t === 'INGREDIENT' || t === 'RECIPE' || t === 'PRODUCT' || t === 'NONE') return t
  return 'INGREDIENT'
}

function formatModifierOptionTypeLabel(type: SaleModifierOptionType): string {
  if (type === 'INGREDIENT') return 'Ingrediente'
  if (type === 'RECIPE') return 'Receta'
  if (type === 'PRODUCT') return 'Producto'
  return 'Solo precio'
}

export function mapApiModifierToSaleOption(mod: Record<string, unknown>): SaleModifierOption {
  const option_type = normalizeModifierOptionType(mod.option_type)
  return {
    id: String(mod.id),
    name: String(mod.name || ''),
    price: Number(mod.price) || 0,
    max_limit: Number(mod.max_limit) || 1,
    included_quantity: Math.max(0, Number(mod.included_quantity) || 0),
    option_type,
    type_label: formatModifierOptionTypeLabel(option_type),
  }
}

/** Price label for POS / online / manual sale UIs. */
export function formatSaleModifierPriceLabel(
  price: number,
  formatCurrency: (n: number) => string,
  includedQuantity = 0,
  labels?: {
    included?: string
    perAdditional?: string
    noAdditionalCost?: string
  },
): string {
  const included = Math.max(0, Number(includedQuantity) || 0)
  if (included > 0) {
    const includedText = labels?.included ?? `${included} incl.`
    if (price > 0) return `${includedText} · + ${formatCurrency(price)} ${labels?.perAdditional ?? 'por adicional'}`
    if (price < 0) return `${includedText} · ${formatCurrency(price)} ${labels?.perAdditional ?? 'por adicional'}`
    return `${includedText} · ${labels?.noAdditionalCost ?? 'sin costo adicional'}`
  }
  if (price > 0) return `+ ${formatCurrency(price)}`
  if (price < 0) return formatCurrency(price)
  return 'Incluido'
}

export function saleModifierPriceClass(price: number): string {
  if (price > 0) return 'text-primary'
  if (price < 0) return 'text-success'
  return 'text-text-secondary'
}
