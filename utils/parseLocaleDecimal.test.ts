import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseLocaleDecimal, parseReceiptDecimal, roundToPrecision } from './parseLocaleDecimal.ts'

describe('parseLocaleDecimal', () => {
  it('parses comma decimal', () => {
    assert.equal(parseLocaleDecimal('1,50'), 1.5)
  })

  it('parses dot decimal', () => {
    assert.equal(parseLocaleDecimal('12.345'), 12.345)
  })

  it('parses es-CO thousands and comma decimal', () => {
    assert.equal(parseLocaleDecimal('1.234,56'), 1234.56)
  })

  it('parses en-US thousands and dot decimal', () => {
    assert.equal(parseLocaleDecimal('1,234.56'), 1234.56)
  })

  it('preserves six-decimal physical quantities from comma and dot input', () => {
    assert.equal(parseLocaleDecimal('0,333333'), 0.333333)
    assert.equal(parseLocaleDecimal('1.345678'), 1.345678)
  })

  it('strips whitespace and currency symbol', () => {
    assert.equal(parseLocaleDecimal('  $ 2,5 '), 2.5)
  })

  it('passes through finite numbers', () => {
    assert.equal(parseLocaleDecimal(3.14), 3.14)
  })

  it('returns null for invalid input', () => {
    assert.equal(parseLocaleDecimal(''), null)
    assert.equal(parseLocaleDecimal('abc'), null)
    assert.equal(parseLocaleDecimal(null), null)
    assert.equal(parseLocaleDecimal(Number.NaN), null)
  })
})

describe('parseReceiptDecimal', () => {
  it('parses FRUVAR-style COP amounts with comma or dot thousands', () => {
    assert.equal(parseReceiptDecimal('2,000', 'amount'), 2000)
    assert.equal(parseReceiptDecimal('2.000', 'amount'), 2000)
    assert.equal(parseReceiptDecimal('8,900', 'amount'), 8900)
    assert.equal(parseReceiptDecimal('8.900', 'amount'), 8900)
    assert.equal(parseReceiptDecimal('12.900', 'amount'), 12900)
  })

  it('parses decimal produce quantities from POS receipts', () => {
    assert.equal(parseReceiptDecimal('1.345', 'quantity'), 1.345)
    assert.equal(parseReceiptDecimal('1,345', 'quantity'), 1.345)
    assert.equal(parseReceiptDecimal('0,333333', 'quantity'), 0.333333)
    assert.equal(parseReceiptDecimal(1, 'quantity'), 1)
  })

  it('does not collapse thousands into decimals for amount fields', () => {
    assert.equal(parseLocaleDecimal('2,000'), 2)
    assert.equal(parseReceiptDecimal('2,000', 'amount'), 2000)
  })
})

describe('roundToPrecision', () => {
  it('rounds to 2 decimals', () => {
    assert.equal(roundToPrecision(1.2345, 2), 1.23)
  })

  it('rounds to 3 decimals', () => {
    assert.equal(roundToPrecision(1.23456, 3), 1.235)
  })

  it('rounds quantity-style values to 6 decimals', () => {
    assert.equal(roundToPrecision(0.3333334, 6), 0.333333)
    assert.equal(roundToPrecision(0.3333336, 6), 0.333334)
  })

  it('rounds to 1 decimal', () => {
    assert.equal(roundToPrecision(1.25, 1), 1.3)
  })
})
