/**
 * Prefactura/factura → configured caja printer via PrintBridge ESC/POS raw (#1960/#1965).
 * Falls back to window.print when bridge/caja is missing, print fails, or hangs (#2003).
 * Soft CUPS “status gone” stays non-fatal but surfaces as unconfirmed (#2058).
 * Sticky browser mode skips bridge until cashier returns to thermal (#2060).
 */
import {
  enableCajaPrintForceBrowser,
  isCajaPrintForceBrowser,
} from '~/composables/useCajaPrintPreference'
import {
  LocalPrintBridgeError,
  useLocalPrintBridge,
  type BridgePrintOutcome,
  type LocalPrintBridge,
} from '~/composables/useLocalPrintBridge'
import {
  buildEscPosTicketBytes,
  findReceiptLogoSrc,
  loadEscPosLogoRasterFromUrl,
} from '~/utils/escPosTicket'

export type CajaTicketPrintResult =
  | { mode: 'bridge'; confirmed: true; printerName: string }
  | { mode: 'bridge'; confirmed: false; printerName: string }
  | { mode: 'browser' }

/** Cap wait so offline USB/CUPS cannot stall the cashier before browser fallback. */
export const BRIDGE_PRINT_TIMEOUT_MS = 5000

export type CajaTicketPrintDeps = {
  getCajaPrinterName: () => Promise<string | null | undefined>
  bridge?: LocalPrintBridge
  /** DOM/HTML content for the ticket; converted to ESC/POS text. */
  getElementHtml?: (elementId: string) => string | null
  browserPrint?: () => void
  /** Optional logo URL override; default discovers img.receipt-logo in print DOM. */
  getLogoSrc?: (elementId: string) => string | null
  /** Override bridge print race timeout (tests). */
  bridgePrintTimeoutMs?: number
  /** Sticky browser preference (#2060); default reads localStorage. */
  isForceBrowser?: () => boolean
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new LocalPrintBridgeError('PRINT_FAILED', `${label} timed out after ${ms}ms`))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer)
  })
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

function bridgeResult(
  printerName: string,
  outcome: BridgePrintOutcome,
): CajaTicketPrintResult {
  return {
    mode: 'bridge',
    confirmed: outcome === 'completed',
    printerName,
  }
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
  const forceBrowser = deps.isForceBrowser ?? isCajaPrintForceBrowser

  if (forceBrowser()) {
    browserPrint()
    return { mode: 'browser' }
  }

  let caja: string | null | undefined
  try {
    caja = await deps.getCajaPrinterName()
  } catch {
    browserPrint()
    return { mode: 'browser' }
  }

  const printerName = (caja || '').trim()
  if (!printerName) {
    browserPrint()
    return { mode: 'browser' }
  }

  const content = getContent(elementId)
  if (!content?.trim()) {
    browserPrint()
    return { mode: 'browser' }
  }

  let logoRaster: Uint8Array | null = null
  try {
    const logoSrc = deps.getLogoSrc?.(elementId) ?? findReceiptLogoSrc(elementId)
    if (logoSrc) {
      logoRaster = await loadEscPosLogoRasterFromUrl(logoSrc, { elementId })
    }
  } catch {
    logoRaster = null
  }

  const bridge = deps.bridge ?? useLocalPrintBridge()
  const timeoutMs = deps.bridgePrintTimeoutMs ?? BRIDGE_PRINT_TIMEOUT_MS
  try {
    const outcome = await withTimeout(
      (async () => {
        await bridge.connect()
        return bridge.printRawEscPos(
          printerName,
          buildEscPosTicketBytes(content, { logoRaster }),
        )
      })(),
      timeoutMs,
      'Caja PrintBridge print',
    )
    return bridgeResult(printerName, outcome)
  } catch {
    browserPrint()
    return { mode: 'browser' }
  }
}

export type CajaPrintFeedbackToast = {
  warning: (
    message: string,
    options?: {
      title?: string
      duration?: number
      actions?: Array<{ label: string; onClick: () => void }>
    },
  ) => unknown
}

/** Warn cashier when CUPS could not confirm paper out; offer retry / browser (#2058). */
export function notifyUnconfirmedCajaPrint(
  result: CajaTicketPrintResult,
  opts: {
    t: (key: string, params?: Record<string, unknown>) => string
    toast: CajaPrintFeedbackToast
    onRetry: () => void
    onBrowserPrint: () => void
  },
): void {
  if (result.mode !== 'bridge' || result.confirmed) return
  opts.toast.warning(
    opts.t('pos.receipt.printUnconfirmedBody', { name: result.printerName }),
    {
      title: opts.t('pos.receipt.printUnconfirmedTitle'),
      duration: 15000,
      actions: [
        {
          label: opts.t('pos.receipt.printRetry'),
          onClick: opts.onRetry,
        },
        {
          label: opts.t('pos.receipt.printWithBrowser'),
          onClick: () => {
            enableCajaPrintForceBrowser()
            opts.onBrowserPrint()
          },
        },
      ],
    },
  )
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
