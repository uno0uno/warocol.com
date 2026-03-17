import { ref, readonly } from 'vue'

// Singleton state — shared across all callers, one fetch for the whole session
const hasCritical = ref(false)
let initialized = false
let pollingInterval: ReturnType<typeof setInterval> | null = null

const fetchStatus = async () => {
  try {
    const data = await $fetch<{ critical: number }>('/api/analytics/data-quality')
    hasCritical.value = (data?.critical ?? 0) > 0
  } catch {
    // Silently fail — do not break nav if the endpoint is unreachable
  }
}

export const useDataQualityStatus = () => {
  if (!initialized) {
    initialized = true

    // Initial fetch
    fetchStatus()

    // Poll every 5 minutes
    pollingInterval = setInterval(fetchStatus, 5 * 60 * 1000)

    // Re-fetch when tenant changes
    const { onTenantChange } = useTenantReactive()
    onTenantChange(() => fetchStatus())
  }

  return {
    hasCriticalAlerts: readonly(hasCritical),
    refresh: fetchStatus
  }
}
