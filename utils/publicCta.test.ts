import assert from 'node:assert/strict'
import test from 'node:test'

import {
  PUBLIC_CTA_ATTRIBUTION_KEY,
  PUBLIC_CTA_COMPARISON,
  activatePublicCta,
  buildPublicCtaRegistrationRoute,
  getBlogPublicCta,
  getPublicCta,
  readPublicCtaAttribution,
  resolveBlogCtaIntent,
  writeVerifiedPublicCtaAttribution,
} from './publicCta.ts'

test('maps blog slugs to the five commercial intents', () => {
  assert.equal(resolveBlogCtaIntent('software-pos-para-restaurantes'), 'pos')
  assert.equal(resolveBlogCtaIntent('precio-sistema-pos'), 'pricing')
  assert.equal(resolveBlogCtaIntent('food-cost-e-inventario'), 'costs')
  assert.equal(resolveBlogCtaIntent('administrar-un-gastrobar'), 'management')
  assert.equal(resolveBlogCtaIntent('liquidacion-de-nomina'), 'team')
})

test('keeps offer and article progression centralized and honest', () => {
  const benefit = getBlogPublicCta('inventario-restaurante', 'benefit')
  const price = getBlogPublicCta('inventario-restaurante', 'price')
  const final = getBlogPublicCta('inventario-restaurante', 'final')
  assert.equal(benefit.variant, 'costs_benefit_v1')
  assert.match(price.headline, /COP 95\.900\/año/)
  assert.match(price.microcopy, /15 días gratis, sin tarjeta/)
  assert.equal(final.button, 'Crear cuenta y probar')
  assert.equal(JSON.stringify([benefit, price, final]).toLocaleLowerCase().includes('demostración'), false)
  assert.equal(PUBLIC_CTA_COMPARISON, null)

  const posFinal = getPublicCta('pos', 'final')
  assert.match(`${posFinal.eyebrow} ${posFinal.headline}`, /POS/)
  assert.match(posFinal.body, /COP 95\.900\/año/)
  assert.match(posFinal.microcopy, /15 días gratis, sin tarjeta/)
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
  assert.equal(route.query.campaign, 'self_service_trial')
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
    campaign: 'self_service_trial',
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
    campaign: 'self_service_trial',
    variant: 'costs_final_v1',
    email: 'must-not-be-persisted@example.com',
  })

  assert.deepEqual(readPublicCtaAttribution(storage), restored)
  assert.equal(values.get(PUBLIC_CTA_ATTRIBUTION_KEY)?.includes('email'), false)
})
