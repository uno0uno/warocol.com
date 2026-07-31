import { afterEach, describe, expect, it, mock } from 'bun:test'
import {
  LocalPrintBridgeError,
  __resetLocalPrintBridgeSingletonForTests,
  __setLocalPrintBridgeClientForTests,
  buildEscPosTestTicketBytes,
  bytesToBase64,
  createLocalPrintBridge,
  normalizePrinterList,
  useLocalPrintBridge,
} from './useLocalPrintBridge'

afterEach(() => {
  __setLocalPrintBridgeClientForTests(null)
  __resetLocalPrintBridgeSingletonForTests()
})

describe('normalizePrinterList', () => {
  it('normalizes array and single string', () => {
    expect(normalizePrinterList(['A', 'B'])).toEqual(['A', 'B'])
    expect(normalizePrinterList('STAR_TP586')).toEqual(['STAR_TP586'])
    expect(normalizePrinterList(null)).toEqual([])
  })
})

describe('buildEscPosTestTicketBytes', () => {
  it('starts with ESC @ init and includes message bytes', () => {
    const bytes = buildEscPosTestTicketBytes('Hola')
    expect(bytes[0]).toBe(0x1b)
    expect(bytes[1]).toBe(0x40)
    const asText = String.fromCharCode(...Array.from(bytes))
    expect(asText.includes('Hola')).toBe(true)
  })
})

describe('createLocalPrintBridge', () => {
  it('lists printers after connect via injected QZ client', async () => {
    const find = mock(() => Promise.resolve(['STAR_TP586', 'Canon']))
    const connect = mock(() => Promise.resolve(undefined))
    const print = mock(() => Promise.resolve(undefined))
    const create = mock((name: string) => ({ name }))

    __setLocalPrintBridgeClientForTests({
      websocket: { connect, isActive: () => false },
      printers: { find },
      configs: { create },
      print,
    })

    const bridge = createLocalPrintBridge()
    await bridge.connect()
    expect(connect).toHaveBeenCalledTimes(1)
    expect(bridge.isAvailable()).toBe(true)

    const printers = await bridge.listPrinters()
    expect(printers).toEqual(['STAR_TP586', 'Canon'])
    expect(find).toHaveBeenCalled()
  })

  it('prints raw ESC/POS as base64 command without touching window.print', async () => {
    const printSpy = mock(() => Promise.resolve(undefined))
    const windowPrint = mock(() => {})
    const g = globalThis as typeof globalThis & { window?: { print: () => void }; print?: () => void }
    const hadWindow = typeof g.window !== 'undefined'
    const originalWindowPrint = g.window?.print
    if (!g.window) {
      ;(g as { window: { print: () => void } }).window = { print: windowPrint }
    } else {
      g.window.print = windowPrint
    }

    __setLocalPrintBridgeClientForTests({
      websocket: {
        connect: mock(() => Promise.resolve(undefined)),
        isActive: () => true,
      },
      printers: { find: mock(() => Promise.resolve(['STAR_TP586'])) },
      configs: { create: mock((name: string) => ({ name })) },
      print: printSpy,
    })

    const bridge = createLocalPrintBridge()
    const payload = buildEscPosTestTicketBytes('test')
    await bridge.printRawEscPos('STAR_TP586', payload)

    expect(windowPrint).toHaveBeenCalledTimes(0)
    expect(printSpy).toHaveBeenCalledTimes(1)
    const call = printSpy.mock.calls[0] as unknown as [unknown, Array<Record<string, string>>]
    expect(call[1]![0]).toMatchObject({
      type: 'raw',
      format: 'command',
      flavor: 'base64',
      data: bytesToBase64(payload),
    })

    if (hadWindow && originalWindowPrint) g.window!.print = originalWindowPrint
  })

  it('throws UNAVAILABLE when QZ connect fails and does not call window.print', async () => {
    const windowPrint = mock(() => {})
    const g = globalThis as typeof globalThis & { window?: { print: () => void } }
    if (!g.window) {
      ;(g as { window: { print: () => void } }).window = { print: windowPrint }
    } else {
      g.window.print = windowPrint
    }

    __setLocalPrintBridgeClientForTests({
      websocket: {
        connect: mock(() => Promise.reject(new Error('Connection refused'))),
        isActive: () => false,
      },
      printers: { find: mock(() => Promise.resolve([])) },
      configs: { create: mock(() => ({})) },
      print: mock(() => Promise.resolve(undefined)),
    })

    const bridge = createLocalPrintBridge()
    let caught: unknown
    try {
      await bridge.connect()
    } catch (err) {
      caught = err
    }
    expect(caught).toBeInstanceOf(LocalPrintBridgeError)
    expect((caught as LocalPrintBridgeError).code).toBe('UNAVAILABLE')
    expect(bridge.isAvailable()).toBe(false)
    expect(windowPrint).toHaveBeenCalledTimes(0)
  })

  it('useLocalPrintBridge returns singleton', () => {
    __setLocalPrintBridgeClientForTests({
      websocket: { connect: mock(() => Promise.resolve(undefined)), isActive: () => false },
      printers: { find: mock(() => Promise.resolve([])) },
      configs: { create: mock(() => ({})) },
      print: mock(() => Promise.resolve(undefined)),
    })
    expect(useLocalPrintBridge()).toBe(useLocalPrintBridge())
  })
})
