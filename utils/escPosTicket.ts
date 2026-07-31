/**
 * ESC/POS helpers for thermal tickets without PrintBridge HTML/Chromium.
 * Plain text → raw bytes (58mm ≈ 32 cols). Accents folded to ASCII for CP437-less queues.
 */

const DEFAULT_COLS = 32

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

/** Build ESC/POS raw ticket: init + left + lines + feed + partial cut. */
export function buildEscPosTicketBytes(
  text: string,
  options?: { cols?: number },
): Uint8Array {
  const cols = options?.cols ?? DEFAULT_COLS
  const plain = ticketHtmlToPlainText(text)
  const normalized = normalizeEscPosAscii(plain)
  const lines = normalized.split(/\n/).flatMap((line) => wrapLine(line, cols))

  const parts: number[] = [
    0x1b, 0x40, // ESC @ init
    0x1b, 0x61, 0x00, // left align
  ]
  for (const line of lines) {
    for (let i = 0; i < line.length; i++) parts.push(line.charCodeAt(i) & 0xff)
    parts.push(0x0a)
  }
  parts.push(0x0a, 0x0a, 0x0a)
  parts.push(0x1d, 0x56, 0x01) // GS V partial cut
  return Uint8Array.from(parts)
}
