import { ref, readonly } from 'vue'

// Singleton state — shared across all callers, one fetch for the whole session
const hasCritical = ref(false)
let initialized = false
let pollingInterval: ReturnType<typeof setInterval> | null = null

const fetchStatus = async () => {
  try {
    const res = await $fetch<{ data?: { critical: number }; critical?: number }>('/api/analytics/data-quality')
    const critical = (res as any)?.data?.critical ?? (res as any)?.critical ?? 0
    hasCritical.value = critical > 0
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
