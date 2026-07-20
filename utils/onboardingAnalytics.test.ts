import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOnboardingAnalyticsEvent, trackOnboardingEvent } from './onboardingAnalytics.ts'

test('allows only non-sensitive onboarding analytics fields', () => {
  const event = buildOnboardingAnalyticsEvent('registration_started', {
    dedupeId: 'private-attempt-id',
    // @ts-expect-error arbitrary fields must not enter the event contract
    email: 'owner@example.com',
  })
  assert.deepEqual(event, {
    event: 'registration_started',
  })
  assert.equal(JSON.stringify(event).includes('owner@example.com'), false)
  assert.equal(JSON.stringify(event).includes('private-attempt-id'), false)
})

test('deduplicates the same event and attempt in session storage', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
  const target: { dataLayer: Array<Record<string, string>> } = { dataLayer: [] }
  assert.equal(trackOnboardingEvent('email_verified', { dedupeId: 'attempt-1' }, target, storage), true)
  assert.equal(trackOnboardingEvent('email_verified', { dedupeId: 'attempt-1' }, target, storage), false)
  assert.equal(target.dataLayer.length, 1)
})

test('is a no-op without a browser target', () => {
  assert.equal(trackOnboardingEvent('registration_started', {}, null, null), false)
})

test('allows only slug-like public attribution for funnel events', () => {
  const event = buildOnboardingAnalyticsEvent('registration_started', {
    source: 'blog',
    content: 'food-cost_benefit',
    campaign: 'self_service_paid',
    variant: 'costs_benefit_v1',
    intent: 'costs',
    // @ts-expect-error PII is outside the analytics contract
    phone: '+573001112233',
  })
  assert.deepEqual(event, {
    event: 'registration_started',
    source: 'blog',
    content: 'food-cost_benefit',
    campaign: 'self_service_paid',
    variant: 'costs_benefit_v1',
    intent: 'costs',
  })
  assert.equal(JSON.stringify(event).includes('+573001112233'), false)
})
