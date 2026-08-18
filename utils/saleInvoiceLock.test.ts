import assert from 'node:assert/strict'
import test from 'node:test'

import { saleMutationsLockedByInvoice } from './saleInvoiceLock.ts'

test('locks pending and accepted electronic invoices', () => {
  assert.equal(saleMutationsLockedByInvoice('pending'), true)
  assert.equal(saleMutationsLockedByInvoice('accepted'), true)
  assert.equal(saleMutationsLockedByInvoice('ACCEPTED'), true)
})

test('allows missing or rejected invoices', () => {
  assert.equal(saleMutationsLockedByInvoice(null), false)
  assert.equal(saleMutationsLockedByInvoice(undefined), false)
  assert.equal(saleMutationsLockedByInvoice(''), false)
  assert.equal(saleMutationsLockedByInvoice('rejected'), false)
})
