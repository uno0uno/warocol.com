import { describe, it } from 'vitest'
import assert from 'node:assert/strict'
import { buildReceiptTicketItems, consolidateReceiptPrintLines } from './receiptPrintLines.ts'

type TestLine = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  notes?: string | null
  modifiers?: Array<{ id?: string; name: string; price: number; quantity?: number }>
}

const group = (items: TestLine[]) =>
  consolidateReceiptPrintLines(items, {
    productKey: item => item.productId,
    displayName: item => item.name,
    quantity: item => item.quantity,
    unitPrice: item => item.unitPrice,
    total: item => item.total,
    modifiers: item => item.modifiers,
    notes: item => item.notes,
    merge: (item, aggregate) => ({
      ...item,
      quantity: aggregate.quantity,
      total: aggregate.total,
    }),
  })

const groupWithPromoGuard = (items: Array<TestLine & { promo?: string | null }>) =>
  consolidateReceiptPrintLines(items, {
    productKey: item => item.productId,
    displayName: item => item.name,
    quantity: item => item.quantity,
    unitPrice: item => item.unitPrice,
    total: item => item.total,
    modifiers: item => item.modifiers,
    notes: item => item.notes,
    guards: item => [item.promo],
    merge: (item, aggregate) => ({
      ...item,
      quantity: aggregate.quantity,
      total: aggregate.total,
    }),
  })

describe('consolidateReceiptPrintLines', () => {
  it('sums taxAmount when consolidating duplicate taxed lines', () => {
    const lines = consolidateReceiptPrintLines(
      [
        { productId: 'a', name: 'Agua', quantity: 1, unitPrice: 3500, total: 3500, taxAmount: 280 },
        { productId: 'a', name: 'Agua', quantity: 1, unitPrice: 3500, total: 3500, taxAmount: 280 },
      ],
      {
        productKey: item => item.productId,
        displayName: item => item.name,
        quantity: item => item.quantity,
        unitPrice: item => item.unitPrice,
        total: item => item.total,
        taxAmount: item => item.taxAmount,
        merge: (item, aggregate) => ({
          ...item,
          quantity: aggregate.quantity,
          total: aggregate.total,
          taxAmount: aggregate.taxAmount,
        }),
      },
    )
    assert.equal(lines.length, 1)
    assert.equal(lines[0].quantity, 2)
    assert.equal(lines[0].total, 7000)
    assert.equal(lines[0].taxAmount, 560)
  })

  it('groups plain duplicate products for receipt printing', () => {
    const lines = group([
      { productId: 'burger', name: 'Burger', quantity: 1, unitPrice: 12000, total: 12000 },
      { productId: 'burger', name: 'Burger', quantity: 2, unitPrice: 12000, total: 24000 },
    ])

    assert.equal(lines.length, 1)
    assert.equal(lines[0].quantity, 3)
    assert.equal(lines[0].total, 36000)
  })

  it('groups products with the same modifiers regardless of modifier order', () => {
    const lines = group([
      {
        productId: 'pizza',
        name: 'Pizza',
        quantity: 1,
        unitPrice: 20000,
        total: 20000,
        modifiers: [
          { id: 'cheese', name: 'Queso', price: 2000, quantity: 1 },
          { id: 'pepperoni', name: 'Pepperoni', price: 3000, quantity: 2 },
        ],
      },
      {
        productId: 'pizza',
        name: 'Pizza',
        quantity: 1,
        unitPrice: 20000,
        total: 20000,
        modifiers: [
          { id: 'pepperoni', name: 'Pepperoni', price: 3000, quantity: 2 },
          { id: 'cheese', name: 'Queso', price: 2000, quantity: 1 },
        ],
      },
    ])

    assert.equal(lines.length, 1)
    assert.equal(lines[0].quantity, 2)
    assert.equal(lines[0].total, 40000)
  })

  it('keeps products with different modifiers separated', () => {
    const lines = group([
      {
        productId: 'pizza',
        name: 'Pizza',
        quantity: 1,
        unitPrice: 20000,
        total: 20000,
        modifiers: [{ id: 'cheese', name: 'Queso', price: 2000 }],
      },
      {
        productId: 'pizza',
        name: 'Pizza',
        quantity: 1,
        unitPrice: 20000,
        total: 20000,
        modifiers: [{ id: 'bacon', name: 'Tocineta', price: 4000 }],
      },
    ])

    assert.equal(lines.length, 2)
  })

  it('keeps products with different notes separated', () => {
    const lines = group([
      { productId: 'juice', name: 'Jugo', quantity: 1, unitPrice: 8000, total: 8000, notes: 'sin hielo' },
      { productId: 'juice', name: 'Jugo', quantity: 1, unitPrice: 8000, total: 8000, notes: 'con hielo' },
    ])

    assert.equal(lines.length, 2)
  })

  it('keeps products with different promo guards separated', () => {
    const lines = groupWithPromoGuard([
      { productId: 'burger', name: 'Burger', quantity: 1, unitPrice: 12000, total: 12000, promo: 'happy-hour' },
      { productId: 'burger', name: 'Burger', quantity: 1, unitPrice: 12000, total: 12000, promo: null },
    ])

    assert.equal(lines.length, 2)
  })

  it('merges plain duplicates like poker 13 + 19 into one line', () => {
    const lines = group([
      { productId: 'poker', name: 'poker 330 und', quantity: 13, unitPrice: 45000, total: 585000 },
      { productId: 'poker', name: 'poker 330 und', quantity: 19, unitPrice: 45000, total: 855000 },
    ])
    assert.equal(lines.length, 1)
    assert.equal(lines[0]!.quantity, 32)
    assert.equal(lines[0]!.total, 1440000)
  })
})

describe('buildReceiptTicketItems', () => {
  it('normalizes Rebel Rebel order 16599 without collapsing products to an empty zero line', () => {
    const lines = buildReceiptTicketItems([
      {
        id: '1',
        product: { id: 'sin-ley', name: 'Sin Ley (Chorizo y pepinillos)', price: 29000 },
        quantity: 4,
        modifiers: [],
      },
      {
        id: '2',
        product: { id: 'agua', name: 'Agua Sin Gas', price: 3500 },
        quantity: 1,
        modifiers: [],
      },
      {
        id: '3',
        product: { id: 'quatro', name: 'Quatro', price: 5000 },
        quantity: 2,
        modifiers: [],
      },
      {
        id: '4',
        product: { id: 'fuego', name: 'Fuego (Frutos rojos)', price: 12000 },
        quantity: 1,
        modifiers: [],
      },
    ])

    assert.equal(lines.length, 4)
    assert.deepEqual(
      lines.map(line => ({
        name: line.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        total: line.total,
      })),
      [
        { name: 'Sin Ley (Chorizo y pepinillos)', quantity: 4, unitPrice: 29000, total: 116000 },
        { name: 'Agua Sin Gas', quantity: 1, unitPrice: 3500, total: 3500 },
        { name: 'Quatro', quantity: 2, unitPrice: 5000, total: 10000 },
        { name: 'Fuego (Frutos rojos)', quantity: 1, unitPrice: 12000, total: 12000 },
      ],
    )
    assert.equal(lines.reduce((sum, line) => sum + line.quantity, 0), 8)
    assert.equal(lines.reduce((sum, line) => sum + line.total, 0), 141500)
  })

  it('preserves a zero-cost included modifier total', () => {
    const [line] = buildReceiptTicketItems([
      {
        product: { id: 'burger', name: 'Burger', price: 20000 },
        quantity: 1,
        modifiers: [
          {
            id: 'included-cheese',
            name: 'Queso incluido',
            price: 2000,
            quantity: 1,
            included_quantity: 1,
          },
        ],
      },
    ])

    assert.equal(line.total, 20000)
    assert.equal(line.modifiers[0].total, 0)
  })
})
