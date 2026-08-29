import { describe, expect, it } from 'vitest'
import {
  normalizePosHexColor,
  resolvePosProductCardColors,
  softPaletteFromHex,
} from './posCategoryColor'

describe('normalizePosHexColor', () => {
  it('uppercases valid #RRGGBB', () => {
    expect(normalizePosHexColor('#a1b2c3')).toBe('#A1B2C3')
  })

  it('accepts RRGGBB without hash', () => {
    expect(normalizePosHexColor('ff00aa')).toBe('#FF00AA')
  })

  it('returns null for empty or invalid', () => {
    expect(normalizePosHexColor(null)).toBeNull()
    expect(normalizePosHexColor('')).toBeNull()
    expect(normalizePosHexColor('#fff')).toBeNull()
    expect(normalizePosHexColor('not-a-color')).toBeNull()
  })
})

describe('resolvePosProductCardColors', () => {
  it('prefers category_color over keyword heuristics', () => {
    const fromHex = softPaletteFromHex('#0EA5E9')
    const resolved = resolvePosProductCardColors({
      categoryColor: '#0ea5e9',
      category: 'Postres',
      name: 'Torta de chocolate',
    })
    expect(resolved).toEqual(fromHex)
  })

  it('falls back to keyword palette when color is null', () => {
    const resolved = resolvePosProductCardColors({
      categoryColor: null,
      category: 'Bebidas',
      name: 'Jugo de naranja',
    })
    expect(resolved.bg).toBe('#F0F9FF')
    expect(resolved.border).toBe('#7DD3FC')
  })

  it('uses surface tokens when no color and no keyword match', () => {
    const resolved = resolvePosProductCardColors({
      categoryColor: null,
      category: 'Misc',
      name: 'Item XYZ',
    })
    expect(resolved.bg).toContain('--surface')
  })
})
