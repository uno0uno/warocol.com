/**
 * useIngredientPurchaseUnits — per-ingredient purchase-unit cache + helpers.
 *
 * Wraps the Map<ingredient_id, units[]> pattern that
 * `pages/abastecimiento/compras-directas/crear.vue` inlines today. Returned
 * from a singleton via `useState` so multiple components share the same cache
 * during a session (re-opening the stock-adjustment slide-over does not
 * re-fetch units for ingredients already seen).
 *
 * Backend: GET /api/suppliers/ingredient-purchase-units/ingredient/{id}
 *   → { data: PurchaseUnit[] }
 *
 * warocol.com#608.
 */

export interface PurchaseUnit {
  id: string
  ingredient_id: string
  purchase_unit: string          // canonical code: 'kg', 'lb', 'bulto', etc.
  purchase_unit_label: string    // display label: '1 Kilogramo', 'Bulto 25kg', …
  conversion_factor: number      // multiply by this to get base unit
  is_default?: boolean
  is_active?: boolean
  unit_cost?: number | null
}

export interface PurchaseUnitOption {
  value: string                  // = purchase_unit
  label: string                  // = purchase_unit_label
  conversion_factor: number
  is_default: boolean
  unit_cost: number | null
}

export function useIngredientPurchaseUnits() {
  // Per-tab singleton via useState. Survives component unmounts.
  const cache = useState<Map<string, PurchaseUnit[]>>(
    'ingredient-purchase-units-cache',
    () => new Map(),
  )
  const loadingSet = useState<Set<string>>(
    'ingredient-purchase-units-loading',
    () => new Set(),
  )

  const isLoading = (ingredientId: string): boolean =>
    loadingSet.value.has(ingredientId)

  const fetch = async (ingredientId: string): Promise<PurchaseUnit[]> => {
    if (!ingredientId) return []
    if (cache.value.has(ingredientId)) return cache.value.get(ingredientId)!

    // Mark loading
    const nextLoading = new Set(loadingSet.value)
    nextLoading.add(ingredientId)
    loadingSet.value = nextLoading

    try {
      const res = await $fetch<{ data: PurchaseUnit[] }>(
        `/api/suppliers/ingredient-purchase-units/ingredient/${ingredientId}`,
      )
      const units = (res?.data ?? []).filter((u) => u.is_active !== false)
      const nextCache = new Map(cache.value)
      nextCache.set(ingredientId, units)
      cache.value = nextCache
      return units
    } catch {
      // On error, cache an empty list so subsequent calls don't loop.
      const nextCache = new Map(cache.value)
      nextCache.set(ingredientId, [])
      cache.value = nextCache
      return []
    } finally {
      const done = new Set(loadingSet.value)
      done.delete(ingredientId)
      loadingSet.value = done
    }
  }

  const options = (ingredientId: string): PurchaseUnitOption[] => {
    const units = cache.value.get(ingredientId) ?? []
    return units.map((u) => ({
      value: u.purchase_unit,
      label: u.purchase_unit_label,
      conversion_factor: Number(u.conversion_factor),
      is_default: !!u.is_default,
      unit_cost: u.unit_cost ?? null,
    }))
  }

  const defaultFor = (ingredientId: string): PurchaseUnitOption | null => {
    const opts = options(ingredientId)
    if (opts.length === 0) return null
    return opts.find((o) => o.is_default) ?? opts[0]
  }

  /**
   * Convert a quantity expressed in `unitValue` (a purchase_unit code) to
   * the ingredient's base unit. Returns the same quantity unchanged when no
   * matching purchase unit is found — that mirrors the backend fallback
   * (`inventory_service.py:498-516`).
   */
  const convertToBase = (
    ingredientId: string,
    qty: number,
    unitValue: string,
  ): number => {
    if (!qty || !unitValue) return 0
    const match = options(ingredientId).find((o) => o.value === unitValue)
    if (!match) return qty
    return qty * match.conversion_factor
  }

  const clear = (ingredientId?: string): void => {
    if (ingredientId) {
      const next = new Map(cache.value)
      next.delete(ingredientId)
      cache.value = next
    } else {
      cache.value = new Map()
    }
  }

  return {
    cache,
    isLoading,
    fetch,
    options,
    defaultFor,
    convertToBase,
    clear,
  }
}
