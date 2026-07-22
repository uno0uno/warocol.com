import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  areCategoryOrdersEqual,
  getCategoryOrderIds,
} from './useCategoryOrderDraft.ts'

const rows = [
  { id: 'cat-1', name: 'Bebidas' },
  { id: 'cat-2', name: 'Comidas' },
  { id: 'cat-3', name: 'Postres' },
]

describe('useCategoryOrderDraft helpers', () => {
  it('returns ids in the current draft order', () => {
    assert.deepEqual(getCategoryOrderIds(rows), ['cat-1', 'cat-2', 'cat-3'])
  })

  it('detects dirty order changes', () => {
    const moved = [rows[0], rows[2], rows[1]]

    assert.equal(areCategoryOrdersEqual(rows, rows), true)
    assert.equal(areCategoryOrdersEqual(rows, moved), false)
  })

  it('treats missing or extra rows as a different order', () => {
    assert.equal(areCategoryOrdersEqual(rows, rows.slice(0, 2)), false)
    assert.equal(areCategoryOrdersEqual(rows.slice(0, 2), rows), false)
  })
})
