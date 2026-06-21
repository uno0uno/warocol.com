import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatDomainQuantity, normalizeDomainNumber } from './domainNumberFormat.ts'

describe('formatDomainQuantity', () => {
  it('keeps meaningful sub-unit precision without long tails', () => {
    assert.equal(formatDomainQuantity(1.345), '1,345')
    assert.equal(formatDomainQuantity(0.3333333333333), '0,3333')
    assert.equal(formatDomainQuantity(0.3333333333333, 6), '0,333333')
  })

  it('supports a six-decimal quantity policy while trimming insignificant zeros', () => {
    assert.equal(formatDomainQuantity('1.345678', 6), '1,345678')
    assert.equal(formatDomainQuantity('1.340000', 6), '1,34')
    assert.equal(formatDomainQuantity('1000', 6), '1.000')
  })

  it('formats tiny float residue as a clean zero', () => {
    assert.equal(formatDomainQuantity(0.1 + 0.2 - 0.3), '0')
  })
})

describe('normalizeDomainNumber', () => {
  it('rounds calculation inputs to the requested precision', () => {
    assert.equal(normalizeDomainNumber(0.1 + 0.2, 6), 0.3)
  })

  it('normalizes physical quantities to 6 decimals without carrying float tails', () => {
    assert.equal(normalizeDomainNumber('0.3333334', 6), 0.333333)
    assert.equal(normalizeDomainNumber(1.3456789, 6), 1.345679)
  })
})
