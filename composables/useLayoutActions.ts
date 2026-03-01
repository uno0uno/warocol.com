// composables/useLayoutActions.ts
// Module-level singleton — safe in SPA mode (ssr: false)
// Replaces provide/inject pattern which is unreliable in Nuxt 3 layout ↔ page communication.
import { ref, readonly } from 'vue'

const _refreshHandler = ref<(() => void | Promise<void>) | undefined>(undefined)
const _isRefreshing = ref(false)
const _lastUpdateText = ref<string | undefined>(undefined)

export const useLayoutActions = () => {
  const setRefreshHandler = (handler: (() => void | Promise<void>) | undefined) => {
    _refreshHandler.value = handler
  }

  // Safe clear: only clears if the current handler is exactly the one we registered.
  // Prevents the race condition where the new page's onMounted fires before the old
  // page's onUnmounted, causing the old page cleanup to wipe the new handler.
  const clearRefreshHandler = (handler: () => void | Promise<void>) => {
    if (_refreshHandler.value === handler) {
      _refreshHandler.value = undefined
    }
  }

  const triggerRefresh = async () => {
    if (!_refreshHandler.value || _isRefreshing.value) return
    _isRefreshing.value = true
    try {
      await _refreshHandler.value()
    } finally {
      _isRefreshing.value = false
    }
  }

  const setLastUpdateText = (text: string | undefined) => {
    _lastUpdateText.value = text
  }

  return {
    refreshHandler: readonly(_refreshHandler),
    isRefreshing: readonly(_isRefreshing),
    lastUpdateText: readonly(_lastUpdateText),
    setRefreshHandler,
    clearRefreshHandler,
    setLastUpdateText,
    triggerRefresh,
  }
}
