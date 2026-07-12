import {
  WAREHOUSE_COPY,
  warehouseCopyKey,
  type WarehouseCopyKey,
} from '~/constants/warehouseCopy'

/**
 * Locale-aware warehouse glossary for operator UI (setup only).
 * Guest/out-of-i18n code should keep importing `WAREHOUSE_COPY` (ES static).
 */
export function useWarehouseCopy(): Record<WarehouseCopyKey, string> {
  const { t } = useI18n({ useScope: 'global' })
  return new Proxy({} as Record<WarehouseCopyKey, string>, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string' || !(prop in WAREHOUSE_COPY)) return undefined
      return t(warehouseCopyKey(prop as WarehouseCopyKey))
    },
  })
}
