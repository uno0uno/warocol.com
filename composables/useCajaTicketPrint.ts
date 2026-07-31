/**
 * Prefactura/factura → configured caja printer via QZ HTML (warocol.com#1950).
 * Falls back to window.print when bridge or caja assignment is missing.
 */
import {
  useLocalPrintBridge,
  type LocalPrintBridge,
} from '~/composables/useLocalPrintBridge'

export type CajaTicketPrintResult = 'bridge' | 'browser'

export type CajaTicketPrintDeps = {
  getCajaPrinterName: () => Promise<string | null | undefined>
  bridge?: LocalPrintBridge
  getElementHtml?: (elementId: string) => string | null
  browserPrint?: () => void
}

function defaultGetElementHtml(elementId: string): string | null {
  if (typeof document === 'undefined') return null
  const el = document.getElementById(elementId)
  if (!el) return null
  const html = el.outerHTML?.trim()
  return html || null
}

/**
 * Try QZ HTML print to the tenant caja printer; otherwise call browserPrint().
 * Never throws — browser fallback absorbs bridge errors.
 */
export async function printTicketViaCajaOrBrowser(
  elementId: string,
  deps: CajaTicketPrintDeps,
): Promise<CajaTicketPrintResult> {
  const browserPrint = deps.browserPrint ?? (() => {
    if (typeof window !== 'undefined') window.print()
  })
  const getHtml = deps.getElementHtml ?? defaultGetElementHtml

  let caja: string | null | undefined
  try {
    caja = await deps.getCajaPrinterName()
  } catch {
    browserPrint()
    return 'browser'
  }

  const printerName = (caja || '').trim()
  if (!printerName) {
    browserPrint()
    return 'browser'
  }

  const html = getHtml(elementId)
  if (!html) {
    browserPrint()
    return 'browser'
  }

  const bridge = deps.bridge ?? useLocalPrintBridge()
  try {
    await bridge.connect()
    await bridge.printHtml(printerName, html)
    return 'bridge'
  } catch {
    browserPrint()
    return 'browser'
  }
}

export function useCajaTicketPrint() {
  const { assignments, refetch } = usePrinterAssignments()
  const bridge = useLocalPrintBridge()

  async function getCajaPrinterName(): Promise<string | null> {
    if (!assignments.value) {
      try {
        await refetch()
      } catch {
        /* fall through */
      }
    }
    const name = assignments.value?.caja_printer_name || assignments.value?.resolved_caja
    return name?.trim() || null
  }

  async function printElement(elementId: string): Promise<CajaTicketPrintResult> {
    return printTicketViaCajaOrBrowser(elementId, {
      getCajaPrinterName,
      bridge,
    })
  }

  return { printElement, getCajaPrinterName }
}
