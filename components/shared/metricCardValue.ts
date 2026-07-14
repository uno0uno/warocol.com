export type MetricValueFormat = 'currency' | 'percentage' | 'number' | 'decimal' | 'text'

type MetricValueOptions = {
  value: string | number | null | undefined
  format: MetricValueFormat
  precision: number
  suffix: string
  formatCurrency: (value: number | null | undefined, options?: { notation?: 'compact' }) => string
  formatNumber: (value: number | null | undefined) => string
}

export const formatMetricCardValue = ({
  value,
  format,
  precision,
  suffix,
  formatCurrency,
  formatNumber,
}: MetricValueOptions): string | number => {
  if (format === 'text') return value ?? ''

  const parsed = typeof value === 'string' ? Number.parseFloat(value) : value
  const numericValue = typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0

  if (format === 'currency') return formatCurrency(numericValue, { notation: 'compact' })
  if (format === 'percentage') return `${numericValue.toFixed(precision)}%`
  if (format === 'decimal') return numericValue.toFixed(precision)
  return `${formatNumber(numericValue)}${suffix}`
}
