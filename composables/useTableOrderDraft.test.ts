import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  areTableOrdersEqual,
  canMoveTableOrderItem,
  getTableOrderIds,
  moveTableOrderItem,
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

  it('moves an item up or down without mutating the original list', () => {
    const movedUp = moveTableOrderItem(rows, 'mesa-2', -1)
    const movedDown = moveTableOrderItem(rows, 'mesa-2', 1)

    assert.deepEqual(getTableOrderIds(movedUp), ['mesa-2', 'mesa-1', 'mesa-3'])
    assert.deepEqual(getTableOrderIds(movedDown), ['mesa-1', 'mesa-3', 'mesa-2'])
    assert.deepEqual(getTableOrderIds(rows), ['mesa-1', 'mesa-2', 'mesa-3'])
  })

  it('keeps the order unchanged when a move is out of bounds', () => {
    assert.deepEqual(getTableOrderIds(moveTableOrderItem(rows, 'mesa-1', -1)), ['mesa-1', 'mesa-2', 'mesa-3'])
    assert.deepEqual(getTableOrderIds(moveTableOrderItem(rows, 'mesa-3', 1)), ['mesa-1', 'mesa-2', 'mesa-3'])
    assert.deepEqual(getTableOrderIds(moveTableOrderItem(rows, 'missing', 1)), ['mesa-1', 'mesa-2', 'mesa-3'])
  })

  it('detects valid movement and dirty order changes', () => {
    const moved = moveTableOrderItem(rows, 'mesa-3', -1)

    assert.equal(canMoveTableOrderItem(rows, 'mesa-1', -1), false)
    assert.equal(canMoveTableOrderItem(rows, 'mesa-1', 1), true)
    assert.equal(areTableOrdersEqual(rows, rows), true)
    assert.equal(areTableOrdersEqual(rows, moved), false)
  })
})
