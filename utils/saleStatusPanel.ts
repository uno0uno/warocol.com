/** Sale-detail status panel (cancel / complete) for mesa, barra, and mostrador. */
const WALLET_PAYMENT_SLUG = 'customer_wallet'

export function canShowSaleStatusPanel (opts: {
  source?: string | null
  status?: string | null
  invoiceLocked: boolean
}): boolean {
  if (opts.invoiceLocked || opts.status === 'cancelled') return false
  const source = opts.source || 'pos'
  return source === 'mesa' || source === 'barra' || source === 'pos'
}

/** Hide the card for the sale's current status. Pending → Completada + Cancelada. */
export function isSaleStatusActionVisible (
  action: 'pending' | 'completed' | 'cancelled',
  currentStatus?: string | null,
): boolean {
  const status = currentStatus || 'pending'
  if (status === 'cancelled') return false
  if (action === status) return false
  if (status === 'completed') return action === 'cancelled'
  return action === 'completed' || action === 'cancelled'
}

export function isIdentifiedSaleCustomer (customer?: {
  id?: string | null
  phone?: string | null
  phone_number?: string | null
} | null): boolean {
  if (!customer?.id) return false
  const phone = String(customer.phone || customer.phone_number || '')
  return phone !== '0000000000'
}

export function isFinalizePaymentGroupVisible (
  group: { slug: string, triggersCartera?: boolean, triggersWallet?: boolean },
  opts: { identifiedCustomer: boolean, walletBalanceCop: number },
): boolean {
  if (group.triggersCartera) return opts.identifiedCustomer
  if (group.slug === WALLET_PAYMENT_SLUG || group.triggersWallet) {
    return opts.identifiedCustomer && opts.walletBalanceCop > 0
  }
  return true
}
