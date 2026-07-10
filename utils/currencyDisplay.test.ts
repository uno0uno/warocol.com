import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_NUMBER_LOCALE,
  formatMoney,
  localeToNumberFormatTag,
  normalizeCurrencyCode,
} from './currencyDisplay.ts'

describe('normalizeCurrencyCode', () => {
  it('defaults missing/invalid to COP', () => {
    assert.equal(normalizeCurrencyCode(null), DEFAULT_CURRENCY_CODE)
    assert.equal(normalizeCurrencyCode(undefined), DEFAULT_CURRENCY_CODE)
    assert.equal(normalizeCurrencyCode(''), DEFAULT_CURRENCY_CODE)
    assert.equal(normalizeCurrencyCode('xx'), DEFAULT_CURRENCY_CODE)
    assert.equal(normalizeCurrencyCode('1234'), DEFAULT_CURRENCY_CODE)
  })

  it('uppercases valid 3-letter codes', () => {
    assert.equal(normalizeCurrencyCode('cop'), 'COP')
    assert.equal(normalizeCurrencyCode(' usd '), 'USD')
  })
})

describe('localeToNumberFormatTag', () => {
  it('defaults to es-CO', () => {
    assert.equal(localeToNumberFormatTag(null), DEFAULT_NUMBER_LOCALE)
    assert.equal(localeToNumberFormatTag(undefined), DEFAULT_NUMBER_LOCALE)
  })

  it('maps es/en prefs and tags', () => {
    assert.equal(localeToNumberFormatTag('es'), 'es-CO')
    assert.equal(localeToNumberFormatTag('en'), 'en-US')
    assert.equal(localeToNumberFormatTag('es-CO'), 'es-CO')
    assert.equal(localeToNumberFormatTag('en-US'), 'en-US')
  })
})

describe('formatMoney', () => {
  it('preserves null contract and COP default formatting', () => {
    assert.equal(formatMoney(null), '$0')
    assert.equal(formatMoney(undefined), '$0')

    const expectedCop = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(1000)

    assert.equal(formatMoney(1000), expectedCop)
    assert.equal(formatMoney(1000, { currency: null, locale: null }), expectedCop)
  })

  it('changes currency option without rewriting the numeric value', () => {
    const usd = formatMoney(1000, { currency: 'USD', locale: 'es' })
    const expected = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(1000)
    assert.equal(usd, expected)
    // Same underlying amount — only presentation differs from COP
    assert.notEqual(usd, formatMoney(1000, { currency: 'COP' }))
  })

  it('uses en-US punctuation when locale is en', () => {
    const expected = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(1000)
    assert.equal(formatMoney(1000, { currency: 'USD', locale: 'en' }), expected)
  })
})
