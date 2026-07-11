const LEGACY_DELIVERY_DESTINATION_RE = /^Domicilio$/i
const LEGACY_DELIVERY_WITH_NUMBER_RE = /^Domicilio\s+#(.+)$/i
const LEGACY_PICKUP_DESTINATION_RE = /^(Pickup|Recogida)$/i
const LEGACY_COUNTER_DESTINATION_RE = /^Mostrador$/i

export function useComandaDisplayLabels() {
  const { t } = useI18n({ useScope: 'global' })
  const { singular: tableSingular } = useTableLabel()

  const sourceLabels = computed<Record<string, string>>(() => ({
    table: tableSingular.value,
    pos: t('despacho.orderTypes.counter'),
    delivery: t('despacho.orderTypes.delivery'),
    pickup: t('despacho.orderTypes.pickup'),
  }))

  const sourceLabel = (sourceType?: string | null): string =>
    sourceType ? (sourceLabels.value[sourceType] ?? sourceType) : '—'

  const destinationLabel = (value: unknown, sourceType?: string | null): string => {
    const raw = String(value ?? '').trim()
    if (!raw) return '—'

    if (sourceType === 'delivery') {
      if (LEGACY_DELIVERY_DESTINATION_RE.test(raw)) return t('despacho.orderTypes.delivery')
      const deliveryMatch = raw.match(LEGACY_DELIVERY_WITH_NUMBER_RE)
      if (deliveryMatch) return `${t('despacho.orderTypes.delivery')} #${deliveryMatch[1]}`
      if (LEGACY_PICKUP_DESTINATION_RE.test(raw)) return t('despacho.orderTypes.pickup')
    }

    if (sourceType === 'pos' && LEGACY_COUNTER_DESTINATION_RE.test(raw)) {
      return t('despacho.orderTypes.counter')
    }

    return raw
  }

  return {
    sourceLabels,
    sourceLabel,
    destinationLabel,
  }
}
