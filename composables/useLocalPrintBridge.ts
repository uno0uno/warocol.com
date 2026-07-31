/**
 * Local thermal print bridge via QZ Tray (warocol.com#1948 / epic #1947).
 * Client-only. Does not call or patch window.print — POS keeps browser print fallback.
 */

export class LocalPrintBridgeError extends Error {
  readonly code: 'UNAVAILABLE' | 'NOT_CONNECTED' | 'PRINT_FAILED' | 'INVALID'

  constructor(code: LocalPrintBridgeError['code'], message: string) {
    super(message)
    this.name = 'LocalPrintBridgeError'
    this.code = code
  }
}

/** Minimal QZ Tray surface used by WARO (injectable for tests). */
export type QzTrayLike = {
  websocket: {
    isActive?: () => boolean
    connect: (options?: Record<string, unknown>) => Promise<unknown>
    disconnect?: () => Promise<unknown>
  }
  printers: {
    find: (query?: string) => Promise<string | string[]>
  }
  configs: {
    create: (printer: string, options?: Record<string, unknown>) => unknown
  }
  print: (config: unknown, data: unknown[]) => Promise<unknown>
}

let injectedQz: QzTrayLike | null = null

/** Test-only: inject a fake QZ client (null restores dynamic import). */
export function __setLocalPrintBridgeClientForTests(client: QzTrayLike | null): void {
  injectedQz = client
}

export function normalizePrinterList(found: string | string[] | null | undefined): string[] {
  if (found == null) return []
  if (Array.isArray(found)) return found.map(String).filter(Boolean)
  const one = String(found).trim()
  return one ? [one] : []
}

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

/** Short ESC/POS ticket for bridge verification (init + text + feed). */
export function buildEscPosTestTicketBytes(message = 'WARO print bridge OK'): Uint8Array {
  const text = `${message}\n`
  const parts: number[] = [
    0x1b, 0x40, // ESC @ init
    0x1b, 0x61, 0x01, // center
  ]
  for (let i = 0; i < text.length; i++) parts.push(text.charCodeAt(i) & 0xff)
  parts.push(0x0a, 0x0a, 0x0a, 0x0a)
  return Uint8Array.from(parts)
}

async function loadQzTray(): Promise<QzTrayLike> {
  if (injectedQz) return injectedQz
  if (import.meta.server) {
    throw new LocalPrintBridgeError('UNAVAILABLE', 'QZ Tray is only available in the browser')
  }
  try {
    const mod = await import('qz-tray')
    const qz = (mod as { default?: QzTrayLike }).default ?? (mod as unknown as QzTrayLike)
    if (!qz?.websocket?.connect || !qz?.printers?.find || !qz?.print) {
      throw new Error('qz-tray module missing expected API')
    }
    return qz
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new LocalPrintBridgeError(
      'UNAVAILABLE',
      `QZ Tray client failed to load (${detail}). Install and start QZ Tray on this machine.`,
    )
  }
}

export type LocalPrintBridge = {
  isAvailable: () => boolean
  connect: () => Promise<void>
  listPrinters: () => Promise<string[]>
  printRawEscPos: (printerName: string, data: Uint8Array | string) => Promise<void>
  printEscPosTestTicket: (printerName: string, message?: string) => Promise<void>
}

export function createLocalPrintBridge(): LocalPrintBridge {
  let connected = false

  const ensureQz = async () => loadQzTray()

  return {
    isAvailable() {
      return connected
    },

    async connect() {
      const qz = await ensureQz()
      if (qz.websocket.isActive?.()) {
        connected = true
        return
      }
      try {
        await qz.websocket.connect()
        connected = true
      } catch (err) {
        connected = false
        const detail = err instanceof Error ? err.message : String(err)
        throw new LocalPrintBridgeError(
          'UNAVAILABLE',
          `Cannot reach QZ Tray (${detail}). Is QZ Tray running on this computer?`,
        )
      }
    },

    async listPrinters() {
      const qz = await ensureQz()
      if (qz.websocket.isActive?.()) {
        connected = true
      } else if (!connected) {
        await this.connect()
      }
      try {
        const found = await qz.printers.find()
        return normalizePrinterList(found)
      } catch (err) {
        if (err instanceof LocalPrintBridgeError) throw err
        const detail = err instanceof Error ? err.message : String(err)
        throw new LocalPrintBridgeError('UNAVAILABLE', `Printer discovery failed: ${detail}`)
      }
    },

    async printRawEscPos(printerName: string, data: Uint8Array | string) {
      const name = printerName?.trim()
      if (!name) {
        throw new LocalPrintBridgeError('INVALID', 'Printer name is required')
      }
      const qz = await ensureQz()
      if (qz.websocket.isActive?.()) {
        connected = true
      } else if (!connected) {
        await this.connect()
      }
      const payload =
        typeof data === 'string'
          ? data
          : bytesToBase64(data)
      const config = qz.configs.create(name)
      const printData = [
        {
          type: 'raw',
          format: 'command',
          flavor: typeof data === 'string' ? 'plain' : 'base64',
          data: payload,
        },
      ]
      try {
        await qz.print(config, printData)
      } catch (err) {
        if (err instanceof LocalPrintBridgeError) throw err
        const detail = err instanceof Error ? err.message : String(err)
        throw new LocalPrintBridgeError('PRINT_FAILED', `Print failed: ${detail}`)
      }
    },

    async printEscPosTestTicket(printerName: string, message?: string) {
      await this.printRawEscPos(printerName, buildEscPosTestTicketBytes(message))
    },
  }
}

let singleton: LocalPrintBridge | null = null

export function useLocalPrintBridge(): LocalPrintBridge {
  if (!singleton) singleton = createLocalPrintBridge()
  return singleton
}

/** Test helper: reset singleton after injecting a fake client. */
export function __resetLocalPrintBridgeSingletonForTests(): void {
  singleton = null
}
