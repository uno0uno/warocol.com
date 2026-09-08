import { describe, expect, it } from 'vitest'
import { firstFreeCell, nodeToPayload, tablesToNodes } from './useFloorPlanNodes'

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
  it('converts pixels back to units rounded to 1 decimal', () => {
    expect(nodeToPayload({ position: { x: 210, y: 70 } })).toEqual({ pos_x: 1.5, pos_y: 0.5 })
    expect(nodeToPayload({ position: { x: NaN, y: 10 } })).toEqual({ pos_x: 0, pos_y: 0.1 })
  })
})

describe('firstFreeCell', () => {
  it('finds the first free row-major cell', () => {
    expect(firstFreeCell(tables)).toEqual({ pos_x: 1, pos_y: 0 })
    expect(firstFreeCell([])).toEqual({ pos_x: 0, pos_y: 0 })
  })
})
