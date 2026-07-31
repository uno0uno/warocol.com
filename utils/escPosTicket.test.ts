import { describe, expect, it } from 'bun:test'
import {
  buildDianQrUrl,
  buildEscPosQrCodeBytes,
  buildEscPosRasterBytes,
  buildEscPosTicketBytes,
  extractDianQrPayload,
  hasEscPosQrMarker,
  hasEscPosRasterMarker,
  normalizeEscPosAscii,
  ticketHtmlToPlainText,
} from './escPosTicket'

const SAMPLE_CUFE = 'a'.repeat(48)

describe('ticketHtmlToPlainText', () => {
  it('strips tags and keeps text', () => {
    expect(ticketHtmlToPlainText('<div>Hola<br/>Mundo</div>')).toBe('Hola\nMundo')
  })

  it('passes plain text through', () => {
    expect(ticketHtmlToPlainText('Linea 1\nLinea 2')).toBe('Linea 1\nLinea 2')
  })
})

describe('normalizeEscPosAscii', () => {
  it('folds Spanish accents', () => {
    expect(normalizeEscPosAscii('Café Niño')).toBe('Cafe Nino')
  })

  it('maps NBSP after peso sign to ASCII space', () => {
    // es-CO Intl: "$" + U+00A0 + "1.100"
    expect(normalizeEscPosAscii('$\u00a01.100')).toBe('$ 1.100')
  })

  it('maps narrow NBSP and unicode minus', () => {
    expect(normalizeEscPosAscii('$\u202f500')).toBe('$ 500')
    expect(normalizeEscPosAscii('\u2212$100')).toBe('-$100')
  })

  it('maps multiply and middle-dot used on receipts', () => {
    expect(normalizeEscPosAscii('1 × COP 45.000')).toBe('1 x COP 45.000')
    expect(normalizeEscPosAscii('FEV-73 · Factura')).toBe('FEV-73 - Factura')
    expect(normalizeEscPosAscii('Datafono · bold')).toBe('Datafono - bold')
  })
})

describe('extractDianQrPayload', () => {
  it('builds URL from CUFE label', () => {
    expect(extractDianQrPayload(`Total\nCUFE: ${SAMPLE_CUFE}\n`)).toBe(buildDianQrUrl(SAMPLE_CUFE))
  })

  it('accepts French-style CUFE with space before colon', () => {
    expect(extractDianQrPayload(`CUFE : ${SAMPLE_CUFE}`)).toBe(buildDianQrUrl(SAMPLE_CUFE))
  })

  it('extracts from catalogo-vpfe URL', () => {
    const url = buildDianQrUrl(SAMPLE_CUFE)
    expect(extractDianQrPayload(`<div>${url}</div>`)).toBe(url)
  })

  it('returns null without CUFE (prefactura)', () => {
    expect(extractDianQrPayload('<div id="pos-prefactura">Prefactura</div>')).toBeNull()
  })
})

describe('buildEscPosQrCodeBytes', () => {
  it('emits GS ( k store/print sequence with payload', () => {
    const url = buildDianQrUrl(SAMPLE_CUFE)
    const bytes = buildEscPosQrCodeBytes(url)
    expect(hasEscPosQrMarker(bytes)).toBe(true)
    const asText = String.fromCharCode(...bytes)
    expect(asText).toContain(SAMPLE_CUFE)
  })
})

describe('buildEscPosTicketBytes', () => {
  it('starts with ESC @ and ends with partial cut', () => {
    const bytes = buildEscPosTicketBytes('WARO')
    expect(bytes[0]).toBe(0x1b)
    expect(bytes[1]).toBe(0x40)
    const n = bytes.length
    expect(bytes[n - 3]).toBe(0x1d)
    expect(bytes[n - 2]).toBe(0x56)
    expect(bytes[n - 1]).toBe(0x01)
    const asText = String.fromCharCode(...bytes)
    expect(asText).toContain('WARO')
  })

  it('accepts HTML ticket markup', () => {
    const bytes = buildEscPosTicketBytes('<div id="pos-receipt">Total $10</div>')
    const asText = String.fromCharCode(...bytes)
    expect(asText).toContain('Total $10')
  })

  it('embeds native QR when CUFE present', () => {
    const bytes = buildEscPosTicketBytes(`Factura\nCUFE: ${SAMPLE_CUFE}\n`)
    expect(hasEscPosQrMarker(bytes)).toBe(true)
    const asText = String.fromCharCode(...bytes)
    expect(asText).toContain(SAMPLE_CUFE)
  })

  it('omits QR when no CUFE', () => {
    const bytes = buildEscPosTicketBytes('<div id="pos-prefactura">Prefactura OK</div>')
    expect(hasEscPosQrMarker(bytes)).toBe(false)
  })

  it('respects explicit qrPayload override', () => {
    const url = buildDianQrUrl(SAMPLE_CUFE)
    const withQr = buildEscPosTicketBytes('Solo texto', { qrPayload: url })
    expect(hasEscPosQrMarker(withQr)).toBe(true)
    const without = buildEscPosTicketBytes(`CUFE: ${SAMPLE_CUFE}`, { qrPayload: null })
    expect(hasEscPosQrMarker(without)).toBe(false)
  })

  it('embeds logo raster when provided', () => {
    // 8x1 black pixels
    const data = new Uint8ClampedArray(8 * 1 * 4)
    for (let i = 0; i < 8; i++) {
      data[i * 4] = 0
      data[i * 4 + 1] = 0
      data[i * 4 + 2] = 0
      data[i * 4 + 3] = 255
    }
    const logo = buildEscPosRasterBytes({ width: 8, height: 1, data })
    expect(hasEscPosRasterMarker(logo)).toBe(true)
    const bytes = buildEscPosTicketBytes('Ticket', { logoRaster: logo })
    expect(hasEscPosRasterMarker(bytes)).toBe(true)
  })
})

describe('buildEscPosRasterBytes', () => {
  it('emits GS v 0 header for black pixels', () => {
    const data = new Uint8ClampedArray(16 * 2 * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 255
    }
    const bytes = buildEscPosRasterBytes({ width: 16, height: 2, data })
    expect(hasEscPosRasterMarker(bytes)).toBe(true)
    expect(bytes.length).toBeGreaterThan(8)
  })
})
