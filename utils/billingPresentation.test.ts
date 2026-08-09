import assert from 'node:assert/strict'
import test from 'node:test'

import {
  billingEventProviderLabelKey,
  billingEventProviderRef,
  billingOfferAnnualSavings,
  canStartBillingSubscription,
  formatBillingOfferAmount,
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
  assert.equal(shouldShowBillingRecoveryAlert(state), false)
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

test('formats SaaS offer amounts and annual savings', () => {
  const offer: BillingPriceOffer = {
    segment: 'usd_9',
    currency: 'USD',
    monthly_amount_minor: 900,
    annual_amount_minor: 9000,
    monthly_amount: 9,
    annual_amount: 90,
  }
  assert.equal(billingOfferAnnualSavings(offer), 18)
  assert.match(formatBillingOfferAmount(90, 'USD', 'en-US'), /\$90/)
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
