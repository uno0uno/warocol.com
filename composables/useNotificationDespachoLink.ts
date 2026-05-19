import type { Notification } from '~/composables/useNotifications'

export function notificationDespachoPath(notification: Notification): string {
  if (notification.type === 'table_qr_request') {
    const tableId = notification.payload?.table_id
    return tableId ? `/despacho/en-mesa?table=${tableId}` : '/despacho/en-mesa'
  }
  if (notification.payload?.order_id) {
    return `/despacho/domicilios/${notification.payload.order_id}`
  }
  return '/despacho/domicilios'
}

export function notificationDespachoTitle(notification: Notification): string {
  if (notification.type === 'table_qr_request') {
    const tableName = notification.payload?.table_name
    return tableName ? `Pedido QR — ${tableName}` : 'Pedido QR en mesa'
  }
  return `Nuevo pedido #${notification.payload?.order_number ?? '—'}`
}
