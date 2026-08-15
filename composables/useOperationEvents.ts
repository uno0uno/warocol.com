/** Operation audit log helpers for Bitácora (warocol.com#787 / #2323). */

export const OPERATION_EVENT_DOMAINS = [
  'pos',
  'ventas',
  'despacho',
  'crm',
  'finanzas',
  'facturacion',
  'menu',
  'abastecimiento',
  'equipo',
  'integraciones',
  'mi_negocio',
] as const

export const operationDomainNavKeys: Record<string, string> = {
  pos: 'pos',
  ventas: 'ventas',
  despacho: 'despacho',
  crm: 'crm',
  finanzas: 'finanzas',
  facturacion: 'facturacion',
  menu: 'menu',
  abastecimiento: 'abastecimiento',
  equipo: 'equipo',
  integraciones: 'integraciones',
  mi_negocio: 'miNegocio',
}

export type OperationEventRow = {
  id: string
  created_at: string
  domain: string
  channel: string | null
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
  'tab_item_edited',
  'tab_item_edit_blocked',
  'tab_cleared',
  'cart_line_removed',
  'cart_cleared',
  'payment_voided',
  'comanda_line_cancelled',
  'promotion_deleted',
] as const

export const ACTION_LABELS: Record<string, string> = {
  tab_item_added: 'Producto agregado al tab',
  tab_item_removed: 'Producto eliminado del tab',
  tab_item_qty_changed: 'Cantidad modificada',
  tab_item_edited: 'Ítem editado en el tab',
  tab_item_edit_blocked: 'Edición bloqueada (cocina)',
  tab_cleared: 'Tab vaciado',
  cart_line_removed: 'Línea eliminada del carrito',
  cart_cleared: 'Carrito vaciado',
  payment_voided: 'Pago anulado',
  comanda_line_cancelled: 'Línea de comanda cancelada',
  promotion_deleted: 'Promoción eliminada',
}

export const CHANNEL_LABELS: Record<string, string> = {
  mesa: 'Mesa',
  barra: 'Barra',
  mostrador: 'Mostrador',
}

export const operationActionI18nKeys: Record<string, string> = {
  tab_item_added: 'actionTabAdded',
  tab_item_removed: 'actionTabRemoved',
  tab_item_qty_changed: 'actionQtyChanged',
  tab_item_edited: 'actionTabEdited',
  tab_item_edit_blocked: 'actionEditBlocked',
  tab_cleared: 'actionTabCleared',
  cart_line_removed: 'actionCartLineRemoved',
  cart_cleared: 'actionCartCleared',
  payment_voided: 'actionPaymentVoided',
  comanda_line_cancelled: 'actionComandaCancelled',
  promotion_deleted: 'actionPromotionDeleted',
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
  locale = 'es',
  translate?: (key: string, params?: Record<string, unknown>) => string,
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
    if (count != null) return translate
      ? `${count} ${translate(count === 1 ? 'operaciones.bitacora.lineOne' : 'operaciones.bitacora.lineMany')}`
      : `${count} ${count === 1 ? 'línea' : 'líneas'}`
  }

  if (action === 'promotion_deleted') {
    const promotionName = payload.promotion_name as string | undefined
    const promoType = payload.promo_type as string | undefined
    if (promotionName && promoType) return `${promotionName} · ${promoType}`
    if (promotionName) return promotionName
  }

  if (payload.order_number != null) {
    return translate
      ? `${translate('operaciones.bitacora.order')} #${payload.order_number}`
      : `Orden #${payload.order_number}`
  }

  return '—'
}

export function formatOperationEventTableName(payload: Record<string, unknown>): string | null {
  const name = payload.table_name as string | undefined
  return name?.trim() || null
}
