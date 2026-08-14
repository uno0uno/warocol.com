import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  filterCityCatalog,
  resolveCityFromSearchTerm,
  formatApiValidationError,
  hasCuratedCityCatalog,
  type PublicCity,
} from './useCityCatalog.ts'

const catalog: PublicCity[] = [
  {
    country: 'Colombia',
    city: 'Aguazul',
    city_slug: 'aguazul',
    tenant_count: 0,
    department_name: 'Casanare',
  },
  {
    country: 'Colombia',
    city: 'Bogotá',
    city_slug: 'bogota',
    tenant_count: 3,
    department_name: 'Bogotá, D.C.',
  },
]

describe('city catalog search helpers', () => {
  it('maps aguasul typo to Aguazul', () => {
    const results = filterCityCatalog(catalog, 'aguasul')
    assert.equal(results.length, 1)
    assert.equal(results[0]?.city_slug, 'aguazul')
  })

  it('resolves Bogotá on blur-style exact match', () => {
    const match = resolveCityFromSearchTerm(catalog, 'Bogotá')
    assert.equal(match?.city_slug, 'bogota')
  })

  it('formats pydantic validation arrays for toast copy', () => {
    const message = formatApiValidationError(
      [{ msg: 'country and currency_code are read-only here; use /financial-profile' }],
      'fallback',
    )
    assert.match(message, /read-only/)
  })

  it('treats all 23 Negocio countries as curated catalogs', () => {
    assert.equal(hasCuratedCityCatalog('CO'), true)
    assert.equal(hasCuratedCityCatalog('AR'), true)
    assert.equal(hasCuratedCityCatalog('MX'), true)
    assert.equal(hasCuratedCityCatalog('US'), true)
    assert.equal(hasCuratedCityCatalog('PE'), true)
    assert.equal(hasCuratedCityCatalog('ES'), true)
    assert.equal(hasCuratedCityCatalog('CL'), true)
    assert.equal(hasCuratedCityCatalog(''), true)
    assert.equal(hasCuratedCityCatalog('ZZ'), false)
  })
})
