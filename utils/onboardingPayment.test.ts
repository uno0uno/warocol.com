import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ONBOARDING_CHECKOUT_STORAGE_KEY,
  buildOnboardingCheckoutBody,
  featureLabels,
  formatAnnualCop,
  isSafeCheckoutUrl,
  readCheckoutContext,
} from './onboardingPayment.ts'

const attemptId = '11111111-1111-4111-8111-111111111111'
const planId = '22222222-2222-4222-8222-222222222222'

test('formats current server fixtures without owning their values', () => {
  assert.match(formatAnnualCop(95_900), /95[.\s]900/)
  assert.match(formatAnnualCop('200000'), /200[.\s]000/)
  assert.equal(formatAnnualCop('invalid'), '')
})

test('accepts only absolute HTTPS checkout URLs', () => {
  assert.equal(isSafeCheckoutUrl('https://checkout.wompi.co/l/example'), true)
  assert.equal(isSafeCheckoutUrl('http://checkout.wompi.co/l/example'), false)
  assert.equal(isSafeCheckoutUrl('/billing/confirmacion'), false)
})

test('checkout payload contains only the selected server plan id', () => {
  assert.deepEqual(buildOnboardingCheckoutBody(planId), { plan_id: planId })
  assert.throws(() => buildOnboardingCheckoutBody('pro'), /ONBOARDING_PLAN_ID_INVALID/)
})

test('reads only tenant-scoped correlation UUIDs from storage', () => {
  const validStorage = {
    getItem: (key: string) => key === ONBOARDING_CHECKOUT_STORAGE_KEY
      ? JSON.stringify({ attemptId, planId, email: 'ignored@example.com' })
      : null,
  }
  assert.deepEqual(readCheckoutContext(validStorage), { attemptId, planId })
  assert.equal(readCheckoutContext({ getItem: () => '{broken' }), null)
  assert.equal(readCheckoutContext({ getItem: () => JSON.stringify({ attemptId: 'bad', planId }) }), null)
})

test('derives display capabilities from the server feature object', () => {
  assert.deepEqual(featureLabels({ invoices: true, scans: 1000, hidden: false }), [
    'Invoices',
    'Scans: 1.000',
  ])
})
