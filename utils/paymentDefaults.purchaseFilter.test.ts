import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  WALLET_PAYMENT_SLUG,
  appendCashDrawerFormField,
  filterPurchasePaymentGroups,
  isCashPaymentSelection,
  mergePosPaymentGroupsFromApi,
  readFromCashDrawer,
  resolvePaymentGroupSlug,
  shouldShowCashDrawerToggle,
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

describe('cash drawer helpers (#2135)', () => {
  const groups = mergePosPaymentGroupsFromApi([
    { id: '1', slug: 'cash', name: 'Efectivo', methods: [{ id: 'm-cash', name: 'Caja' }] },
    { id: '2', slug: 'card', name: 'Datáfono', methods: [{ id: 'm-card', name: 'Visa' }] },
  ])

  it('resolves cash from slug or method id', () => {
    assert.equal(resolvePaymentGroupSlug('cash', groups), 'cash')
    assert.equal(resolvePaymentGroupSlug('m-cash', groups), 'cash')
    assert.ok(isCashPaymentSelection('cash', groups))
    assert.ok(isCashPaymentSelection('m-cash', groups))
    assert.equal(isCashPaymentSelection('m-card', groups), false)
  })

  it('readFromCashDrawer defaults true and accepts camel/snake', () => {
    assert.equal(readFromCashDrawer(null), true)
    assert.equal(readFromCashDrawer({}), true)
    assert.equal(readFromCashDrawer({ fromCashDrawer: false }), false)
    assert.equal(readFromCashDrawer({ from_cash_drawer: false }), false)
    assert.equal(readFromCashDrawer({ fromCashDrawer: true }), true)
    assert.equal(readFromCashDrawer({ fromCashDrawer: 'false' }), false)
    assert.equal(readFromCashDrawer({ from_cash_drawer: 'true' }), true)
  })

  it('purchase/expense pay: toggle only for cash and FormData flag (#2141)', () => {
    assert.equal(shouldShowCashDrawerToggle('cash'), true)
    assert.equal(shouldShowCashDrawerToggle('card'), false)
    assert.equal(shouldShowCashDrawerToggle(''), false)

    const cashPayload = new FormData()
    appendCashDrawerFormField(cashPayload, 'cash', false)
    assert.equal(cashPayload.get('from_cash_drawer'), 'false')

    const cardPayload = new FormData()
    appendCashDrawerFormField(cardPayload, 'card', false)
    assert.equal(cardPayload.get('from_cash_drawer'), null)
  })
})
