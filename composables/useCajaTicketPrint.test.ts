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
  it('prints HTML via bridge when caja is assigned', async () => {
    const printHtml = mock(() => Promise.resolve())
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({ printHtml })

    const result = await printTicketViaCajaOrBrowser('pos-receipt', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge,
      getElementHtml: () => '<div id="pos-receipt">OK</div>',
      browserPrint,
    })

    expect(result).toBe('bridge')
    expect(printHtml).toHaveBeenCalledTimes(1)
    expect(printHtml).toHaveBeenCalledWith('STAR_TP586', '<div id="pos-receipt">OK</div>')
    expect(browserPrint).toHaveBeenCalledTimes(0)
  })

  it('falls back to browser when caja assignment is missing', async () => {
    const printHtml = mock(() => Promise.resolve())
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({ printHtml })

    const result = await printTicketViaCajaOrBrowser('pos-prefactura', {
      getCajaPrinterName: async () => null,
      bridge,
      getElementHtml: () => '<div id="pos-prefactura">Pref</div>',
      browserPrint,
    })

    expect(result).toBe('browser')
    expect(printHtml).toHaveBeenCalledTimes(0)
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('falls back to browser when bridge printHtml fails', async () => {
    const browserPrint = mock(() => {})
    const bridge = fakeBridge({
      connect: mock(() => Promise.resolve()),
      printHtml: mock(() => Promise.reject(new Error('QZ down'))),
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

  it('falls back to browser when element HTML is missing', async () => {
    const printHtml = mock(() => Promise.resolve())
    const browserPrint = mock(() => {})

    const result = await printTicketViaCajaOrBrowser('missing', {
      getCajaPrinterName: async () => 'STAR_TP586',
      bridge: fakeBridge({ printHtml }),
      getElementHtml: () => null,
      browserPrint,
    })

    expect(result).toBe('browser')
    expect(printHtml).toHaveBeenCalledTimes(0)
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
