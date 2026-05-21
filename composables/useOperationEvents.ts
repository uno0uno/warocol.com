/** POS operation audit log helpers (warocol.com#787). */

export type OperationEventRow = {
  id: string
  created_at: string
  domain: string
  channel: string
  action: string
  actor_user_id: string | null
  actor_user_name: string | null
  actor_member_id: string | null
  actor_member_name: string | null
  table_id: string | null
  table_session_id: string | null
  pos_cart_id: string | null
  order_id: string | null
  order_item_id: string | null
  comanda_item_id: string | null
  payload: Record<string, unknown>
  reason: string | null
}

export type OperationEventsListResponse = {
  success: boolean
  data: OperationEventRow[]
  pagination: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export const OPERATION_EVENT_ACTIONS = [
  'tab_item_added',
  'tab_item_removed',
  'tab_item_qty_changed',
  'tab_cleared',
  'cart_line_removed',
  'cart_cleared',
  'payment_voided',
  'comanda_line_cancelled',
] as const

export const ACTION_LABELS: Record<string, string> = {
  tab_item_added: 'Producto agregado al tab',
  tab_item_removed: 'Producto eliminado del tab',
  tab_item_qty_changed: 'Cantidad modificada',
  tab_cleared: 'Tab vaciado',
  cart_line_removed: 'Línea eliminada del carrito',
  cart_cleared: 'Carrito vaciado',
  payment_voided: 'Pago anulado',
  comanda_line_cancelled: 'Línea de comanda cancelada',
}

export const CHANNEL_LABELS: Record<string, string> = {
  mesa: 'Mesa',
  barra: 'Barra',
  mostrador: 'Mostrador',
}

export function formatOperationEventActor(row: OperationEventRow): string {
  if (row.actor_user_name) return row.actor_user_name
  if (row.actor_member_name) return row.actor_member_name
  if (row.actor_user_id) return row.actor_user_id.slice(0, 8)
  return 'Sistema'
}

export function formatOperationEventSummary(
  action: string,
  payload: Record<string, unknown>,
  formatCurrency: (n: number) => string,
): string {
  const product = payload.product_name as string | undefined
  const qty = payload.quantity as number | undefined

  if (product && qty != null) {
    return `${product} × ${qty}`
  }
  if (product) return product

  if (action === 'payment_voided') {
    const method = payload.payment_method as string | undefined
    const amount = payload.amount as number | undefined
    if (method && amount != null) return `${method} · ${formatCurrency(amount)}`
    if (amount != null) return formatCurrency(amount)
  }

  if (action === 'tab_cleared' || action === 'cart_cleared') {
    const count = payload.items_count as number | undefined
    if (count != null) return `${count} línea${count === 1 ? '' : 's'}`
  }

  if (payload.order_number != null) {
    return `Orden #${payload.order_number}`
  }

  return '—'
}

export function formatOperationEventTableName(payload: Record<string, unknown>): string | null {
  const name = payload.table_name as string | undefined
  return name?.trim() || null
}
