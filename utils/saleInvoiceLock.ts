/** Colombia FE statuses that freeze sale mutations until a credit note. */
const LOCKED_INVOICE_STATUSES = new Set(['pending', 'accepted'])

export function saleMutationsLockedByInvoice (status: string | null | undefined): boolean {
  return LOCKED_INVOICE_STATUSES.has(String(status || '').trim().toLowerCase())
}

export type SaleInvoicePaymentMismatchInput = {
  invoiceStatus?: string | null
  recordedPaidTotal?: number | null
  amountDue?: number | null
  orderStatus?: string | null
  paymentStatus?: string | null
  paymentMethod?: string | null
}

/** Single-pay closes store method on orders without split_payments rows (Ventas finalize). */
export function saleLegacySinglePaymentSettled ({
  orderStatus,
  paymentStatus,
  paymentMethod,
}: Pick<SaleInvoicePaymentMismatchInput, 'orderStatus' | 'paymentStatus' | 'paymentMethod'>): boolean {
  return orderStatus === 'completed'
    && paymentStatus === 'paid'
    && Boolean(String(paymentMethod || '').trim())
}

/** FE pending/accepted but no recorded POS tenders while the sale still has a balance. */
export function saleHasLockedInvoiceWithoutRecordedPayments ({
  invoiceStatus,
  recordedPaidTotal = 0,
  amountDue = 0,
  orderStatus,
  paymentStatus,
  paymentMethod,
}: SaleInvoicePaymentMismatchInput): boolean {
  if (!saleMutationsLockedByInvoice(invoiceStatus)) return false
  const due = Number(amountDue) || 0
  if (due <= 0.01) return false
  if (saleLegacySinglePaymentSettled({ orderStatus, paymentStatus, paymentMethod })) return false
  const paid = Number(recordedPaidTotal) || 0
  return paid < due - 0.01
}
