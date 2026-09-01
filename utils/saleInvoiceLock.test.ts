import assert from 'node:assert/strict'
import test from 'node:test'

import {
  saleHasLockedInvoiceWithoutRecordedPayments,
  saleMutationsLockedByInvoice,
} from './saleInvoiceLock.ts'

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

test('detects locked invoice with zero recorded payments and positive balance', () => {
  assert.equal(
    saleHasLockedInvoiceWithoutRecordedPayments({
      invoiceStatus: 'accepted',
      recordedPaidTotal: 0,
      amountDue: 71000,
    }),
    true,
  )
})

test('ignores mismatch when payments cover the balance', () => {
  assert.equal(
    saleHasLockedInvoiceWithoutRecordedPayments({
      invoiceStatus: 'accepted',
      recordedPaidTotal: 71000,
      amountDue: 71000,
    }),
    false,
  )
})

test('ignores mismatch when invoice is not locked', () => {
  assert.equal(
    saleHasLockedInvoiceWithoutRecordedPayments({
      invoiceStatus: 'rejected',
      recordedPaidTotal: 0,
      amountDue: 71000,
    }),
    false,
  )
})

test('ignores mismatch for legacy single payment on orders row', () => {
  assert.equal(
    saleHasLockedInvoiceWithoutRecordedPayments({
      invoiceStatus: 'accepted',
      recordedPaidTotal: 0,
      amountDue: 88000,
      orderStatus: 'completed',
      paymentStatus: 'paid',
      paymentMethod: 'cash',
    }),
    false,
  )
})

test('still flags true zombie without payment method', () => {
  assert.equal(
    saleHasLockedInvoiceWithoutRecordedPayments({
      invoiceStatus: 'accepted',
      recordedPaidTotal: 0,
      amountDue: 71000,
      orderStatus: 'completed',
      paymentStatus: 'paid',
      paymentMethod: null,
    }),
    true,
  )
})
