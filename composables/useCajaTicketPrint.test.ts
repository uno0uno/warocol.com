import { describe, expect, it, mock } from 'bun:test'
import { printTicketViaCajaOrBrowser } from './useCajaTicketPrint'
import type { LocalPrintBridge } from './useLocalPrintBridge'

function fakeBridge(overrides: Partial<LocalPrintBridge> = {}): LocalPrintBridge {
  return {
    isAvailable: () => true,
    connect: mock(() => Promise.resolve()),
    listPrinters: mock(() => Promise.resolve(['STAR_TP586'])),
    printRawEscPos: mock(() => Promise.resolve()),
    printEscPosTestTicket: mock(() => Promise.resolve()),
    printHtml: mock(() => Promise.resolve()),
    ...overrides,
  }
}

describe('printTicketViaCajaOrBrowser', () => {
  it('prints ESC/POS raw via bridge when caja is assigned', async () => {
    const printRawEscPos = mock(() => Promise.resolve())
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({ printRawEscPos })

    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge,
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
    })

    expect(result).toBe('bridge')
    expect(printRawEscPos).toHaveBeenCalledTimes(1)
    const [printer, payload] = printRawEscPos.mock.calls[0]!
    expect(printer).toBe('STAR_TP586')
    expect(payload).toBeInstanceOf(Uint8Array)
    expect((payload as Uint8Array).length).toBeGreaterThan(8)
    expect(browserPrint).toHaveBeenCalledTimes(0)
  })

  it('falls back to browser when caja assignment is missing', async () => {
    const printRawEscPos = mock(() => Promise.resolve())
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({ printRawEscPos })

    const result = await printTicketViaCajaOrBrowser('pos-prefactura', {
      getCajaPrinterName: async () => null,
      bridge,
      getElementHtml: () => '<div id="pos-prefactura">Pref</div>',
      browserPrint,
    })

    expect(result).toBe('browser')
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

    expect(result).toBe('browser')
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

    expect(result).toBe('browser')
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('falls back to browser when element content is missing', async () => {
    const printRawEscPos = mock(() => Promise.resolve())
    const browserPrint = mock(() => {})

    const result = await printTicketViaCajaOrBrowser('missing', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge: fakeBridge({ printRawEscPos }),
      getElementHtml: () => null,
      browserPrint,
    })

    expect(result).toBe('browser')
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
    expect(result).toBe('browser')
    deferred()
    expect(deferred).toHaveBeenCalledTimes(1)
  })
})
