import assert from 'node:assert/strict'
import test from 'node:test'

import {
  billingEventProviderLabelKey,
  billingEventProviderRef,
  billingOfferAnnualSavings,
  canStartBillingSubscription,
  formatBillingOfferAmount,
  normalizeLocalPaddleCheckoutUrl,
  shouldShowBillingRecoveryAlert,
  type BillingPriceOffer,
} from './billingPresentation.ts'

test('payment-pending onboarding without a subscription can subscribe', () => {
  const state = {
    subscriptionStatus: null,
    checkoutUrl: null,
    accessLevel: 'blocked',
  }

  assert.equal(canStartBillingSubscription(state), true)
  assert.equal(shouldShowBillingRecoveryAlert(state), false)
})

test('pending subscription with checkout completes the existing payment', () => {
  const state = {
    subscriptionStatus: 'pending',
    checkoutUrl: 'https://checkout.example.test',
    accessLevel: 'blocked',
  }

  assert.equal(canStartBillingSubscription(state), false)
  // First Pro checkout or renew-pending: Completar pago CTA, not expired banner (#2213)
  assert.equal(shouldShowBillingRecoveryAlert(state), false)
})

test('first Pro pending with starter access hides recovery/expired alert', () => {
  assert.equal(
    shouldShowBillingRecoveryAlert({
      subscriptionStatus: 'pending',
      checkoutUrl: 'https://checkout.example.test',
      accessLevel: 'starter',
    }),
    false,
  )
})

test('pending subscription without checkout can restart payment', () => {
  const state = {
    subscriptionStatus: 'pending',
    checkoutUrl: null,
    accessLevel: 'blocked',
  }

  assert.equal(canStartBillingSubscription(state), true)
  assert.equal(shouldShowBillingRecoveryAlert(state), false)
})

test('after abandon (no subscription) can start billing again', () => {
  const state = {
    subscriptionStatus: null,
    checkoutUrl: null,
    accessLevel: 'starter',
  }

  assert.equal(canStartBillingSubscription(state), true)
  assert.equal(shouldShowBillingRecoveryAlert(state), false)
})

test('active subscription does not expose subscription actions', () => {
  const state = {
    subscriptionStatus: 'active',
    checkoutUrl: null,
    accessLevel: 'full',
  }

  assert.equal(canStartBillingSubscription(state), false)
  assert.equal(shouldShowBillingRecoveryAlert(state), false)
})

test('cancelled, expired and overdue subscriptions use recovery alert', () => {
  for (const subscriptionStatus of ['cancelled', 'expired', 'past_due']) {
    assert.equal(shouldShowBillingRecoveryAlert({
      subscriptionStatus,
      checkoutUrl: null,
      accessLevel: 'blocked',
    }), true)
  }
})

test('formats SaaS offer monthly amounts and legacy annual savings helper', () => {
  const offer: BillingPriceOffer = {
    segment: 'usd_9',
    currency: 'USD',
    monthly_amount_minor: 900,
    annual_amount_minor: 9000,
    monthly_amount: 9,
    annual_amount: 90,
  }
  assert.equal(billingOfferAnnualSavings(offer), 18)
  assert.match(formatBillingOfferAmount(9, 'USD', 'en-US'), /\$9/)
  assert.match(formatBillingOfferAmount(30, 'EUR', 'en-US'), /€30/)
})

test('prefers paddle transaction id over wompi for event refs', () => {
  assert.equal(
    billingEventProviderRef({
      paddle_transaction_id: 'txn_p',
      wompi_transaction_id: 'txn_w',
    }),
    'txn_p',
  )
  assert.equal(
    billingEventProviderLabelKey({ paddle_transaction_id: 'txn_p' }),
    'billing.processedByPaddle',
  )
  assert.equal(
    billingEventProviderLabelKey({ wompi_transaction_id: 'txn_w' }),
    'billing.processedByWompi',
  )
})

test('normalizes local paddle checkout urls to http without waro-colombia prefix', () => {
  assert.equal(
    normalizeLocalPaddleCheckoutUrl(
      'https://localhost:8080/waro-colombia/billing/confirmacion?_ptxn=txn_x',
    ),
    'http://localhost:8080/billing/confirmacion?_ptxn=txn_x',
  )
  assert.equal(
    normalizeLocalPaddleCheckoutUrl('https://warocol.com/billing/confirmacion?_ptxn=txn_x'),
    'https://warocol.com/billing/confirmacion?_ptxn=txn_x',
  )
})
