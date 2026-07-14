import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatMetricCardValue } from './metricCardValue.ts'

const formatCurrency = (value: number | null | undefined, options?: { notation?: 'compact' }) =>
  `EUR:${value}:${options?.notation}`
const formatNumber = (value: number | null | undefined) => `N:${value}`

describe('MetricCard value formatting', () => {
  it('delegates currency values and empty states to the tenant formatter', () => {
    assert.equal(formatMetricCardValue({
      value: 1_250_000, format: 'currency', precision: 2, suffix: '', formatCurrency, formatNumber,
    }), 'EUR:1250000:compact')
    assert.equal(formatMetricCardValue({
      value: '', format: 'currency', precision: 2, suffix: '', formatCurrency, formatNumber,
    }), 'EUR:0:compact')
  })

  it('delegates number punctuation while preserving suffixes', () => {
    assert.equal(formatMetricCardValue({
      value: '42', format: 'number', precision: 2, suffix: ' uds.', formatCurrency, formatNumber,
    }), 'N:42 uds.')
  })
})
