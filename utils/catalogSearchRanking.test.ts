import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeCatalogSearchText,
  rankCatalogSearchOptions,
} from './catalogSearchRanking.ts'

describe('catalog search ranking', () => {
  it('normalizes accents, whitespace, and case', () => {
    assert.equal(normalizeCatalogSearchText('  LÁCTEOS '), 'lacteos')
  })

  it('orders exact, prefix, and partial matches while preserving bucket order', () => {
    const values = ['Salsas dulces', 'Salsas', 'Otras salsas', 'Salsas picantes', 'Carnes']
    assert.deepEqual(
      rankCatalogSearchOptions(values, 'salsas', value => value),
      ['Salsas', 'Salsas dulces', 'Salsas picantes', 'Otras salsas'],
    )
  })

  it('returns the original stable order for an empty query', () => {
    const values = ['Aceites', 'Azúcares', 'Bebidas']
    assert.deepEqual(rankCatalogSearchOptions(values, '', value => value), values)
  })
})
