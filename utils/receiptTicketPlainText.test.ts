import { describe, expect, it } from 'bun:test'
import {
  formatReceiptModifierBlock,
  formatReceiptProductBlock,
  padReceiptLine,
  receiptDivider,
  collectThermalTicketText,
} from './receiptTicketPlainText'

describe('padReceiptLine', () => {
  it('keeps a space gap so label and amount do not mash', () => {
    const line = padReceiptLine('Subtotal', '$ COP 1.763.000,00', 32)
    expect(line).not.toMatch(/Subtotal\$/)
    expect(line).toContain('Subtotal')
    expect(line).toContain('$ COP 1.763.000,00')
    expect(line.length).toBe(32)
  })

  it('pads Descripcion / Total header', () => {
    const line = padReceiptLine('Descripcion', 'Total', 32)
    expect(line).not.toBe('DescripcionTotal')
    expect(line.startsWith('Descripcion')).toBe(true)
    expect(line.endsWith('Total')).toBe(true)
  })
})

describe('formatReceiptProductBlock', () => {
  it('puts name and values on separate lines', () => {
    const block = formatReceiptProductBlock({
      name: 'poker 330 und',
      quantity: 13,
      unitPriceLabel: '$ COP 45.000,00',
      lineTotalLabel: '$ COP 585.000,00',
    })
    expect(block.split('\n')).toHaveLength(2)
    expect(block).toContain('poker 330 und')
    expect(block).not.toMatch(/und13/)
    expect(block).toContain('13 x')
  })
})

describe('formatReceiptModifierBlock', () => {
  it('keeps modifier description above amounts', () => {
    const block = formatReceiptModifierBlock({
      description: '+ TOMATE DE PRUEBA',
      quantity: 1,
      unitPriceLabel: '$ COP 9.000,00',
      lineTotalLabel: '$ COP 9.000,00',
    })
    expect(block.startsWith('+ TOMATE DE PRUEBA\n')).toBe(true)
  })
})

describe('receiptDivider', () => {
  it('emits fixed-width dashes', () => {
    expect(receiptDivider(10)).toBe('----------')
  })
})

describe('collectThermalTicketText', () => {
  it('preserves padReceiptLine spaces from hidden plain lines', () => {
    const padded = padReceiptLine('Subtotal', '$ COP 100', 32)
    const product = formatReceiptProductBlock({
      name: 'poker',
      quantity: 2,
      unitPriceLabel: '$10',
      lineTotalLabel: '$20',
    })
    const root = {
      classList: { contains: () => false },
      children: [
        {
          classList: { contains: (c: string) => c === 'receipt-plain-line' },
          textContent: padded,
          children: [],
        },
        {
          classList: { contains: (c: string) => c === 'receipt-row' },
          textContent: 'Mesa 15',
          children: [],
        },
        {
          classList: { contains: (c: string) => c === 'receipt-plain-pre' },
          textContent: product,
          children: [],
        },
      ],
    } as unknown as Element

    const text = collectThermalTicketText(root)
    expect(text).not.toMatch(/Subtotal\$/)
    expect(text.split('\n')[0]).toMatch(/Subtotal\s{2,}\$ COP 100/)
    expect(text).toContain('Mesa 15')
    expect(text).toContain('poker')
  })
})
