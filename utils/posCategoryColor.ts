/**
 * POS product-card color resolution (#2509).
 * Prefer owner-set category.color (#RRGGBB); else keyword heuristic; else surface tokens.
 */

export interface PosCardPalette {
  bg: string
  hoverBg: string
  border: string
  slotBg: string
}

export interface PosColorEntry {
  keywords: string[]
  bg: string
  hoverBg: string
  border: string
  slotBg: string
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/

/** Normalize #RRGGBB; empty/invalid → null. */
export function normalizePosHexColor(value: string | null | undefined): string | null {
  if (value == null) return null
  let raw = String(value).trim()
  if (!raw) return null
  if (!raw.startsWith('#') && raw.length === 6) raw = `#${raw}`
  if (!HEX_RE.test(raw)) return null
  return raw.toUpperCase()
}

/** Soft pastel palette from a solid hex for POS card surfaces. */
export function softPaletteFromHex(hex: string): PosCardPalette {
  const h = normalizePosHexColor(hex) ?? '#94A3B8'
  return {
    bg: `color-mix(in srgb, ${h} 18%, white)`,
    hoverBg: `color-mix(in srgb, ${h} 28%, white)`,
    border: `color-mix(in srgb, ${h} 45%, white)`,
    slotBg: `color-mix(in srgb, ${h} 22%, white)`,
  }
}

export const POS_KEYWORD_COLOR_ENTRIES: PosColorEntry[] = [
  {
    keywords: ['veg', 'viggi', 'saludab', 'ensalad', 'orella', 'bowl', 'organico', 'orgánico'],
    bg: '#F0FDF4', hoverBg: '#DCFCE7', border: '#86EFAC', slotBg: '#DCFCE7',
  },
  {
    keywords: ['bebida', 'jugo', 'agua', 'cafe', 'café', 'limon', 'cerveza', 'coctel', 'fresco', 'smoothie', 'soda', 'refresc', 'gaseosa', 'drink'],
    bg: '#F0F9FF', hoverBg: '#E0F2FE', border: '#7DD3FC', slotBg: '#E0F2FE',
  },
  {
    keywords: ['postre', 'torta', 'helado', 'dulce', 'brownie', 'galleta', 'donut', 'cake', 'tarta', 'flan', 'mousse', 'crepe', 'pastel'],
    bg: '#FDF2F8', hoverBg: '#FCE7F3', border: '#F9A8D4', slotBg: '#FCE7F3',
  },
  {
    keywords: ['hamburgues', 'burg', 'hot dog', 'hotdog', 'chorizo', 'chori', 'pollo', 'res', 'carne', 'chicken', 'beef', 'costilla', 'cerdo', 'lomo', 'filete', 'asado', 'bestial', 'sencill'],
    bg: '#FFF7ED', hoverBg: '#FFEDD5', border: '#FDBA74', slotBg: '#FFEDD5',
  },
  {
    keywords: ['pizza', 'calzone'],
    bg: '#FFF1F2', hoverBg: '#FFE4E6', border: '#FDA4AF', slotBg: '#FFE4E6',
  },
  {
    keywords: ['pasta', 'sopa', 'crema', 'arroz', 'fideo', 'lasaña', 'espagueti'],
    bg: '#FEFCE8', hoverBg: '#FEF9C3', border: '#FDE047', slotBg: '#FEF9C3',
  },
  {
    keywords: ['papa', 'frit', 'empanada', 'snack', 'alita', 'croqueta', 'entrada'],
    bg: '#F0FDFA', hoverBg: '#CCFBF1', border: '#5EEAD4', slotBg: '#CCFBF1',
  },
  {
    keywords: ['pescado', 'marisco', 'salmon', 'salmón', 'atun', 'atún', 'camaron', 'camarón', 'langosta', 'pulpo', 'seafood'],
    bg: '#EEF2FF', hoverBg: '#E0E7FF', border: '#A5B4FC', slotBg: '#E0E7FF',
  },
  {
    keywords: ['desayuno', 'huevo', 'tostada', 'pancake', 'waffle', 'arepa', 'tamal', 'breakfast'],
    bg: '#FFFBEB', hoverBg: '#FEF3C7', border: '#FCD34D', slotBg: '#FEF3C7',
  },
  {
    keywords: ['caja', 'llevar', 'empaque', 'bolsa', 'envase'],
    bg: '#F5F3FF', hoverBg: '#EDE9FE', border: '#C4B5FD', slotBg: '#EDE9FE',
  },
  {
    keywords: ['sandwich', 'wrap', 'panini', 'taco', 'burrito', 'quesadilla'],
    bg: '#FDF4FF', hoverBg: '#FAE8FF', border: '#E879F9', slotBg: '#FAE8FF',
  },
]

const SURFACE_FALLBACK: PosCardPalette = {
  bg: 'hsl(var(--surface))',
  hoverBg: 'hsl(var(--surface-secondary))',
  border: 'hsl(var(--border))',
  slotBg: 'hsl(var(--surface-secondary))',
}

export function keywordPaletteForProduct(category: string, name: string): PosCardPalette {
  const text = `${category} ${name}`.toLowerCase()
  let bestEntry: PosColorEntry | null = null
  let bestScore = 0
  for (const entry of POS_KEYWORD_COLOR_ENTRIES) {
    const score = entry.keywords.filter(kw => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestEntry = entry
    }
  }
  return bestEntry ?? SURFACE_FALLBACK
}

/** Resolve POS card palette: category_color wins, then keywords, then surface. */
export function resolvePosProductCardColors(opts: {
  categoryColor?: string | null
  category: string
  name: string
}): PosCardPalette {
  const hex = normalizePosHexColor(opts.categoryColor)
  if (hex) return softPaletteFromHex(hex)
  return keywordPaletteForProduct(opts.category, opts.name)
}

/** Preset swatches for category color pickers (solid brands; soft-mixed on POS). */
export const CATEGORY_COLOR_PRESETS = [
  '#22C55E',
  '#0EA5E9',
  '#EC4899',
  '#F97316',
  '#F43F5E',
  '#EAB308',
  '#14B8A6',
  '#6366F1',
  '#F59E0B',
  '#8B5CF6',
] as const
