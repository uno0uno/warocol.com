import { computed, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  usePosOrderPromoTotals,
  type PosPromoTabItem,
} from './usePosOrderPromoTotals'

const OKTOBERT = 'prod-oktobert'
const BOGO_PROMO = {
  id: 'promo-hofbrau',
  name: 'HofBrau Ockteber',
  promo_type: 'bogo',
  value_json: { buy_qty: 1, get_qty: 1 },
  scope_type: 'products',
  priority: 10,
  stackable: false,
  category_ids: [],
  product_ids: [OKTOBERT],
}

function stubGlobals(promos: unknown[] = [BOGO_PROMO]) {
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('usePOSStore', () => ({
    getProduct: () => null,
  }))
  vi.stubGlobal('useActivePromotions', () => ({
    activePromos: ref(promos),
    promoPickOptions: ref(undefined),
  }))
}

function tabLine(
  productId: string,
  quantity: number,
  subtotal: number,
  promoSavings = 0,
): PosPromoTabItem {
  return { productId, quantity, subtotal, promoSavings }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('usePosOrderPromoTotals — tab BOGO cross-line (#1697)', () => {
  it('trusts API per-line values when the server evaluated (4+2 -> 66000)', () => {
    stubGlobals()
    const items = [
      tabLine(OKTOBERT, 4, 88000, 66000),
      tabLine(OKTOBERT, 2, 44000, 0),
    ]
    const { orderPromoSavings, tabLinePromoSavings } = usePosOrderPromoTotals(
      () => [],
      () => items,
      () => 132000,
    )
    expect(orderPromoSavings.value).toBe(66000)
    expect(tabLinePromoSavings(items[0])).toBe(66000)
    expect(tabLinePromoSavings(items[1])).toBe(0)
  })

  it('cross-line fallback allocates free units across sibling lines (4+2 -> 3 free)', () => {
    stubGlobals()
    const items = [tabLine(OKTOBERT, 4, 88000), tabLine(OKTOBERT, 2, 44000)]
    const { orderPromoSavings } = usePosOrderPromoTotals(
      () => [],
      () => items,
      () => 132000,
    )
    // 6 units BOGO 1+1 -> 3 free -> 66000 total, never 4 free (88000)
    expect(orderPromoSavings.value).toBe(66000)
  })

  it('cross-line fallback matches a single-line evaluation (x2 -> 1 free)', () => {
    stubGlobals()
    const items = [tabLine(OKTOBERT, 2, 44000)]
    const { orderPromoSavings, tabLinePromoSavings } = usePosOrderPromoTotals(
      () => [],
      () => items,
      () => 44000,
    )
    expect(orderPromoSavings.value).toBe(22000)
    expect(tabLinePromoSavings(items[0])).toBe(22000)
  })

  it('respects promoOptOut on tab lines', () => {
    stubGlobals()
    const items: PosPromoTabItem[] = [
      { ...tabLine(OKTOBERT, 4, 88000), promoOptOut: true },
      tabLine(OKTOBERT, 2, 44000),
    ]
    const { orderPromoSavings } = usePosOrderPromoTotals(
      () => [],
      () => items,
      () => 132000,
    )
    // Only 2 eligible units -> 1 free
    expect(orderPromoSavings.value).toBe(22000)
  })

  it('returns zero when no promo matches the product', () => {
    stubGlobals()
    const items = [tabLine('prod-sin-promo', 4, 88000)]
    const { orderPromoSavings } = usePosOrderPromoTotals(
      () => [],
      () => items,
      () => 88000,
    )
    expect(orderPromoSavings.value).toBe(0)
  })
})
