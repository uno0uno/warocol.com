import { describe, expect, it } from 'bun:test'
import {
  buildDianQrUrl,
  buildEscPosQrCodeBytes,
  buildEscPosTicketBytes,
  extractDianQrPayload,
  hasEscPosQrMarker,
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
})
