export interface FloorWall {
  id: string
  zona: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface NewFloorWall {
  zona: string
  x1: number
  y1: number
  x2: number
  y2: number
}

/**
 * Group walls by zona for background-layer render per zone section.
 * uno0uno/warocol.com#2614
 */
export function groupWallsByZona(walls: readonly FloorWall[]): Map<string, FloorWall[]> {
  const byZone = new Map<string, FloorWall[]>()
  for (const wall of walls) {
    const list = byZone.get(wall.zona) ?? []
    list.push(wall)
    byZone.set(wall.zona, list)
  }
  return byZone
}

/**
 * Validate a wall segment payload client-side (mirrors API 400 rules).
 * uno0uno/warocol.com#2614
 */
export function isValidWallPayload(payload: Partial<NewFloorWall>): payload is NewFloorWall {
  if (!payload.zona || !payload.zona.trim() || payload.zona.length > 50) return false
  return (['x1', 'y1', 'x2', 'y2'] as const).every(
    (k) => typeof payload[k] === 'number' && Number.isFinite(payload[k]),
  )
}
