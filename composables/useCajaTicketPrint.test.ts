import { describe, expect, it, mock } from 'bun:test'
import {
  notifyUnconfirmedCajaPrint,
  printTicketViaCajaOrBrowser,
} from './useCajaTicketPrint'
import type { LocalPrintBridge } from './useLocalPrintBridge'

function fakeBridge(overrides: Partial<LocalPrintBridge> = {}): LocalPrintBridge {
  return {
    isAvailable: () => true,
    connect: mock(() => Promise.resolve()),
    listPrinters: mock(() => Promise.resolve(['STAR_TP586'])),
    printRawEscPos: mock(() => Promise.resolve('completed' as const)),
    printEscPosTestTicket: mock(() => Promise.resolve('completed' as const)),
    printHtml: mock(() => Promise.resolve('completed' as const)),
    ...overrides,
  }
}

describe('printTicketViaCajaOrBrowser', () => {
  it('prints ESC/POS raw via bridge when caja is assigned', async () => {
    const printRawEscPos = mock(() => Promise.resolve('completed' as const))
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({ printRawEscPos })

    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge,
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
    })

    expect(result).toEqual({ mode: 'bridge', confirmed: true, printerName: 'STAR_TP586' })
    expect(printRawEscPos).toHaveBeenCalledTimes(1)
    const [printer, payload] = printRawEscPos.mock.calls[0]!
    expect(printer).toBe('STAR_TP586')
    expect(payload).toBeInstanceOf(Uint8Array)
    expect((payload as Uint8Array).length).toBeGreaterThan(8)
    expect(browserPrint).toHaveBeenCalledTimes(0)
  })

  it('returns unconfirmed when CUPS soft-success outcome is reported', async () => {
    const browserPrint = mock(() => {})
    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge: fakeBridge({
        printRawEscPos: mock(() => Promise.resolve('unconfirmed' as const)),
      }),
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
    })

    expect(result).toEqual({ mode: 'bridge', confirmed: false, printerName: 'STAR_TP586' })
    expect(browserPrint).toHaveBeenCalledTimes(0)
  })

  it('falls back to browser when caja assignment is missing', async () => {
    const printRawEscPos = mock(() => Promise.resolve('completed' as const))
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({ printRawEscPos })

    const result = await printTicketViaCajaOrBrowser('pos-prefactura', {
      getCajaPrinterName: async () => null,
      bridge,
      getElementHtml: () => '<div id="pos-prefactura">Pref</div>',
      browserPrint,
    })

    expect(result).toEqual({ mode: 'browser' })
    expect(printRawEscPos).toHaveBeenCalledTimes(0)
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('falls back to browser when bridge raw print fails', async () => {
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({
      connect: mock(() => Promise.resolve()),
      printRawEscPos: mock(() => Promise.reject(new Error('bridge down'))),
    })

    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge,
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
    })

    expect(result).toEqual({ mode: 'browser' })
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('falls back to browser when bridge print hangs past timeout', async () => {
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({
      connect: mock(() => Promise.resolve()),
      printRawEscPos: mock(() => new Promise(() => {})), // never resolves
    })

    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge,
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
      bridgePrintTimeoutMs: 30,
    })

    expect(result).toEqual({ mode: 'browser' })
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('falls back to browser when element content is missing', async () => {
    const printRawEscPos = mock(() => Promise.resolve('completed' as const))
    const browserPrint = mock(() => {})

    const result = await printTicketViaCajaOrBrowser('missing', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge: fakeBridge({ printRawEscPos }),
      getElementHtml: () => null,
      browserPrint,
    })

    expect(result).toEqual({ mode: 'browser' })
    expect(printRawEscPos).toHaveBeenCalledTimes(0)
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('supports deferred browserPrint so callers can arm afterprint first', async () => {
    const deferred = mock(() => {})
    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => null,
      bridge: fakeBridge(),
      getElementHtml: () => '<div/>',
      browserPrint: () => {},
    })
    expect(result).toEqual({ mode: 'browser' })
    deferred()
    expect(deferred).toHaveBeenCalledTimes(1)
  })
})

describe('notifyUnconfirmedCajaPrint', () => {
  it('shows retry and browser actions only for unconfirmed bridge results', () => {
    const warning = mock(() => 1)
    const onRetry = mock(() => {})
    const onBrowserPrint = mock(() => {})
    const t = (key: string, params?: Record<string, unknown>) =>
      params?.name ? `${key}:${params.name}` : key

    notifyUnconfirmedCajaPrint(
      { mode: 'bridge', confirmed: false, printerName: 'STAR_TP586' },
      { t, toast: { warning }, onRetry, onBrowserPrint },
    )

    expect(warning).toHaveBeenCalledTimes(1)
    const [, options] = warning.mock.calls[0]!
    expect(options.title).toBe('pos.receipt.printUnconfirmedTitle')
    expect(options.actions).toHaveLength(2)
    options.actions[0].onClick()
    options.actions[1].onClick()
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onBrowserPrint).toHaveBeenCalledTimes(1)

    warning.mockClear()
    notifyUnconfirmedCajaPrint(
      { mode: 'bridge', confirmed: true, printerName: 'STAR_TP586' },
      { t, toast: { warning }, onRetry, onBrowserPrint },
    )
    expect(warning).toHaveBeenCalledTimes(0)
  })
})
