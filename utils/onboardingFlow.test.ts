import assert from 'node:assert/strict'
import test from 'node:test'

import { getSafeInternalRedirect } from './internalAccess.ts'
import {
  classifyAuthSession,
  getEditableBusinessName,
  getSessionNextStep,
  isActiveOnboardingSetupSession,
  isOnboardingEntrySession,
  isPendingBillingPath,
  isPendingOnboardingSession,
  normalizeOnboardingNextStep,
  shouldResumeHostedCheckoutInsteadOfSetupRedirect,
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

test('allows onboarding setup only for an active session at the server setup step', () => {
  assert.equal(isActiveOnboardingSetupSession({
    user: {},
    lifecycleStatus: 'active',
    nextStep: 'setup',
  }), true)
  assert.equal(isActiveOnboardingSetupSession({
    user: {},
    lifecycle_status: 'active',
    next_step: 'payment',
  }), false)
  assert.equal(isActiveOnboardingSetupSession({
    user: {},
    lifecycleStatus: 'pending',
    nextStep: 'setup',
  }), false)
})

test('routes only pending sessions through the persistent onboarding entry', () => {
  assert.equal(isOnboardingEntrySession({ user: {}, lifecycleStatus: 'pending' }), true)
  assert.equal(isOnboardingEntrySession({ user: {}, lifecycleStatus: 'active', nextStep: 'setup' }), false)
  assert.equal(isOnboardingEntrySession({ user: {}, lifecycleStatus: 'active', nextStep: 'payment' }), false)
  assert.equal(isOnboardingEntrySession({ lifecycleStatus: 'pending' }), false)
})

test('allows pending sessions to stay on billing and payment return paths', () => {
  assert.equal(isPendingBillingPath('/gestion/billing'), true)
  assert.equal(isPendingBillingPath('/gestion/billing/uso'), true)
  assert.equal(isPendingBillingPath('/billing/confirmacion'), true)
  assert.equal(isPendingBillingPath('/ventas'), false)
})

test('hosted LS checkout id resumes thank-you instead of Mi Plan (#943)', () => {
  assert.equal(shouldResumeHostedCheckoutInsteadOfSetupRedirect('ls_chk_abc'), true)
  assert.equal(shouldResumeHostedCheckoutInsteadOfSetupRedirect('12345'), true)
  assert.equal(shouldResumeHostedCheckoutInsteadOfSetupRedirect(null), false)
  assert.equal(shouldResumeHostedCheckoutInsteadOfSetupRedirect(''), false)
})

test('normalizes onboarding steps safely', () => {
  assert.equal(normalizeOnboardingNextStep('business_profile'), 'business_profile')
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
