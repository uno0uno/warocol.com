/**
 * Auto-print fired comandas when PrintBridge is connected (warocol.com#1971).
 * Mesa (source_type=table) → caja. Mostrador/barra (pos) → user's single printer.
 * Never falls back to window.print — silent no-op without bridge/printer.
 */
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { mapComandasForPrint } from '~/composables/useComandaPrint'
import { getUserPrinterName } from '~/composables/useUserPrinterPreference'
import {
  LocalPrintBridgeError,
  useLocalPrintBridge,
  type LocalPrintBridge,
} from '~/composables/useLocalPrintBridge'
import { buildEscPosTicketBytes } from '~/utils/escPosTicket'

export type ComandaFiredSsePayload = {
  type?: string
  order_id?: string
  source_type?: string
  table_display_name?: string | null
  /** Explicit target from API: caja (mesa) | user (mostrador/barra) */
  auto_print_target?: 'caja' | 'user' | string
  comandas?: unknown[]
}

export type ComandaPrintWithFallback = ComandaPrintPayload & {
  print_fallback?: boolean
}

const printedIds = new Set<string>()
const PRINTED_CAP = 200

export function __resetAutoComandaPrintDedupeForTests(): void {
  printedIds.clear()
}

/** Station tickets first; print_fallback / null station last (#1973). */
export function orderComandasForPrint(
  comandas: ComandaPrintWithFallback[],
): ComandaPrintWithFallback[] {
  return [...comandas].sort((a, b) => {
    const aFb = a.print_fallback || !a.station_id ? 1 : 0
    const bFb = b.print_fallback || !b.station_id ? 1 : 0
    return aFb - bFb
  })
}

export function resolveAutoPrintPrinterName(opts: {
  sourceType: string | null | undefined
  tableDisplayName?: string | null
  autoPrintTarget?: string | null
  cajaPrinterName: string | null | undefined
  userPrinterName: string | null | undefined
}): string | null {
  const explicit = (opts.autoPrintTarget || '').trim().toLowerCase()
  const source = (opts.sourceType || '').trim().toLowerCase()
  const label = (opts.tableDisplayName || '').trim().toLowerCase()

  let target: 'caja' | 'user'
  if (explicit === 'caja' || explicit === 'user') {
    target = explicit
  } else if (source === 'table' && label !== 'barra' && label !== 'bar') {
    target = 'caja'
  } else {
    target = 'user'
  }

  if (target === 'caja') {
    const caja = (opts.cajaPrinterName || '').trim()
    return caja || null
  }
  const user = (opts.userPrinterName || '').trim()
  return user || null
}

export function comandaDedupeKey(comanda: ComandaPrintPayload, orderId?: string): string {
  if (comanda.id) return String(comanda.id)
  return `fallback:${orderId || 'x'}:${comanda.comanda_number}:${comanda.station_name || ''}`
}

export function filterUnprintedComandas(
  comandas: ComandaPrintPayload[],
  orderId?: string,
): ComandaPrintPayload[] {
  const out: ComandaPrintPayload[] = []
  for (const c of comandas) {
    const key = comandaDedupeKey(c, orderId)
    if (printedIds.has(key)) continue
    out.push(c)
  }
  return out
}

export function markComandasPrinted(comandas: ComandaPrintPayload[], orderId?: string): void {
  for (const c of comandas) {
    printedIds.add(comandaDedupeKey(c, orderId))
  }
  while (printedIds.size > PRINTED_CAP) {
    const first = printedIds.values().next().value
    if (first == null) break
    printedIds.delete(first)
  }
}

export function buildComandaPlainText(comandas: ComandaPrintWithFallback[]): string {
  const blocks: string[] = []
  for (const c of orderComandasForPrint(comandas)) {
    const stationLabel = c.station_name
      || (c.print_fallback || !c.station_id ? 'Sin cocina asignada' : '')
    const lines: string[] = [
      `COMANDA #${c.comanda_number}`,
      c.table_display_name ? String(c.table_display_name) : '',
      stationLabel ? `Estacion: ${stationLabel}` : '',
      '----------------',
    ]
    for (const item of c.items) {
      lines.push(`${item.quantity}x ${item.kitchen_name}`)
      for (const mod of item.modifiers_snapshot || []) {
        const qty = Number(mod.quantity) || 1
        lines.push(`  + ${mod.name}${qty > 1 ? ` x${qty}` : ''}`)
      }
      if (item.notes?.trim()) lines.push(`  * ${item.notes.trim()}`)
    }
    blocks.push(lines.filter(Boolean).join('\n'))
  }
  return blocks.join('\n\n')
}

export type AutoPrintDeps = {
  bridge?: LocalPrintBridge
  getCajaPrinterName: () => Promise<string | null>
  getUserId: () => string
  /** Injected for tests — default uses getUserPrinterName */
  getUserPrinter?: (userId: string) => string | null
}

/**
 * Gate + print. Returns 'printed' | 'skipped'. Never throws to callers.
 */
export async function autoPrintComandaFired(
  payload: ComandaFiredSsePayload,
  deps: AutoPrintDeps,
): Promise<'printed' | 'skipped'> {
  if (payload?.type && payload.type !== 'comanda_fired') return 'skipped'

  const rawList = (payload.comandas || []) as Record<string, unknown>[]
  const mapped: ComandaPrintWithFallback[] = mapComandasForPrint(rawList).map((c) => {
    const raw = rawList.find((r) => {
      if (c.id != null && r.id != null) return String(r.id) === c.id
      return r.id == null
        && String(r.comanda_number ?? '') === String(c.comanda_number)
        && String(r.station_name ?? '') === String(c.station_name ?? '')
    })
    return {
      ...c,
      print_fallback: Boolean(raw?.print_fallback) || !c.station_id,
    }
  })
  const pending = filterUnprintedComandas(
    orderComandasForPrint(mapped),
    payload.order_id,
  )
  if (!pending.length) return 'skipped'

  let caja: string | null = null
  try {
    caja = await deps.getCajaPrinterName()
  } catch {
    caja = null
  }

  const userId = deps.getUserId()
  const userPrinter = (deps.getUserPrinter || getUserPrinterName)(userId)
  const printerName = resolveAutoPrintPrinterName({
    sourceType: payload.source_type,
    tableDisplayName: payload.table_display_name,
    autoPrintTarget: payload.auto_print_target,
    cajaPrinterName: caja,
    userPrinterName: userPrinter,
  })
  if (!printerName) return 'skipped'

  const bridge = deps.bridge ?? useLocalPrintBridge()
  try {
    await bridge.connect()
  } catch {
    return 'skipped'
  }

  const plain = buildComandaPlainText(pending)
  if (!plain.trim()) return 'skipped'

  try {
    await bridge.printRawEscPos(printerName, buildEscPosTicketBytes(plain))
    markComandasPrinted(pending, payload.order_id)
    return 'printed'
  } catch (err) {
    if (err instanceof LocalPrintBridgeError) return 'skipped'
    return 'skipped'
  }
}
