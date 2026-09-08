import { describe, expect, it } from 'vitest'
import {
  UNPLACED_ZONE,
  buildFreePositionPayload,
  buildZoneDropPayload,
  groupTablesByZona,
  positionForIndex,
  sortTablesByPosition,
} from './useTableZoneMatrix'

const rows = [
  { id: 'm1', name: 'Mesa 1', zona: 'Terraza', pos_x: 10, pos_y: 20 },
  { id: 'm2', name: 'Mesa 2', zona: null, pos_x: null, pos_y: null },
  { id: 'm3', name: 'Mesa 3', zona: 'Salon', pos_x: 1, pos_y: 2 },
  { id: 'm4', name: 'Mesa 4', zona: 'Terraza', pos_x: 30, pos_y: 40 },
]

describe('useTableZoneMatrix grouping', () => {
  it('groups by zona preserving API order within each zone', () => {
    const groups = groupTablesByZona(rows)
    expect(groups.map((g) => g.zona)).toEqual(['Salon', 'Terraza', UNPLACED_ZONE])
    expect(groups.find((g) => g.zona === 'Terraza')!.tables.map((t) => t.id)).toEqual([
      'm1',
      'm4',
    ])
  })

  it('sends unplaced tables to Sin ubicar fallback', () => {
    const groups = groupTablesByZona(rows)
    expect(groups.find((g) => g.zona === UNPLACED_ZONE)!.tables.map((t) => t.id)).toEqual([
      'm2',
    ])
  })

  it('treats blank zona as unplaced', () => {
    const groups = groupTablesByZona([{ id: 'm9', zona: '  ' }])
    expect(groups.length).toBe(1)
    expect(groups[0].zona).toBe(UNPLACED_ZONE)
  })
})

describe('useTableZoneMatrix drop payload', () => {
  it('keeps stored coordinates when moving zones (full-replace API)', () => {
    expect(buildZoneDropPayload(rows[0], 'Salon')).toEqual({
      pos_x: 10,
      pos_y: 20,
      zona: 'Salon',
    })
  })

  it('clears zona but keeps coordinates when dropped in Sin ubicar', () => {
    expect(buildZoneDropPayload(rows[0], UNPLACED_ZONE)).toEqual({
      pos_x: 10,
      pos_y: 20,
      zona: null,
    })
  })
})

describe('useTableZoneMatrix free x/y grid (#2613)', () => {
  it('derives row-major coordinates from the drop index', () => {
    expect(positionForIndex(0)).toEqual({ pos_x: 0, pos_y: 0 })
    expect(positionForIndex(3)).toEqual({ pos_x: 3, pos_y: 0 })
    expect(positionForIndex(4)).toEqual({ pos_x: 0, pos_y: 1 })
    expect(positionForIndex(-2)).toEqual({ pos_x: 0, pos_y: 0 })
    expect(positionForIndex(NaN)).toEqual({ pos_x: 0, pos_y: 0 })
  })

  it('sorts placed tables by (y, x), legacy without coords last in API order', () => {
    const tables = [
      { id: 'a', zona: 'Salon', pos_x: 2, pos_y: 0 },
      { id: 'b', zona: 'Salon', pos_x: null, pos_y: null },
      { id: 'c', zona: 'Salon', pos_x: 0, pos_y: 1 },
      { id: 'd', zona: 'Salon', pos_x: 0, pos_y: 0 },
    ]
    expect(sortTablesByPosition(tables).map((t) => t.id)).toEqual(['d', 'a', 'c', 'b'])
  })

  it('builds free payload with zona + derived coordinates', () => {
    expect(buildFreePositionPayload('Terraza', 5)).toEqual({
      pos_x: 1,
      pos_y: 1,
      zona: 'Terraza',
    })
    expect(buildFreePositionPayload(UNPLACED_ZONE, 0)).toEqual({
      pos_x: 0,
      pos_y: 0,
      zona: null,
    })
  })
})
