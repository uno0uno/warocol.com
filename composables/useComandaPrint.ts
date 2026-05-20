/**
 * Kitchen comanda ticket printing (#753) — browser print via hidden DOM + body class.
 */

export type ComandaPrintItem = {
  kitchen_name: string
  quantity: number
  modifiers_snapshot?: Array<{ name: string; price?: number }> | null
  notes?: string | null
}

export type ComandaPrintPayload = {
  id?: string
  comanda_number: number | string
  station_name?: string | null
  table_display_name?: string | null
  fired_at?: string | null
  items: ComandaPrintItem[]
}

export function formatComandaPrintTime(firedAt?: string | null): string {
  if (!firedAt) {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date())
  }
  const d = new Date(firedAt)
  if (Number.isNaN(d.getTime())) return firedAt
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

export type FireTableResponse = {
  success?: boolean
  data?: { comandas?: unknown[]; fired_items_count?: number }
  comandas?: unknown[]
  fired_items_count?: number
}

/** API wraps fire payload in `data`; tab/add and /fire share the same fields. */
export function parseFireTableResponse(raw: FireTableResponse): {
  comandas: unknown[]
  fired_items_count: number
} {
  const data = raw.data as Record<string, unknown> | undefined
  const comandas = data?.comandas ?? raw.comandas
  const fired = data?.fired_items_count ?? raw.fired_items_count
  return {
    comandas: Array.isArray(comandas) ? comandas : [],
    fired_items_count: typeof fired === 'number' ? fired : Number(fired ?? 0),
  }
}

export function mapComandasForPrint(rawComandas: unknown[]): ComandaPrintPayload[] {
  return (rawComandas as Record<string, unknown>[])
    .map((c) => ({
    id: c.id != null ? String(c.id) : undefined,
    comanda_number: (c.comanda_number as number | string) ?? '—',
    station_name: (c.station_name as string) ?? null,
    table_display_name: (c.table_display_name as string) ?? null,
    fired_at: c.fired_at != null ? String(c.fired_at) : null,
    items: ((c.items as Record<string, unknown>[]) ?? []).map((i) => ({
      kitchen_name: String(i.kitchen_name ?? ''),
      quantity: Number(i.quantity ?? 1),
      modifiers_snapshot: i.modifiers_snapshot as ComandaPrintItem['modifiers_snapshot'],
      notes: (i.notes as string) ?? null,
    })),
  }))
    .filter(c => c.items.length > 0)
}

export function orderItemIdsFromComandas(rawComandas: unknown[]): Set<string> {
  const ids = new Set<string>()
  for (const c of rawComandas as Record<string, unknown>[]) {
    for (const i of (c.items as Record<string, unknown>[]) ?? []) {
      if (i.order_item_id != null) ids.add(String(i.order_item_id))
    }
  }
  return ids
}

export function printComandaTickets(): void {
  document.body.classList.add('printing-comanda')
  const cleanup = () => {
    document.body.classList.remove('printing-comanda')
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(cleanup, 4000)
  window.print()
}
