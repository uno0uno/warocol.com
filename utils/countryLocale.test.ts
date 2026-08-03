import assert from 'node:assert/strict'
import test from 'node:test'

import { localeFromCountry, suggestCountryFromLocale } from './countryLocale.ts'

test('localeFromCountry maps CO/US/BR and LATAM', () => {
  assert.equal(localeFromCountry('CO'), 'es')
  assert.equal(localeFromCountry('US'), 'en')
  assert.equal(localeFromCountry('BR'), 'pt')
  assert.equal(localeFromCountry('MX'), 'es')
  assert.equal(localeFromCountry('DE'), 'es')
  assert.equal(localeFromCountry(''), 'es')
  assert.equal(localeFromCountry(null), 'es')
  assert.equal(localeFromCountry(' us '), 'en')
})

test('suggestCountryFromLocale maps cookie locales; others null', () => {
  assert.equal(suggestCountryFromLocale('en'), 'US')
  assert.equal(suggestCountryFromLocale('en-US'), 'US')
  assert.equal(suggestCountryFromLocale('es'), 'CO')
  assert.equal(suggestCountryFromLocale('pt'), 'BR')
  assert.equal(suggestCountryFromLocale('fr'), null)
  assert.equal(suggestCountryFromLocale('xx'), null)
  assert.equal(suggestCountryFromLocale(null), null)
})
