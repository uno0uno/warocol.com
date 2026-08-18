/** Colombia FE statuses that freeze sale mutations until a credit note. */
const LOCKED_INVOICE_STATUSES = new Set(['pending', 'accepted'])

export function saleMutationsLockedByInvoice (status: string | null | undefined): boolean {
  return LOCKED_INVOICE_STATUSES.has(String(status || '').trim().toLowerCase())
}
