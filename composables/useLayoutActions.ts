// composables/useLayoutActions.ts
// Module-level singleton — safe in SPA mode (ssr: false)
// Replaces provide/inject pattern which is unreliable in Nuxt 3 layout ↔ page communication.
import { onUnmounted, readonly, ref, watch, type ComputedRef, type Ref } from 'vue'

const _refreshHandler = ref<(() => void | Promise<void>) | undefined>(undefined)
const _isRefreshing = ref(false)
const _lastUpdateText = ref<string | undefined>(undefined)
const _isProgressiveLoading = ref(false)
const _progressiveLoadingLabel = ref<string | undefined>(undefined)
const _progressiveLoadingOwner = ref<symbol | undefined>(undefined)

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

  const setProgressiveLoading = (
    loading: boolean,
    options?: { label?: string; owner?: symbol }
  ) => {
    if (loading) {
      _progressiveLoadingOwner.value = options?.owner
      _progressiveLoadingLabel.value = options?.label || 'Actualizando'
      _isProgressiveLoading.value = true
      return
    }

    if (options?.owner && _progressiveLoadingOwner.value && _progressiveLoadingOwner.value !== options.owner) {
      return
    }

    _isProgressiveLoading.value = false
    _progressiveLoadingLabel.value = undefined
    if (!options?.owner || _progressiveLoadingOwner.value === options.owner) {
      _progressiveLoadingOwner.value = undefined
    }
  }

  const registerProgressiveLoading = (
    source: Ref<boolean> | ComputedRef<boolean>,
    label = 'Actualizando'
  ) => {
    const owner = Symbol('layout-progressive-loading')
    const stop = watch(
      source,
      (loading) => {
        setProgressiveLoading(loading, { label, owner })
      },
      { immediate: true }
    )

    onUnmounted(() => {
      stop()
      setProgressiveLoading(false, { owner })
    })
  }

  return {
    refreshHandler: readonly(_refreshHandler),
    isRefreshing: readonly(_isRefreshing),
    lastUpdateText: readonly(_lastUpdateText),
    isProgressiveLoading: readonly(_isProgressiveLoading),
    progressiveLoadingLabel: readonly(_progressiveLoadingLabel),
    setRefreshHandler,
    clearRefreshHandler,
    setLastUpdateText,
    setProgressiveLoading,
    registerProgressiveLoading,
    triggerRefresh,
  }
}
