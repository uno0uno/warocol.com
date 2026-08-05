/**
 * Cash-count denominations per display currency (arqueo de caja).
 *
 * Only circulating banknotes are listed; coins are counted as a single
 * free-form amount in the UI, so low face values are intentionally omitted.
 */
import { normalizeCurrencyCode } from '~/utils/currencyDisplay'

export const CASH_DENOMINATIONS_BY_CURRENCY: Record<string, readonly number[]> = {
  ARS: [20000, 10000, 2000, 1000, 500, 200],
  BOB: [200, 100, 50, 20, 10],
  BRL: [200, 100, 50, 20, 10, 5, 2],
  CLP: [20000, 10000, 5000, 2000, 1000],
  COP: [100000, 50000, 20000, 10000, 5000, 2000, 1000],
  CRC: [50000, 20000, 10000, 5000, 2000, 1000],
  DOP: [2000, 1000, 500, 200, 100, 50],
  EUR: [200, 100, 50, 20, 10, 5],
  GTQ: [200, 100, 50, 20, 10, 5],
  HNL: [500, 200, 100, 50, 20, 10],
  MXN: [1000, 500, 200, 100, 50, 20],
  NIO: [1000, 500, 200, 100, 50, 20],
  PAB: [100, 50, 20, 10, 5, 1],
  PEN: [200, 100, 50, 20, 10],
  PYG: [100000, 50000, 20000, 10000, 5000, 2000],
  USD: [100, 50, 20, 10, 5, 1],
  UYU: [2000, 1000, 500, 200, 100, 50],
  VES: [100, 50, 20, 10, 5],
}

/** Currencies without a mapping fall back by magnitude, not by country. */
const FALLBACK_LARGE_NOTES = [100000, 50000, 20000, 10000, 5000, 2000] as const
const FALLBACK_SMALL_NOTES = [100, 50, 20, 10, 5, 1] as const

export const DEFAULT_CASH_DENOMINATIONS = CASH_DENOMINATIONS_BY_CURRENCY.COP

/**
 * Banknotes to show in the cash count for a tenant currency.
 * `minorUnits === 0` currencies (COP, CLP, PYG) use the large-note ladder.
 */
export function resolveCashDenominations(
  currency?: string | null,
  minorUnits?: number | null,
): number[] {
  const code = normalizeCurrencyCode(currency)
  const mapped = CASH_DENOMINATIONS_BY_CURRENCY[code]
  if (mapped) return [...mapped]
  const useLargeNotes = (minorUnits ?? 0) === 0
  return [...(useLargeNotes ? FALLBACK_LARGE_NOTES : FALLBACK_SMALL_NOTES)]
}
