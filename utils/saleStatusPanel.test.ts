import assert from 'node:assert/strict'
import test from 'node:test'

import { canShowSaleStatusPanel } from './saleStatusPanel.ts'

test('shows panel for mesa, barra, and mostrador when unlocked', () => {
  assert.equal(canShowSaleStatusPanel({ source: 'mesa', status: 'completed', invoiceLocked: false }), true)
  assert.equal(canShowSaleStatusPanel({ source: 'barra', status: 'pending', invoiceLocked: false }), true)
  assert.equal(canShowSaleStatusPanel({ source: 'pos', status: 'completed', invoiceLocked: false }), true)
  assert.equal(canShowSaleStatusPanel({ source: null, status: 'completed', invoiceLocked: false }), true)
})

test('hides panel when cancelled or invoice-locked', () => {
  assert.equal(canShowSaleStatusPanel({ source: 'pos', status: 'cancelled', invoiceLocked: false }), false)
  assert.equal(canShowSaleStatusPanel({ source: 'mesa', status: 'completed', invoiceLocked: true }), false)
})
