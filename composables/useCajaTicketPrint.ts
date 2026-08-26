/**
 * Prefactura/factura → configured caja printer via PrintBridge ESC/POS raw (#1960/#1965).
 * Falls back to window.print when bridge/caja is missing, print fails, or hangs (#2003).
 * Soft CUPS “status gone” → unconfirmed (may print or queue offline; #2058/#2072).
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
  hasEscPosPrintablePlainText,
  loadEscPosLogoRasterFromUrl,
} from '~/utils/escPosTicket'

export type CajaTicketPrintResult =
  | { mode: 'bridge'; confirmed: true; printerName: string }
  | { mode: 'bridge'; confirmed: false; printerName: string }
  | { mode: 'browser' }
  | { mode: 'skipped' }

/** Cap wait so offline USB/CUPS cannot stall the cashier before browser fallback. */
export const BRIDGE_PRINT_TIMEOUT_MS = 5000

/** Ignore double-clicks while a bridge/browser print attempt is in flight (#2072). */
let cajaPrintInFlight = false

/** Test-only: reset in-flight lock between cases. */
export function __resetCajaPrintInFlightForTests(): void {
  cajaPrintInFlight = false
}

export type CajaTicketPrintDeps = {
  getCajaPrinterName: () => Promise<string | null | undefined>
  /** Sync cached value — when provided, allows transient-preserving fast path without await refetch. */
  getCachedCajaPrinterName?: () => string | null | undefined
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
  if (cajaPrintInFlight) return { mode: 'skipped' }
  cajaPrintInFlight = true

  const browserPrint = deps.browserPrint ?? (() => {
    if (typeof window !== 'undefined') window.print()
  })
  const getContent = deps.getElementHtml ?? defaultGetElementContent
  const forceBrowser = deps.isForceBrowser ?? isCajaPrintForceBrowser

  // iPad Safari transient activation ~0.5s (webkit): any await before window.print
  // loses the gesture and the dialog is silently ignored. When the caller already
  // showed that no caja printer is configured (assignments null / !printerName),
  // that knowledge is synchronously available via a cached assignment, but the
  // helper awaited getCajaPrinterName() (15s staleTime fetch) before fallback.
  // The ventas caller now re-checks without await; here we keep the same no-op
  // optimization: if deps declares browser-only (e.g. ventas iPad path), the
  // caller passes browserPrint that already fired sync — we still return browser
  // without double-print. No behavior change for POS thermal path with printer.
  try {
    if (forceBrowser()) {
      browserPrint()
      return { mode: 'browser' }
    }

    // Fast sync path: if caller cached assignments and they show no caja, skip
    // the awaited refetch entirely so window.print stays inside transient activation (#2448).
    const cached = deps.getCachedCajaPrinterName?.()
    console.log('[print-composable] cached=' + JSON.stringify(cached) + ' forceBrowser=' + forceBrowser())
    if (typeof cached !== 'undefined') {
      if (!String(cached || '').trim()) {
        console.log('[print-composable] no caja cached -> browser fallback'); browserPrint()
        return { mode: 'browser' }
      }
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
    // Reject markup/whitespace that would become cut-only ESC/POS (#2072).
    if (!content?.trim() || !hasEscPosPrintablePlainText(content)) {
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
  } finally {
    cajaPrintInFlight = false
  }
}

type CajaPrintToastOptions = {
  title?: string
  duration?: number
  actions?: Array<{ label: string; onClick: () => void }>
}

export type CajaPrintFeedbackToast = {
  success: (message: string, options?: CajaPrintToastOptions) => unknown
  warning: (message: string, options?: CajaPrintToastOptions) => unknown
}

function showUnconfirmedHelpToast(
  printerName: string,
  opts: {
    t: (key: string, params?: Record<string, unknown>) => string
    toast: CajaPrintFeedbackToast
    onRetry: () => void
    onBrowserPrint: () => void
  },
): void {
  opts.toast.warning(
    opts.t('pos.receipt.printUnconfirmedBody', { name: printerName }),
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

/**
 * Bridge feedback (#2074):
 * - CUPS completed → calm success
 * - Soft-success (typical Star) → calm “sent” + optional “¿No salió?” help
 * - Escalated help only when cashier asks
 */
export function notifyCajaPrintResult(
  result: CajaTicketPrintResult,
  opts: {
    t: (key: string, params?: Record<string, unknown>) => string
    toast: CajaPrintFeedbackToast
    onRetry: () => void
    onBrowserPrint: () => void
  },
): void {
  if (result.mode !== 'bridge') return
  if (result.confirmed) {
    opts.toast.success(
      opts.t('pos.receipt.printOkBody', { name: result.printerName }),
      {
        title: opts.t('pos.receipt.printOkTitle'),
        duration: 3500,
      },
    )
    return
  }
  // Soft-success: assume happy path; escalate only if cashier says it did not print.
  opts.toast.success(
    opts.t('pos.receipt.printSentBody', { name: result.printerName }),
    {
      title: opts.t('pos.receipt.printSentTitle'),
      duration: 4000,
      actions: [
        {
          label: opts.t('pos.receipt.printDidNotComeOut'),
          onClick: () => showUnconfirmedHelpToast(result.printerName, opts),
        },
      ],
    },
  )
}

/** @deprecated Prefer notifyCajaPrintResult. */
export function notifyUnconfirmedCajaPrint(
  result: CajaTicketPrintResult,
  opts: {
    t: (key: string, params?: Record<string, unknown>) => string
    toast: CajaPrintFeedbackToast
    onRetry: () => void
    onBrowserPrint: () => void
  },
): void {
  notifyCajaPrintResult(result, opts)
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

  function getCachedCajaPrinterName(): string | null | undefined {
    const a = assignments.value
    if (!a) return undefined
    return (a.caja_printer_name || a.resolved_caja || null) as string | null | undefined
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
      getCachedCajaPrinterName,
      bridge,
      browserPrint: options?.browserPrint,
      getElementHtml: options?.getElementHtml,
      getLogoSrc: options?.getLogoSrc,
    })
  }

  return { printElement, getCajaPrinterName, getCachedCajaPrinterName }
}
