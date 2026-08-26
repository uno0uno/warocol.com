import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeArticleCountry,
  normalizeArticleCountryCode,
  resolveAnonymousReaderMarket,
  resolveArticleMarket,
} from './articleMarket.ts'

test('defaults unknown or empty country to CO market', () => {
  assert.equal(normalizeArticleCountry(null), 'CO')
  assert.equal(normalizeArticleCountry(''), 'CO')
  assert.equal(normalizeArticleCountry('Colombia'), 'CO')
  assert.equal(normalizeArticleCountry('CO'), 'CO')
  assert.equal(normalizeArticleCountryCode('Mexico'), 'MX')
  assert.equal(normalizeArticleCountryCode('LATAM'), null)
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

test('Spain article uses EUR and es-ES tags', () => {
  const market = resolveArticleMarket({ lang: 'es', country: 'Spain', country_code: 'ES' })
  assert.equal(market.currency, 'EUR')
  assert.equal(market.ogLocale, 'es_ES')
  assert.equal(market.market, 'ES')
})

test('LATAM article falls back to COP / es-CO', () => {
  const market = resolveArticleMarket({ lang: 'es', country: 'LATAM' })
  assert.equal(market.currency, 'COP')
  assert.equal(market.market, 'CO')
})

test('anonymous reader uses cf-ipcountry and Accept-Language', () => {
  const es = resolveAnonymousReaderMarket({
    acceptLanguage: 'es-ES,es;q=0.9',
    cfIpCountry: 'ES',
  })
  assert.equal(es.currency, 'EUR')
  assert.equal(es.market, 'ES')

  const usd = resolveAnonymousReaderMarket({
    acceptLanguage: 'en-US,en;q=0.8',
    cfIpCountry: 'US',
  })
  assert.equal(usd.currency, 'USD')
  assert.equal(usd.isUsEn, true)

  const fallback = resolveAnonymousReaderMarket({})
  assert.equal(fallback.currency, 'COP')
  assert.equal(fallback.market, 'CO')
})
