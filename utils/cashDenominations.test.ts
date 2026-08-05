import { describe, expect, it } from 'bun:test'
import {
  CASH_DENOMINATIONS_BY_CURRENCY,
  resolveCashDenominations,
} from './cashDenominations'

describe('resolveCashDenominations', () => {
  it('keeps the Colombian ladder for COP tenants', () => {
    expect(resolveCashDenominations('COP', 0)).toEqual([100000, 50000, 20000, 10000, 5000, 2000, 1000])
  })

  it('uses Mexican banknotes for MXN tenants', () => {
    expect(resolveCashDenominations('MXN', 2)).toEqual([1000, 500, 200, 100, 50, 20])
  })

  it('normalizes lowercase and padded codes', () => {
    expect(resolveCashDenominations(' usd ', 2)).toEqual([100, 50, 20, 10, 5, 1])
  })

  it('falls back to COP when the currency is missing', () => {
    expect(resolveCashDenominations(null, 0)).toEqual(CASH_DENOMINATIONS_BY_CURRENCY.COP)
  })

  it('falls back by magnitude for unmapped currencies', () => {
    expect(resolveCashDenominations('JPY', 0)).toEqual([100000, 50000, 20000, 10000, 5000, 2000])
    expect(resolveCashDenominations('GBP', 2)).toEqual([100, 50, 20, 10, 5, 1])
  })

  it('returns a mutable copy so callers cannot corrupt the table', () => {
    const list = resolveCashDenominations('MXN', 2)
    list.push(1)
    expect(resolveCashDenominations('MXN', 2)).toEqual([1000, 500, 200, 100, 50, 20])
  })

  it('lists denominations in descending order for every currency', () => {
    for (const [code, list] of Object.entries(CASH_DENOMINATIONS_BY_CURRENCY)) {
      const sorted = [...list].sort((a, b) => b - a)
      expect({ code, list: [...list] }).toEqual({ code, list: sorted })
    }
  })
})
