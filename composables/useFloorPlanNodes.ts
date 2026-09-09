import type { ZoneTableItem } from './useTableZoneMatrix'

/** Pixels per floor-plan unit (pos_x/pos_y are grid units). */
export const NODE_PX = 140

export interface FloorPlanNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: { tableId: string; title: string; status: string; zona: string | null }
}

export function hasCoords(table: ZoneTableItem): table is ZoneTableItem & {
  pos_x: number
  pos_y: number
} {
  return typeof table.pos_x === 'number' && typeof table.pos_y === 'number'
}

/**
 * Map placed tables to Vue Flow nodes (free canvas, uno0uno/warocol.com#2617).
 * Tables without coordinates stay out — they render in the Sin ubicar tray.
 */
export function tablesToNodes(tables: readonly ZoneTableItem[]): FloorPlanNode[] {
  return tables.filter(hasCoords).map((table) => ({
    id: String(table.id),
    type: 'mesa',
    position: { x: (table.pos_x as number) * NODE_PX, y: (table.pos_y as number) * NODE_PX },
    data: {
      tableId: String(table.id),
      title: String((table as Record<string, unknown>).name ?? table.id),
      status: String((table as Record<string, unknown>).status ?? 'free'),
      zona: typeof table.zona === 'string' && table.zona.trim() ? table.zona : null,
    },
  }))
}

/**
 * Convert a dropped node position back to floor-plan units for PATCH.
 * Snapped to integers so occupancy checks stay exact.
 */
export function nodeToPayload(node: { position: { x: number; y: number } }): {
  pos_x: number
  pos_y: number
} {
  const snap = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n / NODE_PX)) : 0)
  return { pos_x: snap(node.position.x), pos_y: snap(node.position.y) }
}

export interface StagedCoords {
  pos_x: number
  pos_y: number
  zona?: string | null
}

/**
 * Resolve effective coordinates: staged draft wins over stored.
 * Returns null when the table has neither (stays in Sin ubicar).
 * uno0uno/warocol.com#2620
 */
export function resolveTableCoords(
  table: ZoneTableItem,
  staged: ReadonlyMap<string, StagedCoords>,
): { pos_x: number; pos_y: number; zona: string | null } | null {
  const draft = staged.get(String(table.id))
  if (draft) {
    return {
      pos_x: draft.pos_x,
      pos_y: draft.pos_y,
      zona: draft.zona ?? (typeof table.zona === 'string' && table.zona.trim() ? table.zona : null),
    }
  }
  if (!hasCoords(table)) return null
  return {
    pos_x: table.pos_x as number,
    pos_y: table.pos_y as number,
    zona: typeof table.zona === 'string' && table.zona.trim() ? table.zona : null,
  }
}

/**
 * Figure footprint in grid units (PosTableFigure ≈ 76px on 140px units).
 * Auto-place steps by footprint so fresh nodes never overlap.
 * uno0uno/warocol.com#2638
 */
export const NODE_FOOTPRINT_W = 1
export const NODE_FOOTPRINT_H = 1

/**
 * Lay out unplaced tables into free matrix cells (row-major, footprint steps) for
 * "Colocar todas" — pure, testable; caller stages the result.
 * uno0uno/warocol.com#2620
 */
export function layoutUnplacedInMatrix(
  unplaced: readonly ZoneTableItem[],
  occupied: readonly ZoneTableItem[],
  staged: ReadonlyMap<string, StagedCoords>,
): Map<string, StagedCoords> {
  const next = new Map(staged)
  const taken = new Set<string>()
  const key = (x: number, y: number) => `${x}:${y}`
  for (const t of occupied) {
    const c = resolveTableCoords(t, next)
    if (c) taken.add(key(Math.round(c.pos_x), Math.round(c.pos_y)))
  }
  const freeCell = (): { pos_x: number; pos_y: number } => {
    for (let y = 0; y < 100; y += NODE_FOOTPRINT_H) {
      for (let x = 0; x < 100; x += NODE_FOOTPRINT_W) {
        if (!taken.has(key(x, y))) {
          taken.add(key(x, y))
          return { pos_x: x, pos_y: y }
        }
      }
    }
    return { pos_x: 0, pos_y: 0 }
  }
  for (const table of unplaced) {
    if (next.has(String(table.id))) continue
    const cell = freeCell()
    next.set(String(table.id), { ...cell, zona: typeof table.zona === 'string' && table.zona.trim() ? table.zona : 'Salon' })
  }
  return next
}
