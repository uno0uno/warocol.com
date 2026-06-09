import {
  computePromoEligibleSubtotal,
  linePromoSavingsForProduct,
  promoBadgeForProduct,
  type PromoBadgeDisplay,
} from '~/utils/promoProductMatch'

export type PosPromoCartItem = {
  product: {
    id: string
    price: number
  }
  modifiers: Array<{ id: string; price: number; quantity?: number }>
  quantity: number
  promo_opt_out?: boolean
}

export type PosPromoTabItem = {
  productId: string
  categoryId?: string | null
  quantity: number
  subtotal: number
  promoSavings?: number
  promoOptOut?: boolean
  modifiers?: Array<{ price: number; quantity?: number }>
}

/** Shared POS cart/tab promo savings — keeps CartPanel and mobile bar in sync (#1094). */
export function usePosOrderPromoTotals(
  getCartItems: () => PosPromoCartItem[],
  getTabItems: () => PosPromoTabItem[],
  getGrossTotal: () => number,
) {
  const posStore = usePOSStore()
  const { activePromos, promoPickOptions } = useActivePromotions()

  function categoryForProduct(productId: string): string | null {
    return posStore.getProduct(productId)?.category_id ?? null
  }

  function modifierGroupsForProduct(productId: string) {
    return posStore.getProduct(productId)?.modifier_groups ?? []
  }

  function cartLineGross(item: PosPromoCartItem): number {
    const basePrice = Number(item.product.price) || 0
    const modifiersPrice = (item.modifiers ?? []).reduce(
      (sum, mod) => sum + Number(mod.price) * (mod.quantity ?? 1),
      0,
    )
    return (basePrice + modifiersPrice) * Number(item.quantity)
  }

  function cartLinePromoSavings(item: PosPromoCartItem): number {
    if (item.promo_opt_out) return 0
    return linePromoSavingsForProduct(
      activePromos.value,
      item.product.id,
      {
        subtotal: cartLineGross(item),
        eligibleSubtotal: computePromoEligibleSubtotal(
          item.product.price,
          item.modifiers ?? [],
          modifierGroupsForProduct(item.product.id),
          item.quantity,
        ),
        quantity: item.quantity,
      },
      categoryForProduct(item.product.id),
      promoPickOptions.value,
    )
  }

  function tabLinePromoSavings(item: PosPromoTabItem): number {
    if (item.promoOptOut) return 0
    const fromApi = Number(item.promoSavings) || 0
    if (fromApi > 0) return fromApi
    const categoryId = item.categoryId ?? categoryForProduct(item.productId)
    return linePromoSavingsForProduct(
      activePromos.value,
      item.productId,
      { subtotal: item.subtotal, quantity: item.quantity },
      categoryId,
      promoPickOptions.value,
    )
  }

  function linePromoBadge(
    productId: string,
    categoryId?: string | null,
  ): PromoBadgeDisplay | null {
    return promoBadgeForProduct(
      activePromos.value,
      productId,
      categoryId,
      promoPickOptions.value,
    )
  }

  /** Hide cart-line badge when qty rules yield zero savings (scope-only badge stays on catalog). */
  function linePromoBadgeWhenSaving(
    productId: string,
    categoryId: string | null | undefined,
    savings: number,
  ): PromoBadgeDisplay | null {
    if (savings <= 0) return null
    return linePromoBadge(productId, categoryId)
  }

  const orderPromoSavings = computed(() => {
    let savings = 0
    for (const item of getTabItems()) {
      savings += tabLinePromoSavings(item)
    }
    for (const item of getCartItems()) {
      savings += cartLinePromoSavings(item)
    }
    return savings
  })

  const grossOrderTotal = computed(() => getGrossTotal())

  const netOrderTotal = computed(() =>
    Math.max(0, grossOrderTotal.value - orderPromoSavings.value),
  )

  return {
    cartLinePromoSavings,
    tabLinePromoSavings,
    linePromoBadgeWhenSaving,
    orderPromoSavings,
    grossOrderTotal,
    netOrderTotal,
  }
}
