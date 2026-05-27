/**
 * POS table short code — mirrors API infer_table_code (warocol.com#927).
 */
export function inferTableCode(name: string): string {
  const cleaned = (name || '').trim()
  if (!cleaned) return '?'
  const match = cleaned.match(/\d+/)
  if (match) return match[0].slice(0, 4)
  return cleaned.slice(0, 3).toUpperCase()
}

export function displayTableCode(table: { code?: string | null; name: string }): string {
  const code = table.code?.trim()
  if (code) return code
  return inferTableCode(table.name)
}

export function useTableDisplayCode() {
  return { displayTableCode, inferTableCode }
}
