import { ref, computed } from 'vue'

export interface ScanQuota {
  scans_used: number
  scans_limit: number
  period_start: string
  period_end: string
  percentage: number
}

export type QuotaWarningLevel = 'ok' | 'warning' | 'critical' | 'exceeded'

const quota = ref<ScanQuota | null>(null)
const loading = ref(false)

export const useScanQuota = () => {
  const fetchQuota = async () => {
    loading.value = true
    try {
      const data = await $fetch<ScanQuota>('/api/suppliers/purchases/scan-usage')
      quota.value = data
    } catch (err: unknown) {
      const e = err as { status?: number }
      // 404 = tenant without subscription / no scan period yet — silent
      if (e?.status !== 404) {
        console.error('[useScanQuota] fetchQuota error:', err)
      }
      quota.value = null
    } finally {
      loading.value = false
    }
  }

  const isQuotaExceeded = computed(() =>
    quota.value !== null && quota.value.scans_used >= quota.value.scans_limit
  )

  // percentage comes pre-calculated from backend
  const percentageUsed = computed(() => quota.value?.percentage ?? 0)

  const warningLevel = computed((): QuotaWarningLevel => {
    const pct = percentageUsed.value
    if (pct >= 100) return 'exceeded'
    if (pct >= 90) return 'critical'
    if (pct >= 70) return 'warning'
    return 'ok'
  })

  const scansRemaining = computed(() =>
    quota.value ? Math.max(0, quota.value.scans_limit - quota.value.scans_used) : null
  )

  return {
    quota,
    loading,
    fetchQuota,
    isQuotaExceeded,
    percentageUsed,
    warningLevel,
    scansRemaining,
  }
}
