import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  areTableOrdersEqual,
  getTableOrderIds,
} from './useTableOrderDraft.ts'

const rows = [
  { id: 'mesa-1', name: 'Mesa 1' },
  { id: 'mesa-2', name: 'Mesa 2' },
  { id: 'mesa-3', name: 'Mesa 3' },
]

describe('useTableOrderDraft helpers', () => {
  it('returns ids in the current draft order', () => {
    assert.deepEqual(getTableOrderIds(rows), ['mesa-1', 'mesa-2', 'mesa-3'])
  })

  it('detects dirty order changes', () => {
    const moved = [rows[0], rows[2], rows[1]]

    assert.equal(areTableOrdersEqual(rows, rows), true)
    assert.equal(areTableOrdersEqual(rows, moved), false)
  })

  it('treats missing or extra rows as a different order', () => {
    assert.equal(areTableOrdersEqual(rows, rows.slice(0, 2)), false)
    assert.equal(areTableOrdersEqual(rows.slice(0, 2), rows), false)
  })
})
