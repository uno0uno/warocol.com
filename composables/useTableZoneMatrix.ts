export interface ZoneTableItem {
  id: string
  zona?: string | null
  pos_x?: number | null
  pos_y?: number | null
  [key: string]: unknown
}

export interface ZoneGroup {
  zona: string
  tables: ZoneTableItem[]
}

export const UNPLACED_ZONE = 'Sin ubicar'

/** Logical grid columns for free x/y positioning (matches lg:grid-cols-4). */
export const ZONE_GRID_COLS = 4

export function zoneOf(table: ZoneTableItem): string {
  const zona = typeof table.zona === 'string' ? table.zona.trim() : ''
  return zona || UNPLACED_ZONE
}

/**
 * Group regular tables by zona, preserving API order within each zone.
 * Tables with NULL/blank zona fall back to UNPLACED_ZONE (Operaciones order).
 * uno0uno/warocol.com#2610
 */
export function groupTablesByZona(tables: readonly ZoneTableItem[]): ZoneGroup[] {
  const order: string[] = []
  const byZone = new Map<string, ZoneTableItem[]>()
  for (const table of tables) {
    const zona = zoneOf(table)
    if (!byZone.has(zona)) {
      byZone.set(zona, [])
      order.push(zona)
    }
    byZone.get(zona)!.push(table)
  }
  // "Sin ubicar" always last so placed zones read first.
  order.sort((a, b) => {
    if (a === UNPLACED_ZONE) return 1
    if (b === UNPLACED_ZONE) return -1
    return a.localeCompare(b, 'es')
  })
  return order.map((zona) => ({ zona, tables: byZone.get(zona)! }))
}

/**
 * Sort zone tables by stored (y, x); tables without coordinates keep
 * API order at the end (legacy zona-only drops from #2610).
 * uno0uno/warocol.com#2613
 */
export function sortTablesByPosition(tables: readonly ZoneTableItem[]): ZoneTableItem[] {
  const placed = tables.filter(
    (t) => typeof t.pos_x === 'number' && typeof t.pos_y === 'number',
  )
  const unplaced = tables.filter(
    (t) => !(typeof t.pos_x === 'number' && typeof t.pos_y === 'number'),
  )
  placed.sort((a, b) => (a.pos_y as number) - (b.pos_y as number) || (a.pos_x as number) - (b.pos_x as number))
  return [...placed, ...unplaced]
}

/**
 * Derive grid coordinates from the drop index within the target zone.
 * uno0uno/warocol.com#2613
 */
export function positionForIndex(index: number): { pos_x: number; pos_y: number } {
  const safe = Math.max(0, Math.floor(index))
  return { pos_x: safe % ZONE_GRID_COLS, pos_y: Math.floor(safe / ZONE_GRID_COLS) }
}

/**
 * Build the PATCH /api/tables/{id}/position payload for a free-grid drop:
 * new zona + coordinates derived from the drop index.
 * uno0uno/warocol.com#2613
 */
export function buildFreePositionPayload(
  targetZona: string,
  newIndex: number,
): { pos_x: number; pos_y: number; zona: string | null } {
  return { ...positionForIndex(newIndex), zona: targetZona === UNPLACED_ZONE ? null : targetZona }
}

/**
 * Build the PATCH /api/tables/{id}/position payload for a zone drop.
 * Sends all three fields together to avoid wiping stored coordinates
 * (uno0uno/warocol.com#2609; API is partial but explicit values win).
 */
export function buildZoneDropPayload(
  table: ZoneTableItem,
  targetZona: string,
): { pos_x: number | null; pos_y: number | null; zona: string | null } {
  const zona = targetZona === UNPLACED_ZONE ? null : targetZona
  const pos_x = typeof table.pos_x === 'number' ? table.pos_x : null
  const pos_y = typeof table.pos_y === 'number' ? table.pos_y : null
  return { pos_x, pos_y, zona }
}
