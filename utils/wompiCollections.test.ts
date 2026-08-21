import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COLLECTIONS_WEBHOOK_PATH,
  collectionMailtoHref,
  collectionsWebhookUrl,
  isValidCollectionEmail,
  isWompiPaymentMethod,
  splitPaymentShowsWompiDetail,
  pasarelaConnectionBadgeVariant,
  pasarelaEnvironmentBadgeVariant,
  pasarelaEnvironmentLabelKey,
  ventasPaymentStatusIsUnpaid,
  waroCollectionLandingUrl,
  waroCollectionSiteOrigin,
  waroCollectionThankYouUrl,
} from './wompiCollections.ts'

test('builds the collections webhook URL from the API origin', () => {
  assert.equal(
    collectionsWebhookUrl('https://api.warolabs.com'),
    'https://api.warolabs.com/collections/webhooks/wompi',
  )
  assert.equal(
    collectionsWebhookUrl('https://api.warolabs.com/'),
    'https://api.warolabs.com/collections/webhooks/wompi',
  )
  assert.equal(
    collectionsWebhookUrl('http://localhost:9999'),
    'http://localhost:9999/collections/webhooks/wompi',
  )
})

test('does not prefix the webhook path with /api', () => {
  const url = collectionsWebhookUrl('https://api.warolabs.com')
  assert.equal(COLLECTIONS_WEBHOOK_PATH, '/collections/webhooks/wompi')
  assert.equal(url.includes('/api/'), false)
})

test('maps Wompi environment to i18n keys', () => {
  assert.equal(pasarelaEnvironmentLabelKey('prod'), 'integraciones.pasarela.envProd')
  assert.equal(pasarelaEnvironmentLabelKey('test'), 'integraciones.pasarela.envTest')
  assert.equal(pasarelaEnvironmentLabelKey(null), 'integraciones.pasarela.envTest')
})

test('connection and environment badges use semantic variants, not color-only meaning', () => {
  assert.equal(pasarelaConnectionBadgeVariant(null), 'secondary')
  assert.equal(
    pasarelaConnectionBadgeVariant({
      fingerprint: 'x',
      environment: 'test',
      isActive: true,
      paymentMethodId: null,
    }),
    'success',
  )
  assert.equal(
    pasarelaConnectionBadgeVariant({
      fingerprint: 'x',
      environment: 'test',
      isActive: false,
      paymentMethodId: null,
    }),
    'warning',
  )
  assert.equal(pasarelaEnvironmentBadgeVariant(null), 'secondary')
  assert.equal(pasarelaEnvironmentBadgeVariant('test'), 'info')
  assert.equal(pasarelaEnvironmentBadgeVariant('prod'), 'warning')
})

test('detects Wompi by method name, not the digital group', () => {
  assert.equal(isWompiPaymentMethod({ name: 'Wompi' }), true)
  assert.equal(isWompiPaymentMethod('Wompi'), true)
  assert.equal(isWompiPaymentMethod({ name: 'Nequi' }), false)
  assert.equal(isWompiPaymentMethod({ name: 'QR' }), false)
  assert.equal(isWompiPaymentMethod({ name: 'digital' }), false)
})

test('split payment shows Wompi detail for Wompi or digital tender when a session exists', () => {
  assert.equal(splitPaymentShowsWompiDetail({
    hasCollectionSession: true,
    paymentMethod: 'digital',
    paymentMethodLabel: 'Wompi',
  }), true)
  assert.equal(splitPaymentShowsWompiDetail({
    hasCollectionSession: true,
    paymentMethod: 'cash',
    paymentMethodLabel: 'Efectivo',
  }), false)
  assert.equal(splitPaymentShowsWompiDetail({
    hasCollectionSession: false,
    paymentMethod: 'digital',
    paymentMethodLabel: 'Wompi',
  }), false)
})

test('builds WARO cobro URLs without Wompi or API hosts', () => {
  const landing = waroCollectionLandingUrl('https://warocol.com/', 'session-1')
  const thanks = waroCollectionThankYouUrl('https://warocol.com', 'session-1')
  assert.equal(landing, 'https://warocol.com/cobro/session-1')
  assert.equal(thanks, 'https://warocol.com/cobro/session-1/gracias')
  assert.equal(landing.includes('/api/'), false)
  assert.equal(thanks.includes('/api/'), false)
  assert.equal(landing.includes('checkout.wompi.co'), false)
  assert.equal(thanks.includes('checkout.wompi.co'), false)
})

test('uses configured NUXT_PUBLIC_SITE_URL origin, not a hardcoded host', () => {
  assert.equal(
    waroCollectionSiteOrigin('http://localhost:8080'),
    'http://localhost:8080',
  )
  assert.equal(
    waroCollectionSiteOrigin('https://warocol.com/'),
    'https://warocol.com',
  )
})

test('validates collection email', () => {
  assert.equal(isValidCollectionEmail('diner@example.com'), true)
  assert.equal(isValidCollectionEmail('  '), false)
  assert.equal(isValidCollectionEmail('not-an-email'), false)
})

test('treats null payment_status as unpaid, not paid', () => {
  assert.equal(ventasPaymentStatusIsUnpaid(null), true)
  assert.equal(ventasPaymentStatusIsUnpaid(undefined), true)
  assert.equal(ventasPaymentStatusIsUnpaid(''), true)
  assert.equal(ventasPaymentStatusIsUnpaid('paid'), false)
  assert.equal(ventasPaymentStatusIsUnpaid('credit'), false)
})

test('mailto uses the WARO landing URL, never Wompi checkout', () => {
  const landing = waroCollectionLandingUrl('https://warocol.com', 'session-1')
  const href = collectionMailtoHref('diner@example.com', landing)
  assert.equal(href.includes('checkout.wompi.co'), false)
  assert.equal(href.includes(encodeURIComponent(landing)), true)
  assert.equal(href.startsWith('mailto:diner@example.com'), true)
})
