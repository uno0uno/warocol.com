const DEFAULT_TABLE_NAME_RE = /^Mesa(?:\s+(.+))?$/i
const DEFAULT_BAR_NAME_RE = /^Barra$/i

export function useTableDisplayLabel() {
  const { t } = useI18n({ useScope: 'global' })

  const tableDisplayLabel = (value: unknown): string => {
    const raw = String(value ?? '').trim()
    if (!raw) return '—'

    const tableMatch = raw.match(DEFAULT_TABLE_NAME_RE)
    if (tableMatch) {
      const suffix = tableMatch[1]?.trim()
      const tableLabel = t('despacho.common.table')
      return suffix ? `${tableLabel} ${suffix}` : tableLabel
    }

    if (DEFAULT_BAR_NAME_RE.test(raw)) return t('despacho.common.bar')

    return raw
  }

  return {
    tableDisplayLabel,
  }
}
