/** Hide Matias SQL/schema dumps; keep DIAN business errors and retry. */

const LEAK_MARKERS = [
  'sqlstate',
  'unknown column',
  'file_managers',
  'select * from',
  'connection: mysql',
  'sql:',
]

export function isFacturadorInfrastructureError (raw: string | null | undefined): boolean {
  const lower = String(raw || '').toLowerCase()
  if (!lower) return false
  if (LEAK_MARKERS.some(marker => lower.includes(marker))) return true
  return lower.includes('matias api 5')
}

export function publicInvoiceErrorMessage (
  raw: string | null | undefined,
  fallback: string,
): string {
  const text = String(raw || '').trim()
  if (!text) return fallback
  if (isFacturadorInfrastructureError(text)) return fallback
  return text
}
