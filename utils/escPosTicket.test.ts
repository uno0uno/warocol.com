import { describe, expect, it } from 'bun:test'
import {
  buildEscPosTicketBytes,
  normalizeEscPosAscii,
  ticketHtmlToPlainText,
} from './escPosTicket'

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
})
