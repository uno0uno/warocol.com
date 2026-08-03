/**
 * Display tip % after whole-currency tip rounding (warocol.com#2085).
 * Checkout stores tip = round(total × preset/100); reverse tip/total shows noise like 30.22%.
 */

export function tipAmountFromPercent(totalAmount: number, percent: number): number {
  const total = Number(totalAmount) || 0
  const p = Number(percent) || 0
  if (total <= 0 || p <= 0) return 0
  return Math.round(total * (p / 100))
}

/** Common POS presets used when tenant list is unavailable. */
export const DEFAULT_TIP_PERCENT_CANDIDATES = [5, 10, 12, 15, 18, 20, 25, 30] as const

export function displayedTipPercent(opts: {
  tipAmount: number
  totalAmount: number
  tipSource?: string | null
  presets?: Array<number | string> | null
}): number | null {
  const tip = Math.round(Number(opts.tipAmount) || 0)
  const total = Number(opts.totalAmount) || 0
  if (tip <= 0 || total <= 0) return null

  const fromOpts = (opts.presets ?? [])
    .map(p => Number(p))
    .filter(p => Number.isFinite(p) && p > 0)
  const candidates = fromOpts.length > 0
    ? fromOpts
    : [...DEFAULT_TIP_PERCENT_CANDIDATES]

  const matches = candidates.filter(p => tipAmountFromPercent(total, p) === tip)
  if (matches.length === 1) return matches[0]
  if (matches.length > 1) {
    const reverse = (tip / total) * 100
    return matches.reduce((best, p) =>
      Math.abs(p - reverse) < Math.abs(best - reverse) ? p : best,
    )
  }

  // Custom / unmatched: whole percent only (never two-decimal reverse noise).
  return Math.round((tip / total) * 100)
}

export function formatDisplayedTipPercent(opts: {
  tipAmount: number
  totalAmount: number
  tipSource?: string | null
  presets?: Array<number | string> | null
  /** When only API reverse % is available (no amounts). */
  fallbackPercent?: number | null
}): string {
  if (
    (Number(opts.tipAmount) || 0) > 0
    && (Number(opts.totalAmount) || 0) > 0
  ) {
    const p = displayedTipPercent(opts)
    return p == null ? '' : `${p}%`
  }
  const fb = Number(opts.fallbackPercent)
  if (!Number.isFinite(fb) || fb <= 0) return ''
  return `${Math.round(fb)}%`
}
