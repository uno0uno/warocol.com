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
 * Build the PATCH /api/tables/{id}/position payload for a zone drop.
 * Batch-1 API is full-replace, so always send all three fields together
 * to avoid wiping stored coordinates (uno0uno/warocol.com#2609).
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
