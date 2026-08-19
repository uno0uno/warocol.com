/** Sale-detail status panel (cancel / complete) for mesa, barra, and mostrador. */
export function canShowSaleStatusPanel (opts: {
  source?: string | null
  status?: string | null
  invoiceLocked: boolean
}): boolean {
  if (opts.invoiceLocked || opts.status === 'cancelled') return false
  const source = opts.source || 'pos'
  return source === 'mesa' || source === 'barra' || source === 'pos'
}
