/** Enable in prod/staging: localStorage.setItem('waro:reventa-catalog-debug', '1') */
export const REVENTA_CATALOG_DEBUG_LS_KEY = 'waro:reventa-catalog-debug'

export function isReventaCatalogDebugEnabled(): boolean {
  if (import.meta.dev) return true
  if (!import.meta.client) return false
  try {
    return localStorage.getItem(REVENTA_CATALOG_DEBUG_LS_KEY) === '1'
  } catch {
    return false
  }
}

export function logReventaCatalog(
  scope: 'bulk' | 'catalog' | 'toggle',
  phase: string,
  payload?: Record<string, unknown>,
) {
  if (!isReventaCatalogDebugEnabled()) return
  console.log(`[reventa/${scope}]`, phase, payload ?? '')

  if (
    scope === 'bulk'
    || (scope === 'catalog' && (
      phase === 'collect-bulk-product-ids'
      || phase === 'will-save-catalog'
      || phase === 'save-catalog-done'
    ))
  ) {
    const summary = {
      phase,
      productIds: payload?.productIds ?? payload?.productIdsForPatch,
      hasApiPatch: payload?.hasApiPatch ?? payload?.hasApiPatchPreview,
      productsInCache: payload?.productsInCache,
      createCount: payload?.createCount,
      debug: payload?.debug,
      selection: payload?.selection,
    }
    console.warn(`[reventa/${scope}] ${phase}`, JSON.stringify(summary))
  }
}
