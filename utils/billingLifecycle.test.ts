import assert from 'node:assert/strict'
import test from 'node:test'

import { isAllowedBillingAccess, resolveBillingLifecycle } from './billingLifecycle.ts'

const start = '2026-07-15T12:00:00.000Z'
const end = '2026-07-30T12:00:00.000Z'

test('normalizes explicit trial lifecycle and server days from snake case', () => {
  const result = resolveBillingLifecycle({
    status: 'trialing',
    trial_started_at: start,
    trial_ends_at: end,
    trial_days_remaining: 15,
  }, { level: 'full' })
  assert.deepEqual(result, {
    kind: 'trialing',
    status: 'trialing',
    accessLevel: 'full',
    trialStartedAt: start,
    trialEndsAt: end,
    trialDaysRemaining: 15,
    isTrial: true,
    isReadOnly: false,
    isPaidGrace: false,
  })
})

test('uses additive access contract aliases without inferring trial from no subscription', () => {
  const result = resolveBillingLifecycle(null, {
    subscriptionStatus: 'trial_expired',
    trialStartedAt: start,
    trialEndsAt: end,
    level: 'read_only',
  })
  assert.equal(result.kind, 'trial_expired')
  assert.equal(result.trialDaysRemaining, 0)
  assert.equal(result.isReadOnly, true)
  assert.equal(resolveBillingLifecycle(null, { level: 'full' }).kind, 'unknown')
})

test('calculates display days from the server end instant without changing authority', () => {
  const result = resolveBillingLifecycle(
    { status: 'trialing', trial_ends_at: end },
    { level: 'full' },
    Date.parse('2026-07-29T12:00:00.001Z'),
  )
  assert.equal(result.kind, 'trialing')
  assert.equal(result.trialDaysRemaining, 1)
  assert.equal(resolveBillingLifecycle(
    { status: 'trialing', trial_ends_at: end },
    { level: 'full' },
    Date.parse(end),
  ).trialDaysRemaining, 0)
})

test('keeps paid grace separate and only trusts explicit access levels', () => {
  const result = resolveBillingLifecycle({ status: 'past_due' }, {
    level: 'read_only',
    grace_days_remaining: 4,
  })
  assert.equal(result.kind, 'paid_grace')
  assert.equal(result.isPaidGrace, true)
  assert.equal(result.trialDaysRemaining, null)
  assert.equal(isAllowedBillingAccess('read_only'), true)
  assert.equal(isAllowedBillingAccess('blocked'), false)
  assert.equal(isAllowedBillingAccess('trialing'), false)
})
