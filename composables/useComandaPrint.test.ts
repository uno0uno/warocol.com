import { describe, expect, it } from 'bun:test'
import {
  buildComandaTicketPlainText,
  formatComandaModifierLabel,
  mapComandasForPrint,
} from './useComandaPrint'

describe('mapComandasForPrint', () => {
  it('preserves station_id alongside station_name', () => {
    const mapped = mapComandasForPrint([
      {
        id: 'c1',
        comanda_number: 12,
        station_id: '11111111-1111-1111-1111-111111111111',
        station_name: 'Barra',
        items: [{ kitchen_name: 'Café', quantity: 1 }],
      },
    ])
    expect(mapped).toHaveLength(1)
    expect(mapped[0]!.station_id).toBe('11111111-1111-1111-1111-111111111111')
    expect(mapped[0]!.station_name).toBe('Barra')
  })

  it('sets station_id null when missing', () => {
    const mapped = mapComandasForPrint([
      {
        comanda_number: 1,
        station_name: 'Sin id',
        items: [{ kitchen_name: 'X', quantity: 2 }],
      },
    ])
    expect(mapped[0]!.station_id).toBeNull()
  })
})

describe('buildComandaTicketPlainText', () => {
  it('keeps meta rows and item details on separate lines', () => {
    const text = buildComandaTicketPlainText(
      [
        {
          comanda_number: 173,
          table_display_name: 'Mesa 15',
          station_name: 'Cocina',
          fired_at: '2026-07-31T19:05:00-05:00',
          items: [
            {
              kitchen_name: 'Santa inquisicion',
              quantity: 1,
              notes: 'GRATIS (HORA FELIZ)',
              modifiers_snapshot: [
                { name: 'Papas Fritas', price: 5000, quantity: 1 },
                { name: 'Tocineta', price: 4000, quantity: 2 },
              ],
            },
          ],
        },
      ],
      {
        businessName: 'Waro Colombia',
        includeModifierPrices: true,
        formatPrice: (n) => `$${n}`,
        formatTime: () => '31/07/26, 19:05',
      },
    )

    expect(text.split('\n')).toEqual([
      'Waro Colombia',
      '*** COMANDA POS ***',
      '31/07/26, 19:05',
      'Mesa 15',
      'Comanda #173',
      '--------------------------------',
      'Estacion: Cocina',
      '1x Santa inquisicion',
      '  - Papas Fritas - $5000',
      '  - Tocineta x2 - $8000',
      '  * Notas especiales: GRATIS (HORA FELIZ)',
    ])
    expect(text).not.toContain('?')
    expect(text).not.toMatch(/19:05Mesa/)
  })
})

describe('formatComandaModifierLabel', () => {
  it('uses ASCII separators for thermal-safe labels', () => {
    expect(
      formatComandaModifierLabel(
        { name: 'Extra', price: 1000, quantity: 2 },
        { includePrice: true, formatPrice: (n) => `$${n}` },
      ),
    ).toBe('Extra x2 - $2000')
  })
})
