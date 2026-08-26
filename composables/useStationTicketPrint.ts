/**
 * Station-routed comanda printing via PrintBridge ESC/POS raw (warocol.com#1960).
 * Groups by resolved station printer (else caja); falls back to window.print.
 */
import {
  useLocalPrintBridge,
  type LocalPrintBridge,
} from '~/composables/useLocalPrintBridge'
import type { ComandaPrintPayload } from '~/composables/useComandaPrint'
import { buildEscPosTicketBytes, hasEscPosPrintablePlainText } from '~/utils/escPosTicket'
import { nextTick } from 'vue'

export type StationTicketPrintResult = 'bridge' | 'browser'

export type PrinterResolveMap = {
  resolved: Record<string, string | null>
  resolved_caja: string | null
}

export type ComandaPrinterGroup = {
  printerName: string | null
  comandas: ComandaPrintPayload[]
}

export function resolveComandaPrinterName(
  stationId: string | null | undefined,
  map: PrinterResolveMap,
): string | null {
  const sid = (stationId || '').trim()
  if (sid) {
    const mapped = map.resolved[sid]
    if (mapped != null && String(mapped).trim()) return String(mapped).trim()
  }
  const caja = map.resolved_caja || null
  return caja?.trim() || null
}

/** Group comandas by resolved printer name (shared printers → one job). */
export function groupComandasByPrinter(
  comandas: ComandaPrintPayload[],
  map: PrinterResolveMap,
): ComandaPrinterGroup[] {
  const order: string[] = []
  const byKey = new Map<string, ComandaPrintPayload[]>()
  for (const comanda of comandas) {
    const printerName = resolveComandaPrinterName(comanda.station_id, map)
    const key = printerName ?? ''
    if (!byKey.has(key)) {
      byKey.set(key, [])
      order.push(key)
    }
    byKey.get(key)!.push(comanda)
  }
  return order.map((key) => ({
    printerName: key || null,
    comandas: byKey.get(key)!,
  }))
}

function defaultGetElementContent(elementId: string): string | null {
  if (typeof document === 'undefined') return null
  const el = document.getElementById(elementId)
  if (!el) return null
  const text = (el as HTMLElement).innerText?.trim()
  if (text) return text
  const html = el.outerHTML?.trim()
  return html || null
}

export type PrintComandasViaBridgeDeps = {
  setQueue: (comandas: ComandaPrintPayload[]) => void
  getResolveMap: () => Promise<PrinterResolveMap | null>
  getCachedResolveMap?: () => PrinterResolveMap | null | undefined
  bridge?: LocalPrintBridge
  elementId?: string
  getElementHtml?: (elementId: string) => string | null
  browserPrint?: () => void
  waitForDom?: () => Promise<void>
}

/**
 * Print comandas grouped by station→printer (else caja).
 * Never throws — browser fallback on missing assignment / bridge errors.
 */
export async function printComandasViaBridgeOrBrowser(
  comandas: ComandaPrintPayload[],
  deps: PrintComandasViaBridgeDeps,
): Promise<StationTicketPrintResult> {
  const browserPrint = deps.browserPrint ?? (() => {
    if (typeof window !== 'undefined') window.print()
  })
  const elementId = deps.elementId ?? 'pos-comanda-print'
  const getContent = deps.getElementHtml ?? defaultGetElementContent
  const waitForDom = deps.waitForDom ?? (() => nextTick())

  if (!comandas.length) {
    return 'browser'
  }

  // Fast sync path to preserve transient activation on iPad/Android (#2448)
  const cachedMap = deps.getCachedResolveMap?.()
  if (typeof cachedMap !== 'undefined') {
    if (!cachedMap) {
      deps.setQueue(comandas)
      await waitForDom()
      browserPrint()
      return 'browser'
    }
    const cachedGroups = groupComandasByPrinter(comandas, cachedMap)
    const cachedWith = cachedGroups.filter((g) => g.printerName)
    if (!cachedWith.length) {
      deps.setQueue(comandas)
      await waitForDom()
      browserPrint()
      return 'browser'
    }
  }

  let map: PrinterResolveMap | null
  try {
    map = await deps.getResolveMap()
  } catch {
    deps.setQueue(comandas)
    await waitForDom()
    browserPrint()
    return 'browser'
  }

  if (!map) {
    deps.setQueue(comandas)
    await waitForDom()
    browserPrint()
    return 'browser'
  }

  const groups = groupComandasByPrinter(comandas, map)
  const withPrinter = groups.filter((g) => g.printerName)
  if (!withPrinter.length) {
    deps.setQueue(comandas)
    await waitForDom()
    browserPrint()
    return 'browser'
  }

  const bridge = deps.bridge ?? useLocalPrintBridge()
  try {
    await bridge.connect()
    for (const group of withPrinter) {
      deps.setQueue(group.comandas)
      await waitForDom()
      const content = getContent(elementId)
      if (!content?.trim() || !hasEscPosPrintablePlainText(content)) {
        throw new Error('Missing comanda print content')
      }
      await bridge.printRawEscPos(group.printerName!, buildEscPosTicketBytes(content))
    }
    // Unmapped leftovers (no caja) — leave queue as leftovers so deferred
    // callers' window.print only reprints those, not bridge-printed groups.
    const without = groups.filter((g) => !g.printerName).flatMap((g) => g.comandas)
    if (without.length) {
      deps.setQueue(without)
      await waitForDom()
      browserPrint()
      return 'browser'
    }
    deps.setQueue(comandas)
    return 'bridge'
  } catch {
    deps.setQueue(comandas)
    await waitForDom()
    browserPrint()
    return 'browser'
  }
}

export function useStationTicketPrint() {
  const { assignments, refetch } = usePrinterAssignments()
  const bridge = useLocalPrintBridge()

  async function getResolveMap(): Promise<PrinterResolveMap | null> {
    if (!assignments.value) {
      try {
        await refetch()
      } catch {
        /* fall through */
      }
    }
    const data = assignments.value
    if (!data) return null
    return {
      resolved: data.resolved ?? {},
      resolved_caja: data.resolved_caja ?? data.caja_printer_name ?? null,
    }
  }

  function getCachedResolveMap(): PrinterResolveMap | null | undefined {
    const data = assignments.value
    if (!data) return undefined
    return {
      resolved: data.resolved ?? {},
      resolved_caja: data.resolved_caja ?? data.caja_printer_name ?? null,
    }
  }

  async function printComandas(
    comandas: ComandaPrintPayload[],
    options: {
      setQueue: (comandas: ComandaPrintPayload[]) => void
      browserPrint?: () => void
    },
  ): Promise<StationTicketPrintResult> {
    return printComandasViaBridgeOrBrowser(comandas, {
      setQueue: options.setQueue,
      getResolveMap,
      getCachedResolveMap,
      bridge,
      browserPrint: options.browserPrint,
    })
  }

  return { printComandas, getResolveMap, getCachedResolveMap }
}
