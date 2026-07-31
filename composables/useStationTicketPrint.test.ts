import { describe, expect, it, mock } from 'bun:test'
import {
  groupComandasByPrinter,
  printComandasViaBridgeOrBrowser,
  resolveComandaPrinterName,
} from './useStationTicketPrint'
import type { ComandaPrintPayload } from './useComandaPrint'
import type { LocalPrintBridge } from './useLocalPrintBridge'

const STATION_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const STATION_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

function comanda(
  stationId: string | null,
  number: number,
): ComandaPrintPayload {
  return {
    comanda_number: number,
    station_id: stationId,
    station_name: stationId ? `S-${number}` : null,
    items: [{ kitchen_name: 'Item', quantity: 1 }],
  }
}

function fakeBridge(overrides: Partial<LocalPrintBridge> = {}): LocalPrintBridge {
  return {
    isAvailable: () => true,
    connect: mock(() => Promise.resolve()),
    listPrinters: mock(() => Promise.resolve([])),
    printRawEscPos: mock(() => Promise.resolve()),
    printEscPosTestTicket: mock(() => Promise.resolve()),
    printHtml: mock(() => Promise.resolve()),
    ...overrides,
  }
}

describe('resolveComandaPrinterName', () => {
  it('uses station mapping when present', () => {
    expect(
      resolveComandaPrinterName(STATION_A, {
        resolved: { [STATION_A]: 'BAR' },
        resolved_caja: 'CAJA',
      }),
    ).toBe('BAR')
  })

  it('falls back to caja when station unmapped', () => {
    expect(
      resolveComandaPrinterName(STATION_A, {
        resolved: { [STATION_A]: null },
        resolved_caja: 'CAJA',
      }),
    ).toBe('CAJA')
  })
})

describe('groupComandasByPrinter', () => {
  it('groups by resolved printer and merges shared printers', () => {
    const groups = groupComandasByPrinter(
      [comanda(STATION_A, 1), comanda(STATION_B, 2), comanda(STATION_A, 3)],
      {
        resolved: { [STATION_A]: 'BAR', [STATION_B]: 'BAR' },
        resolved_caja: 'CAJA',
      },
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]!.printerName).toBe('BAR')
    expect(groups[0]!.comandas.map((c) => c.comanda_number)).toEqual([1, 2, 3])
  })

  it('sends unmapped stations to caja', () => {
    const groups = groupComandasByPrinter(
      [comanda(STATION_A, 1), comanda(STATION_B, 2)],
      {
        resolved: { [STATION_A]: 'COCINA', [STATION_B]: null },
        resolved_caja: 'CAJA',
      },
    )
    expect(groups).toHaveLength(2)
    const cocina = groups.find((g) => g.printerName === 'COCINA')
    const caja = groups.find((g) => g.printerName === 'CAJA')
    expect(cocina?.comandas).toHaveLength(1)
    expect(caja?.comandas).toHaveLength(1)
  })
})

describe('printComandasViaBridgeOrBrowser', () => {
  it('prints one HTML job per printer via bridge', async () => {
    const printHtml = mock(() => Promise.resolve())
    const setQueue = mock((_c: ComandaPrintPayload[]) => {})
    const browserPrint = mock(() => {})

    const result = await printComandasViaBridgeOrBrowser(
      [comanda(STATION_A, 1), comanda(STATION_B, 2)],
      {
        setQueue,
        getResolveMap: async () => ({
          resolved: { [STATION_A]: 'BAR', [STATION_B]: 'COCINA' },
          resolved_caja: 'CAJA',
        }),
        bridge: fakeBridge({ printHtml }),
        getElementHtml: () => '<div id="pos-comanda-print">ok</div>',
        browserPrint,
        waitForDom: async () => {},
      },
    )

    expect(result).toBe('bridge')
    expect(printHtml).toHaveBeenCalledTimes(2)
    expect(browserPrint).toHaveBeenCalledTimes(0)
    expect(setQueue.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('falls back to browser when no printers resolved', async () => {
    const printHtml = mock(() => Promise.resolve())
    const browserPrint = mock(() => {})
    const setQueue = mock((_c: ComandaPrintPayload[]) => {})

    const result = await printComandasViaBridgeOrBrowser([comanda(null, 1)], {
      setQueue,
      getResolveMap: async () => ({ resolved: {}, resolved_caja: null }),
      bridge: fakeBridge({ printHtml }),
      getElementHtml: () => '<div/>',
      browserPrint,
      waitForDom: async () => {},
    })

    expect(result).toBe('browser')
    expect(printHtml).toHaveBeenCalledTimes(0)
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('falls back to browser when bridge fails', async () => {
    const browserPrint = mock(() => {})
    const result = await printComandasViaBridgeOrBrowser([comanda(STATION_A, 1)], {
      setQueue: mock(() => {}),
      getResolveMap: async () => ({
        resolved: { [STATION_A]: 'BAR' },
        resolved_caja: 'CAJA',
      }),
      bridge: fakeBridge({
        connect: mock(() => Promise.reject(new Error('down'))),
      }),
      getElementHtml: () => '<div/>',
      browserPrint,
      waitForDom: async () => {},
    })
    expect(result).toBe('browser')
    expect(browserPrint).toHaveBeenCalledTimes(1)
  })

  it('leaves queue as leftovers only when some groups lack a printer', async () => {
    const printHtml = mock(() => Promise.resolve())
    const queued: ComandaPrintPayload[][] = []
    const setQueue = mock((c: ComandaPrintPayload[]) => { queued.push(c) })
    const browserPrint = mock(() => {})

    const result = await printComandasViaBridgeOrBrowser(
      [comanda(STATION_A, 1), comanda(null, 2)],
      {
        setQueue,
        getResolveMap: async () => ({
          resolved: { [STATION_A]: 'BAR' },
          resolved_caja: null,
        }),
        bridge: fakeBridge({ printHtml }),
        getElementHtml: () => '<div id="pos-comanda-print">ok</div>',
        browserPrint,
        waitForDom: async () => {},
      },
    )

    expect(result).toBe('browser')
    expect(printHtml).toHaveBeenCalledTimes(1)
    const lastQueue = queued[queued.length - 1]!
    expect(lastQueue.map((c) => c.comanda_number)).toEqual([2])
  })
})
