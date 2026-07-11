import { computed } from 'vue'
import { useQuery, useQueryCache } from '@pinia/colada'
import { useTenantReactive } from '@/composables/useTenantReactive'

interface TableLabelPayload {
  singular: string
  plural: string
}

const DEFAULTS: TableLabelPayload = { singular: 'Mesa', plural: 'Mesas' }

/**
 * Pre-#614 per-device localStorage key. Read once on first mount per device
 * after the upgrade and migrated to the DB via `migrateLocalStorageIfPresent`.
 * Kept as a const so the cleanup path doesn't drift if it ever moves.
 */
const oldLocalStorageKey = (tenantId: string) => `waro_table_label_${tenantId}`

/**
 * Tenant-global custom labels for the "Mesa" noun (warocol.com#614).
 *
 * Reads from the POS restaurant-context aggregator (cached on most pages
 * the user lands on — POS, ventas, comandas, finanzas/arqueo). Pinia
 * Colada shares the same cache key across all 21+ consumers, so the
 * composable adds zero extra round-trips beyond what already happens.
 *
 * Writes via PATCH to `/api/operaciones/labels/tables` (gated under
 * Module.OPERACIONES) and invalidates both audience caches so every
 * page reflects the change without a manual refresh.
 *
 * Returns `computed` refs, not `ref`. Vue auto-unwraps both in templates
 * so existing consumers from #612 keep working unchanged.
 */
export function useTableLabel() {
  const { t } = useI18n()
  const { currentTenant } = useTenantReactive()
  const cache = useQueryCache()

  const { data: contextData } = useQuery({
    key: () => ['pos', 'restaurant-context', currentTenant.value?.id ?? null],
    query: () => $fetch<{ success: boolean; data: any }>('/api/pos/restaurant-context'),
    enabled: () => !!currentTenant.value,
    staleTime: 30_000,
  })

  const singular = computed(() => {
    const value = contextData.value?.data?.tables_label_singular
    // Tenant custom label wins; otherwise follow UI locale (Mesa/Table).
    return (typeof value === 'string' && value.trim()) ? value.trim() : t('pos.glossary.table')
  })
  const plural = computed(() => {
    const value = contextData.value?.data?.tables_label_plural
    return (typeof value === 'string' && value.trim()) ? value.trim() : t('pos.glossary.tables')
  })

  const setLabel = async (newSingular: string, newPlural: string) => {
    await $fetch('/api/operaciones/labels/tables', {
      method: 'PATCH',
      body: { singular: newSingular, plural: newPlural },
    })
    // Cross-audience invalidation: POS pages and operaciones pages both
    // read the aggregator under different cache keys.
    await cache.invalidateQueries({ key: ['pos', 'restaurant-context'] })
    await cache.invalidateQueries({ key: ['operaciones', 'restaurant-context'] })
  }

  /**
   * One-shot migration from the pre-#614 per-device localStorage to the
   * tenant-global DB columns. Runs idempotently: if the localStorage key
   * is gone (already migrated or never set), this is a no-op.
   *
   * Only writes to the API when the DB row still has NULL for both
   * fields — never overwrites a tenant-global value that another device
   * already configured.
   *
   * Guarded behind `import.meta.client` so it never runs during SSR.
   */
  const migrateLocalStorageIfPresent = async () => {
    if (!import.meta.client) return
    const tenantId = currentTenant.value?.id
    if (!tenantId) return

    const raw = localStorage.getItem(oldLocalStorageKey(tenantId))
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as Partial<TableLabelPayload>
      const dbSingular = contextData.value?.data?.tables_label_singular
      const dbPlural = contextData.value?.data?.tables_label_plural

      const hasDbValue = !!(dbSingular || dbPlural)
      const hasLocalValue = !!((parsed.singular ?? '').trim() || (parsed.plural ?? '').trim())

      if (!hasDbValue && hasLocalValue) {
        await setLabel(parsed.singular ?? '', parsed.plural ?? '')
      }
    } catch {
      // Bad JSON or network failure — clear the key anyway so it doesn't
      // retry on every mount.
    } finally {
      localStorage.removeItem(oldLocalStorageKey(tenantId))
    }
  }

  return {
    singular,
    plural,
    setLabel,
    migrateLocalStorageIfPresent,
  }
}
