import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeArticleCountry,
  resolveArticleMarket,
} from './articleMarket.ts'

test('defaults unknown or empty country to CO', () => {
  assert.equal(normalizeArticleCountry(null), 'CO')
  assert.equal(normalizeArticleCountry(''), 'CO')
  assert.equal(normalizeArticleCountry('Mexico'), 'CO')
  assert.equal(normalizeArticleCountry('Colombia'), 'CO')
  assert.equal(normalizeArticleCountry('CO'), 'CO')
})

test('accepts US country aliases', () => {
  assert.equal(normalizeArticleCountry('US'), 'US')
  assert.equal(normalizeArticleCountry('USA'), 'US')
  assert.equal(normalizeArticleCountry('United States'), 'US')
  assert.equal(normalizeArticleCountry('united states of america'), 'US')
})

test('keeps Colombia ES offer and locales', () => {
  const market = resolveArticleMarket({ lang: 'es', country: 'Colombia' })
  assert.equal(market.isUsEn, false)
  assert.equal(market.ogLocale, 'es_CO')
  assert.equal(market.inLanguage, 'es-CO')
  assert.equal(market.localeTag, 'es-CO')
  assert.equal(market.currency, 'COP')
  assert.equal(market.annualPrice, '95900')
  assert.equal(market.monthlyPrice, '7992')
  assert.equal(market.areaServedName, 'Colombia')
})

test('maps US English articles to USD offer and en_US meta', () => {
  const market = resolveArticleMarket({ lang: 'en', country: 'United States' })
  assert.equal(market.isUsEn, true)
  assert.equal(market.ogLocale, 'en_US')
  assert.equal(market.inLanguage, 'en-US')
  assert.equal(market.currency, 'USD')
  assert.equal(market.annualPrice, '360')
  assert.equal(market.monthlyPrice, '30')
  assert.equal(market.annualPriceLabel, 'USD $30/month')
  assert.equal(market.areaServedName, 'United States')
})

test('requires both English lang and US country for USD market', () => {
  assert.equal(resolveArticleMarket({ lang: 'en', country: 'Colombia' }).isUsEn, false)
  assert.equal(resolveArticleMarket({ lang: 'es', country: 'US' }).isUsEn, false)
  assert.equal(resolveArticleMarket({ lang: 'en-US', country: 'USA' }).isUsEn, true)
  assert.equal(resolveArticleMarket({}).currency, 'COP')
})
