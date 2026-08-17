import assert from 'node:assert/strict'
import test from 'node:test'

import {
  COLLECTIONS_WEBHOOK_PATH,
  collectionsWebhookUrl,
  pasarelaEnvironmentLabelKey,
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
