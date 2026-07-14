import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_NUMBER_LOCALE,
  formatMoney,
  localeToNumberFormatTag,
  normalizeCurrencyCode,
  normalizeMinorUnits,
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

  it('maps every supported locale and regional tag', () => {
    assert.equal(localeToNumberFormatTag('es'), 'es-CO')
    assert.equal(localeToNumberFormatTag('en'), 'en-US')
    assert.equal(localeToNumberFormatTag('es-CO'), 'es-CO')
    assert.equal(localeToNumberFormatTag('en-US'), 'en-US')
    assert.equal(localeToNumberFormatTag('pt-BR'), 'pt-BR')
    assert.equal(localeToNumberFormatTag('fr'), 'fr-FR')
    assert.equal(localeToNumberFormatTag('de'), 'de-DE')
    assert.equal(localeToNumberFormatTag('ar'), 'ar-u-nu-latn')
    assert.equal(localeToNumberFormatTag('hi'), 'hi-IN')
    assert.equal(localeToNumberFormatTag('zh'), 'zh-CN')
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
      maximumFractionDigits: 0,
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
      maximumFractionDigits: 0,
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
      maximumFractionDigits: 0,
    }).format(1000)
    assert.equal(formatMoney(1000, { currency: 'USD', locale: 'en' }), expected)
  })

  it('uses authoritative minor units for zero- and two-decimal currencies', () => {
    const clp = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(1234.56)
    const usd = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(1234.5)

    assert.equal(formatMoney(1234.56, { currency: 'CLP', minorUnits: 0 }), clp)
    assert.equal(formatMoney(1234.5, { currency: 'USD', locale: 'en', minorUnits: 2 }), usd)
  })
})

describe('normalizeMinorUnits', () => {
  it('accepts ISO-style units and falls back safely', () => {
    assert.equal(normalizeMinorUnits(0), 0)
    assert.equal(normalizeMinorUnits(2), 2)
    assert.equal(normalizeMinorUnits(3), 3)
    assert.equal(normalizeMinorUnits(-1, 0), 0)
    assert.equal(normalizeMinorUnits(4, 0), 0)
    assert.equal(normalizeMinorUnits(null, 0), 0)
  })
})
