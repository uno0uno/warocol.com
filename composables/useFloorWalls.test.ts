import { describe, expect, it } from 'vitest'
import { groupWallsByZona, isValidWallPayload } from './useFloorWalls'

const walls = [
  { id: 'w1', zona: 'Salon', x1: 0, y1: 0, x2: 4, y2: 0 },
  { id: 'w2', zona: 'Terraza', x1: 1, y1: 1, x2: 1, y2: 3 },
  { id: 'w3', zona: 'Salon', x1: 0, y1: 2, x2: 4, y2: 2 },
]

describe('useFloorWalls grouping', () => {
  it('groups walls by zona preserving order', () => {
    const byZone = groupWallsByZona(walls)
    expect(byZone.get('Salon')!.map((w) => w.id)).toEqual(['w1', 'w3'])
    expect(byZone.get('Terraza')!.map((w) => w.id)).toEqual(['w2'])
  })

  it('returns empty map without walls', () => {
    expect(groupWallsByZona([]).size).toBe(0)
  })
})

describe('useFloorWalls payload validation', () => {
  it('accepts finite segments with valid zona', () => {
    expect(isValidWallPayload({ zona: 'Salon', x1: 0, y1: 0, x2: 4, y2: 0 })).toBe(true)
  })

  it('rejects blank zona, NaN and missing coords', () => {
    expect(isValidWallPayload({ zona: '  ', x1: 0, y1: 0, x2: 4, y2: 0 })).toBe(false)
    expect(isValidWallPayload({ zona: 'Salon', x1: NaN, y1: 0, x2: 4, y2: 0 })).toBe(false)
    expect(isValidWallPayload({ zona: 'Salon', x1: 0, y1: 0, x2: 4 } as never)).toBe(false)
  })
})
