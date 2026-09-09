import { describe, expect, it } from 'vitest'
import {
  NODE_FOOTPRINT_H,
  NODE_FOOTPRINT_W,
  findTooCloseTables,
  layoutUnplacedInMatrix,
  nodeToPayload,
  positionOverlaps,
  resolveTableCoords,
  tablesToNodes,
} from './useFloorPlanNodes'

const tables = [
  { id: 'm1', name: 'Mesa 1', status: 'free', zona: 'Salon', pos_x: 1, pos_y: 2 },
  { id: 'm2', name: 'Mesa 2', status: 'open', zona: null, pos_x: null, pos_y: null },
  { id: 'm3', name: 'Barra', status: 'open', zona: 'Barra', pos_x: 0, pos_y: 0 },
]

describe('tablesToNodes', () => {
  it('maps placed tables to nodes with scaled positions', () => {
    const nodes = tablesToNodes(tables)
    expect(nodes.map((n) => n.id)).toEqual(['m1', 'm3'])
    expect(nodes[0].position).toEqual({ x: 140, y: 280 })
    expect(nodes[0].data).toMatchObject({ tableId: 'm1', title: 'Mesa 1', zona: 'Salon' })
    expect(nodes.every((n) => n.type === 'mesa')).toBe(true)
  })
})

describe('nodeToPayload', () => {
  it('keeps 1-decimal precision so the card stays where dropped', () => {
    expect(nodeToPayload({ position: { x: 210, y: 70 } })).toEqual({ pos_x: 1.5, pos_y: 0.5 })
    expect(nodeToPayload({ position: { x: NaN, y: 10 } })).toEqual({ pos_x: 0, pos_y: 0.1 })
    expect(nodeToPayload({ position: { x: -70, y: -140 } })).toEqual({ pos_x: -0.5, pos_y: -1 })
  })
})

describe('positionOverlaps', () => {
  const pts = [
    { id: 'a', pos_x: 0, pos_y: 0 },
    { id: 'b', pos_x: 5, pos_y: 5 },
  ]
  it('detects overlap excluding self', () => {
    expect(positionOverlaps(pts, 'c', 0.2, 0)).toBe(true)
    expect(positionOverlaps(pts, 'a', 0, 0)).toBe(false)
    expect(positionOverlaps(pts, 'c', 2, 0)).toBe(false)
  })
})

describe('findTooCloseTables', () => {
  it('flags only overlapping cards', () => {
    const pts = [
      { id: 'a', pos_x: 0, pos_y: 0 },
      { id: 'b', pos_x: 0.5, pos_y: 0 },
      { id: 'c', pos_x: 5, pos_y: 5 },
    ]
    expect([...findTooCloseTables(pts)].sort()).toEqual(['a', 'b'])
  })
})

describe('layoutUnplacedInMatrix', () => {
  it('places all unplaced into free footprint cells at once', () => {
    const unplaced = [
      { id: 'a', zona: null, pos_x: null, pos_y: null },
      { id: 'b', zona: null, pos_x: null, pos_y: null },
    ]
    const next = layoutUnplacedInMatrix(unplaced, tables, new Map())
    expect(next.get('a')).toMatchObject({ pos_x: 1, pos_y: 0 })
    expect(next.get('b')).toMatchObject({ pos_x: 2, pos_y: 0 })
  })

  it('skips already staged tables', () => {
    const unplaced = [{ id: 'a', zona: null, pos_x: null, pos_y: null }]
    const staged = new Map([['a', { pos_x: 9, pos_y: 9 }]])
    const next = layoutUnplacedInMatrix(unplaced, tables, staged)
    expect(next.get('a')).toMatchObject({ pos_x: 9, pos_y: 9 })
  })

describe('resolveTableCoords', () => {
  it('prefers staged draft over stored coords', () => {
    const staged = new Map([['m1', { pos_x: 5, pos_y: 5 }]])
    expect(resolveTableCoords(tables[0], staged)).toMatchObject({ pos_x: 5, pos_y: 5, zona: 'Salon' })
    expect(resolveTableCoords(tables[0], new Map())).toMatchObject({ pos_x: 1, pos_y: 2 })
  })

  it('returns null without stored coords nor draft', () => {
    expect(resolveTableCoords(tables[1], new Map())).toBeNull()
    const staged = new Map([['m2', { pos_x: 0, pos_y: 3 }]])
    expect(resolveTableCoords(tables[1], staged)).toMatchObject({ pos_x: 0, pos_y: 3, zona: null })
  })
})

describe('layoutUnplacedInMatrix', () => {
  it('places all unplaced into free footprint cells at once', () => {
    const unplaced = [
      { id: 'a', zona: null, pos_x: null, pos_y: null },
      { id: 'b', zona: null, pos_x: null, pos_y: null },
    ]
    const next = layoutUnplacedInMatrix(unplaced, tables, new Map())
    expect(next.get('a')).toMatchObject({ pos_x: 1, pos_y: 0 })
    expect(next.get('b')).toMatchObject({ pos_x: 2, pos_y: 0 })
  })

  it('skips already staged tables', () => {
    const unplaced = [{ id: 'a', zona: null, pos_x: null, pos_y: null }]
    const staged = new Map([['a', { pos_x: 9, pos_y: 9 }]])
    const next = layoutUnplacedInMatrix(unplaced, tables, staged)
    expect(next.get('a')).toMatchObject({ pos_x: 9, pos_y: 9 })
  })

  it('uses 1-unit footprint steps for figures', () => {
    expect(NODE_FOOTPRINT_W).toBe(1)
    expect(NODE_FOOTPRINT_H).toBe(1)
  })
})
})
