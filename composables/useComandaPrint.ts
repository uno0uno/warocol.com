/**
 * Kitchen comanda ticket printing (#753) — browser print via hidden DOM + body class.
 * Prefer printComandasViaBridgeOrBrowser (warocol.com#1951) for station routing.
 */

import { DEFAULT_TENANT_TIMEZONE, normalizeTimezone } from '~/utils/bogotaDate'
import { normalizeUiLocale, type UiLocale } from '~/utils/parseLocaleDecimal'
import { toNumberLocaleTag } from '~/utils/appLocales'

export type ComandaModifierSnapshot = {
  name: string
  price?: number
  quantity?: number
}

export type ComandaPrintItem = {
  kitchen_name: string
  quantity: number
  modifiers_snapshot?: ComandaModifierSnapshot[] | null
  notes?: string | null
}

export function formatComandaModifierLabel(
  mod: ComandaModifierSnapshot,
  options?: { includePrice?: boolean; formatPrice?: (amount: number) => string },
): string {
  const qty = Number(mod.quantity) || 1
  let label = mod.name
  // ASCII separators — thermal Windows drivers often turn ×/· into "?"
  if (qty > 1) label += ` x${qty}`
  if (options?.includePrice && mod.price != null) {
    const lineTotal = Number(mod.price) * qty
    label += ` - ${options.formatPrice ? options.formatPrice(lineTotal) : String(lineTotal)}`
  }
  return label
}

export type ComandaTicketPlainTextOptions = {
  businessName?: string
  /** e.g. "*** COMANDA POS ***" */
  title?: string
  comandaLabel?: (numbers: string) => string
  stationLabel?: (name: string) => string
  noStationLabel?: string
  specialNotesLabel?: string
  includeModifierPrices?: boolean
  formatPrice?: (amount: number) => string
  formatTime?: (firedAt?: string | null) => string
  orderComandas?: (comandas: ComandaPrintPayload[]) => ComandaPrintPayload[]
}

/**
 * Shared plain-text comanda layout for ESC/POS auto-print and browser/thermal
 * window.print (#1975). Explicit \\n so generic Windows drivers do not mash rows.
 */
export function buildComandaTicketPlainText(
  comandas: ComandaPrintPayload[],
  options: ComandaTicketPlainTextOptions = {},
): string {
  if (!comandas.length) return ''

  const ordered = options.orderComandas
    ? options.orderComandas(comandas)
    : comandas
  const first = ordered[0]!
  const business = (options.businessName || 'WARO').trim() || 'WARO'
  const title = options.title ?? '*** COMANDA POS ***'
  const noStation = options.noStationLabel ?? 'Sin cocina asignada'
  const specialNotes = options.specialNotesLabel ?? 'Notas especiales'
  const stationLabel = options.stationLabel ?? ((name: string) => `Estacion: ${name}`)
  const comandaLabel = options.comandaLabel ?? ((numbers: string) => `Comanda #${numbers}`)
  const formatTime = options.formatTime ?? ((firedAt?: string | null) => formatComandaPrintTime(firedAt))

  const numbers = [...new Set(ordered.map((c) => String(c.comanda_number ?? '—')))].join(', ')

  type Section = { stationName: string; items: ComandaPrintItem[] }
  const sections: Section[] = []
  const byStation = new Map<string, Section>()
  for (const comanda of ordered) {
    const stationName = (comanda.station_name || '').trim() || noStation
    let section = byStation.get(stationName)
    if (!section) {
      section = { stationName, items: [] }
      byStation.set(stationName, section)
      sections.push(section)
    }
    section.items.push(...comanda.items)
  }

  const lines: string[] = [
    business,
    title,
    formatTime(first.fired_at),
  ]
  const table = (first.table_display_name || '').trim()
  if (table) lines.push(table)
  lines.push(comandaLabel(numbers))
  lines.push('--------------------------------')

  for (const section of sections) {
    lines.push(stationLabel(section.stationName))
    for (const item of section.items) {
      const qty = Number(item.quantity) || 1
      lines.push(`${qty}x ${item.kitchen_name}`)
      for (const mod of item.modifiers_snapshot || []) {
        lines.push(
          `  - ${formatComandaModifierLabel(mod, {
            includePrice: options.includeModifierPrices,
            formatPrice: options.formatPrice,
          })}`,
        )
      }
      const notes = (item.notes || '').trim()
      if (notes) lines.push(`  * ${specialNotes}: ${notes}`)
    }
    lines.push('')
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export type ComandaPrintPayload = {
  id?: string
  comanda_number: number | string
  station_id?: string | null
  station_name?: string | null
  table_display_name?: string | null
  fired_at?: string | null
  items: ComandaPrintItem[]
}

export function formatComandaPrintTime(
  firedAt?: string | null,
  timezone = DEFAULT_TENANT_TIMEZONE,
  locale: UiLocale | string = 'es',
): string {
  const timeZone = normalizeTimezone(timezone)
  const localeTag = toNumberLocaleTag(normalizeUiLocale(locale))
  if (!firedAt) {
    return new Intl.DateTimeFormat(localeTag, {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone,
    }).format(new Date())
  }
  const d = new Date(firedAt)
  if (Number.isNaN(d.getTime())) return firedAt
  return new Intl.DateTimeFormat(localeTag, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
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
    station_id: c.station_id != null ? String(c.station_id) : null,
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
  void document.body.offsetHeight
  const cleanup = () => {
    document.body.classList.remove('printing-comanda')
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(cleanup, 4000)
  window.print()
}
