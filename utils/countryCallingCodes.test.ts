import assert from 'node:assert/strict'
import test from 'node:test'

import {
  callingCodeForCountry,
  phonePlaceholderForCountry,
} from './countryCallingCodes.ts'

test('callingCodeForCountry maps catalog countries', () => {
  assert.equal(callingCodeForCountry('AR'), 54)
  assert.equal(callingCodeForCountry('ar'), 54)
  assert.equal(callingCodeForCountry(' CO '), 57)
  assert.equal(callingCodeForCountry('MX'), 52)
  assert.equal(callingCodeForCountry('US'), 1)
  assert.equal(callingCodeForCountry(''), null)
  assert.equal(callingCodeForCountry(null), null)
  assert.equal(callingCodeForCountry('XX'), null)
})

test('phonePlaceholderForCountry is a +code hint, not a CO default', () => {
  assert.equal(phonePlaceholderForCountry('AR'), '+54 000 000 0000')
  assert.equal(phonePlaceholderForCountry('CO'), '+57 000 000 0000')
  assert.equal(phonePlaceholderForCountry(''), '')
  assert.equal(phonePlaceholderForCountry('ZZ'), '')
})
