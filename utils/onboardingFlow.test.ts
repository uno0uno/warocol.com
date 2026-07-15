import assert from 'node:assert/strict'
import test from 'node:test'

import { getSafeInternalRedirect } from './internalAccess.ts'
import {
  classifyAuthSession,
  getEditableBusinessName,
  getSessionNextStep,
  isPendingOnboardingSession,
  normalizeOnboardingNextStep,
  resolveOnboardingView,
} from './onboardingFlow.ts'

test('classifies active, pending, customer and anonymous sessions', () => {
  assert.equal(classifyAuthSession({ user: {}, lifecycleStatus: 'active' }, true), 'internal')
  assert.equal(classifyAuthSession({ user: {}, lifecycleStatus: 'pending' }, false), 'pending')
  assert.equal(classifyAuthSession({ user: {}, lifecycleStatus: 'active' }, false), 'customer')
  assert.equal(classifyAuthSession(null, false), 'anonymous')
})

test('supports snake_case session aliases without weakening pending detection', () => {
  const session = { user: {}, lifecycle_status: 'pending', next_step: 'terms' }
  assert.equal(isPendingOnboardingSession(session), true)
  assert.equal(getSessionNextStep(session), 'terms')
})

test('uses server status and returns a safe error for unknown next steps', () => {
  assert.equal(resolveOnboardingView({ nextStep: 'business_profile' }), 'business')
  assert.equal(resolveOnboardingView({ nextStep: 'terms' }), 'terms')
  assert.equal(resolveOnboardingView({ nextStep: 'payment', termsAccepted: false }), 'terms')
  assert.equal(resolveOnboardingView({ nextStep: 'payment', termsAccepted: true }), 'complete')
  assert.equal(resolveOnboardingView({ nextStep: 'unexpected' }), 'error')
  assert.equal(normalizeOnboardingNextStep('unexpected'), null)
})

test('requires a real business name instead of the server placeholder', () => {
  assert.equal(getEditableBusinessName('  Negocio   pendiente  '), '')
  assert.equal(getEditableBusinessName('  Cafe   Central  '), 'Cafe Central')
})

test('rejects open redirects after onboarding authentication', () => {
  assert.equal(getSafeInternalRedirect('https://example.com'), '/pos')
  assert.equal(getSafeInternalRedirect('//example.com/path'), '/pos')
  assert.equal(getSafeInternalRedirect('/ventas'), '/ventas')
})
