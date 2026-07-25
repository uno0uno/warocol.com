import assert from 'node:assert/strict'
import test from 'node:test'

import {
  blogLeadSource,
  getBlogLeadCta,
} from './blogLeadCta.ts'

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

test('builds stable blog lead attribution sources', () => {
  assert.equal(blogLeadSource('gastrobar-que-es'), 'blog:gastrobar-que-es')
})
