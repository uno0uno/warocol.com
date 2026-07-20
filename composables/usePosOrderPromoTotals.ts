import {
  computeLinePromoSavings,
  computePromoEligibleSubtotal,
  linePromoSavingsForProduct,
  pickBestPromotionForProduct,
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
  promotionName?: string | null
  promoType?: string | null
  promoSavings?: number
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
    const fromApi = Number(item.promoSavings) || 0
    if (fromApi > 0) return fromApi
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

  /**
   * Server-truth rule (#1697): when the API evaluated the tab (any line reports
   * savings), per-line API values are authoritative — a sibling line reporting 0
   * is a valid answer (cross-line allocation granted the free units to another
   * line), not "unevaluated". The client fallback only runs when the server did
   * not evaluate at all, and mirrors the server cross-line BOGO allocation
   * (cheapest-first per product+promo) instead of per-line isolated math.
   */
  const apiTabEvaluated = computed(() =>
    getTabItems().some(
      (item) => !item.promoOptOut && (Number(item.promoSavings) || 0) > 0,
    ),
  )

  /** Cross-line fallback per tab-line index — mirrors the server rule (#1023). */
  const tabFallbackSavings = computed((): number[] => {
    const items = getTabItems()
    const result = items.map(() => 0)
    const bogoGroups = new Map<
      string,
      { promo: NonNullable<ReturnType<typeof pickBestPromotionForProduct>>; indices: number[] }
    >()

    items.forEach((item, idx) => {
      if (item.promoOptOut) return
      const categoryId = item.categoryId ?? categoryForProduct(item.productId)
      const promo = pickBestPromotionForProduct(
        activePromos.value,
        item.productId,
        categoryId,
        promoPickOptions.value,
      )
      if (!promo) return
      if (promo.promo_type === 'bogo') {
        const key = `${item.productId}:${promo.id}`
        const group = bogoGroups.get(key) ?? { promo, indices: [] }
        group.indices.push(idx)
        bogoGroups.set(key, group)
      } else {
        result[idx] = computeLinePromoSavings(
          { subtotal: item.subtotal, quantity: item.quantity },
          promo,
        )
      }
    })

    for (const { promo, indices } of bogoGroups.values()) {
      const valueJson = (promo.value_json ?? {}) as Record<string, unknown>
      const buyQty = Number(valueJson.buy_qty) || 0
      const getQty = Number(valueJson.get_qty) || 0
      if (buyQty < 1 || getQty < 1) continue
      const bundle = buyQty + getQty

      // Expand sibling lines to units; free units go cheapest-first (stable).
      const units: Array<{ idx: number; unitPrice: number }> = []
      for (const idx of indices) {
        const item = items[idx]
        const qty = Math.max(0, Math.floor(Number(item.quantity) || 0))
        const unitPrice = qty > 0 ? (Number(item.subtotal) || 0) / qty : 0
        for (let u = 0; u < qty; u++) units.push({ idx, unitPrice })
      }
      const freeCount = Math.floor(units.length / bundle) * getQty
      if (freeCount <= 0) continue
      const sorted = [...units].sort((a, b) => a.unitPrice - b.unitPrice)
      for (const unit of sorted.slice(0, freeCount)) {
        const lineCap = Math.round(Number(items[unit.idx].subtotal) || 0)
        result[unit.idx] = Math.min(
          Math.round(result[unit.idx] + unit.unitPrice),
          lineCap,
        )
      }
    }

    return result
  })

  function tabLinePromoSavings(item: PosPromoTabItem): number {
    if (item.promoOptOut) return 0
    if (apiTabEvaluated.value) return Number(item.promoSavings) || 0
    const idx = getTabItems().indexOf(item)
    return idx >= 0 ? tabFallbackSavings.value[idx] : 0
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
