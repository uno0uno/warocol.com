/**
 * Type definitions for scan quota.
 * The composable has been migrated to Pinia Colada — use useScanQuotaQuery() instead.
 * @see composables/queries/useScanQuota.ts
 */

export interface ScanQuota {
  scans_used: number
  scans_limit: number
  period_start: string
  period_end: string
  percentage: number
}

export type QuotaWarningLevel = 'ok' | 'warning' | 'critical' | 'exceeded'
