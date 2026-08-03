import { describe, expect, it } from 'bun:test'
import {
  displayedTipPercent,
  formatDisplayedTipPercent,
  tipAmountFromPercent,
} from './tipPercentDisplay'

describe('tipAmountFromPercent', () => {
  it('matches TipSelector whole-currency rounding', () => {
    expect(tipAmountFromPercent(225, 30)).toBe(68)
    expect(tipAmountFromPercent(225, 20)).toBe(45)
    expect(tipAmountFromPercent(225, 10)).toBe(23)
  })
})

describe('displayedTipPercent', () => {
  it('returns the preset that produced the tip amount (not reverse 30.22)', () => {
    expect(displayedTipPercent({
      tipAmount: 68,
      totalAmount: 225,
      tipSource: 'preset',
      presets: [10, 20, 30],
    })).toBe(30)
  })

  it('uses default candidates when presets omitted', () => {
    expect(displayedTipPercent({
      tipAmount: 68,
      totalAmount: 225,
      tipSource: 'preset',
    })).toBe(30)
  })

  it('rounds custom tips to a whole percent', () => {
    expect(displayedTipPercent({
      tipAmount: 50,
      totalAmount: 225,
      tipSource: 'custom',
    })).toBe(22)
  })

  it('returns null for empty tip or total', () => {
    expect(displayedTipPercent({ tipAmount: 0, totalAmount: 225 })).toBeNull()
    expect(displayedTipPercent({ tipAmount: 68, totalAmount: 0 })).toBeNull()
  })
})

describe('formatDisplayedTipPercent', () => {
  it('formats matched preset as integer percent label', () => {
    expect(formatDisplayedTipPercent({
      tipAmount: 68,
      totalAmount: 225,
      tipSource: 'preset',
      presets: [10, 20, 30],
    })).toBe('30%')
  })

  it('rounds API fallback percent when amounts missing', () => {
    expect(formatDisplayedTipPercent({
      tipAmount: 0,
      totalAmount: 0,
      fallbackPercent: 30.22,
    })).toBe('30%')
  })
})
