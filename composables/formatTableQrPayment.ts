/** Display label for table QR request payment (group + optional custom method). */
export function formatTableQrPayment(row: {
  payment_display?: string | null
  payment_method_group_name?: string | null
  payment_method_name?: string | null
  payment_method?: string | null
}): string {
  if (row.payment_display) return row.payment_display
  const group = row.payment_method_group_name ?? row.payment_method
  if (!group) return '—'
  if (row.payment_method_name) return `${group} · ${row.payment_method_name}`
  return group
}
