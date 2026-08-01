import { describe, expect, it } from 'bun:test'
import {
  compactThermalMoneyLabel,
  formatReceiptModifierBlock,
  formatReceiptProductBlock,
  formatReceiptTaxCue,
  padReceiptLine,
  receiptDivider,
  collectThermalTicketText,
} from './receiptTicketPlainText'

describe('compactThermalMoneyLabel', () => {
  it('strips COP prefix for narrower thermal columns', () => {
    expect(compactThermalMoneyLabel('$ COP 45.000,00')).toBe('$45.000,00')
    expect(compactThermalMoneyLabel('$ 1.000')).toBe('$1.000')
  })
})

describe('padReceiptLine', () => {
  it('keeps a space gap so label and amount do not mash', () => {
    const line = padReceiptLine('Subtotal', '$1.763.000,00', 32)
    expect(line).not.toMatch(/Subtotal\$/)
    expect(line).toContain('Subtotal')
    expect(line).toContain('$1.763.000,00')
    expect(line.length).toBe(32)
  })

  it('pads Descripcion / Total header', () => {
    const line = padReceiptLine('Descripcion', 'Total', 32)
    expect(line).not.toBe('DescripcionTotal')
    expect(line.startsWith('Descripcion')).toBe(true)
    expect(line.endsWith('Total')).toBe(true)
  })

  it('preserves leading indent and never truncates with ellipsis', () => {
    const line = padReceiptLine('  13 x $45.000,00', '$585.000,00', 32)
    expect(line).not.toContain('...')
    expect(line.startsWith('  ') || line.includes('\n')).toBe(true)
  })

  it('stacks when both sides cannot fit instead of cutting digits', () => {
    const line = padReceiptLine(
      'TOTAL A COBRAR CON SERVICIO INCLUIDO',
      '$1.845.600,00',
      32,
    )
    expect(line).not.toContain('...')
    expect(line).toContain('TOTAL A COBRAR')
    expect(line).toContain('$1.845.600,00')
    expect(line.includes('\n')).toBe(true)
  })
})

describe('formatReceiptTaxCue', () => {
  it('formats included and exclusive tax with amount', () => {
    expect(formatReceiptTaxCue({
      label: 'IVA 19%',
      amountLabel: '$ COP 1.900,00',
      includedInPrice: true,
      includedTemplate: 'Incluye {label} · {amount}',
    })).toBe('Incluye IVA 19% · $1.900,00')
    expect(formatReceiptTaxCue({
      label: 'IVA 16%',
      amountLabel: '$160',
      includedInPrice: false,
    })).toBe('IVA 16% · $160')
  })

  it('returns bare label for exempt / zero-amount cues', () => {
    expect(formatReceiptTaxCue({ label: 'Exento' })).toBe('Exento')
    expect(formatReceiptTaxCue({ label: '', amountLabel: '$1' })).toBeNull()
  })

  it('accepts pre-localized text from vue-i18n t(key, params)', () => {
    expect(formatReceiptTaxCue({
      text: 'Incluye IVA 19% · $2.076,00',
    })).toBe('Incluye IVA 19% · $2.076,00')
  })

  it('recovers when i18n emptied template placeholders (Incluye ·)', () => {
    expect(formatReceiptTaxCue({
      label: 'IVA 19%',
      amountLabel: '$2.076,00',
      includedInPrice: true,
      includedTemplate: 'Incluye ·',
    })).toBe('Incluye IVA 19% · $2.076,00')
    expect(formatReceiptTaxCue({
      label: 'IVA licores 5%',
      amountLabel: '$1.500,00',
      includedInPrice: false,
      exclusiveTemplate: '·',
    })).toBe('IVA licores 5% · $1.500,00')
  })
})

describe('formatReceiptProductBlock', () => {
  it('puts name and values on separate lines without truncating money', () => {
    const block = formatReceiptProductBlock({
      name: 'poker 330 und',
      quantity: 13,
      unitPriceLabel: '$ COP 45.000,00',
      lineTotalLabel: '$ COP 585.000,00',
    })
    expect(block).toContain('poker 330 und')
    expect(block).not.toMatch(/und13/)
    expect(block).toContain('13 x')
    expect(block).not.toContain('...')
    expect(block).toContain('$45.000,00')
    expect(block).toContain('$585.000,00')
  })

  it('appends per-line tax declaration under the qty/total row', () => {
    const block = formatReceiptProductBlock({
      name: 'Agua',
      quantity: 1,
      unitPriceLabel: '$3.500',
      lineTotalLabel: '$3.500',
      taxCue: 'Incluye INC · $280',
    })
    const lines = block.split('\n')
    expect(lines[0]).toBe('Agua')
    expect(lines[1]).toContain('1 x')
    expect(lines[2]).toBe('Incluye INC · $280')
  })
})

describe('formatReceiptModifierBlock', () => {
  it('indents modifier name and amount under the parent item', () => {
    const block = formatReceiptModifierBlock({
      description: '+ TOMATE DE PRUEBA',
      quantity: 3,
      unitPriceLabel: '$ COP 9.000,00',
      lineTotalLabel: '$ COP 27.000,00',
    })
    const lines = block.split('\n')
    expect(lines[0]).toMatch(/^\s{2}\+ TOMATE DE PRUEBA$/)
    expect(block).not.toContain('...')
    expect(block).toContain('$9.000,00')
    expect(block).toContain('$27.000,00')
    expect(lines[1]?.startsWith('  ')).toBe(true)
  })
})

describe('receiptDivider', () => {
  it('emits fixed-width dashes', () => {
    expect(receiptDivider(10)).toBe('----------')
  })
})

describe('collectThermalTicketText', () => {
  it('preserves pad spaces and modifier indent from hidden plain lines', () => {
    const padded = padReceiptLine('Subtotal', '$100', 32)
    const mod = formatReceiptModifierBlock({
      description: '+ Papas',
      quantity: 1,
      unitPriceLabel: '$ COP 5.000,00',
      lineTotalLabel: '$ COP 5.000,00',
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
          classList: { contains: (c: string) => c === 'receipt-plain-pre' },
          textContent: mod,
          children: [],
        },
      ],
    } as unknown as Element

    const text = collectThermalTicketText(root)
    expect(text.split('\n')[0]).toMatch(/Subtotal\s{2,}\$100/)
    expect(text).toMatch(/\n {2}\+ Papas/)
  })
})
