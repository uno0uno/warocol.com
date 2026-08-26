import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  __resetCajaPrintInFlightForTests,
  notifyCajaPrintResult,
  printTicketViaCajaOrBrowser,
} from './useCajaTicketPrint'
import type { LocalPrintBridge } from './useLocalPrintBridge'

function installMemoryLocalStorage() {
  const store = new Map<string, string>()
  const memoryStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, String(value)) },
    removeItem: (key: string) => { store.delete(key) },
    clear: () => { store.clear() },
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'window', {
    value: { localStorage: memoryStorage },
    configurable: true,
    writable: true,
  })
}

beforeEach(() => {
  installMemoryLocalStorage()
  localStorage.removeItem('waro.cajaPrint.forceBrowser')
  __resetCajaPrintInFlightForTests()
})

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
      isForceBrowser: () => false,
    })

    expect(result).toEqual({ mode: 'bridge', confirmed: false, printerName: 'STAR_TP586' })
    expect(browserPrint).toHaveBeenCalledTimes(0)
  })

  it('falls back to browser when content is markup-only (cut-only ESC/POS)', async () => {
    const printRawEscPos = mock(() => Promise.resolve('completed' as const))
    const browserPrint = mock(() => {})
    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge: fakeBridge({ printRawEscPos }),
      getElementHtml: () => '<div id="pos-receipt"></div>',
      browserPrint,
      isForceBrowser: () => false,
    })

    expect(result).toEqual({ mode: 'browser' })
    expect(printRawEscPos).toHaveBeenCalledTimes(0)
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('skips overlapping print attempts while one is in flight', async () => {
    let resolvePrint: (value: 'completed') => void = () => {}
    const printRawEscPos = mock(
      () => new Promise<'completed'>((resolve) => { resolvePrint = resolve }),
    )
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({ printRawEscPos })
    const deps = {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge,
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
      isForceBrowser: () => false,
      bridgePrintTimeoutMs: 10_000,
    }
    const first = printTicketViaCajaOrBrowser('pos-receipt', deps)
    await Promise.resolve()
    const second = await printTicketViaCajaOrBrowser('pos-receipt', deps)
    expect(second).toEqual({ mode: 'skipped' })
    resolvePrint('completed')
    await expect(first).resolves.toEqual({
      mode: 'bridge',
      confirmed: true,
      printerName: 'STAR_TP586',
    })
    expect(printRawEscPos).toHaveBeenCalledTimes(1)
    expect(browserPrint).toHaveBeenCalledTimes(0)
  })

  it('skips bridge when sticky force-browser preference is on', async () => {
    const printRawEscPos = mock(() => Promise.resolve('completed' as const))
    const browserPrint = mock(() => {})
    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge: fakeBridge({ printRawEscPos }),
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
      isForceBrowser: () => true,
    })

    expect(result).toEqual({ mode: 'browser' })
    expect(printRawEscPos).toHaveBeenCalledTimes(0)
    expect(browserPrint).toHaveBeenCalledTimes(1)
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

  it('fast-paths via cached null without awaiting refetch (transient activation)', async () => {
    const getCajaPrinterName = mock(async () => 'STAR_TP586')
    const browserPrint = mock(() => {})
    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName,
      getCachedCajaPrinterName: () => null,
      bridge: fakeBridge({ printRawEscPos: mock(() => Promise.resolve('completed' as const)) }),
      getElementHtml: () => '<div>OK</div>',
      browserPrint,
    })
    expect(result).toEqual({ mode: 'browser' })
    expect(browserPrint).toHaveBeenCalledTimes(1)
    expect(getCajaPrinterName).toHaveBeenCalledTimes(0)
  })
})

describe('notifyCajaPrintResult', () => {
  it('shows success toast for confirmed bridge results', () => {
    const success = mock(() => 1)
    const warning = mock(() => 1)
    const t = (key: string, params?: Record<string, unknown>) =>
      params?.name ? `${key}:${params.name}` : key

    notifyCajaPrintResult(
      { mode: 'bridge', confirmed: true, printerName: 'STAR_TP586' },
      {
        t,
        toast: { success, warning },
        onRetry: () => {},
        onBrowserPrint: () => {},
      },
    )

    expect(success).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenCalledTimes(0)
    expect(success.mock.calls[0]![1].title).toBe('pos.receipt.printOkTitle')
  })

  it('shows calm sent toast for soft-success with Didnt print help', () => {
    const success = mock(() => 1)
    const warning = mock(() => 1)
    const onRetry = mock(() => {})
    const onBrowserPrint = mock(() => {})
    const t = (key: string, params?: Record<string, unknown>) =>
      params?.name ? `${key}:${params.name}` : key

    notifyCajaPrintResult(
      { mode: 'bridge', confirmed: false, printerName: 'STAR_TP586' },
      { t, toast: { success, warning }, onRetry, onBrowserPrint },
    )

    expect(success).toHaveBeenCalledTimes(1)
    expect(warning).toHaveBeenCalledTimes(0)
    expect(success.mock.calls[0]![1].title).toBe('pos.receipt.printSentTitle')
    const [, options] = success.mock.calls[0]!
    expect(options.actions).toHaveLength(1)
    expect(options.actions[0].label).toBe('pos.receipt.printDidNotComeOut')

    options.actions[0].onClick()
    expect(warning).toHaveBeenCalledTimes(1)
    const [, help] = warning.mock.calls[0]!
    expect(help.title).toBe('pos.receipt.printUnconfirmedTitle')
    expect(help.actions).toHaveLength(2)
    help.actions[0].onClick()
    help.actions[1].onClick()
    expect(onRetry).toHaveBeenCalledTimes(1)
    expect(onBrowserPrint).toHaveBeenCalledTimes(1)
  })

  it('enables sticky force-browser when cashier chooses browser from help toast', () => {
    localStorage.removeItem('waro.cajaPrint.forceBrowser')
    const success = mock(() => 1)
    const warning = mock(() => 1)
    const onBrowserPrint = mock(() => {})
    const t = (key: string) => key

    notifyCajaPrintResult(
      { mode: 'bridge', confirmed: false, printerName: 'STAR_TP586' },
      {
        t,
        toast: { success, warning },
        onRetry: () => {},
        onBrowserPrint,
      },
    )

    const [, sent] = success.mock.calls[0]!
    sent.actions[0].onClick()
    const [, help] = warning.mock.calls[0]!
    help.actions[1].onClick()
    expect(localStorage.getItem('waro.cajaPrint.forceBrowser')).toBe('1')
    expect(onBrowserPrint).toHaveBeenCalledTimes(1)
    localStorage.removeItem('waro.cajaPrint.forceBrowser')
  })
})
