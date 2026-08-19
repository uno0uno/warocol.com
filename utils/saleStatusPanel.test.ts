import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canShowSaleStatusPanel,
  isFinalizePaymentGroupVisible,
  isIdentifiedSaleCustomer,
  isSaleStatusActionVisible,
} from './saleStatusPanel.ts'

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

test('pending hides Pendiente and keeps Completada + Cancelada', () => {
  assert.equal(isSaleStatusActionVisible('pending', 'pending'), false)
  assert.equal(isSaleStatusActionVisible('completed', 'pending'), true)
  assert.equal(isSaleStatusActionVisible('cancelled', 'pending'), true)
})

test('completed shows only Cancelada', () => {
  assert.equal(isSaleStatusActionVisible('pending', 'completed'), false)
  assert.equal(isSaleStatusActionVisible('completed', 'completed'), false)
  assert.equal(isSaleStatusActionVisible('cancelled', 'completed'), true)
})

test('identified customer rejects guests and anonymous phone', () => {
  assert.equal(isIdentifiedSaleCustomer(null), false)
  assert.equal(isIdentifiedSaleCustomer({ id: '1', phone: '0000000000' }), false)
  assert.equal(isIdentifiedSaleCustomer({ id: '1', phone: '3001234567' }), true)
})

test('hides credit without customer and wallet without balance', () => {
  const credit = { slug: 'credit', triggersCartera: true }
  const wallet = { slug: 'customer_wallet', triggersCartera: false, triggersWallet: true }
  const cash = { slug: 'cash', triggersCartera: false }
  assert.equal(isFinalizePaymentGroupVisible(credit, { identifiedCustomer: false, walletBalanceCop: 1000 }), false)
  assert.equal(isFinalizePaymentGroupVisible(credit, { identifiedCustomer: true, walletBalanceCop: 0 }), true)
  assert.equal(isFinalizePaymentGroupVisible(wallet, { identifiedCustomer: true, walletBalanceCop: 0 }), false)
  assert.equal(isFinalizePaymentGroupVisible(wallet, { identifiedCustomer: true, walletBalanceCop: 500 }), true)
  assert.equal(isFinalizePaymentGroupVisible(cash, { identifiedCustomer: false, walletBalanceCop: 0 }), true)
})
