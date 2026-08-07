import assert from 'node:assert/strict'
import test from 'node:test'

import {
  blogLeadSource,
  getBlogLeadCta,
} from './blogLeadCta.ts'

const US_EN = { lang: 'en', country: 'United States' }
const CO_ES = { lang: 'es', country: 'Colombia' }

test('maps blog slugs to pain-first lead copy', () => {
  const gastrobar = getBlogLeadCta('gastrobar-que-es', 'final')
  assert.match(gastrobar.headline, /restaurante/i)
  assert.equal(gastrobar.button, 'Quiero mi demo gratis')
  assert.match(gastrobar.microcopy, /Sin tarjeta/)

  const pos = getBlogLeadCta('software-pos-restaurantes-colombia', 'final')
  assert.match(pos.button, /demostración/i)
})

test('shows price placement only on commercial slugs', () => {
  const commercial = getBlogLeadCta('software-para-restaurantes-precio', 'price')
  assert.match(commercial.headline, /95\.900/)

  const informational = getBlogLeadCta('inventario-restaurante', 'price')
  assert.doesNotMatch(informational.headline, /activa después del pago/)
  assert.equal(informational.button, 'Quiero ver cómo funciona')
})

test('keeps Colombia ES COP copy when market is CO', () => {
  const pos = getBlogLeadCta('software-pos-restaurantes', 'final', CO_ES)
  assert.match(pos.headline, /COP 95\.900/)
  assert.match(pos.microcopy, /Sin tarjeta/)

  const price = getBlogLeadCta('precio-sistema-pos', 'price', CO_ES)
  assert.match(price.headline, /COP 95\.900/)
})

test('shows EN CTA with USD $30/month for US English market', () => {
  const pos = getBlogLeadCta('software-pos-restaurants', 'final', US_EN)
  assert.match(pos.headline, /USD \$30\/month/)
  assert.match(pos.microcopy, /No card/i)
  assert.match(pos.button, /demo/i)

  const price = getBlogLeadCta('restaurant-pos-pricing', 'price', US_EN)
  assert.match(price.headline, /USD \$30\/month/)
  assert.equal(price.button, 'See my options')
})

test('defaults omitted market to Colombia ES behavior', () => {
  const omitted = getBlogLeadCta('software-pos-restaurantes', 'final')
  const explicit = getBlogLeadCta('software-pos-restaurantes', 'final', CO_ES)
  assert.equal(omitted.headline, explicit.headline)
  assert.equal(omitted.microcopy, explicit.microcopy)
})

test('builds stable blog lead attribution sources', () => {
  assert.equal(blogLeadSource('gastrobar-que-es'), 'blog:gastrobar-que-es')
})
