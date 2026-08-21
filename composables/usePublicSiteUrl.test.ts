import assert from 'node:assert/strict'
import test from 'node:test'

import { publicSiteOriginFromConfig } from './usePublicSiteUrl.ts'

test('public guest origin comes from NUXT_PUBLIC_SITE_URL, not window', () => {
  assert.equal(publicSiteOriginFromConfig('http://localhost:8080'), 'http://localhost:8080')
  assert.equal(publicSiteOriginFromConfig('https://warocol.com/'), 'https://warocol.com')
  assert.equal(publicSiteOriginFromConfig(null), 'https://warocol.com')
  assert.equal(publicSiteOriginFromConfig(undefined), 'https://warocol.com')
})
