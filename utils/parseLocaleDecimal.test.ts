import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parseLocaleDecimal, roundToPrecision } from './parseLocaleDecimal.ts'

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

describe('roundToPrecision', () => {
  it('rounds to 2 decimals', () => {
    assert.equal(roundToPrecision(1.2345, 2), 1.23)
  })

  it('rounds to 3 decimals', () => {
    assert.equal(roundToPrecision(1.23456, 3), 1.235)
  })

  it('rounds to 1 decimal', () => {
    assert.equal(roundToPrecision(1.25, 1), 1.3)
  })
})
