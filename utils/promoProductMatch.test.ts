import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { ActivePromotionRow } from './promoProductMatch.ts'
import {
  bogoMinQuantity,
  computeLinePromoSavings,
  computePromoEligibleSubtotal,
  linePromoSavingsForProduct,
  pickBestPromotionForProduct,
  promoBadgeForProduct,
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

describe('computeLinePromoSavings', () => {
  it('uses eligible subtotal for percent savings while preserving gross subtotal cap', () => {
    const percent = promo({
      promo_type: 'percent_off',
      value_json: { percent: 10 },
    })

    assert.equal(
      computeLinePromoSavings(
        { subtotal: 12000, eligibleSubtotal: 10000, quantity: 1 },
        percent,
      ),
      1000,
    )
  })

  it('caps fixed savings against eligible subtotal', () => {
    const fixed = promo({
      promo_type: 'fixed_off',
      value_json: { amount_cop: 15000 },
    })

    assert.equal(
      computeLinePromoSavings(
        { subtotal: 12000, eligibleSubtotal: 10000, quantity: 1 },
        fixed,
      ),
      10000,
    )
  })

  it('uses eligible unit price for same-line BOGO savings', () => {
    const bogo = promo({
      promo_type: 'bogo',
      value_json: { buy_qty: 1, get_qty: 1 },
    })

    assert.equal(
      computeLinePromoSavings(
        { subtotal: 24000, eligibleSubtotal: 20000, quantity: 2 },
        bogo,
      ),
      10000,
    )
  })
})

describe('computePromoEligibleSubtotal', () => {
  const groups = [
    {
      id: 'required-group',
      is_required: true,
      modifiers: [
        { id: 'required-cheese', is_default: false },
      ],
    },
    {
      id: 'min-group',
      minQty: 1,
      modifiers: [
        { id: 'min-sauce', isDefault: false },
      ],
    },
    {
      id: 'optional-group',
      isRequired: false,
      min_qty: 0,
      modifiers: [
        { id: 'default-bread', is_default: true },
        { id: 'optional-bacon', is_default: false },
        { id: 'optional-discount', is_default: false },
      ],
    },
  ]

  it('includes required, min-qty, and default modifiers', () => {
    assert.equal(
      computePromoEligibleSubtotal(
        10000,
        [
          { id: 'required-cheese', price: 1000, quantity: 2 },
          { id: 'min-sauce', price: 500, quantity: 1 },
          { id: 'default-bread', price: 700, quantity: 1 },
          { id: 'optional-bacon', price: 2000, quantity: 1 },
        ],
        groups,
        1,
      ),
      13200,
    )
  })

  it('excludes optional positive and negative modifiers from eligibility', () => {
    assert.equal(
      computePromoEligibleSubtotal(
        10000,
        [
          { id: 'optional-bacon', price: 2000, quantity: 1 },
          { id: 'optional-discount', price: -500, quantity: 1 },
        ],
        groups,
        1,
      ),
      10000,
    )
  })

  it('multiplies the eligible unit subtotal by quantity', () => {
    assert.equal(
      computePromoEligibleSubtotal(
        10000,
        [
          { id: 'required-cheese', price: 1000, quantity: 1 },
          { id: 'optional-bacon', price: 2000, quantity: 1 },
        ],
        groups,
        3,
      ),
      33000,
    )
  })
})

describe('bogoMinQuantity', () => {
  it('returns paid plus free units for bundle threshold', () => {
    assert.equal(bogoMinQuantity({ buy_qty: 2, get_qty: 1 }), 3)
    assert.equal(bogoMinQuantity({ buy_qty: 6, get_qty: 5 }), 11)
    assert.equal(bogoMinQuantity({ buy_qty: 5, get_qty: 1 }), 6)
  })
})

describe('promoBadgeForProduct', () => {
  it('includes BOGO minimum quantity in title', () => {
    const badge = promoBadgeForProduct(
      [
        promo({
          name: 'Pizza promo',
          promo_type: 'bogo',
          value_json: { buy_qty: 5, get_qty: 1 },
        }),
      ],
      productId,
    )
    assert.match(badge?.title ?? '', /mín\. 6 ud\./)
  })
})
