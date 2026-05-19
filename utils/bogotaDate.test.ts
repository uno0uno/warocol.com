import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDaysBogotaISO,
  bogotaDateAtNoon,
  bogotaISOFromDate,
  combineBogotaDateAndTimeISO,
  todayBogotaISO,
} from './bogotaDate.ts'

describe('bogotaDate', () => {
  it('bogotaISOFromDate uses Bogotá calendar day not UTC', () => {
    // 2026-05-19 01:30 UTC = 2026-05-18 20:30 Bogotá
    const d = new Date('2026-05-19T01:30:00Z')
    assert.equal(bogotaISOFromDate(d), '2026-05-18')
  })

  it('combineBogotaDateAndTimeISO builds -05:00 offset', () => {
    assert.equal(
      combineBogotaDateAndTimeISO('2026-05-18', '14:01'),
      '2026-05-18T14:01:00-05:00',
    )
  })

  it('addDaysBogotaISO shifts calendar days', () => {
    assert.equal(addDaysBogotaISO('2026-05-18', 1), '2026-05-19')
    assert.equal(addDaysBogotaISO('2026-05-18', -1), '2026-05-17')
  })

  it('bogotaDateAtNoon parses anchor', () => {
    const d = bogotaDateAtNoon('2026-05-18')
    assert.equal(bogotaISOFromDate(d), '2026-05-18')
  })

  it('todayBogotaISO returns YYYY-MM-DD', () => {
    assert.match(todayBogotaISO(), /^\d{4}-\d{2}-\d{2}$/)
  })
})
