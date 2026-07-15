import assert from 'node:assert/strict'
import test from 'node:test'

import {
  REGISTRATION_STORAGE_KEY,
  buildRegistrationPayload,
  createRegistrationDraft,
  getRegistrationCooldownSeconds,
  prefillRegistrationEmail,
  readRegistrationDraft,
  sanitizeRegistrationAttribution,
  writeRegistrationDraft,
} from './registrationFlow.ts'

const memoryStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    values,
  }
}

test('keeps only allow-listed slug attribution', () => {
  assert.deepEqual(sanitizeRegistrationAttribution({
    source: 'blog',
    content: ['hero_card', 'ignored'],
    campaign: 'launch-2026',
    variant: 'bad value',
    email: 'owner@example.com',
  }), {
    source: 'blog',
    content: 'hero_card',
    campaign: 'launch-2026',
  })
})

test('round-trips a normalized draft and removes it after its TTL', () => {
  const storage = memoryStorage()
  const now = 1_000
  writeRegistrationDraft(storage, {
    email: ' Owner@Example.COM ',
    phoneCountryIso: 'co',
    phoneCountryCode: '+57',
    phoneNumber: '300 123 4567',
    businessName: '  Panaderia   Central  ',
    businessCountryCode: 'co',
    baseCurrencyCode: 'cop',
    consent: true,
    attribution: { source: 'home', variant: 'a' },
    phase: 'code',
    sentAt: now,
  }, now)

  assert.deepEqual(readRegistrationDraft(storage, now + 1_000), {
    version: 1,
    email: 'owner@example.com',
    phoneCountryIso: 'CO',
    phoneCountryCode: '57',
    phoneNumber: '3001234567',
    businessName: 'Panaderia Central',
    businessCountryCode: 'CO',
    baseCurrencyCode: 'COP',
    consent: true,
    attribution: { source: 'home', variant: 'a' },
    phase: 'code',
    sentAt: now,
    expiresAt: now + 30 * 60 * 1000,
  })
  assert.equal(readRegistrationDraft(storage, now + 30 * 60 * 1000), null)
  assert.equal(storage.values.has(REGISTRATION_STORAGE_KEY), false)
})

test('prefills email without moving PII into navigation data', () => {
  const storage = memoryStorage()
  writeRegistrationDraft(storage, {
    attribution: { source: 'header' },
    phoneNumber: '3001234567',
    phase: 'code',
  }, 2_000)

  const draft = prefillRegistrationEmail(storage, 'NEW@EXAMPLE.COM', 3_000)
  assert.equal(draft.email, 'new@example.com')
  assert.equal(draft.phoneNumber, '3001234567')
  assert.equal(draft.phase, 'form')
  assert.equal(draft.sentAt, null)
  assert.deepEqual(draft.attribution, { source: 'header' })
})

test('builds the exact API payload and computes resend cooldown', () => {
  const draft = createRegistrationDraft({
    email: 'owner@example.com',
    phoneCountryCode: '57',
    phoneNumber: '3001234567',
    businessName: 'Panaderia Central',
    businessCountryCode: 'CO',
    baseCurrencyCode: 'COP',
    consent: true,
    attribution: { source: 'blog', campaign: 'julio', variant: 'bad value' },
  }, 10_000)

  assert.deepEqual(buildRegistrationPayload(draft), {
    email: 'owner@example.com',
    phone_country_code: 57,
    phone_number: '3001234567',
    business_name: 'Panaderia Central',
    country_code: 'CO',
    base_currency_code: 'COP',
    consent: true,
    source: 'blog',
    campaign: 'julio',
  })
  assert.equal(getRegistrationCooldownSeconds(10_000, 10_001), 30)
  assert.equal(getRegistrationCooldownSeconds(10_000, 40_000), 0)
})
