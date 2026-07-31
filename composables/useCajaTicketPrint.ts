/**
 * Prefactura/factura → configured caja printer via PrintBridge ESC/POS raw (#1960/#1965).
 * Falls back to window.print when bridge or caja assignment is missing.
 */
import {
  useLocalPrintBridge,
  type LocalPrintBridge,
} from '~/composables/useLocalPrintBridge'
import {
  buildEscPosTicketBytes,
  findReceiptLogoSrc,
  loadEscPosLogoRasterFromUrl,
} from '~/utils/escPosTicket'

export type CajaTicketPrintResult = 'bridge' | 'browser'

export type CajaTicketPrintDeps = {
  getCajaPrinterName: () => Promise<string | null | undefined>
  bridge?: LocalPrintBridge
  /** DOM/HTML content for the ticket; converted to ESC/POS text. */
  getElementHtml?: (elementId: string) => string | null
  browserPrint?: () => void
  /** Optional logo URL override; default discovers img.receipt-logo in print DOM. */
  getLogoSrc?: (elementId: string) => string | null
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

/**
 * Try PrintBridge raw ESC/POS to the tenant caja printer; otherwise call browserPrint().
 * Never throws — browser fallback absorbs bridge errors.
 */
export async function printTicketViaCajaOrBrowser(
  elementId: string,
  deps: CajaTicketPrintDeps,
): Promise<CajaTicketPrintResult> {
  const browserPrint = deps.browserPrint ?? (() => {
    if (typeof window !== 'undefined') window.print()
  })
  const getContent = deps.getElementHtml ?? defaultGetElementContent

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

  const content = getContent(elementId)
  if (!content?.trim()) {
    browserPrint()
    return 'browser'
  }

  let logoRaster: Uint8Array | null = null
  try {
    const logoSrc = deps.getLogoSrc?.(elementId) ?? findReceiptLogoSrc(elementId)
    if (logoSrc) logoRaster = await loadEscPosLogoRasterFromUrl(logoSrc)
  } catch {
    logoRaster = null
  }

  const bridge = deps.bridge ?? useLocalPrintBridge()
  try {
    await bridge.connect()
    await bridge.printRawEscPos(
      printerName,
      buildEscPosTicketBytes(content, { logoRaster }),
    )
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

  async function printElement(
    elementId: string,
    options?: {
      browserPrint?: () => void
      getElementHtml?: (elementId: string) => string | null
      getLogoSrc?: (elementId: string) => string | null
    },
  ): Promise<CajaTicketPrintResult> {
    return printTicketViaCajaOrBrowser(elementId, {
      getCajaPrinterName,
      bridge,
      browserPrint: options?.browserPrint,
      getElementHtml: options?.getElementHtml,
      getLogoSrc: options?.getLogoSrc,
    })
  }

  return { printElement, getCajaPrinterName }
}
