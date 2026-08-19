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
  'order_status_changed',
  'order_customer_changed',
  'order_email_sent',
  'order_item_deleted',
  'order_item_modifier_deleted',
  'comanda_status_changed',
  'comanda_recalled',
  'customer_created',
  'customer_updated',
  'expense_created',
  'expense_updated',
  'expense_deleted',
  'expense_paid',
  'expense_instance_created',
  'expense_instance_updated',
  'shift_opened',
  'cierre_created',
  'cierre_deleted',
  'shift_deleted',
  'period_closed',
  'credit_payment_registered',
  'journal_entry_created',
  'journal_entry_posted',
  'journal_entry_voided',
  'invoice_emitted',
  'product_created',
  'product_updated',
  'product_deleted',
  'modifier_group_created',
  'modifier_group_updated',
  'modifier_group_deleted',
  'recipe_created',
  'recipe_updated',
  'recipe_deleted',
  'menu_reordered',
  'purchase_created',
  'purchase_updated',
  'purchase_confirmed',
  'purchase_shipped',
  'purchase_received',
  'purchase_invoiced',
  'purchase_paid',
  'purchase_cancelled',
  'direct_purchase_created',
  'direct_purchase_updated',
  'direct_purchase_deleted',
  'stock_adjusted',
  'warehouse_category_created',
  'warehouse_category_updated',
  'warehouse_category_archived',
  'member_deleted',
  'member_role_updated',
  'invitation_sent',
  'invitation_cancelled',
  'role_override_updated',
  'role_override_deleted',
  'api_token_created',
  'api_token_updated',
  'api_token_revoked',
  'api_token_deleted',
  'public_profile_updated',
  'tax_config_updated',
  'financial_profile_updated',
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
  order_status_changed: 'Estado de la orden cambiado',
  order_customer_changed: 'Cliente de la venta cambiado',
  order_email_sent: 'Correo de la venta enviado',
  order_item_deleted: 'Producto eliminado de la venta',
  order_item_modifier_deleted: 'Modificador eliminado de la venta',
  comanda_status_changed: 'Estado de comanda cambiado',
  comanda_recalled: 'Comanda recuperada',
  customer_created: 'Cliente creado',
  customer_updated: 'Cliente actualizado',
  expense_created: 'Gasto creado',
  expense_updated: 'Gasto actualizado',
  expense_deleted: 'Gasto eliminado',
  expense_paid: 'Gasto pagado',
  expense_instance_created: 'Cuota de gasto creada',
  expense_instance_updated: 'Cuota de gasto actualizada',
  shift_opened: 'Turno abierto',
  cierre_created: 'Cierre registrado',
  cierre_deleted: 'Cierre eliminado',
  shift_deleted: 'Apertura de turno cancelada',
  period_closed: 'Período mensual cerrado',
  credit_payment_registered: 'Pago a crédito registrado',
  journal_entry_created: 'Asiento creado',
  journal_entry_posted: 'Asiento publicado',
  journal_entry_voided: 'Asiento anulado',
  invoice_emitted: 'Factura electrónica emitida',
  product_created: 'Producto creado',
  product_updated: 'Producto actualizado',
  product_deleted: 'Producto eliminado',
  modifier_group_created: 'Grupo de modificadores creado',
  modifier_group_updated: 'Grupo de modificadores actualizado',
  modifier_group_deleted: 'Grupo de modificadores eliminado',
  recipe_created: 'Receta base creada',
  recipe_updated: 'Receta base actualizada',
  recipe_deleted: 'Receta base eliminada',
  menu_reordered: 'Menú en línea reordenado',
  purchase_created: 'Compra creada',
  purchase_updated: 'Compra actualizada',
  purchase_confirmed: 'Compra confirmada',
  purchase_shipped: 'Compra enviada',
  purchase_received: 'Compra recibida',
  purchase_invoiced: 'Compra facturada',
  purchase_paid: 'Compra pagada',
  purchase_cancelled: 'Compra cancelada',
  direct_purchase_created: 'Compra directa creada',
  direct_purchase_updated: 'Compra directa actualizada',
  direct_purchase_deleted: 'Compra directa eliminada',
  stock_adjusted: 'Ajuste de inventario',
  warehouse_category_created: 'Categoría de bodega creada',
  warehouse_category_updated: 'Categoría de bodega actualizada',
  warehouse_category_archived: 'Categoría de bodega archivada',
  member_deleted: 'Miembro eliminado',
  member_role_updated: 'Rol de miembro actualizado',
  invitation_sent: 'Invitación enviada',
  invitation_cancelled: 'Invitación cancelada',
  role_override_updated: 'Cuenta contable de rol actualizada',
  role_override_deleted: 'Cuenta contable de rol eliminada',
  api_token_created: 'Token de API creado',
  api_token_updated: 'Token de API actualizado',
  api_token_revoked: 'Token de API revocado',
  api_token_deleted: 'Token de API eliminado',
  public_profile_updated: 'Perfil público actualizado',
  tax_config_updated: 'Impuestos de venta actualizados',
  financial_profile_updated: 'Perfil financiero actualizado',
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
  order_status_changed: 'actionOrderStatusChanged',
  order_customer_changed: 'actionOrderCustomerChanged',
  order_email_sent: 'actionOrderEmailSent',
  order_item_deleted: 'actionOrderItemDeleted',
  order_item_modifier_deleted: 'actionOrderItemModifierDeleted',
  comanda_status_changed: 'actionComandaStatusChanged',
  comanda_recalled: 'actionComandaRecalled',
  customer_created: 'actionCustomerCreated',
  customer_updated: 'actionCustomerUpdated',
  expense_created: 'actionExpenseCreated',
  expense_updated: 'actionExpenseUpdated',
  expense_deleted: 'actionExpenseDeleted',
  expense_paid: 'actionExpensePaid',
  expense_instance_created: 'actionExpenseInstanceCreated',
  expense_instance_updated: 'actionExpenseInstanceUpdated',
  shift_opened: 'actionShiftOpened',
  cierre_created: 'actionCierreCreated',
  cierre_deleted: 'actionCierreDeleted',
  shift_deleted: 'actionShiftDeleted',
  period_closed: 'actionPeriodClosed',
  credit_payment_registered: 'actionCreditPaymentRegistered',
  journal_entry_created: 'actionJournalCreated',
  journal_entry_posted: 'actionJournalPosted',
  journal_entry_voided: 'actionJournalVoided',
  invoice_emitted: 'actionInvoiceEmitted',
  product_created: 'actionProductCreated',
  product_updated: 'actionProductUpdated',
  product_deleted: 'actionProductDeleted',
  modifier_group_created: 'actionModifierGroupCreated',
  modifier_group_updated: 'actionModifierGroupUpdated',
  modifier_group_deleted: 'actionModifierGroupDeleted',
  recipe_created: 'actionRecipeCreated',
  recipe_updated: 'actionRecipeUpdated',
  recipe_deleted: 'actionRecipeDeleted',
  menu_reordered: 'actionMenuReordered',
  purchase_created: 'actionPurchaseCreated',
  purchase_updated: 'actionPurchaseUpdated',
  purchase_confirmed: 'actionPurchaseConfirmed',
  purchase_shipped: 'actionPurchaseShipped',
  purchase_received: 'actionPurchaseReceived',
  purchase_invoiced: 'actionPurchaseInvoiced',
  purchase_paid: 'actionPurchasePaid',
  purchase_cancelled: 'actionPurchaseCancelled',
  direct_purchase_created: 'actionDirectPurchaseCreated',
  direct_purchase_updated: 'actionDirectPurchaseUpdated',
  direct_purchase_deleted: 'actionDirectPurchaseDeleted',
  stock_adjusted: 'actionStockAdjusted',
  warehouse_category_created: 'actionWarehouseCategoryCreated',
  warehouse_category_updated: 'actionWarehouseCategoryUpdated',
  warehouse_category_archived: 'actionWarehouseCategoryArchived',
  member_deleted: 'actionMemberDeleted',
  member_role_updated: 'actionMemberRoleUpdated',
  invitation_sent: 'actionInvitationSent',
  invitation_cancelled: 'actionInvitationCancelled',
  role_override_updated: 'actionRoleOverrideUpdated',
  role_override_deleted: 'actionRoleOverrideDeleted',
  api_token_created: 'actionApiTokenCreated',
  api_token_updated: 'actionApiTokenUpdated',
  api_token_revoked: 'actionApiTokenRevoked',
  api_token_deleted: 'actionApiTokenDeleted',
  public_profile_updated: 'actionPublicProfileUpdated',
  tax_config_updated: 'actionTaxConfigUpdated',
  financial_profile_updated: 'actionFinancialProfileUpdated',
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

  const label = payload.label as string | undefined
  if (label?.trim()) return label.trim()

  return '—'
}

export function formatOperationEventTableName(payload: Record<string, unknown>): string | null {
  const name = payload.table_name as string | undefined
  return name?.trim() || null
}

function payloadOrderNumber(payload: Record<string, unknown> | undefined): string | null {
  const raw = payload?.order_number
  if (raw == null || raw === '') return null
  const value = String(raw).trim()
  return value || null
}

export function operationEventOrderHref(row: Pick<OperationEventRow, 'order_id' | 'payload'>): string | null {
  if (!row.order_id) return null
  const number = payloadOrderNumber(row.payload)
  return number
    ? `/ventas/${row.order_id}?n=${encodeURIComponent(number)}`
    : `/ventas/${row.order_id}`
}

export function operationEventOrderLabel(
  row: Pick<OperationEventRow, 'order_id' | 'payload'>,
  fallback: string,
): string | null {
  if (!row.order_id) return null
  const number = payloadOrderNumber(row.payload)
  return number ? `#${number}` : fallback
}

export function operationEventOrderLink(
  row: Pick<OperationEventRow, 'order_id' | 'payload'>,
  fallback: string,
): { to: string; label: string } | null {
  const to = operationEventOrderHref(row)
  const label = operationEventOrderLabel(row, fallback)
  if (!to || !label) return null
  return { to, label }
}
