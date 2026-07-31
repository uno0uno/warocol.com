/**
 * ESC/POS helpers for thermal tickets without PrintBridge HTML/Chromium.
 * Plain text → raw bytes (58mm ≈ 32 cols). Accents folded to ASCII for CP437-less queues.
 * Optional DIAN QR via native GS ( k when CUFE / search URL is present (#1962).
 */

const DEFAULT_COLS = 32

export const DIAN_SEARCH_QR_PREFIX =
  'https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey='

const ACCENT_MAP: Record<string, string> = {
  'á': 'a',
  'é': 'e',
  'í': 'i',
  'ó': 'o',
  'ú': 'u',
  'ü': 'u',
  'ñ': 'n',
  'Á': 'A',
  'É': 'E',
  'Í': 'I',
  'Ó': 'O',
  'Ú': 'U',
  'Ü': 'U',
  'Ñ': 'N',
  '¿': '?',
  '¡': '!',
  '°': 'o',
}

/** Strip tags / entities from ticket HTML (or pass through plain text). */
export function ticketHtmlToPlainText(htmlOrText: string): string {
  const raw = (htmlOrText || '').trim()
  if (!raw) return ''
  if (!raw.includes('<')) return raw

  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|section|article|header|footer)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export function normalizeEscPosAscii(text: string): string {
  let out = ''
  for (const ch of text) {
    if (ACCENT_MAP[ch]) {
      out += ACCENT_MAP[ch]
      continue
    }
    const code = ch.charCodeAt(0)
    if (code === 9) {
      out += ' '
      continue
    }
    if (code === 10 || code === 13) {
      out += ch === '\r' ? '' : '\n'
      continue
    }
    // Printable ASCII only
    out += code >= 32 && code <= 126 ? ch : '?'
  }
  return out
}

function wrapLine(line: string, cols: number): string[] {
  if (line.length <= cols) return [line]
  const parts: string[] = []
  let rest = line
  while (rest.length > cols) {
    let breakAt = rest.lastIndexOf(' ', cols)
    if (breakAt < Math.floor(cols / 2)) breakAt = cols
    parts.push(rest.slice(0, breakAt).trimEnd())
    rest = rest.slice(breakAt).trimStart()
  }
  if (rest) parts.push(rest)
  return parts
}

export function buildDianQrUrl(cufe: string): string {
  return `${DIAN_SEARCH_QR_PREFIX}${cufe.trim()}`
}

/**
 * Resolve DIAN verify URL from ticket HTML/text (CUFE line or searchqr URL).
 * Prefactura without CUFE → null.
 */
export function extractDianQrPayload(htmlOrText: string): string | null {
  const raw = htmlOrText || ''
  if (!raw.trim()) return null

  const urlMatch = raw.match(
    /https?:\/\/catalogo-vpfe\.dian\.gov\.co\/document\/searchqr\?documentkey=([A-Za-z0-9]+)/i,
  )
  if (urlMatch?.[1]) return buildDianQrUrl(urlMatch[1])

  const keyMatch = raw.match(/documentkey=([A-Za-z0-9]{20,})/i)
  if (keyMatch?.[1]) return buildDianQrUrl(keyMatch[1])

  const cufeMatch = raw.match(/CUFE:\s*([A-Za-z0-9]{20,})/i)
  if (cufeMatch?.[1]) return buildDianQrUrl(cufeMatch[1])

  return null
}

/**
 * Epson / Star-compatible QR Code via GS ( k (model 2).
 * @see ESC/POS QR: functions 165/167/169/180/181
 */
export function buildEscPosQrCodeBytes(
  data: string,
  options?: { moduleSize?: number },
): Uint8Array {
  const payload = new TextEncoder().encode(data)
  if (!payload.length) return new Uint8Array(0)

  const size = Math.min(16, Math.max(3, options?.moduleSize ?? 5))
  const parts: number[] = []

  // Center
  parts.push(0x1b, 0x61, 0x01)

  // Select model 2: GS ( k 04 00 31 41 32 00
  parts.push(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)

  // Module size: GS ( k 03 00 31 43 n
  parts.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, size)

  // Error correction level M (0x31): GS ( k 03 00 31 45 31
  parts.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31)

  // Store symbol data: GS ( k pL pH 31 50 30 + data
  const storeLen = payload.length + 3
  parts.push(0x1d, 0x28, 0x6b, storeLen & 0xff, (storeLen >> 8) & 0xff, 0x31, 0x50, 0x30)
  for (let i = 0; i < payload.length; i++) parts.push(payload[i]!)

  // Print symbol: GS ( k 03 00 31 51 30
  parts.push(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30)

  // Left + feed
  parts.push(0x1b, 0x61, 0x00, 0x0a)

  return Uint8Array.from(parts)
}

function bytesIncludeSubsequence(haystack: Uint8Array, needle: number[]): boolean {
  if (needle.length > haystack.length) return false
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) continue outer
    }
    return true
  }
  return false
}

/** True when buffer contains GS ( k QR store/print sequence marker. */
export function hasEscPosQrMarker(bytes: Uint8Array): boolean {
  // GS ( k … 31 50 30 = store QR data
  return bytesIncludeSubsequence(bytes, [0x1d, 0x28, 0x6b])
    && bytesIncludeSubsequence(bytes, [0x31, 0x50, 0x30])
}

/** Build ESC/POS raw ticket: init + left + lines + optional QR + feed + partial cut. */
export function buildEscPosTicketBytes(
  text: string,
  options?: { cols?: number; qrPayload?: string | null },
): Uint8Array {
  const cols = options?.cols ?? DEFAULT_COLS
  const plain = ticketHtmlToPlainText(text)
  const normalized = normalizeEscPosAscii(plain)
  const lines = normalized.split(/\n/).flatMap((line) => wrapLine(line, cols))

  const qrUrl =
    options && 'qrPayload' in options
      ? (options.qrPayload?.trim() || null)
      : extractDianQrPayload(text)

  const parts: number[] = [
    0x1b, 0x40, // ESC @ init
    0x1b, 0x61, 0x00, // left align
  ]
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) parts.push(line.charCodeAt(i) & 0xff)
    parts.push(0x0a)
  }
  parts.push(0x0a)

  if (qrUrl) {
    const qr = buildEscPosQrCodeBytes(qrUrl)
    for (let i = 0; i < qr.length; i++) parts.push(qr[i]!)
  }

  parts.push(0x0a, 0x0a)
  parts.push(0x1d, 0x56, 0x01) // GS V partial cut
  return Uint8Array.from(parts)
}
