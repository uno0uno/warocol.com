/** Display label for table QR request payment (group + optional custom method). */
const DEFAULT_PAYMENT_LABEL_KEYS: Record<string, string> = {
  cash: 'pos.payment.defaults.cash',
  efectivo: 'pos.payment.defaults.cash',
  card: 'pos.payment.defaults.card',
  tarjeta: 'pos.payment.defaults.card',
  datáfono: 'pos.payment.defaults.card',
  datafono: 'pos.payment.defaults.card',
  digital: 'pos.payment.defaults.digital',
  qr: 'pos.payment.defaults.digital',
  credit: 'pos.payment.defaults.credit',
  crédito: 'pos.payment.defaults.credit',
  credito: 'pos.payment.defaults.credit',
  customer_wallet: 'pos.payment.defaults.customer_wallet',
  'saldo wallet': 'pos.payment.defaults.customer_wallet',
}

export function formatTableQrPayment(row: {
  payment_display?: string | null
  payment_method_group_name?: string | null
  payment_method_name?: string | null
  payment_method?: string | null
}, options?: { t?: (key: string) => string }): string {
  const translateDefault = (value?: string | null): string | null => {
    const raw = value?.trim()
    if (!raw) return null
    const key = DEFAULT_PAYMENT_LABEL_KEYS[raw.toLowerCase()]
    return key && options?.t ? options.t(key) : raw
  }

  if (row.payment_display) return translateDefault(row.payment_display) ?? row.payment_display
  const group = row.payment_method_group_name ?? row.payment_method
  if (!group) return '—'
  const groupLabel = translateDefault(group) ?? group
  if (row.payment_method_name) return `${groupLabel} · ${row.payment_method_name}`
  return groupLabel
}
