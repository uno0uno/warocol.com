import type { CartModifier } from '~/stores/online_cart'
import {
  formatModifierOptionTypeLabel,
  type ModifierOptionType,
} from '~/composables/useModifierOptionForm'

export interface SaleModifierOption {
  id: string
  name: string
  price: number
  max_limit: number
  option_type: ModifierOptionType
  type_label: string
}

/** Line total for one modifier selection (supports qty steppers and negative = discount). */
export function modifierLineTotal(mod: Pick<CartModifier, 'price' | 'quantity'>): number {
  return Number(mod.price) * (mod.quantity ?? 1)
}

export function modifiersCartTotal(mods: CartModifier[]): number {
  return mods.reduce((sum, mod) => sum + modifierLineTotal(mod), 0)
}

export function normalizeModifierOptionType(raw: unknown): ModifierOptionType {
  const t = String(raw || 'INGREDIENT').toUpperCase()
  if (t === 'INGREDIENT' || t === 'RECIPE' || t === 'PRODUCT' || t === 'NONE') return t
  return 'INGREDIENT'
}

export function mapApiModifierToSaleOption(mod: Record<string, unknown>): SaleModifierOption {
  const option_type = normalizeModifierOptionType(mod.option_type)
  return {
    id: String(mod.id),
    name: String(mod.name || ''),
    price: Number(mod.price) || 0,
    max_limit: Number(mod.max_limit) || 1,
    option_type,
    type_label: formatModifierOptionTypeLabel(option_type),
  }
}

/** Price label for POS / online / manual sale UIs. */
export function formatSaleModifierPriceLabel(
  price: number,
  formatCurrency: (n: number) => string,
): string {
  if (price > 0) return `+ ${formatCurrency(price)}`
  if (price < 0) return formatCurrency(price)
  return 'Incluido'
}

export function saleModifierPriceClass(price: number): string {
  if (price > 0) return 'text-primary'
  if (price < 0) return 'text-success'
  return 'text-text-secondary'
}
