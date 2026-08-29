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
  resolvePublicOffer,
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

test('trial banner price anchor uses USD $9 for Colombia (usd_9), not COP', () => {
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'CO', currencyCode: 'COP' }),
    'menos de USD $9/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'CO', currencyCode: 'COP' }),
    'under USD $9/month',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: null, currencyCode: 'COP' }),
    'menos de USD $9/mes',
  )
  assert.doesNotMatch(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'CO', currencyCode: 'COP' }),
    /COP/i,
  )
})

test('trial banner price anchor uses USD $9 for usd_9 catalog tenants', () => {
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'MX', currencyCode: 'MXN' }),
    'menos de USD $9/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'MX', currencyCode: 'MXN' }),
    'under USD $9/month',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: null, currencyCode: 'MXN' }),
    'menos de USD $9/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'AR', currencyCode: 'ARS' }),
    'menos de USD $9/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'PE', currencyCode: 'PEN' }),
    'menos de USD $9/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'CL', currencyCode: 'CLP' }),
    'menos de USD $9/mes',
  )
  for (const opts of [
    { locale: 'es', countryCode: 'MX', currencyCode: 'MXN' },
    { locale: 'es', countryCode: 'AR', currencyCode: 'ARS' },
    { locale: 'es', countryCode: null, currencyCode: 'ARS' },
  ]) {
    const line = resolveTrialPriceAnchor(opts)
    assert.doesNotMatch(line, /COP/i)
    assert.doesNotMatch(line, /\$30/)
  }
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

test('Spain public CTAs stay Spanish and use EUR not COP', () => {
  const spain = getPublicCta('pos', 'final', { lang: 'es', country_code: 'ES' })
  assert.match(spain.body, /EUR €360\/año/)
  assert.doesNotMatch(spain.body, /COP/i)
  assert.equal(spain.button, 'Crear cuenta y elegir plan')
})

test('LATAM public offer is monthly USD $9 only (no annual, no COP)', () => {
  const offer = resolvePublicOffer({ lang: 'es', country: 'LATAM' })
  assert.equal(offer.annualPrice, 'USD $9/mes')
  assert.match(offer.monthlyEquivalent, /USD \$9\/mes/)
  assert.doesNotMatch(offer.annualPrice, /108|año|COP/i)

  const en = resolvePublicOffer({ lang: 'en', country: 'latam' })
  assert.equal(en.annualPrice, 'USD $9/month')

  const cta = getPublicCta('pricing', 'price', { lang: 'es', country: 'LATAM' })
  assert.match(cta.headline, /USD \$9\/mes/)
  assert.doesNotMatch(cta.body, /COP|108/i)
})

test('omitted market keeps Colombia ES COP public CTAs', () => {
  const omitted = getPublicCta('pos', 'final')
  const co = getPublicCta('pos', 'final', { lang: 'es', country: 'Colombia' })
  assert.equal(omitted.body, co.body)
  assert.match(omitted.body, /COP 95\.900\/año/)
  assert.equal(omitted.button, 'Crear cuenta y elegir plan')
})

test('trial banner price anchor uses USD $30 for usd_30 catalog tenants', () => {
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'US', currencyCode: 'USD' }),
    'under USD $30/month',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'US', currencyCode: 'USD' }),
    'menos de USD $30/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'PA', currencyCode: 'USD' }),
    'menos de USD $30/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'GB', currencyCode: 'GBP' }),
    'under USD $30/month',
  )
  assert.doesNotMatch(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'US', currencyCode: 'USD' }),
    /COP/i,
  )
})

test('trial banner price anchor uses EUR €30 for eurozone catalog tenants', () => {
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: 'ES', currencyCode: 'EUR' }),
    'menos de EUR €30/mes',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'en', countryCode: 'DE', currencyCode: 'EUR' }),
    'under EUR €30/month',
  )
  assert.equal(
    resolveTrialPriceAnchor({ locale: 'es', countryCode: null, currencyCode: 'EUR' }),
    'menos de EUR €30/mes',
  )
})

test('trial banner price anchor is pending when country and currency are unknown', () => {
  assert.equal(resolveTrialPriceAnchor({ locale: 'es' }), null)
  assert.equal(resolveTrialPriceAnchor({ locale: 'en' }), null)
  assert.equal(resolveTrialPriceAnchor({}), null)
})
