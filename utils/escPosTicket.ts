/**
 * ESC/POS helpers for thermal tickets without PrintBridge HTML/Chromium.
 * Plain text → raw bytes (58mm ≈ 32 cols). Accents folded to ASCII for CP437-less queues.
 * Optional DIAN QR via native GS ( k when CUFE / search URL is present (#1962).
 * Optional logo via GS v 0 raster (#1965).
 */

const DEFAULT_COLS = 32
const DEFAULT_LOGO_MAX_WIDTH = 384 // ~58mm @ 203dpi
const DEFAULT_LOGO_MAX_HEIGHT = 120

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
  // Receipt punctuation that was printing as "?" on thermal (#1965 follow-up)
  '×': 'x',
  '·': '-',
  '•': '-',
  '—': '-',
  '–': '-',
  '…': '...',
  '\u2018': "'",
  '\u2019': "'",
  '\u201c': '"',
  '\u201d': '"',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'Y',
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
    // Tab + Unicode spaces (NBSP, narrow NBSP, thin, etc.) → ASCII space
    // so es-CO "$ 1.100" does not become "$?1.100" on thermal.
    if (
      code === 9
      || code === 0xa0
      || code === 0x202f
      || code === 0x2007
      || code === 0x2009
      || code === 0x200a
      || code === 0xfeff
    ) {
      out += ' '
      continue
    }
    if (code === 10 || code === 13) {
      out += ch === '\r' ? '' : '\n'
      continue
    }
    // Unicode minus / en-dash near amounts → ASCII hyphen
    if (code === 0x2212 || code === 0x2013) {
      out += '-'
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

  const cufeMatch = raw.match(/CUFE\s*:\s*([A-Za-z0-9]{20,})/i)
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

/** True when buffer contains GS v 0 raster header. */
export function hasEscPosRasterMarker(bytes: Uint8Array): boolean {
  return bytesIncludeSubsequence(bytes, [0x1d, 0x76, 0x30])
}

export type EscPosImageDataLike = {
  width: number
  height: number
  data: ArrayLike<number>
}

/**
 * Pack RGBA image data into ESC/POS GS v 0 raster (1-bit, centered).
 * Width is floored to a multiple of 8.
 */
export function buildEscPosRasterBytes(imageData: EscPosImageDataLike): Uint8Array {
  const width = Math.floor(imageData.width) & ~7
  const height = Math.floor(imageData.height)
  if (width < 8 || height < 1) return new Uint8Array(0)

  const widthBytes = width / 8
  const raster: number[] = []
  for (let y = 0; y < height; y++) {
    for (let xb = 0; xb < widthBytes; xb++) {
      let byte = 0
      for (let bit = 0; bit < 8; bit++) {
        const x = xb * 8 + bit
        const i = (y * imageData.width + x) * 4
        const r = Number(imageData.data[i] ?? 255)
        const g = Number(imageData.data[i + 1] ?? 255)
        const b = Number(imageData.data[i + 2] ?? 255)
        const a = Number(imageData.data[i + 3] ?? 255)
        const lum = (r * 299 + g * 587 + b * 114) / 1000
        if (a > 64 && lum < 180) byte |= 0x80 >> bit
      }
      raster.push(byte)
    }
  }

  return Uint8Array.from([
    0x1b, 0x61, 0x01, // center
    0x1d, 0x76, 0x30, 0x00,
    widthBytes & 0xff,
    (widthBytes >> 8) & 0xff,
    height & 0xff,
    (height >> 8) & 0xff,
    ...raster,
    0x0a,
    0x1b, 0x61, 0x00, // left
  ])
}

/** Find receipt logo <img> from print DOM. */
export function findReceiptLogoImage(elementId?: string | null): HTMLImageElement | null {
  if (typeof document === 'undefined') return null
  const roots: Element[] = []
  if (elementId) {
    const el = document.getElementById(elementId)
    if (el) roots.push(el)
  }
  const teleported = document.querySelector('.receipt-print-ticket')
  if (teleported) roots.push(teleported)
  // Prefactura / inline receipt header (not teleported)
  for (const root of document.querySelectorAll('.receipt-print-header')) {
    roots.push(root)
  }
  for (const root of roots) {
    const img = root.querySelector('img.receipt-logo') as HTMLImageElement | null
    if (img?.src) return img
  }
  return null
}

/** Find receipt logo URL from print DOM (#pos-* or teleported .receipt-print-ticket). */
export function findReceiptLogoSrc(elementId?: string | null): string | null {
  const img = findReceiptLogoImage(elementId)
  const src = (img?.currentSrc || img?.src || '').trim()
  return src || null
}

function rasterFromLoadedImage(
  img: HTMLImageElement,
  maxW: number,
  maxH: number,
): Uint8Array | null {
  let w = img.naturalWidth || img.width
  let h = img.naturalHeight || img.height
  if (!w || !h) return null
  const scale = Math.min(maxW / w, maxH / h, 1)
  w = Math.max(8, Math.floor(w * scale) & ~7)
  h = Math.max(1, Math.floor(h * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  try {
    return buildEscPosRasterBytes(ctx.getImageData(0, 0, w, h))
  } catch {
    // Canvas tainted (cross-origin without CORS)
    return null
  }
}

/** Same-origin proxy URL so canvas can read CDN logos without CORS. */
export function thermalLogoProxyUrl(remoteUrl: string): string {
  const u = remoteUrl.trim()
  if (!u) return ''
  if (u.startsWith('data:') || u.startsWith('blob:')) return u
  // Already proxied
  if (u.includes('/thermal-logo?')) return u
  return `/thermal-logo?url=${encodeURIComponent(u)}`
}

/** Load logo URL / DOM img → ESC/POS raster (best-effort). */
export async function loadEscPosLogoRasterFromUrl(
  url: string,
  options?: { maxWidthPx?: number; maxHeightPx?: number; elementId?: string | null },
): Promise<Uint8Array | null> {
  if (typeof document === 'undefined' || !url?.trim()) return null
  const maxW = options?.maxWidthPx ?? DEFAULT_LOGO_MAX_WIDTH
  const maxH = options?.maxHeightPx ?? DEFAULT_LOGO_MAX_HEIGHT

  // Prefer same-origin proxy (bypasses CDN CORS + display:none unload issues)
  const candidates = [
    thermalLogoProxyUrl(url),
    url,
  ].filter((u, i, arr) => u && arr.indexOf(u) === i)

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, { credentials: 'same-origin', cache: 'force-cache' })
      if (!res.ok) continue
      const blob = await res.blob()
      if (!blob.type.startsWith('image/') && !candidate.startsWith('data:')) continue
      const objectUrl = URL.createObjectURL(blob)
      try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image()
          i.onload = () => resolve(i)
          i.onerror = () => reject(new Error('blob logo load failed'))
          i.src = objectUrl
        })
        const raster = rasterFromLoadedImage(img, maxW, maxH)
        if (raster?.length) return raster
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    } catch {
      /* try next */
    }
  }

  // DOM img (may be tainted / not loaded under display:none)
  const domImg = findReceiptLogoImage(options?.elementId)
  if (domImg && (domImg.complete || domImg.naturalWidth > 0)) {
    const fromDom = rasterFromLoadedImage(domImg, maxW, maxH)
    if (fromDom?.length) return fromDom
  }

  // Last resort: Image + crossOrigin anonymous
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.crossOrigin = 'anonymous'
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('logo load failed'))
      i.src = url
    })
    return rasterFromLoadedImage(img, maxW, maxH)
  } catch {
    return null
  }
}

/** Build ESC/POS raw ticket: init + optional logo + lines + optional QR + feed + partial cut. */
export function buildEscPosTicketBytes(
  text: string,
  options?: {
    cols?: number
    qrPayload?: string | null
    logoRaster?: Uint8Array | null
  },
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

  const logo = options?.logoRaster
  if (logo?.length) {
    for (let i = 0; i < logo.length; i++) parts.push(logo[i]!)
    parts.push(0x0a)
  }

  for (const line of lines) {
    for (let i = 0; i < line.length; i++) parts.push(line.charCodeAt(i) & 0xff)
    parts.push(0x0a)
  }
  parts.push(0x0a, 0x0a)

  if (qrUrl) {
    const qr = buildEscPosQrCodeBytes(qrUrl)
    for (let i = 0; i < qr.length; i++) parts.push(qr[i]!)
  }

  parts.push(0x0a, 0x0a, 0x0a)
  parts.push(0x1d, 0x56, 0x01) // GS V partial cut
  return Uint8Array.from(parts)
}
