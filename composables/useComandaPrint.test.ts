import { describe, expect, it } from 'bun:test'
import { mapComandasForPrint } from './useComandaPrint'

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
