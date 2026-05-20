/**
 * Dual product cost margins — real (costo_calculado) vs operativo (costo_percibido).
 * Prefers API-computed fields from #745 when present.
 */

export type ProductCostFields = {
  price?: number | string | null
  costo_calculado?: number | string | null
  costo_percibido?: number | string | null
  margen_real_pct?: number | string | null
  margen_operativo_pct?: number | string | null
}

export function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function marginPctFromCosts(price: number, cost: number): number | null {
  if (price <= 0 || cost <= 0) return null
  const margin = ((price - cost) / cost) * 100
  return Number.isFinite(margin) ? margin : null
}

export function marginRealPct(product: ProductCostFields): number | null {
  const fromApi = toNum(product.margen_real_pct)
  if (fromApi !== null) return fromApi
  const price = toNum(product.price)
  const cost = toNum(product.costo_calculado)
  if (price === null || cost === null) return null
  return marginPctFromCosts(price, cost)
}

export function marginOperativoPct(product: ProductCostFields): number | null {
  const fromApi = toNum(product.margen_operativo_pct)
  if (fromApi !== null) return fromApi
  const perceived = toNum(product.costo_percibido)
  if (perceived === null) return null
  const price = toNum(product.price)
  if (price === null) return null
  return marginPctFromCosts(price, perceived)
}

/** |real - perceived| / real > threshold when both costs are set. */
export function hasCostDrift(product: ProductCostFields, threshold = 0.25): boolean {
  const real = toNum(product.costo_calculado)
  const perceived = toNum(product.costo_percibido)
  if (real === null || perceived === null || real <= 0) return false
  return Math.abs(real - perceived) / real > threshold
}

export function formatCostCell(
  value: unknown,
  formatCurrency: (n: number) => string,
): string {
  if (value === null || value === undefined) return '—'
  return formatCurrency(Number(value))
}

/** Composable wrapper for auto-import in pages and components. */
export function useProductMargins() {
  return {
    marginRealPct,
    marginOperativoPct,
    hasCostDrift,
    formatCostCell,
  }
}
