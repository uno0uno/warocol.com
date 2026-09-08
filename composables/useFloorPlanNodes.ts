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
 * Snapped to integers so occupancy checks (firstFreeCell) stay exact.
 */
export function nodeToPayload(node: { position: { x: number; y: number } }): {
  pos_x: number
  pos_y: number
} {
  const snap = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.round(n / NODE_PX)) : 0)
  return { pos_x: snap(node.position.x), pos_y: snap(node.position.y) }
}

/**
 * First free cell (row-major scan) for auto-placing a tray table on canvas.
 */
export function firstFreeCell(tables: readonly ZoneTableItem[]): { pos_x: number; pos_y: number } {
  const used = new Set(
    tables.filter(hasCoords).map((t) => `${Math.round(t.pos_x as number)}:${Math.round(t.pos_y as number)}`),
  )
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      if (!used.has(`${x}:${y}`)) return { pos_x: x, pos_y: y }
    }
  }
  return { pos_x: 0, pos_y: 0 }
}
