import { afterEach, describe, expect, it, mock } from 'bun:test'
import {
  LocalPrintBridgeError,
  __resetLocalPrintBridgeSingletonForTests,
  __setLocalPrintBridgeClientForTests,
  buildEscPosTestTicketBytes,
  bytesToBase64,
  createLocalPrintBridge,
  isCupsJobStatusGoneSoftSuccess,
  normalizePrinterList,
} from './useLocalPrintBridge'

afterEach(() => {
  __setLocalPrintBridgeClientForTests(null)
  __resetLocalPrintBridgeSingletonForTests()
})

function mockClient(overrides: Partial<{
  connect: () => Promise<void>
  getPrintersList: () => Promise<Array<{ name: string }>>
  print: (job: Record<string, unknown>) => Promise<unknown>
}> = {}) {
  let live = false
  return {
    connect: overrides.connect ?? mock(async () => { live = true }),
    isConnected: () => live,
    getPrintersList:
      overrides.getPrintersList
      ?? mock(() => Promise.resolve([{ name: 'STAR_TP586' }, { name: 'Canon' }])),
    print: overrides.print ?? mock(() => Promise.resolve({ status: 'queued' })),
  }
}

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
  it('lists printers after connect via injected PrintBridge client', async () => {
    const client = mockClient()
    __setLocalPrintBridgeClientForTests(client)

    const bridge = createLocalPrintBridge()
    await bridge.connect()
    expect(client.connect).toHaveBeenCalledTimes(1)
    expect(bridge.isAvailable()).toBe(true)

    const printers = await bridge.listPrinters()
    expect(printers).toEqual(['STAR_TP586', 'Canon'])
    expect(client.getPrintersList).toHaveBeenCalled()
  })

  it('prints raw ESC/POS as base64 raw job without touching window.print', async () => {
    const printSpy = mock(() => Promise.resolve({ status: 'queued' }))
    const windowPrint = mock(() => {})
    const g = globalThis as typeof globalThis & { window?: { print: () => void } }
    const hadWindow = typeof g.window !== 'undefined'
    const originalWindowPrint = g.window?.print
    if (!g.window) {
      ;(g as { window: { print: () => void } }).window = { print: windowPrint }
    } else {
      g.window.print = windowPrint
    }

    __setLocalPrintBridgeClientForTests(mockClient({ print: printSpy }))

    const bridge = createLocalPrintBridge()
    const payload = buildEscPosTestTicketBytes('test')
    await bridge.printRawEscPos('STAR_TP586', payload)

    expect(windowPrint).toHaveBeenCalledTimes(0)
    expect(printSpy).toHaveBeenCalledTimes(1)
    const job = printSpy.mock.calls[0]![0] as Record<string, unknown>
    expect(job).toMatchObject({
      type: 'raw',
      printerName: 'STAR_TP586',
      dataBase64: bytesToBase64(payload),
    })

    if (hadWindow && originalWindowPrint) g.window!.print = originalWindowPrint
  })

  it('throws UNAVAILABLE when PrintBridge connect fails and does not call window.print', async () => {
    const windowPrint = mock(() => {})
    const g = globalThis as typeof globalThis & { window?: { print: () => void } }
    if (!g.window) {
      ;(g as { window: { print: () => void } }).window = { print: windowPrint }
    } else {
      g.window.print = windowPrint
    }

    __setLocalPrintBridgeClientForTests({
      connect: mock(() => Promise.reject(new Error('Connection refused'))),
      isConnected: () => false,
      getPrintersList: mock(() => Promise.resolve([])),
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

  it('prints HTML as raw-html with ~58mm paper width', async () => {
    const printSpy = mock(() => Promise.resolve({ status: 'queued' }))
    __setLocalPrintBridgeClientForTests(mockClient({ print: printSpy }))

    const bridge = createLocalPrintBridge()
    await bridge.printHtml('STAR_TP586', '<div id="pos-receipt">Ticket</div>')

    expect(printSpy).toHaveBeenCalledTimes(1)
    const job = printSpy.mock.calls[0]![0] as Record<string, unknown>
    expect(job).toMatchObject({
      type: 'raw-html',
      printerName: 'STAR_TP586',
      html: '<div id="pos-receipt">Ticket</div>',
      paper: { widthMm: 57 },
    })
  })

  it('printHtml rejects empty printer or html', async () => {
    __setLocalPrintBridgeClientForTests(mockClient())
    const bridge = createLocalPrintBridge()
    await expect(bridge.printHtml('', '<div/>')).rejects.toMatchObject({ code: 'INVALID' })
    await expect(bridge.printHtml('STAR', '  ')).rejects.toMatchObject({ code: 'INVALID' })
  })

  it('isCupsJobStatusGoneSoftSuccess detects Star/CUPS purge message', () => {
    expect(isCupsJobStatusGoneSoftSuccess(
      'unknown',
      'CUPS job status was no longer available',
    )).toBe(true)
    expect(isCupsJobStatusGoneSoftSuccess(
      'Unable to confirm next status',
      'CUPS job status was no longer available',
    )).toBe(true)
    expect(isCupsJobStatusGoneSoftSuccess(
      'unknown',
      'Unable to send data to printer.',
    )).toBe(false)
  })

  it('rejects when status stream reports unknown/failed after queued accept', async () => {
    let statusHandler: ((event: { requestId?: string; status?: string; message?: string }) => void) | null = null
    const printSpy = mock(async (job: Record<string, unknown>) => {
      const requestId = String(job.requestId)
      queueMicrotask(() => statusHandler?.({ requestId, status: 'queued' }))
      queueMicrotask(() => statusHandler?.({
        requestId,
        status: 'unknown',
        message: 'Unable to send data to printer.',
      }))
      return { status: 'queued', requestId }
    })
    __setLocalPrintBridgeClientForTests({
      ...mockClient({ print: printSpy }),
      on: mock((_event: 'status', handler: typeof statusHandler) => {
        statusHandler = handler
        return () => { statusHandler = null }
      }),
    })

    const bridge = createLocalPrintBridge()
    await expect(bridge.printRawEscPos('STAR_TP586', buildEscPosTestTicketBytes('x')))
      .rejects.toMatchObject({
        code: 'PRINT_FAILED',
        message: expect.stringContaining('Unable to send data to printer'),
      })
  })

  it('resolves completed when CUPS purges job status after submit (Star soft-success)', async () => {
    let statusHandler: ((event: { requestId?: string; status?: string; message?: string }) => void) | null = null
    const printSpy = mock(async (job: Record<string, unknown>) => {
      const requestId = String(job.requestId)
      queueMicrotask(() => statusHandler?.({ requestId, status: 'queued' }))
      queueMicrotask(() => statusHandler?.({ requestId, status: 'submitted' }))
      queueMicrotask(() => statusHandler?.({
        requestId,
        status: 'unknown',
        message: 'CUPS job status was no longer available',
      }))
      return { status: 'queued', requestId }
    })
    __setLocalPrintBridgeClientForTests({
      ...mockClient({ print: printSpy }),
      on: mock((_event: 'status', handler: typeof statusHandler) => {
        statusHandler = handler
        return () => { statusHandler = null }
      }),
    })

    const bridge = createLocalPrintBridge()
    await expect(bridge.printRawEscPos('STAR_TP586', buildEscPosTestTicketBytes('ok')))
      .resolves.toBe('completed')
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('resolves completed when status stream reports completed', async () => {
    let statusHandler: ((event: { requestId?: string; status?: string }) => void) | null = null
    const printSpy = mock(async (job: Record<string, unknown>) => {
      const requestId = String(job.requestId)
      queueMicrotask(() => statusHandler?.({ requestId, status: 'queued' }))
      queueMicrotask(() => statusHandler?.({ requestId, status: 'completed' }))
      return { status: 'queued', requestId }
    })
    __setLocalPrintBridgeClientForTests({
      ...mockClient({ print: printSpy }),
      on: mock((_event: 'status', handler: typeof statusHandler) => {
        statusHandler = handler
        return () => { statusHandler = null }
      }),
    })

    const bridge = createLocalPrintBridge()
    await expect(bridge.printRawEscPos('STAR_TP586', buildEscPosTestTicketBytes('ok')))
      .resolves.toBe('completed')
    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})
