import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ActivePromotionRow } from './promoProductMatch.ts'
import {
  computeLinePromoSavings,
  linePromoSavingsForProduct,
  pickBestPromotionForProduct,
} from './promoProductMatch.ts'

const productId = 'product-1'
const categoryId = 'category-1'

function promo(
  overrides: Partial<ActivePromotionRow> & Pick<ActivePromotionRow, 'promo_type' | 'value_json'>,
): ActivePromotionRow {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    name: overrides.name ?? 'Test promo',
    promo_type: overrides.promo_type,
    scope_type: overrides.scope_type ?? 'all_products',
    schedules: overrides.schedules ?? [],
    value_json: overrides.value_json,
    priority: overrides.priority ?? 10,
    category_ids: overrides.category_ids,
    product_ids: overrides.product_ids,
  }
}

describe('pickBestPromotionForProduct', () => {
  it('bogo blocks percent and fixed at equal priority', () => {
    const bogo = promo({
      name: 'BOGO deal',
      promo_type: 'bogo',
      value_json: { buy_qty: 1, get_qty: 1 },
      priority: 10,
    })
    const percent = promo({
      name: 'Percent deal',
      promo_type: 'percent_off',
      value_json: { percent: 30 },
      priority: 10,
    })
    const fixed = promo({
      name: 'Fixed deal',
      promo_type: 'fixed_off',
      value_json: { amount_cop: 5000 },
      priority: 10,
    })

    const winner = pickBestPromotionForProduct([percent, fixed, bogo], productId)
    assert.equal(winner?.name, 'BOGO deal')
  })

  it('higher priority percent wins over bogo block', () => {
    const bogo = promo({
      name: 'BOGO',
      promo_type: 'bogo',
      value_json: { buy_qty: 1, get_qty: 1 },
      priority: 0,
    })
    const percent = promo({
      name: 'VIP percent',
      promo_type: 'percent_off',
      value_json: { percent: 30 },
      priority: 20,
    })

    const winner = pickBestPromotionForProduct([bogo, percent], productId)
    assert.equal(winner?.name, 'VIP percent')
  })

  it('product scope beats category at equal priority', () => {
    const categoryPromo = promo({
      id: 'category-promo',
      name: 'Category wide',
      promo_type: 'percent_off',
      value_json: { percent: 50 },
      scope_type: 'categories',
      priority: 10,
      category_ids: [categoryId],
    })
    const productPromo = promo({
      id: 'product-promo',
      name: 'Product specific',
      promo_type: 'percent_off',
      value_json: { percent: 10 },
      scope_type: 'products',
      priority: 10,
      product_ids: [productId],
    })

    const winner = pickBestPromotionForProduct(
      [categoryPromo, productPromo],
      productId,
      categoryId,
    )
    assert.equal(winner?.name, 'Product specific')
  })
})

describe('linePromoSavingsForProduct', () => {
  it('uses blocked winner savings for BOGO vs percent on same SKU', () => {
    const bogo = promo({
      name: 'BOGO',
      promo_type: 'bogo',
      value_json: { buy_qty: 1, get_qty: 1 },
      priority: 5,
    })
    const percent = promo({
      name: 'Half off',
      promo_type: 'percent_off',
      value_json: { percent: 50 },
      priority: 5,
    })

    const savings = linePromoSavingsForProduct(
      [bogo, percent],
      productId,
      { subtotal: 20000, quantity: 2 },
    )
    assert.equal(savings, 10000)
    assert.equal(
      computeLinePromoSavings({ subtotal: 20000, quantity: 2 }, percent),
      10000,
    )
    assert.equal(pickBestPromotionForProduct([bogo, percent], productId)?.name, 'BOGO')
  })
})
