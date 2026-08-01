/**
 * Local thermal print bridge via PrintBridge agent (replaces QZ Tray).
 * Client-only. Does not call or patch window.print — POS keeps browser print fallback.
 *
 * Requires PrintBridge installed and running on the POS machine, with warocol.com
 * (and localhost for dev) in the agent origin whitelist.
 * @see https://github.com/vergil-lai/print-bridge
 */

import { PrintBridgeClient, PrintBridgeError } from 'print-bridge-sdk'

export class LocalPrintBridgeError extends Error {
  readonly code: 'UNAVAILABLE' | 'NOT_CONNECTED' | 'PRINT_FAILED' | 'INVALID'

  constructor(code: LocalPrintBridgeError['code'], message: string) {
    super(message)
    this.name = 'LocalPrintBridgeError'
    this.code = code
  }
}

export type PrintBridgeStatusEvent = {
  requestId?: string
  jobId?: string
  status?: string
  message?: string | null
}

/** Minimal PrintBridge client surface used by WARO (injectable for tests). */
export type PrintBridgeClientLike = {
  connect: () => Promise<void>
  disconnect?: () => void
  isConnected: () => boolean
  getPrintersList: () => Promise<Array<{ name: string }>>
  print: (job: Record<string, unknown>) => Promise<unknown>
  /** SDK status stream — required to detect CUPS fail after queued accept (#2003). */
  on?: (event: 'status', handler: (event: PrintBridgeStatusEvent) => void) => () => void
}

const PRINT_SUCCESS_STATUSES = new Set(['completed'])
const PRINT_FAILURE_STATUSES = new Set(['failed', 'cancelled', 'unknown'])

function newPrintRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `waro-print-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * SDK `print()` resolves on `queued` only. Wait for a terminal job status so
 * offline thermals reject and callers can fall back to window.print (#2003).
 * Clients without `on` keep queued-accept behavior (tests / stubs).
 */
export function waitForPrintTerminalStatus(
  client: PrintBridgeClientLike,
  requestId: string,
): Promise<void> {
  if (typeof client.on !== 'function') return Promise.resolve()

  return new Promise((resolve, reject) => {
    const off = client.on!('status', (event) => {
      if (String(event?.requestId || '') !== requestId) return
      const status = String(event?.status || '')
      if (PRINT_SUCCESS_STATUSES.has(status)) {
        off()
        resolve()
        return
      }
      if (PRINT_FAILURE_STATUSES.has(status)) {
        off()
        reject(
          new LocalPrintBridgeError(
            'PRINT_FAILED',
            event?.message?.trim() || `Print ended with status ${status}`,
          ),
        )
      }
    })
  })
}

async function printAndAwaitOutcome(
  client: PrintBridgeClientLike,
  job: Record<string, unknown>,
): Promise<void> {
  const requestId = String(job.requestId || newPrintRequestId())
  const payload = { ...job, requestId }
  const terminal = waitForPrintTerminalStatus(client, requestId)
  await client.print(payload)
  await terminal
}

let injectedClient: PrintBridgeClientLike | null = null

/** Test-only: inject a fake PrintBridge client (null restores real SDK). */
export function __setLocalPrintBridgeClientForTests(client: PrintBridgeClientLike | null): void {
  injectedClient = client
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

function mapPrintBridgeError(err: unknown, fallbackCode: LocalPrintBridgeError['code'], prefix: string): LocalPrintBridgeError {
  if (err instanceof LocalPrintBridgeError) return err
  const detail = err instanceof Error ? err.message : String(err)
  const code = err instanceof PrintBridgeError ? String(err.code) : ''
  if (
    code === 'CONNECTION_FAILED'
    || code === 'CONNECTION_TIMEOUT'
    || code === 'ORIGIN_NOT_ALLOWED'
    || code === 'NOT_CONNECTED'
  ) {
    return new LocalPrintBridgeError(
      'UNAVAILABLE',
      `${prefix} (${detail}). Is PrintBridge running and is this site in the origin whitelist?`,
    )
  }
  if (code === 'PRINT_FAILED' || code === 'PRINTER_NOT_FOUND' || code === 'PRINTER_NOT_CONFIGURED') {
    return new LocalPrintBridgeError('PRINT_FAILED', `${prefix}: ${detail}`)
  }
  return new LocalPrintBridgeError(fallbackCode, `${prefix}: ${detail}`)
}

function createDefaultClient(): PrintBridgeClientLike {
  return new PrintBridgeClient({
    ip: '127.0.0.1',
    port: 17890,
    connectTimeoutMs: 4000,
    // Keep print requests short so offline thermals fall back to window.print (#2003).
    requestTimeoutMs: 5000,
    autoReconnect: false,
  })
}

async function loadClient(): Promise<PrintBridgeClientLike> {
  if (injectedClient) return injectedClient
  if (import.meta.server) {
    throw new LocalPrintBridgeError('UNAVAILABLE', 'PrintBridge is only available in the browser')
  }
  try {
    return createDefaultClient()
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new LocalPrintBridgeError(
      'UNAVAILABLE',
      `PrintBridge client failed to load (${detail}). Install and start PrintBridge on this machine.`,
    )
  }
}

export type LocalPrintBridge = {
  isAvailable: () => boolean
  connect: () => Promise<void>
  listPrinters: () => Promise<string[]>
  printRawEscPos: (printerName: string, data: Uint8Array | string) => Promise<void>
  printEscPosTestTicket: (printerName: string, message?: string) => Promise<void>
  printHtml: (printerName: string, html: string, options?: { pageWidthIn?: number }) => Promise<void>
}

export function createLocalPrintBridge(): LocalPrintBridge {
  let client: PrintBridgeClientLike | null = null
  let connected = false

  const ensureClient = async () => {
    if (!client) client = await loadClient()
    return client
  }

  const ensureConnected = async () => {
    const c = await ensureClient()
    if (c.isConnected()) {
      connected = true
      return c
    }
    try {
      await c.connect()
      connected = true
      return c
    } catch (err) {
      connected = false
      throw mapPrintBridgeError(err, 'UNAVAILABLE', 'Cannot reach PrintBridge')
    }
  }

  return {
    isAvailable() {
      return connected
    },

    async connect() {
      await ensureConnected()
    },

    async listPrinters() {
      const c = await ensureConnected()
      try {
        const list = await c.getPrintersList()
        const names = (list || []).map(p => String(p?.name || '').trim()).filter(Boolean)
        return normalizePrinterList(names)
      } catch (err) {
        throw mapPrintBridgeError(err, 'UNAVAILABLE', 'Printer discovery failed')
      }
    },

    async printRawEscPos(printerName: string, data: Uint8Array | string) {
      const name = printerName?.trim()
      if (!name) {
        throw new LocalPrintBridgeError('INVALID', 'Printer name is required')
      }
      const c = await ensureConnected()
      const dataBase64 =
        typeof data === 'string'
          ? bytesToBase64(new TextEncoder().encode(data))
          : bytesToBase64(data)
      try {
        await printAndAwaitOutcome(c, {
          type: 'raw',
          printerName: name,
          dataBase64,
        })
      } catch (err) {
        throw mapPrintBridgeError(err, 'PRINT_FAILED', 'Print failed')
      }
    },

    async printEscPosTestTicket(printerName: string, message?: string) {
      await this.printRawEscPos(printerName, buildEscPosTestTicketBytes(message))
    },

    async printHtml(printerName: string, html: string, options?: { pageWidthIn?: number }) {
      const name = printerName?.trim()
      if (!name) {
        throw new LocalPrintBridgeError('INVALID', 'Printer name is required')
      }
      if (!html?.trim()) {
        throw new LocalPrintBridgeError('INVALID', 'HTML content is required')
      }
      const c = await ensureConnected()
      const pageWidthIn = options?.pageWidthIn ?? 2.25 // ~58mm thermal
      const widthMm = Math.round(pageWidthIn * 25.4)
      try {
        await printAndAwaitOutcome(c, {
          type: 'raw-html',
          printerName: name,
          html,
          waitMs: 500,
          copies: 1,
          paper: {
            widthMm,
            heightMm: Math.max(widthMm * 4, 80),
          },
        })
      } catch (err) {
        throw mapPrintBridgeError(err, 'PRINT_FAILED', 'HTML print failed')
      }
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
