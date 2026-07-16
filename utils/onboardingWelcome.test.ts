import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ONBOARDING_WELCOME_STORAGE_KEY,
  ONBOARDING_WELCOME_TTL_MS,
  clearOnboardingWelcome,
  createOnboardingWelcomeCountdown,
  hasOnboardingWelcome,
  markOnboardingWelcome,
} from './onboardingWelcome.ts'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

test('keeps a recent welcome marker and removes expired or invalid values', () => {
  const storage = createStorage()
  markOnboardingWelcome(storage, 1000)
  assert.equal(hasOnboardingWelcome(storage, 1000 + ONBOARDING_WELCOME_TTL_MS), true)
  assert.equal(hasOnboardingWelcome(storage, 1001 + ONBOARDING_WELCOME_TTL_MS), false)
  assert.equal(storage.values.has(ONBOARDING_WELCOME_STORAGE_KEY), false)

  storage.setItem(ONBOARDING_WELCOME_STORAGE_KEY, 'invalid')
  assert.equal(hasOnboardingWelcome(storage, 2000), false)
  clearOnboardingWelcome(storage)
})

test('counts down once and completes exactly once', () => {
  let callback: () => void = () => assert.fail('countdown callback was not registered')
  let cleared = 0
  let completed = 0
  const ticks: number[] = []
  const countdown = createOnboardingWelcomeCountdown({
    seconds: 2,
    onTick: value => ticks.push(value),
    onComplete: () => { completed += 1 },
    setIntervalFn: ((handler: () => void) => {
      callback = handler
      return 1
    }) as typeof setInterval,
    clearIntervalFn: (() => { cleared += 1 }) as typeof clearInterval,
  })

  countdown.start()
  callback()
  callback()
  callback()

  assert.deepEqual(ticks, [2, 1, 0])
  assert.equal(completed, 1)
  assert.equal(cleared, 1)
})

test('cancelling prevents a pending countdown from navigating', () => {
  let callback: () => void = () => assert.fail('countdown callback was not registered')
  let completed = 0
  const countdown = createOnboardingWelcomeCountdown({
    seconds: 1,
    onTick: () => {},
    onComplete: () => { completed += 1 },
    setIntervalFn: ((handler: () => void) => {
      callback = handler
      return 1
    }) as typeof setInterval,
    clearIntervalFn: (() => {}) as typeof clearInterval,
  })

  countdown.start()
  countdown.cancel()
  callback()

  assert.equal(completed, 0)
})
