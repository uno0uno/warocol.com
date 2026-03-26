import type { ScanQuota, QuotaWarningLevel } from '~/composables/useScanQuota'

/**
 * Pinia Colada query for scan quota.
 *
 * Replaces the module-level singleton in useScanQuota.ts.
 * Auto-fetches on mount; use refetch() for explicit re-fetches after mutations.
 *
 * Usage:
 *   const { quota, status, refetch, warningLevel } = useScanQuotaQuery()
 */
export const useScanQuotaQuery = defineQuery(() => {
  const { data: quota, status, refetch } = useQuery({
    key: ['scan-quota'],
    query: async () => {
      try {
        return await $fetch<ScanQuota>('/api/suppliers/purchases/scan-usage')
      } catch (err: unknown) {
        const e = err as { status?: number }
        // 404 = tenant without active subscription — not an error, return null silently
        if (e?.status === 404) return null
        throw err
      }
    },
    staleTime: 60_000, // quota data valid for 1 minute
  })

  const isQuotaExceeded = computed(() =>
    quota.value != null &&
    quota.value.scans_used >= quota.value.scans_limit
  )

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

  return { quota, status, refetch, isQuotaExceeded, percentageUsed, warningLevel, scansRemaining }
})
