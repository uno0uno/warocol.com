import { describe, expect, it } from 'vitest'
import { blogSeoRedirectTarget } from './blogSeoRedirects.js'

describe('blogSeoRedirectTarget', () => {
  it('301s alias slugs in a single hop', () => {
    expect(blogSeoRedirectTarget('/blog/best-pos-for-restaurant'))
      .toBe('/blog/best-pos-system-for-restaurant')
    expect(blogSeoRedirectTarget('/blog/software-para-restaurantes'))
      .toBe('/blog/mejores-software-restaurantes-colombia')
    expect(blogSeoRedirectTarget('/blog/software-para-restaurante'))
      .toBe('/blog/mejores-software-restaurantes-colombia')
  })

  it('does not redirect unknown or canonical 404 slugs', () => {
    expect(blogSeoRedirectTarget('/blog/software-comandas-restaurantes-gratis')).toBeUndefined()
    expect(blogSeoRedirectTarget('/blog/facturacion-electronica-restaurante')).toBeUndefined()
    expect(blogSeoRedirectTarget('/blog/best-pos-system-for-restaurant')).toBeUndefined()
  })
})
