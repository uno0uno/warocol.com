import { ref, computed, readonly, watch } from 'vue'
import { useQuery, useMutation, useQueryCache } from '@pinia/colada'
import { useTenantsStore } from '~/stores/tenants'

export interface Notification {
  id: string
  order_id: string | null
  type: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

// Module-level cache ref — captured from first setup() call, used by SSE callback
// (SSE onmessage runs outside Vue reactivity, so useQueryCache() cannot be called there)
let _queryCache: ReturnType<typeof useQueryCache> | null = null

// Singleton state — shared across all callers, prevents multiple SSE connections
const initialized = ref(false)
const isTenantResetting = ref(false)
let eventSource: EventSource | null = null
const connectionOwners = new Set<string>()
let tenantWatcherSetup = false
let intentionalClose = false
let lastErrorWarningAt = 0

type DisconnectOptions = {
  force?: boolean
  clearCache?: boolean
}

export const useNotifications = () => {
  // Capture query cache for SSE callback — must be called inside setup() context
  const queryCache = useQueryCache()
  if (!_queryCache) _queryCache = queryCache

  const { data } = useQuery({
    key: ['notifications'],
    enabled: () => import.meta.client,
    query: async () => {
      const response = await $fetch<{ success: boolean; data: Omit<Notification, 'read_at'>[] }>(
        '/api/notifications'
      )
      return response.data.map(n => ({ ...n, read_at: null }))
    },
  })

  // Wrap to maintain Notification[] (non-undefined) contract — no consumer changes needed
  const notifications = computed(() => data.value ?? [])
  const unreadCount = computed(() => notifications.value.filter(n => !n.read_at).length)

  const canConnect = () => {
    const authStore = useAuthStore()
    return authStore.isSessionValid
  }

  const closeEventSource = (clearCache = false) => {
    intentionalClose = true
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    initialized.value = false
    if (clearCache) {
      _queryCache?.setQueryData(['notifications'], [])
    }
    queueMicrotask(() => {
      intentionalClose = false
    })
  }

  const connect = () => {
    if (!process.client) return
    if (!canConnect()) return
    if (eventSource) return // Already connected — singleton guard

    eventSource = new EventSource('/api/notifications/stream', { withCredentials: true })
    initialized.value = true

    eventSource.onmessage = async (event) => {
      if (!event.data || event.data.startsWith(':')) return // ignore heartbeat comments
      // Invalidate cache — Pinia Colada refetches automatically
      // Toast + chime are handled by MobileOrderToast.vue via its length watcher
      await _queryCache?.invalidateQueries({ key: ['notifications'] })
      await _queryCache?.invalidateQueries({ key: ['table-qr-requests'] })
    }

    eventSource.onerror = () => {
      if (intentionalClose || eventSource?.readyState === EventSource.CLOSED) return

      const now = Date.now()
      if (now - lastErrorWarningAt > 30000) {
        lastErrorWarningAt = now
        console.debug('[useNotifications] SSE reconnecting')
      }
    }
  }

  const disconnect = (owner = 'default', options: DisconnectOptions = {}) => {
    connectionOwners.delete(owner)
    if (options.force) {
      connectionOwners.clear()
    }

    if (connectionOwners.size === 0) {
      closeEventSource(options.clearCache ?? true)
    }
  }

  // Hard-resets SSE on tenant change — data refresh handled by tenants.ts bulk invalidation
  const resetForTenantChange = () => {
    isTenantResetting.value = true
    closeEventSource(false)
    queueMicrotask(() => {
      if (connectionOwners.size > 0) {
        connect()
      }
      isTenantResetting.value = false
    })
  }

  const init = async (owner = 'default') => {
    if (!process.client) return
    connectionOwners.add(owner)
    if (!initialized.value || !eventSource) {
      connect() // open SSE only once
    }
  }

  // Wire tenant change once — the watcher lives in the first caller's setup context (dashboard layout)
  if (process.client && !tenantWatcherSetup) {
    tenantWatcherSetup = true
    const tenantsStore = useTenantsStore()
    watch(
      () => tenantsStore.selectedTenant?.id,
      (newId, oldId) => {
        if (newId && newId !== oldId) {
          resetForTenantChange()
        }
      }
    )
  }

  const markAsReadMutation = useMutation({
    mutation: (id: string) =>
      $fetch(`/api/notifications/${id}/read`, { method: 'PATCH' }),
    onMutate: (id) => {
      const prev = queryCache.getQueryData<Notification[]>(['notifications'])
      queryCache.setQueryData(
        ['notifications'],
        (prev ?? []).map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      queryCache.setQueryData(['notifications'], ctx?.prev)
    },
    onSettled: () => queryCache.invalidateQueries({ key: ['notifications'] }),
  })

  const markAllReadMutation = useMutation({
    mutation: () =>
      $fetch('/api/notifications/read-all', { method: 'POST' }),
    onMutate: () => {
      const prev = queryCache.getQueryData<Notification[]>(['notifications'])
      const now = new Date().toISOString()
      queryCache.setQueryData(
        ['notifications'],
        (prev ?? []).map(n => n.read_at ? n : { ...n, read_at: now })
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      queryCache.setQueryData(['notifications'], ctx?.prev)
    },
    onSettled: () => queryCache.invalidateQueries({ key: ['notifications'] }),
  })

  const markAsRead = (id: string) => markAsReadMutation.mutateAsync(id)
  const markAllRead = () => markAllReadMutation.mutateAsync()

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
