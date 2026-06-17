import type { Notification } from '~/composables/useNotifications'
import { notificationIsTermsAcceptanceRequired } from '~/composables/useNotificationDespachoLink'

/**
 * Navigate to a table QR request from a notification, or dismiss stale alerts
 * when the request was already accepted/rejected on another device.
 */
export function useTableQrNotificationNavigation() {
  const router = useRouter()
  const toast = useToast()
  const { markAsRead } = useNotifications()

  async function navigateFromNotification(
    notification: Notification,
    event?: Event,
  ): Promise<boolean> {
    if (notification.type !== 'table_qr_request') return false

    const requestId = notification.payload?.request_id
    if (typeof requestId !== 'string' || !requestId) return false

    event?.preventDefault()

    try {
      await $fetch(`/api/table-qr-requests/${requestId}`)
      await markAsRead(notification.id)
      await router.push(`/despacho/en-mesa/${requestId}`)
    } catch {
      toast.info('Este pedido ya fue aceptado o rechazado', { title: 'Pedido procesado' })
      try {
        await markAsRead(notification.id)
      } catch {
        // Notification may already be cleared server-side after accept/reject.
      }
    }
    return true
  }

  async function handleDespachoNotificationClick(
    notification: Notification,
    event?: Event,
    onAfter?: () => void,
  ): Promise<void> {
    if (await navigateFromNotification(notification, event)) {
      onAfter?.()
      return
    }
    if (!notificationIsTermsAcceptanceRequired(notification)) {
      await markAsRead(notification.id)
    }
    onAfter?.()
  }

  return { navigateFromNotification, handleDespachoNotificationClick }
}
