import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  addDaysBogotaISO,
  addDaysISO,
  bogotaDateAtNoon,
  bogotaISOFromDate,
  combineBogotaDateAndTimeISO,
  combineDateAndTimeISO,
  dateAtNoon,
  DEFAULT_TENANT_TIMEZONE,
  defaultTimezoneForCountry,
  isoFromDate,
  normalizeTimezone,
  resolveTimezonePrefill,
  todayBogotaISO,
  todayISO,
} from './bogotaDate.ts'

describe('tenant date helpers', () => {
  it('normalizes missing and invalid timezones to Colombia', () => {
    assert.equal(normalizeTimezone(null), DEFAULT_TENANT_TIMEZONE)
    assert.equal(normalizeTimezone(''), DEFAULT_TENANT_TIMEZONE)
    assert.equal(normalizeTimezone('Nope/Nowhere'), DEFAULT_TENANT_TIMEZONE)
    assert.equal(normalizeTimezone('America/Mexico_City'), 'America/Mexico_City')
  })

  it('maps catalog countries to primary IANA defaults', () => {
    assert.equal(defaultTimezoneForCountry('CO'), 'America/Bogota')
    assert.equal(defaultTimezoneForCountry('pa'), 'America/Panama')
    assert.equal(defaultTimezoneForCountry('US'), 'America/New_York')
    assert.equal(defaultTimezoneForCountry('CA'), 'America/Toronto')
    assert.equal(defaultTimezoneForCountry('xx'), DEFAULT_TENANT_TIMEZONE)
  })

  it('prefills timezone from country only when still on the global default', () => {
    assert.equal(resolveTimezonePrefill({
      storedTimezone: null,
      countryCode: 'PA',
    }), 'America/Panama')
    assert.equal(resolveTimezonePrefill({
      storedTimezone: DEFAULT_TENANT_TIMEZONE,
      countryCode: 'US',
    }), 'America/New_York')
    assert.equal(resolveTimezonePrefill({
      storedTimezone: 'America/Mexico_City',
      countryCode: 'US',
    }), 'America/Mexico_City')
  })

  it('uses the requested timezone calendar day instead of UTC', () => {
    const d = new Date('2026-05-19T01:30:00Z')
    assert.equal(isoFromDate(d, 'America/Bogota'), '2026-05-18')
    assert.equal(isoFromDate(d, 'Europe/Madrid'), '2026-05-19')
  })

  it('builds tenant-local wall clock instants as UTC ISO timestamps', () => {
    assert.equal(
      combineDateAndTimeISO('2026-05-18', '14:01', 'America/Bogota'),
      '2026-05-18T19:01:00.000Z',
    )
    assert.equal(
      combineDateAndTimeISO('2026-01-15', '09:00', 'America/New_York'),
      '2026-01-15T14:00:00.000Z',
    )
  })

  it('adds calendar days in the requested timezone', () => {
    assert.equal(addDaysISO('2026-05-18', 1, 'America/Bogota'), '2026-05-19')
    assert.equal(addDaysISO('2026-05-18', -1, 'America/Bogota'), '2026-05-17')
  })

  it('anchors datepicker dates at tenant-local noon', () => {
    const d = dateAtNoon('2026-05-18', 'America/Bogota')
    assert.equal(isoFromDate(d, 'America/Bogota'), '2026-05-18')
  })

  it('todayISO returns YYYY-MM-DD for any valid timezone', () => {
    assert.match(todayISO('America/Mexico_City'), /^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('legacy Bogotá wrappers', () => {
  it('keeps existing Bogotá calendar behavior', () => {
    const d = new Date('2026-05-19T01:30:00Z')
    assert.equal(bogotaISOFromDate(d), '2026-05-18')
    assert.equal(addDaysBogotaISO('2026-05-18', 1), '2026-05-19')
    assert.equal(bogotaDateAtNoon('2026-05-18').toISOString(), '2026-05-18T17:00:00.000Z')
    assert.match(todayBogotaISO(), /^\d{4}-\d{2}-\d{2}$/)
  })

  it('preserves the old offset string helper', () => {
    assert.equal(
      combineBogotaDateAndTimeISO('2026-05-18', '14:01'),
      '2026-05-18T14:01:00-05:00',
    )
  })
})
