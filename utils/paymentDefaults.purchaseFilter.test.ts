import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  WALLET_PAYMENT_SLUG,
  filterPurchasePaymentGroups,
  mergePosPaymentGroupsFromApi,
} from './paymentDefaults.ts'

describe('filterPurchasePaymentGroups', () => {
  it('removes credit and wallet from default POS merge (#1823)', () => {
    const groups = filterPurchasePaymentGroups(mergePosPaymentGroupsFromApi([]))
    const slugs = groups.map(g => g.slug)

    assert.ok(!slugs.includes('credit'))
    assert.ok(!slugs.includes(WALLET_PAYMENT_SLUG))
    assert.ok(slugs.includes('cash'))
    assert.ok(slugs.includes('card'))
    assert.ok(slugs.includes('digital'))
  })

  it('keeps tenant methods that are not credit/wallet', () => {
    const groups = filterPurchasePaymentGroups(
      mergePosPaymentGroupsFromApi([
        { id: '1', slug: 'cash', name: 'Efectivo', methods: [{ id: 'm1', name: 'Caja' }] },
        { id: '2', slug: 'credit', name: 'Crédito', methods: [] },
        { id: '3', slug: WALLET_PAYMENT_SLUG, name: 'Saldo wallet', methods: [] },
        { id: '4', slug: 'transfer', name: 'Transferencia', methods: [{ id: 'm2', name: 'Bancolombia' }] },
      ]),
    )
    const slugs = groups.map(g => g.slug)

    assert.deepEqual(slugs, ['cash', 'transfer'])
  })
})
