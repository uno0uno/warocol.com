import type { Notification } from '~/composables/useNotifications'

export const TERMS_ACCEPTANCE_REQUIRED_TYPE = 'terms_acceptance_required'

function formatComandaLabel(notification: Notification): string {
  const num = notification.payload?.comanda_number ?? '—'
  const idx = notification.payload?.comanda_index
  const suffix = typeof idx === 'number' ? `-${String(idx).padStart(2, '0')}` : ''
  return `#${num}${suffix}`
}

export function notificationDespachoPath(notification: Notification): string {
  if (notificationIsTermsAcceptanceRequired(notification)) {
    const returnToPayload = notification.payload?.return_to
    const returnTo = typeof returnToPayload === 'string' && returnToPayload
      ? returnToPayload
      : '/gestion/billing'
    return `/terminos-y-condiciones?return=${encodeURIComponent(returnTo)}`
  }
  if (notification.type === 'comanda_ready') {
    const tableId = notification.payload?.table_id
    if (typeof tableId === 'string' && tableId) {
      return `/pos?open_table=${tableId}&expediter=1`
    }
    return '/pos?expediter=1'
  }
  if (notification.type === 'table_qr_request') {
    const requestId = notification.payload?.request_id
    if (requestId) return `/despacho/en-mesa/${requestId}`
    const tableId = notification.payload?.table_id
    return tableId ? `/despacho/en-mesa?table=${tableId}` : '/despacho/en-mesa'
  }
  if (notification.payload?.order_id) {
    return `/despacho/domicilios/${notification.payload.order_id}`
  }
  return '/despacho/domicilios'
}

export function notificationDespachoTitle(notification: Notification): string {
  if (notificationIsTermsAcceptanceRequired(notification)) {
    const versionPayload = notification.payload?.version
    return typeof versionPayload === 'string' && versionPayload
      ? `Acepta los TyC vigentes (${versionPayload})`
      : 'Acepta los TyC vigentes'
  }
  if (notification.type === 'comanda_ready') {
    const label = formatComandaLabel(notification)
    const dest = notification.payload?.table_display_name
    return dest ? `Comanda ${label} lista — ${dest}` : `Comanda ${label} lista`
  }
  if (notification.type === 'table_qr_request') {
    const tableName = notification.payload?.table_name
    return tableName ? `Pedido QR — ${tableName}` : 'Pedido QR en mesa'
  }
  return `Nuevo pedido #${notification.payload?.order_number ?? '—'}`
}

export function notificationIsComandaReady(notification: Notification): boolean {
  return notification.type === 'comanda_ready'
}

export function notificationIsTermsAcceptanceRequired(notification: Notification): boolean {
  return notification.type === TERMS_ACCEPTANCE_REQUIRED_TYPE
}
