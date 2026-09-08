import { describe, expect, it } from 'vitest'
import {
  UNPLACED_ZONE,
  buildZoneDropPayload,
  groupTablesByZona,
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
