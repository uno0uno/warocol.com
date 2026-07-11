const DEFAULT_TABLE_NAME_RE = /^Mesa(?:\s+(.+))?$/i
const DEFAULT_BAR_NAME_RE = /^Barra$/i

export function useTableDisplayLabel() {
  const { t } = useI18n({ useScope: 'global' })
  const { singular: tableSingular } = useTableLabel()

  const tableDisplayLabel = (value: unknown): string => {
    const raw = String(value ?? '').trim()
    if (!raw) return '—'

    const tableMatch = raw.match(DEFAULT_TABLE_NAME_RE)
    if (tableMatch) {
      const suffix = tableMatch[1]?.trim()
      return suffix ? `${tableSingular.value} ${suffix}` : tableSingular.value
    }

    if (DEFAULT_BAR_NAME_RE.test(raw)) return t('despacho.common.bar')

    return raw
  }

  return {
    tableDisplayLabel,
  }
}
