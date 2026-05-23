export function enrichResaleIngredientUnits(
  ingredient: Record<string, unknown>,
  product: Record<string, unknown>,
) {
  const enriched = { ...ingredient }
  if (enriched.unit_weight_gr == null && product.resale_unit_weight_gr != null) {
    enriched.unit_weight_gr = product.resale_unit_weight_gr
  }
  if (enriched.unit_weight_unit == null && product.resale_unit_weight_unit != null) {
    enriched.unit_weight_unit = product.resale_unit_weight_unit
  }
  if (enriched.unit === 'und' && enriched.unit_weight_gr && !enriched.unit_weight_unit) {
    enriched.unit_weight_unit = 'ml'
  }
  return enriched
}

export async function fetchResaleLinkedIngredient(
  product: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const rawId = product.resale_ingredient_id
  const ingredientId = typeof rawId === 'string' ? rawId : rawId != null ? String(rawId) : undefined

  if (ingredientId) {
    try {
      const res = await $fetch<{ data?: Record<string, unknown> }>(`/api/suppliers/ingredients/${ingredientId}`)
      return enrichResaleIngredientUnits(res?.data ?? (res as Record<string, unknown>), product)
    } catch {
      return enrichResaleIngredientUnits({
        id: ingredientId,
        name: product.name,
        unit: 'und',
      }, product)
    }
  }

  const name = typeof product.name === 'string' ? product.name.trim() : ''
  if (!name) return null

  try {
    const res = await $fetch<{ data?: Array<Record<string, unknown>> }>('/api/suppliers/ingredients', {
      query: { search: name, limit: 20 },
    })
    const rows = res?.data ?? []
    const match = rows.find(i => String(i.name ?? '').toLowerCase() === name.toLowerCase())
      ?? rows.find(i => String(i.name ?? '').toLowerCase().includes(name.toLowerCase()))
    return match ? enrichResaleIngredientUnits(match, product) : null
  } catch {
    return null
  }
}
