import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  __resetAutoComandaPrintDedupeForTests,
  autoPrintComandaFired,
  buildComandaPlainText,
  filterUnprintedComandas,
  markComandasPrinted,
  resolveAutoPrintPrinterName,
} from './useAutoComandaPrint'
import type { LocalPrintBridge } from './useLocalPrintBridge'
import { LocalPrintBridgeError } from './useLocalPrintBridge'

function fakeBridge(overrides: Partial<LocalPrintBridge> = {}): LocalPrintBridge {
  return {
    isAvailable: () => true,
    connect: vi.fn(async () => {}),
    listPrinters: vi.fn(async () => ['CAJA']),
    printRawEscPos: vi.fn(async () => {}),
    printEscPosTestTicket: vi.fn(async () => {}),
    printHtml: vi.fn(async () => {}),
    ...overrides,
  }
}

beforeEach(() => {
  __resetAutoComandaPrintDedupeForTests()
})

describe('resolveAutoPrintPrinterName', () => {
  it('uses caja for table / mesa', () => {
    expect(
      resolveAutoPrintPrinterName({
        sourceType: 'table',
        tableDisplayName: 'Mesa 5',
        cajaPrinterName: 'CAJA',
        userPrinterName: 'USER',
      }),
    ).toBe('CAJA')
  })

  it('uses user printer for barra even with source table', () => {
    expect(
      resolveAutoPrintPrinterName({
        sourceType: 'table',
        tableDisplayName: 'Barra',
        cajaPrinterName: 'CAJA',
        userPrinterName: 'BARRA',
      }),
    ).toBe('BARRA')
  })

  it('uses user printer for pos / counter', () => {
    expect(
      resolveAutoPrintPrinterName({
        sourceType: 'pos',
        cajaPrinterName: 'CAJA',
        userPrinterName: 'BARRA',
      }),
    ).toBe('BARRA')
  })

  it('honors explicit auto_print_target', () => {
    expect(
      resolveAutoPrintPrinterName({
        sourceType: 'table',
        autoPrintTarget: 'user',
        cajaPrinterName: 'CAJA',
        userPrinterName: 'MINE',
      }),
    ).toBe('MINE')
  })

  it('returns null when required printer missing', () => {
    expect(
      resolveAutoPrintPrinterName({
        sourceType: 'table',
        tableDisplayName: 'Mesa 1',
        cajaPrinterName: null,
        userPrinterName: 'BARRA',
      }),
    ).toBeNull()
    expect(
      resolveAutoPrintPrinterName({
        sourceType: 'pos',
        cajaPrinterName: 'CAJA',
        userPrinterName: null,
      }),
    ).toBeNull()
  })
})

describe('dedupe', () => {
  it('skips already printed comanda ids', () => {
    const comandas = [
      { comanda_number: 1, items: [{ kitchen_name: 'A', quantity: 1 }], id: 'c1' },
    ]
    markComandasPrinted(comandas)
    expect(filterUnprintedComandas(comandas)).toEqual([])
  })
})

describe('buildComandaPlainText', () => {
  it('includes qty and kitchen name', () => {
    const text = buildComandaPlainText([
      {
        comanda_number: 5,
        table_display_name: 'Mesa 2',
        station_name: 'Cocina',
        items: [{ kitchen_name: 'Burger', quantity: 2, notes: 'sin cebolla' }],
      },
    ])
    expect(text).toContain('COMANDA #5')
    expect(text).toContain('2x Burger')
    expect(text).toContain('sin cebolla')
  })

  it('prints fallback last and labels Sin cocina asignada', () => {
    const text = buildComandaPlainText([
      {
        id: undefined,
        comanda_number: 10,
        station_id: null,
        station_name: 'Sin cocina asignada',
        print_fallback: true,
        items: [{ kitchen_name: 'PASSION', quantity: 1, notes: 'CON PEPINILLOS' }],
      },
      {
        id: 'st-1',
        comanda_number: 10,
        station_id: 'st-1',
        station_name: 'Parrilla',
        items: [{ kitchen_name: 'Burger', quantity: 1 }],
      },
    ])
    const parrillaAt = text.indexOf('Parrilla')
    const fallbackAt = text.indexOf('Sin cocina asignada')
    expect(parrillaAt).toBeGreaterThanOrEqual(0)
    expect(fallbackAt).toBeGreaterThan(parrillaAt)
    expect(text).toContain('PASSION')
    expect(text).toContain('CON PEPINILLOS')
  })
})

describe('autoPrintComandaFired', () => {
  it('prints to caja for table when bridge ok', async () => {
    const bridge = fakeBridge()
    const result = await autoPrintComandaFired(
      {
        type: 'comanda_fired',
        source_type: 'table',
        order_id: 'o1',
        comandas: [
          {
            id: 'c-a',
            comanda_number: 1,
            items: [{ kitchen_name: 'Soup', quantity: 1 }],
          },
        ],
      },
      {
        bridge,
        getCajaPrinterName: async () => 'CAJA_1',
        getUserId: () => 'u1',
        getUserPrinter: () => null,
      },
    )
    expect(result).toBe('printed')
    expect(bridge.printRawEscPos).toHaveBeenCalledOnce()
    expect(bridge.printRawEscPos).toHaveBeenCalledWith('CAJA_1', expect.any(Uint8Array))
  })

  it('skips when PrintBridge unavailable', async () => {
    const bridge = fakeBridge({
      connect: vi.fn(async () => {
        throw new LocalPrintBridgeError('UNAVAILABLE', 'down')
      }),
    })
    const result = await autoPrintComandaFired(
      {
        type: 'comanda_fired',
        source_type: 'table',
        comandas: [
          { id: 'c-b', comanda_number: 1, items: [{ kitchen_name: 'X', quantity: 1 }] },
        ],
      },
      {
        bridge,
        getCajaPrinterName: async () => 'CAJA',
        getUserId: () => 'u1',
      },
    )
    expect(result).toBe('skipped')
    expect(bridge.printRawEscPos).not.toHaveBeenCalled()
  })

  it('skips pos without user printer', async () => {
    const bridge = fakeBridge()
    const result = await autoPrintComandaFired(
      {
        type: 'comanda_fired',
        source_type: 'pos',
        comandas: [
          { id: 'c-c', comanda_number: 1, items: [{ kitchen_name: 'X', quantity: 1 }] },
        ],
      },
      {
        bridge,
        getCajaPrinterName: async () => 'CAJA',
        getUserId: () => 'u1',
        getUserPrinter: () => null,
      },
    )
    expect(result).toBe('skipped')
  })

  it('dedupes second SSE for same comanda', async () => {
    const bridge = fakeBridge()
    const payload = {
      type: 'comanda_fired' as const,
      source_type: 'table',
      order_id: 'o1',
      comandas: [
        { id: 'c-dup', comanda_number: 1, items: [{ kitchen_name: 'X', quantity: 1 }] },
      ],
    }
    const deps = {
      bridge,
      getCajaPrinterName: async () => 'CAJA',
      getUserId: () => 'u1',
    }
    expect(await autoPrintComandaFired(payload, deps)).toBe('printed')
    expect(await autoPrintComandaFired(payload, deps)).toBe('skipped')
    expect(bridge.printRawEscPos).toHaveBeenCalledOnce()
  })

  it('prints fallback-only payload to caja for mesa', async () => {
    const bridge = fakeBridge()
    const result = await autoPrintComandaFired(
      {
        type: 'comanda_fired',
        source_type: 'table',
        table_display_name: 'Mesa 1',
        auto_print_target: 'caja',
        order_id: 'o-fb',
        comandas: [
          {
            id: null,
            comanda_number: 3,
            station_id: null,
            station_name: 'Sin cocina asignada',
            print_fallback: true,
            items: [{ kitchen_name: 'poker 330', quantity: 2 }],
          },
        ],
      },
      {
        bridge,
        getCajaPrinterName: async () => 'CAJA_1',
        getUserId: () => 'u1',
      },
    )
    expect(result).toBe('printed')
    expect(bridge.printRawEscPos).toHaveBeenCalledOnce()
  })
})
