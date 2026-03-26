import { ref, computed, readonly, watch } from 'vue'
import { useTenantsStore } from '~/stores/tenants'

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
const isTenantResetting = ref(false)
let eventSource: EventSource | null = null
let connectionRefCount = 0
let tenantWatcherSetup = false

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
    if (eventSource) return // Already connected — singleton guard only

    eventSource = new EventSource('/api/notifications/stream', { withCredentials: true })

    eventSource.onmessage = async (event) => {
      if (!event.data || event.data.startsWith(':')) return // ignore heartbeat comments
      const prevCount = notifications.value.length
      await fetchNotifications()
      if (notifications.value.length > prevCount) {
        try {
          const chime = new Audio('/sounds/order-confirmed.wav')
          chime.volume = 0.2
          chime.play().catch(() => { }) // silently ignore autoplay block
        } catch { }
      }
    }

    eventSource.onerror = () => {
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

  // Hard-resets SSE and state on tenant change — bypasses ref-count guard intentionally
  const resetForTenantChange = async () => {
    isTenantResetting.value = true
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    initialized.value = false
    notifications.value = []
    await fetchNotifications()
    connect()
    isTenantResetting.value = false
  }

  const init = async () => {
    if (!process.client) return
    connectionRefCount++ // always track this caller (fixes ref-count mismatch on re-navigation)
    await fetchNotifications() // always fetch fresh data (not guarded by initialized)
    if (!initialized.value) {
      initialized.value = true
      connect() // open SSE only once
    }
  }

  // Wire tenant change once — the watcher lives in the first caller's setup context (dashboard layout)
  if (process.client && !tenantWatcherSetup) {
    tenantWatcherSetup = true
    const tenantsStore = useTenantsStore()
    watch(
      () => tenantsStore.selectedTenant?.id,
      async (newId, oldId) => {
        if (newId && newId !== oldId) {
          await resetForTenantChange()
        }
      }
    )
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
    isTenantResetting: readonly(isTenantResetting),
    init,
    connect,
    disconnect,
    markAsRead,
    markAllRead,
  }
}
