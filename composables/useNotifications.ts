import { ref, computed, readonly } from 'vue'

export interface Notification {
  id: string
  order_id: string | null
  type: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

// Singleton state — shared across all callers, prevents multiple SSE connections
const notifications = ref<Notification[]>([])
const initialized = ref(false)
let eventSource: EventSource | null = null
let connectionRefCount = 0

export const useNotifications = () => {
  const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)

  const fetchNotifications = async () => {
    try {
      const response = await $fetch<{ success: boolean; data: Omit<Notification, 'read_at'>[] }>(
        '/api/notifications'
      )
      if (response.success) {
        notifications.value = response.data.map(n => ({ ...n, read_at: null }))
      }
    } catch (err) {
      console.error('[useNotifications] Error fetching notifications:', err)
    }
  }

  const connect = () => {
    if (!process.client) return

    connectionRefCount++

    if (eventSource) return // Already connected

    eventSource = new EventSource('/api/notifications/stream', { withCredentials: true })

    eventSource.onmessage = async (event) => {
      if (!event.data || event.data.startsWith(':')) return // ignore heartbeat comments
      await fetchNotifications()
    }

    eventSource.onerror = () => {
      // EventSource auto-reconnects on error — no manual intervention needed
      console.warn('[useNotifications] SSE connection error, will auto-reconnect')
    }
  }

  const disconnect = () => {
    connectionRefCount--
    if (connectionRefCount <= 0 && eventSource) {
      eventSource.close()
      eventSource = null
      connectionRefCount = 0
      notifications.value = []
      initialized.value = false
    }
  }

  const init = async () => {
    if (!process.client || initialized.value) return
    initialized.value = true
    await fetchNotifications()
    connect()
  }

  const markAsRead = async (id: string) => {
    try {
      await $fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      const notification = notifications.value.find(n => n.id === id)
      if (notification) {
        notification.read_at = new Date().toISOString()
      }
    } catch (err) {
      console.error('[useNotifications] Error marking notification as read:', err)
    }
  }

  const markAllRead = async () => {
    try {
      await $fetch('/api/notifications/read-all', { method: 'POST' })
      const now = new Date().toISOString()
      notifications.value.forEach(n => {
        if (!n.read_at) n.read_at = now
      })
    } catch (err) {
      console.error('[useNotifications] Error marking all notifications as read:', err)
    }
  }

  return {
    notifications: readonly(notifications),
    unreadCount,
    init,
    connect,
    disconnect,
    markAsRead,
    markAllRead,
  }
}
