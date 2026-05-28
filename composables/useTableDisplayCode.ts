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

/** Floor-plan square typography — scales down for 3–4 char codes (#950). */
export function tableCodeTypographyClass(code: string): string {
  const len = code.length
  const base = 'font-black leading-none tabular-nums text-center max-w-full truncate'
  if (len <= 2) return `${base} text-3xl tracking-tight`
  if (len === 3) return `${base} text-2xl tracking-tight`
  return `${base} text-xl tracking-tight`
}

export function useTableDisplayCode() {
  return { displayTableCode, inferTableCode, tableCodeTypographyClass }
}
