import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatDomainQuantity, normalizeDomainNumber } from './domainNumberFormat.ts'

describe('formatDomainQuantity', () => {
  it('keeps meaningful sub-unit precision without long tails', () => {
    assert.equal(formatDomainQuantity(1.345), '1,345')
    assert.equal(formatDomainQuantity(0.3333333333333), '0,3333')
    assert.equal(formatDomainQuantity(0.3333333333333, 6), '0,333333')
  })

  it('formats tiny float residue as a clean zero', () => {
    assert.equal(formatDomainQuantity(0.1 + 0.2 - 0.3), '0')
  })
})

describe('normalizeDomainNumber', () => {
  it('rounds calculation inputs to the requested precision', () => {
    assert.equal(normalizeDomainNumber(0.1 + 0.2, 6), 0.3)
  })
})
