import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PUBLIC_CTA_ATTRIBUTION_KEY,
  PUBLIC_CTA_COMPARISON,
  PUBLIC_OFFER,
  activatePublicCta,
  buildPublicCtaRegistrationRoute,
  getPublicCta,
  readPublicCtaAttribution,
  resolveBlogCtaIntent,
  resolveTrialPriceAnchor,
  writeVerifiedPublicCtaAttribution,
} from './publicCta.ts'

test('maps blog slugs to the five commercial intents', () => {
  assert.equal(resolveBlogCtaIntent('software-pos-para-restaurantes'), 'pos')
  assert.equal(resolveBlogCtaIntent('precio-sistema-pos'), 'pricing')
  assert.equal(resolveBlogCtaIntent('food-cost-e-inventario'), 'costs')
  assert.equal(resolveBlogCtaIntent('administrar-un-gastrobar'), 'management')
  assert.equal(resolveBlogCtaIntent('liquidacion-de-nomina'), 'team')
})

test('keeps self-service registration copy centralized', () => {
  const posFinal = getPublicCta('pos', 'final')
  assert.match(`${posFinal.eyebrow} ${posFinal.headline}`, /POS/)
  assert.match(posFinal.body, /COP 95\.900\/año/)
  assert.match(posFinal.microcopy, /activa después del pago/)
  assert.equal(posFinal.button, 'Crear cuenta y elegir plan')
  assert.equal(PUBLIC_CTA_COMPARISON, null)
})

test('builds a complete allow-listed registration route from arbitrary content', () => {
  const cta = getPublicCta('pos', 'hero')
  const route = buildPublicCtaRegistrationRoute(cta, {
    source: 'Home Hero',
    content: `${'Artículo muy largo '.repeat(12)} principal`,
  })
  assert.equal(route.path, '/registro')
  assert.equal(route.query.source, 'home-hero')
  assert.equal(route.query.content?.length, 100)
  assert.match(route.query.content ?? '', /^[a-z0-9][a-z0-9._-]{0,99}$/)
  assert.equal(route.query.campaign, 'self_service_paid')
  assert.equal(route.query.variant, 'pos_hero_v1')
})

test('tracks every click and persists only safe attribution', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
  const target: { dataLayer: Array<Record<string, string>> } = { dataLayer: [] }
  const cta = getPublicCta('team', 'final')
  const route = activatePublicCta(cta, { source: 'blog', content: 'nomina-final' }, target, storage)
  activatePublicCta(cta, { source: 'blog', content: 'nomina-final' }, target, storage)

  assert.equal(target.dataLayer.length, 2)
  assert.deepEqual(target.dataLayer[0], {
    event: 'public_cta_clicked',
    source: 'blog',
    content: 'nomina-final',
    campaign: 'self_service_paid',
    variant: 'team_final_v1',
    intent: 'team',
  })
  assert.deepEqual(readPublicCtaAttribution(storage), route.query)
  assert.equal(values.get(PUBLIC_CTA_ATTRIBUTION_KEY)?.includes('email'), false)
})

test('restores server-bound attribution in a fresh magic-link tab', () => {
  const values = new Map<string, string>()
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }

  const restored = writeVerifiedPublicCtaAttribution(storage, {
    source: 'blog_article',
    content: 'inventario_final',
    campaign: 'self_service_paid',
    variant: 'costs_final_v1',
    email: 'must-not-be-persisted@example.com',
  })

  assert.deepEqual(readPublicCtaAttribution(storage), restored)
  assert.equal(values.get(PUBLIC_CTA_ATTRIBUTION_KEY)?.includes('email'), false)
})

test('trial banner price anchor stays COP for Colombia tenants', () => {
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'CO', currencyCode: 'COP' }),
    PUBLIC_OFFER.monthlyEquivalent,
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'CO', currencyCode: 'COP' }),
    'under COP 8,000/month',
  )
})

test('trial banner price anchor avoids COP for Mexico tenants', () => {
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'MX', currencyCode: 'MXN' }),
    'el Plan Pro',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'MX', currencyCode: 'MXN' }),
    'Plan Pro',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: null, currencyCode: 'MXN' }),
    'el Plan Pro',
  )
  assert.doesNotMatch(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'MX', currencyCode: 'MXN' }),
    /COP/i,
  )
})

test('public CTAs render EN + USD $30/month for US English market', () => {
  const us = { lang: 'en', country: 'United States' }
  const posFinal = getPublicCta('pos', 'final', us)
  assert.match(posFinal.body, /USD \$30\/month/)
  assert.match(posFinal.microcopy, /USD \$30\/month/)
  assert.match(posFinal.microcopy, /Module access activates/i)
  assert.equal(posFinal.button, 'Create account and choose a plan')
  assert.doesNotMatch(posFinal.body, /COP/i)

  const price = getPublicCta('pricing', 'price', us)
  assert.match(price.headline, /USD \$30\/month/)
  assert.match(price.body, /USD \$30\/month/)
})

test('omitted market keeps Colombia ES COP public CTAs', () => {
  const omitted = getPublicCta('pos', 'final')
  const co = getPublicCta('pos', 'final', { lang: 'es', country: 'Colombia' })
  assert.equal(omitted.body, co.body)
  assert.match(omitted.body, /COP 95\.900\/año/)
  assert.equal(omitted.button, 'Crear cuenta y elegir plan')
})

test('trial banner price anchor uses USD for US tenants', () => {
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'US', currencyCode: 'USD' }),
    'under USD $30/month',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'US', currencyCode: 'USD' }),
    'menos de USD $30/mes',
  )
  assert.doesNotMatch(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'US', currencyCode: 'USD' }),
    /COP/i,
  )
})
