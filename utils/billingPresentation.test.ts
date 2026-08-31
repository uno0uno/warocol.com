import assert from 'node:assert/strict'
import test from 'node:test'

import {
  billingEventProviderLabelKey,
  billingEventProviderRef,
  billingOfferAnnualSavings,
  canStartBillingSubscription,
  formatBillingOfferAmount,
  normalizeLocalCheckoutUrl,
  resolveBillingScenario,
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
  assert.equal(resolveBillingScenario(state).id, 'starter_or_none')
  assert.equal(resolveBillingScenario(state).primaryLabelKey, 'billing.upgradeToPro')
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
  const scenario = resolveBillingScenario(state)
  assert.equal(scenario.id, 'pending_checkout')
  assert.equal(scenario.primaryAction, 'complete_checkout')
  assert.equal(scenario.showAbandonSecondary, true)
  assert.equal(scenario.primaryLabelKey, 'billing.completePayment')
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
  assert.equal(resolveBillingScenario(state).id, 'pending_restart')
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
  assert.equal(resolveBillingScenario(state).primaryAction, 'none')
})

test('past_due full_with_warning uses grace copy and update/complete CTA', () => {
  const withCheckout = resolveBillingScenario({
    subscriptionStatus: 'past_due',
    checkoutUrl: 'https://checkout.example.test',
    accessLevel: 'full_with_warning',
  })
  assert.equal(withCheckout.id, 'past_due_warning')
  assert.equal(withCheckout.alertTitleKey, 'billing.paymentFailedGrace')
  assert.equal(withCheckout.primaryLabelKey, 'billing.completePayment')
  assert.equal(withCheckout.showRecoveryAlert, true)
  assert.equal(canStartBillingSubscription({
    subscriptionStatus: 'past_due',
    checkoutUrl: 'https://checkout.example.test',
    accessLevel: 'full_with_warning',
  }), false)

  const without = resolveBillingScenario({
    subscriptionStatus: 'past_due',
    checkoutUrl: null,
    accessLevel: 'full_with_warning',
  })
  assert.equal(without.primaryLabelKey, 'billing.updatePayment')
})

test('past_due read_only uses AI suspended title', () => {
  const scenario = resolveBillingScenario({
    subscriptionStatus: 'past_due',
    checkoutUrl: null,
    accessLevel: 'read_only',
  })
  assert.equal(scenario.id, 'past_due_read_only')
  assert.equal(scenario.alertTitleKey, 'billing.aiSuspended')
  assert.equal(scenario.alertTone, 'warning')
  assert.equal(shouldShowBillingRecoveryAlert({
    subscriptionStatus: 'past_due',
    checkoutUrl: null,
    accessLevel: 'read_only',
  }), true)
})

test('blocked past grace uses expired title and recover CTA in alert only', () => {
  const scenario = resolveBillingScenario({
    subscriptionStatus: 'past_due',
    checkoutUrl: null,
    accessLevel: 'blocked',
  })
  assert.equal(scenario.id, 'blocked')
  assert.equal(scenario.alertTitleKey, 'billing.subscriptionExpired')
  assert.equal(scenario.primaryLabelKey, 'billing.reactivate')
  assert.equal(canStartBillingSubscription({
    subscriptionStatus: 'past_due',
    checkoutUrl: null,
    accessLevel: 'blocked',
  }), false)
  assert.equal(shouldShowBillingRecoveryAlert({
    subscriptionStatus: 'past_due',
    checkoutUrl: null,
    accessLevel: 'blocked',
  }), true)
})

test('cancelled and expired use recovery alert (not header subscribe)', () => {
  for (const subscriptionStatus of ['cancelled', 'expired'] as const) {
    const state = {
      subscriptionStatus,
      checkoutUrl: null,
      accessLevel: 'blocked',
    }
    assert.equal(shouldShowBillingRecoveryAlert(state), true)
    assert.equal(canStartBillingSubscription(state), false)
    const scenario = resolveBillingScenario(state)
    assert.equal(scenario.showRecoveryAlert, true)
    assert.equal(
      scenario.alertTitleKey,
      subscriptionStatus === 'cancelled'
        ? 'billing.subscriptionCancelledTitle'
        : 'billing.subscriptionExpired',
    )
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
  assert.equal(
    billingEventProviderLabelKey({ provider: 'lemon_squeezy' }),
    'billing.processedByLemonSqueezy',
  )
})

test('normalizes local hosted checkout urls to http without waro-colombia prefix', () => {
  assert.equal(
    normalizeLocalCheckoutUrl(
      'https://localhost:8080/waro-colombia/billing/confirmacion?ls_checkout=ls_chk_x',
    ),
    'http://localhost:8080/billing/confirmacion?ls_checkout=ls_chk_x',
  )
  assert.equal(
    normalizeLocalCheckoutUrl('https://warocol.com/billing/confirmacion?ls_checkout=ls_chk_x'),
    'https://warocol.com/billing/confirmacion?ls_checkout=ls_chk_x',
  )
})
