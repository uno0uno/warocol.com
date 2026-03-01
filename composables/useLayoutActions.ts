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
    setLastUpdateText,
    triggerRefresh,
  }
}
