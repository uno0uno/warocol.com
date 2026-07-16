import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatSaleModifierPriceLabel,
  mapApiModifierToSaleOption,
  modifierLineTotal,
  modifiersCartTotal,
  saleLineTotal,
} from './saleModifierOption.ts'

describe('modifierLineTotal', () => {
  it('charges only units above the included threshold', () => {
    assert.equal(modifierLineTotal({ price: 2000, quantity: 1, included_quantity: 1 }), 0)
    assert.equal(modifierLineTotal({ price: 2000, quantity: 2, included_quantity: 1 }), 2000)
    assert.equal(modifierLineTotal({ price: 2000, quantity: 3, included_quantity: 1 }), 4000)
  })

  it('keeps legacy totals when included_quantity is absent', () => {
    assert.equal(modifierLineTotal({ price: 2000, quantity: 3 }), 6000)
    assert.equal(modifierLineTotal({ price: -500, quantity: 2 }), -1000)
    assert.equal(modifiersCartTotal([{ price: 0, quantity: 8, included_quantity: 1 }]), 0)
  })

  it('multiplies the complete unit subtotal by product quantity', () => {
    assert.equal(
      saleLineTotal(10000, 2, [{ price: 2000, quantity: 3, included_quantity: 1 }]),
      28000,
    )
  })
})

describe('modifier option mapping and labels', () => {
  it('maps included_quantity with a backward-compatible zero default', () => {
    assert.equal(mapApiModifierToSaleOption({ id: 'a', name: 'Salsa', max_limit: 3 }).included_quantity, 0)
    assert.equal(mapApiModifierToSaleOption({ id: 'b', name: 'Queso', included_quantity: 1 }).included_quantity, 1)
  })

  it('explains the included threshold and additional unit price', () => {
    assert.equal(
      formatSaleModifierPriceLabel(2000, value => `$${value}`, 1, {
        included: '1 incluida',
        perAdditional: 'por adicional',
      }),
      '1 incluida · + $2000 por adicional',
    )
  })
})
