import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canStartBillingSubscription,
  shouldShowBillingRecoveryAlert,
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
