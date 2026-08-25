/**
 * Batch fetch helper for ingredient purchase units — fixes N+1 in recipe builder (#2438).
 * Uses POST /api/suppliers/ingredient-purchase-units/batch with fallback throttling.
 */

export async function fetchIngredientPurchaseUnitsBatch(
  ingredientIds: string[],
  caches: {
    purchaseUnitsCache: Map<string, any[]>
    loadingUnits: Set<string>
  },
  setLoading: (ids: string[], add: boolean) => void,
  setCache: (updater: (prev: Map<string, any[]>) => Map<string, any[]>) => void,
): Promise<void> {
  const pending = [...new Set(ingredientIds.filter(Boolean))].filter(
    id => !caches.purchaseUnitsCache.has(id) && !caches.loadingUnits.has(id),
  ).slice(0, 250)
  if (!pending.length) return
  setLoading(pending, true)
  try {
    const res = await $fetch<any>('/api/suppliers/ingredient-purchase-units/batch', {
      method: 'POST',
      body: { ingredient_ids: pending },
    })
    const data: Record<string, any[]> = res?.data ?? {}
    setCache((prev) => {
      const next = new Map(prev)
      for (const id of pending) {
        next.set(id, data[id] ?? data[id.toLowerCase()] ?? [])
      }
      return next
    })
  } catch {
    // Fallback: sequential throttled (6 concurrent budget)
    for (let i = 0; i < pending.length; i++) {
      const id = pending[i]
      if (caches.purchaseUnitsCache.has(id)) continue
      try {
        const res = await $fetch<any>(`/api/suppliers/ingredient-purchase-units/ingredient/${id}`)
        setCache(prev => {
          const next = new Map(prev)
          next.set(id, res?.data ?? [])
          return next
        })
      } catch {
        setCache(prev => {
          const next = new Map(prev)
          next.set(id, [])
          return next
        })
      }
      if (i % 6 === 5) await new Promise(r => setTimeout(r, 80))
    }
  } finally {
    setLoading(pending, false)
  }
}
